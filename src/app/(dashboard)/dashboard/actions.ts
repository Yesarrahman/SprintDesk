'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function fetchDashboardMetrics() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  let query = supabase.from('tasks').select('*')
  if (activeWorkspaceId) {
    query = query.eq('workspace_id', activeWorkspaceId)
  }

  const { data: tasks, error } = await query

  if (error || !tasks) {
    return { error: 'Failed to fetch dashboard metrics' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)

  let dueTodayCount = 0
  let highPriorityDueToday = 0
  let completedCount = 0
  
  const upcomingTasks = []
  
  // For charts
  const completionByDate: Record<string, number> = {}
  
  // Initialize last 7 days
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(sevenDaysAgo.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    completionByDate[dateStr] = 0
  }

  for (const task of tasks) {
    if (task.status === 'completed') {
      completedCount++
      // If we have a completed_at or updated_at, use it. Else fallback to created_at
      const completionDate = task.completed_at ? new Date(task.completed_at) : new Date(task.updated_at)
      const dateStr = completionDate.toISOString().split('T')[0]
      if (completionByDate[dateStr] !== undefined) {
         completionByDate[dateStr]++
      }
    }

    if (task.due_date && task.status !== 'completed' && task.status !== 'archived') {
      const dueDate = new Date(task.due_date)
      
      // Due today
      if (dueDate >= today && dueDate < tomorrow) {
        dueTodayCount++
        if (task.priority === 'high' || task.priority === 'urgent') {
          highPriorityDueToday++
        }
      }

      // Upcoming (future tasks)
      if (dueDate >= today) {
        upcomingTasks.push(task)
      }
    }
  }

  // Sort upcoming
  upcomingTasks.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
  
  const productivityScore = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0
  
  // Calculate Velocity (tasks per day over last 7 days)
  const totalCompletedLast7Days = Object.values(completionByDate).reduce((a,b) => a + b, 0)
  const velocity = totalCompletedLast7Days / 7
  
  let estimatedFinishDate = null
  const pendingTasks = tasks.length - completedCount
  
  if (velocity > 0 && pendingTasks > 0) {
     const daysRemaining = Math.ceil(pendingTasks / velocity)
     const estDate = new Date()
     estDate.setDate(estDate.getDate() + daysRemaining)
     estimatedFinishDate = estDate.toISOString().split('T')[0]
  }

  const trends = Object.entries(completionByDate).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      completed: count
  }))

  return {
    metrics: {
      dueToday: dueTodayCount,
      highPriorityDueToday,
      completed: completedCount,
      productivity: productivityScore,
      upcoming: upcomingTasks.slice(0, 3),
      trends,
      estimatedFinishDate
    }
  }
}
