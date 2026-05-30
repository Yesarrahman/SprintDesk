'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { Task, TaskStatus } from '@/types'

export async function fetchTasks() {
  try {
    const supabase = await createClient()

    const cookieStore = await cookies()
    const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

    let query = supabase
      .from('tasks')
      .select(`
        *,
        profiles:assigned_to (
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (activeWorkspaceId) {
      query = query.eq('workspace_id', activeWorkspaceId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return { error: error.message }
    }

    return { tasks: data as Task[] }
  } catch (err) {
    console.error('Unexpected error in fetchTasks:', err)
    return { error: 'An unexpected error occurred while fetching tasks' }
  }
}

export async function createTask(formData: FormData) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const cookieStore = await cookies()
    const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

    let workspaceId = activeWorkspaceId || null

    if (!workspaceId) {
      const { data: workspaces, error: wsFetchError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)

      if (wsFetchError) {
        console.error('Error fetching workspaces:', wsFetchError)
        return { error: 'Failed to fetch your workspace' }
      }
      
      if (workspaces && workspaces.length > 0) {
          workspaceId = workspaces[0].workspace_id
      } else {
          const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()
          
          if (!profile) {
            const { error: profileErr } = await supabase.from('profiles').insert({ 
              id: user.id, 
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User' 
            })
            if (profileErr) console.error('Error creating profile:', profileErr)
          }

          const newWorkspaceId = crypto.randomUUID();
          const { error: wsError } = await supabase.from('workspaces').insert({ id: newWorkspaceId, name: 'My Workspace', owner_id: user.id })
          
          if (wsError) {
            console.error('Error creating workspace:', wsError)
            return { error: 'Failed to create a new workspace' }
          }
          
          workspaceId = newWorkspaceId
          const { error: wmError } = await supabase.from('workspace_members').insert({ workspace_id: workspaceId, user_id: user.id, role: 'owner' })
          if (wmError) {
            console.error('Error creating workspace member:', wmError)
            return { error: 'Failed to assign workspace membership' }
          }
      }
    }
    
    if (!workspaceId) {
        return { error: 'Could not resolve workspace' }
    }

    // RBAC Check for Create
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (member && member.role === 'member') {
      return { error: 'Members cannot create tasks in this workspace.' }
    }

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const priority = formData.get('priority') as string
    const dueDate = formData.get('due_date') as string
    const estimatedDuration = formData.get('estimated_duration') as string
    const status = formData.get('status') as TaskStatus || 'todo'

    if (!title) {
      return { error: 'Task title is required' }
    }

    const newTaskData: Partial<Task> = {
      workspace_id: workspaceId,
      title,
      description: description || null,
      priority: priority as Task['priority'] || 'medium',
      status,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : null,
      created_by: user.id,
      assigned_to: user.id, // For now, assign to self
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(newTaskData)
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return { error: error.message }
    }

    return { task: data as Task }
  } catch (err) {
    console.error('Unexpected error in createTask:', err)
    return { error: 'An unexpected error occurred while creating the task' }
  }
}

export async function updateTaskDetails(taskId: string, formData: FormData) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // First get the workspace ID for this task
    const { data: taskData } = await supabase
      .from('tasks')
      .select('workspace_id')
      .eq('id', taskId)
      .single()

    if (!taskData?.workspace_id) return { error: 'Task not found' }

    // RBAC Check for Edit
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', taskData.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (member && member.role === 'member') {
      return { error: 'Members cannot edit tasks in this workspace.' }
    }

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const priority = formData.get('priority') as string
    const dueDate = formData.get('due_date') as string
    const estimatedDuration = formData.get('estimated_duration') as string
    const status = formData.get('status') as TaskStatus

    if (!title) return { error: 'Task title is required' }

    const updateData: Partial<Task> = {
      title,
      description: description || null,
      priority: priority as Task['priority'] || 'medium',
      status: status || 'todo',
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Error updating task details:', error)
      return { error: error.message }
    }

    return { task: data as Task }
  } catch (err) {
    console.error('Unexpected error in updateTaskDetails:', err)
    return { error: 'An unexpected error occurred while updating the task' }
  }
}

export async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (error) {
      console.error('Error updating task status:', error)
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error in updateTaskStatus:', err)
    return { error: 'An unexpected error occurred while updating task status' }
  }
}

export async function deleteTask(taskId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // First get the workspace ID for this task
    const { data: taskData } = await supabase
      .from('tasks')
      .select('workspace_id')
      .eq('id', taskId)
      .single()

    if (taskData?.workspace_id) {
       // RBAC Check
       const { data: member } = await supabase
         .from('workspace_members')
         .select('role')
         .eq('workspace_id', taskData.workspace_id)
         .eq('user_id', user.id)
         .single()

       if (member && member.role === 'member') {
         return { error: 'Members cannot delete tasks in this workspace.' }
       }
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting task:', error)
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error in deleteTask:', err)
    return { error: 'An unexpected error occurred while deleting the task' }
  }
}
