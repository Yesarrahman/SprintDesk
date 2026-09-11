'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { WorkspaceRole } from '@/types'

export interface UserContext {
  userId: string
  userName: string
  userEmail: string
  role: WorkspaceRole
  tier: 'free' | 'pro' | 'enterprise'
  workspaceId: string
  workspaceName: string
  isPersonal: boolean
}

export async function getUserTierAndRole(): Promise<{ error?: string; context?: UserContext }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  if (!activeWorkspaceId) {
    return { error: 'No active workspace selected' }
  }

  const adminClient = await createAdminClient()

  // 1. Fetch workspace info
  const { data: ws, error: wsErr } = await adminClient
    .from('workspaces')
    .select('id, name, owner_id, tier, stripe_subscription_id')
    .eq('id', activeWorkspaceId)
    .single()

  if (wsErr || !ws) {
    return { error: 'Workspace not found' }
  }

  // 2. Fetch user profile for subscription_tier & name
  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name, subscription_tier, stripe_subscription_id')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

  // Determine user role in workspace
  let role: WorkspaceRole = 'member'
  if (ws.owner_id === user.id) {
    role = 'owner'
  } else {
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', activeWorkspaceId)
      .eq('user_id', user.id)
      .single()

    if (membership?.role) {
      role = membership.role as WorkspaceRole
    }
  }

  // Determine effective tier: requires active Stripe subscription on workspace or owner
  const hasStripe = !!(ws.stripe_subscription_id || profile?.stripe_subscription_id)
  const workspaceTier = (ws.tier as string) || 'free'
  const profileTier = (profile?.subscription_tier as string) || 'free'
  
  let effectiveTier: 'free' | 'pro' | 'enterprise' = 'free'
  if (hasStripe && (workspaceTier === 'enterprise' || profileTier === 'enterprise' || workspaceTier === 'agency' || profileTier === 'agency')) {
    effectiveTier = 'enterprise'
  } else if (hasStripe && (workspaceTier === 'pro' || profileTier === 'pro')) {
    effectiveTier = 'pro'
  }

  const isPersonal = ws.name === 'My Workspace' && ws.owner_id === user.id

  return {
    context: {
      userId: user.id,
      userName,
      userEmail: user.email || '',
      role,
      tier: effectiveTier,
      workspaceId: ws.id,
      workspaceName: ws.name,
      isPersonal,
    },
  }
}

export async function fetchWorkspaceMembers(workspaceId: string) {
  const adminClient = await createAdminClient()
  const { data: members, error } = await adminClient
    .from('workspace_members')
    .select(`
      user_id,
      role,
      profiles:user_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('workspace_id', workspaceId)

  // Also include the owner if not in workspace_members
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single()

  const memberList: { user_id: string; full_name: string; role: string; avatar_url: string | null }[] = []

  if (ws?.owner_id) {
    const { data: ownerProf } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', ws.owner_id)
      .single()

    memberList.push({
      user_id: ws.owner_id,
      full_name: ownerProf?.full_name || 'Workspace Owner',
      role: 'owner',
      avatar_url: ownerProf?.avatar_url || null,
    })
  }

  if (members) {
    members.forEach((m: any) => {
      if (m.user_id !== ws?.owner_id) {
        const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
        memberList.push({
          user_id: m.user_id,
          full_name: prof?.full_name || 'Team Member',
          role: m.role || 'member',
          avatar_url: prof?.avatar_url || null,
        })
      }
    })
  }

  return { members: memberList, error: error?.message }
}

export async function fetchTeamReportData(workspaceId: string, fromDate: string, toDate: string) {
  const adminClient = await createAdminClient()

  // Get workspace info
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single()

  // Fetch all tasks for this workspace
  const { data: allTasks, error } = await adminClient
    .from('tasks')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      created_at,
      updated_at,
      assigned_to,
      profiles:assigned_to (
        full_name
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error || !allTasks) {
    return { error: error?.message || 'Failed to load tasks for team report' }
  }

  const fromTime = new Date(`${fromDate}T00:00:00`).getTime()
  const toTime = new Date(`${toDate}T23:59:59.999`).getTime()
  const now = new Date()

  // Filter tasks that have activity in the range (created, updated, due, or completed in range)
  const rangeTasks = allTasks.filter((t) => {
    const createdTime = new Date(t.created_at).getTime()
    const completedTime = t.completed_at ? new Date(t.completed_at).getTime() : null
    const dueTime = t.due_date ? new Date(t.due_date).getTime() : null

    // Check if task falls inside range
    if (createdTime >= fromTime && createdTime <= toTime) return true
    if (completedTime && completedTime >= fromTime && completedTime <= toTime) return true
    if (dueTime && dueTime >= fromTime && dueTime <= toTime) return true
    return false
  })

  // 1. KPI Cards
  const totalTasks = rangeTasks.length
  const completedTasks = rangeTasks.filter((t) => t.status === 'completed')
  const completedCount = completedTasks.length
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0

  const overdueTasks = allTasks
    .filter((t) => {
      if (!t.due_date) return false
      const due = new Date(t.due_date)
      return due < now && t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'archived'
    })
    .map((t) => {
      const due = new Date(t.due_date!)
      const diffDays = Math.max(1, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
      const assigneeName = (t.profiles as any)?.full_name || 'Unassigned'
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        due_date: t.due_date,
        days_overdue: diffDays,
        assigned_to_name: assigneeName,
      }
    })
    .sort((a, b) => b.days_overdue - a.days_overdue)

  const inProgressCount = rangeTasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'in_review'
  ).length
  const cancelledCount = rangeTasks.filter((t) => t.status === 'cancelled').length

  // 2. Status Breakdown
  const statusCounts: Record<string, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    completed: 0,
    cancelled: 0,
    archived: 0,
  }
  rangeTasks.forEach((t) => {
    if (statusCounts[t.status] !== undefined) {
      statusCounts[t.status]++
    }
  })

  // 3. Priority Breakdown
  const priorityCounts: Record<string, number> = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
  }
  rangeTasks.forEach((t) => {
    if (priorityCounts[t.priority] !== undefined) {
      priorityCounts[t.priority]++
    }
  })

  // Fetch time logs for workspace tasks in this date range
  const taskIds = allTasks.map((t) => t.id)
  let totalTeamSeconds = 0
  const memberSecondsMap: Record<string, number> = {}

  if (taskIds.length > 0) {
    const { data: timeLogs } = await adminClient
      .from('time_logs')
      .select('task_id, user_id, duration_seconds, start_time')
      .in('task_id', taskIds)
      .gte('start_time', `${fromDate}T00:00:00`)
      .lte('start_time', `${toDate}T23:59:59.999`)

    if (timeLogs) {
      timeLogs.forEach((log) => {
        const secs = log.duration_seconds || 0
        totalTeamSeconds += secs
        if (log.user_id) {
          memberSecondsMap[log.user_id] = (memberSecondsMap[log.user_id] || 0) + secs
        }
      })
    }
  }

  const formatHoursMinutes = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    if (hrs === 0 && mins === 0) return '0h 0m'
    return `${hrs}h ${mins}m`
  }

  // 4. Per-Member Workload Table
  const workloadMap: Record<string, { member_name: string; assigned: number; completed: number; overdue: number; hours_logged: string; total_seconds: number }> = {}

  rangeTasks.forEach((t) => {
    const key = t.assigned_to || 'unassigned'
    const name = (t.profiles as any)?.full_name || (key === 'unassigned' ? 'Unassigned' : 'Team Member')
    if (!workloadMap[key]) {
      const userSecs = memberSecondsMap[key] || 0
      workloadMap[key] = {
        member_name: name,
        assigned: 0,
        completed: 0,
        overdue: 0,
        hours_logged: formatHoursMinutes(userSecs),
        total_seconds: userSecs,
      }
    }
    workloadMap[key].assigned++
    if (t.status === 'completed') {
      workloadMap[key].completed++
    }
  })

  // Count overdues per member from overdue list
  overdueTasks.forEach((ot) => {
    const matched = Object.values(workloadMap).find((w) => w.member_name === ot.assigned_to_name)
    if (matched) {
      matched.overdue++
    }
  })

  const memberWorkload = Object.values(workloadMap).map((w) => ({
    ...w,
    completion_rate: w.assigned > 0 ? Math.round((w.completed / w.assigned) * 100) : 0,
  })).sort((a, b) => b.assigned - a.assigned)

  // 5. Completed Tasks in Range
  const completedTasksList = completedTasks.slice(0, 25).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    completed_at: t.completed_at || t.updated_at,
    assigned_to_name: (t.profiles as any)?.full_name || 'Unassigned',
  }))

  // 6. Upcoming Tasks (due date after now)
  const upcomingTasksList = allTasks
    .filter((t) => {
      if (!t.due_date) return false
      const due = new Date(t.due_date)
      return due >= now && t.status !== 'completed' && t.status !== 'cancelled'
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 15)
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      due_date: t.due_date,
      assigned_to_name: (t.profiles as any)?.full_name || 'Unassigned',
    }))

  return {
    data: {
      workspaceName: ws?.name || 'Workspace',
      rangeFrom: fromDate,
      rangeTo: toDate,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTasks,
        completedCount,
        completionRate,
        overdueCount: overdueTasks.length,
        inProgressCount,
        cancelledCount,
        totalTeamHours: formatHoursMinutes(totalTeamSeconds),
        totalTeamSeconds,
      },
      statusCounts,
      priorityCounts,
      memberWorkload,
      overdueTasks: overdueTasks.slice(0, 20),
      completedTasksList,
      upcomingTasksList,
    },
  }
}

export async function fetchIndividualReportData(
  workspaceId: string,
  memberId: string,
  fromDate: string,
  toDate: string
) {
  const adminClient = await createAdminClient()

  // Get workspace info
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single()

  // Get member profile
  const { data: memberProf } = await adminClient
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', memberId)
    .single()

  // Get member's role in this workspace
  let memberRole = 'member'
  const { data: wsOwner } = await adminClient
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single()

  if (wsOwner?.owner_id === memberId) {
    memberRole = 'owner'
  } else {
    const { data: memRecord } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', memberId)
      .single()
    if (memRecord?.role) memberRole = memRecord.role
  }

  // Fetch all tasks for this workspace
  const { data: tasks, error } = await adminClient
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .or(`assigned_to.eq.${memberId},created_by.eq.${memberId}`)
    .order('created_at', { ascending: false })

  if (error || !tasks) {
    return { error: error?.message || 'Failed to fetch member tasks' }
  }

  const fromTime = new Date(`${fromDate}T00:00:00`).getTime()
  const toTime = new Date(`${toDate}T23:59:59.999`).getTime()
  const now = new Date()

  // Filter tasks assigned to member
  const assignedTasks = tasks.filter((t) => t.assigned_to === memberId)

  // Range tasks assigned
  const rangeAssigned = assignedTasks.filter((t) => {
    const createdTime = new Date(t.created_at).getTime()
    const completedTime = t.completed_at ? new Date(t.completed_at).getTime() : null
    const dueTime = t.due_date ? new Date(t.due_date).getTime() : null
    if (createdTime >= fromTime && createdTime <= toTime) return true
    if (completedTime && completedTime >= fromTime && completedTime <= toTime) return true
    if (dueTime && dueTime >= fromTime && dueTime <= toTime) return true
    return false
  })

  const tasksCompleted = rangeAssigned.filter((t) => t.status === 'completed')
  const completionRate = rangeAssigned.length > 0 ? Math.round((tasksCompleted.length / rangeAssigned.length) * 100) : 0

  const overdueTasks = assignedTasks
    .filter((t) => {
      if (!t.due_date) return false
      const due = new Date(t.due_date)
      return due < now && t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'archived'
    })
    .map((t) => {
      const due = new Date(t.due_date!)
      const diffDays = Math.max(1, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        due_date: t.due_date,
        days_overdue: diffDays,
      }
    })
    .sort((a, b) => b.days_overdue - a.days_overdue)

  const tasksCreated = tasks.filter((t) => {
    if (t.created_by !== memberId) return false
    const createdTime = new Date(t.created_at).getTime()
    return createdTime >= fromTime && createdTime <= toTime
  }).length

  const inProgressTasks = assignedTasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'in_review'
  )

  // Status breakdown for this member
  const statusCounts: Record<string, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    completed: 0,
    cancelled: 0,
  }
  rangeAssigned.forEach((t) => {
    if (statusCounts[t.status] !== undefined) statusCounts[t.status]++
  })

  // Fetch time logs for this member's tasks in this date range
  const memberTaskIds = tasks.map((t) => t.id)
  let totalPersonalSeconds = 0
  const taskSecondsMap: Record<string, number> = {}

  if (memberTaskIds.length > 0) {
    const { data: memberLogs } = await adminClient
      .from('time_logs')
      .select('task_id, duration_seconds, start_time')
      .eq('user_id', memberId)
      .in('task_id', memberTaskIds)
      .gte('start_time', `${fromDate}T00:00:00`)
      .lte('start_time', `${toDate}T23:59:59.999`)

    if (memberLogs) {
      memberLogs.forEach((log) => {
        const s = log.duration_seconds || 0
        totalPersonalSeconds += s
        taskSecondsMap[log.task_id] = (taskSecondsMap[log.task_id] || 0) + s
      })
    }
  }

  const formatHoursMinutes = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    if (hrs === 0 && mins === 0) return '0h 0m'
    return `${hrs}h ${mins}m`
  }

  // Priority breakdown for this member
  const priorityCounts: Record<string, number> = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
  }
  rangeAssigned.forEach((t) => {
    if (priorityCounts[t.priority] !== undefined) priorityCounts[t.priority]++
  })

  return {
    data: {
      workspaceName: ws?.name || 'Workspace',
      memberId,
      memberName: memberProf?.full_name || 'Team Member',
      memberRole,
      avatarUrl: memberProf?.avatar_url || null,
      rangeFrom: fromDate,
      rangeTo: toDate,
      generatedAt: new Date().toISOString(),
      summary: {
        tasksAssigned: rangeAssigned.length,
        tasksCompleted: tasksCompleted.length,
        completionRate,
        overdueCount: overdueTasks.length,
        tasksCreated,
        inProgressCount: inProgressTasks.length,
        totalHoursLogged: formatHoursMinutes(totalPersonalSeconds),
        totalSeconds: totalPersonalSeconds,
      },
      statusCounts,
      priorityCounts,
      completedList: tasksCompleted.slice(0, 25).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        completed_at: t.completed_at || t.updated_at,
        estimated_duration: t.estimated_duration,
        actual_duration: taskSecondsMap[t.id] ? formatHoursMinutes(taskSecondsMap[t.id]) : t.actual_duration,
      })),
      overdueList: overdueTasks.slice(0, 20),
      inProgressList: inProgressTasks.slice(0, 20).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        due_date: t.due_date,
        status: t.status,
      })),
    },
  }
}

export async function submitReportToManager(payload: {
  workspaceId: string
  memberId: string
  memberName: string
  rangeFrom: string
  rangeTo: string
  reportData: any
}) {
  const adminClient = await createAdminClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Insert into submitted_reports table
  const { data: submittedReport, error: insertError } = await adminClient
    .from('submitted_reports')
    .insert({
      workspace_id: payload.workspaceId,
      member_id: payload.memberId,
      member_name: payload.memberName,
      range_from: payload.rangeFrom,
      range_to: payload.rangeTo,
      report_data: payload.reportData,
    })
    .select('id')
    .single()

  if (insertError || !submittedReport) {
    return { error: insertError?.message || 'Failed to record submitted report' }
  }

  // 2. Find all owners & admins of this workspace
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('owner_id')
    .eq('id', payload.workspaceId)
    .single()

  const { data: admins } = await adminClient
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', payload.workspaceId)
    .eq('role', 'admin')

  const recipientIds = new Set<string>()
  if (ws?.owner_id && ws.owner_id !== user.id) {
    recipientIds.add(ws.owner_id)
  }
  if (admins) {
    admins.forEach((a) => {
      if (a.user_id !== user.id) {
        recipientIds.add(a.user_id)
      }
    })
  }

  // 3. Create notifications for all recipients
  const notificationsToInsert = Array.from(recipientIds).map((recipientId) => ({
    user_id: recipientId,
    type: 'report_submitted',
    title: 'Report Submitted',
    message: `${payload.memberName} submitted an individual performance report for ${payload.rangeFrom} – ${payload.rangeTo}. Click to review.`,
    is_read: false,
  }))

  if (notificationsToInsert.length > 0) {
    await adminClient.from('notifications').insert(notificationsToInsert)
  }

  revalidatePath('/reports')
  revalidatePath('/reports/submitted/' + submittedReport.id)

  return { success: true, submittedReportId: submittedReport.id }
}

export async function fetchSubmittedReports(workspaceId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('submitted_reports')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('submitted_at', { ascending: false })

  if (error) return { error: error.message }
  return { reports: data || [] }
}

export async function fetchSubmittedReportById(id: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('submitted_reports')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return { error: error?.message || 'Report not found' }
  return { report: data }
}
