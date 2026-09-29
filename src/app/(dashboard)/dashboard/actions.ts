'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function fetchDashboardMetrics() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!activeWorkspaceId) return { metrics: null }

  const adminClient = await createAdminClient()

  // ─── Date ranges ───────────────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)

  // ─── Run all independent queries in parallel ───────────────────
  const [
    dueTodayResult,
    highPriorityDueTodayResult,
    completedResult,
    completedTodayResult,
    upcomingResult,
    recentCompletionsResult,
    workspaceResult,
  ] = await Promise.all([
    // Count tasks due today (non-completed)
    adminClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', activeWorkspaceId)
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString())
      .neq('status', 'completed')
      .neq('status', 'archived'),

    // Count high/urgent tasks due today
    adminClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', activeWorkspaceId)
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString())
      .neq('status', 'completed')
      .in('priority', ['high', 'urgent']),

    // Count all completed tasks
    adminClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', activeWorkspaceId)
      .eq('status', 'completed'),

    // Count tasks completed today
    adminClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', activeWorkspaceId)
      .eq('status', 'completed')
      .gte('updated_at', today.toISOString())
      .lt('updated_at', tomorrow.toISOString()),

    // Fetch next 3 upcoming tasks (sorted by due_date)
    adminClient
      .from('tasks')
      .select('id, title, due_date')
      .eq('workspace_id', activeWorkspaceId)
      .neq('status', 'completed')
      .neq('status', 'archived')
      .gte('due_date', today.toISOString())
      .order('due_date', { ascending: true })
      .limit(3),

    // Fetch completions in the last 7 days (for the trend chart)
    adminClient
      .from('tasks')
      .select('updated_at, completed_at')
      .eq('workspace_id', activeWorkspaceId)
      .eq('status', 'completed')
      .gte('updated_at', sevenDaysAgo.toISOString()),

    // Fetch workspace owner (for team members)
    adminClient
      .from('workspaces')
      .select('owner_id')
      .eq('id', activeWorkspaceId)
      .single(),
  ])

  // ─── Total task count for productivity score ───────────────────
  const { count: totalCount } = await adminClient
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', activeWorkspaceId)

  const completedCount = completedResult.count || 0
  const total = totalCount || 0
  const productivityScore = total > 0 ? Math.round((completedCount / total) * 100) : 0

  // ─── Build trend chart data (last 7 days) ──────────────────────
  const completionByDate: Record<string, number> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(sevenDaysAgo.getDate() + i)
    completionByDate[d.toISOString().split('T')[0]] = 0
  }

  for (const task of (recentCompletionsResult.data || [])) {
    const dateStr = (task.completed_at
      ? new Date(task.completed_at)
      : new Date(task.updated_at)
    ).toISOString().split('T')[0]
    if (completionByDate[dateStr] !== undefined) {
      completionByDate[dateStr]++
    }
  }

  const trends = Object.entries(completionByDate).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    completed: count,
  }))

  // ─── Velocity & estimated finish ──────────────────────────────
  const totalCompletedLast7Days = Object.values(completionByDate).reduce((a, b) => a + b, 0)
  const velocity = totalCompletedLast7Days / 7
  const pendingTasks = total - completedCount
  let estimatedFinishDate = null
  if (velocity > 0 && pendingTasks > 0) {
    const daysRemaining = Math.ceil(pendingTasks / velocity)
    const estDate = new Date()
    estDate.setDate(estDate.getDate() + daysRemaining)
    estimatedFinishDate = estDate.toISOString().split('T')[0]
  }

  // ─── Team members (parallel with member query) ─────────────────
  let teamMembers: any[] = []
  const ownerId = workspaceResult.data?.owner_id

  const [ownerProfileResult, membersResult] = await Promise.all([
    ownerId
      ? adminClient.from('profiles').select('id, full_name, avatar_url').eq('id', ownerId).single()
      : Promise.resolve({ data: null }),
    adminClient
      .from('workspace_members')
      .select('profiles(id, full_name, avatar_url)')
      .eq('workspace_id', activeWorkspaceId),
  ])

  const memberMap = new Map<string, any>()
  if (ownerProfileResult.data) {
    memberMap.set(ownerProfileResult.data.id, ownerProfileResult.data)
  }
  for (const m of (membersResult.data || [])) {
    const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    if (prof?.id && !memberMap.has(prof.id)) {
      memberMap.set(prof.id, prof)
    }
  }
  teamMembers = Array.from(memberMap.values())

  return {
    metrics: {
      dueToday: dueTodayResult.count || 0,
      highPriorityDueToday: highPriorityDueTodayResult.count || 0,
      completed: completedCount,
      completedToday: completedTodayResult.count || 0,
      productivity: productivityScore,
      upcoming: upcomingResult.data || [],
      trends,
      estimatedFinishDate,
      teamMembers,
    },
  }
}
