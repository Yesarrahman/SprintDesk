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

  let dueTodayCount = 0
  let highPriorityDueToday = 0
  let completedCount = 0
  
  const upcomingTasks = []

  for (const task of tasks) {
    if (task.status === 'completed') {
      completedCount++
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
  
  // Basic mock productivity calculation
  const productivityScore = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  return {
    metrics: {
      dueToday: dueTodayCount,
      highPriorityDueToday,
      completed: completedCount,
      productivity: productivityScore,
      upcoming: upcomingTasks.slice(0, 3)
    }
  }
}
