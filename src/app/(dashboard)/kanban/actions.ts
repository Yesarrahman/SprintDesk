'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { Task, TaskStatus } from '@/types'

async function executeAutomations(workspaceId: string, taskId: string, triggerType: string, triggerValue: string) {
  try {
    const supabase = await createClient()
    const { data: automations } = await supabase
      .from('automations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .eq('trigger_type', triggerType)
      .eq('trigger_value', triggerValue)

    if (automations && automations.length > 0) {
      for (const rule of automations) {
        if (rule.action_type === 'assign_to') {
          await supabase.from('tasks').update({ assigned_to: rule.action_value === 'unassigned' ? null : rule.action_value }).eq('id', taskId)
        } else if (rule.action_type === 'set_priority') {
          await supabase.from('tasks').update({ priority: rule.action_value }).eq('id', taskId)
        }
      }
    }
  } catch (error) {
    console.error('Automation engine error:', error)
  }
}

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
        ),
        comments:task_comments(count),
        subtasks(id, completed)
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
      const adminClient = await createAdminClient()
      const { data: workspaces, error: wsFetchError } = await adminClient
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
          const { error: wsError } = await adminClient.from('workspaces').insert({ id: newWorkspaceId, name: 'My Workspace', owner_id: user.id })
          
          if (wsError) {
            console.error('Error creating workspace:', wsError)
            return { error: 'Failed to create a new workspace' }
          }
          
          workspaceId = newWorkspaceId
          const { error: wmError } = await adminClient.from('workspace_members').insert({ workspace_id: workspaceId, user_id: user.id, role: 'owner' })
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
    const adminClient = await createAdminClient()
    const { data: member } = await adminClient
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
    const storyPoints = formData.get('story_points') as string
    const status = formData.get('status') as TaskStatus || 'todo'
    const assignedTo = formData.get('assigned_to') as string

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
      story_points: storyPoints ? parseInt(storyPoints) : null,
      created_by: user.id,
      assigned_to: assignedTo === 'unassigned' ? null : (assignedTo || user.id),
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
      .select('workspace_id, status')
      .eq('id', taskId)
      .single()

    if (!taskData?.workspace_id) return { error: 'Task not found' }

    // RBAC Check for Edit
    const adminClient = await createAdminClient()
    const { data: member } = await adminClient
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
    const assignedTo = formData.get('assigned_to') as string

    if (!title) return { error: 'Task title is required' }

    const updateData: Partial<Task> & { started_at?: string | null, completed_at?: string | null } = {
      title,
      description: description || null,
      priority: priority as Task['priority'] || 'medium',
      status: status || 'todo',
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : null,
      updated_at: new Date().toISOString(),
    }

    if (status === 'in_progress' && taskData.status !== 'in_progress') {
       updateData.started_at = new Date().toISOString()
    } else if (status === 'completed' && taskData.status !== 'completed') {
       updateData.completed_at = new Date().toISOString()
    }

    if (assignedTo === 'unassigned') {
      updateData.assigned_to = null
    } else if (assignedTo) {
      updateData.assigned_to = assignedTo
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
    
    if (status !== taskData.status) {
      executeAutomations(taskData.workspace_id, taskId, 'status_changed', status)
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

    const updateData: any = { status: newStatus }
    if (newStatus === 'in_progress') updateData.started_at = new Date().toISOString()
    if (newStatus === 'completed') updateData.completed_at = new Date().toISOString()

    const { error, data } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select('workspace_id')
      .single()

    if (error) {
      console.error('Error updating task status:', error)
      return { error: error.message }
    }

    if (data?.workspace_id) {
      // Fire and forget automation engine
      executeAutomations(data.workspace_id, taskId, 'status_changed', newStatus)
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error in updateTaskStatus:', err)
    return { error: 'An unexpected error occurred while updating task status' }
  }
}

export async function updateTaskOrder(updates: { id: string; sort_order: number; status: TaskStatus }[]) {
  try {
    const supabase = await createClient()

    for (const update of updates) {
      const updateData: any = { sort_order: update.sort_order, status: update.status }
      if (update.status === 'in_progress') updateData.started_at = new Date().toISOString()
      if (update.status === 'completed') updateData.completed_at = new Date().toISOString()
      
      const { error, data } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', update.id)
        .select('workspace_id')
        .single()
        
      if (data?.workspace_id) {
         executeAutomations(data.workspace_id, update.id, 'status_changed', update.status)
      }
        
      if (error) {
        console.error('Error updating task order:', error)
        return { error: error.message }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error in updateTaskOrder:', err)
    return { error: 'An unexpected error occurred while updating task order' }
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
       const adminClient = await createAdminClient()
       const { data: member } = await adminClient
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

export async function fetchKanbanColumns(workspaceId: string, isPersonal: boolean = false) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    let query = supabase.from('kanban_columns').select('*').eq('workspace_id', workspaceId).order('order_index', { ascending: true })
    if (isPersonal && user) {
        query = query.eq('user_id', user.id)
    }

    const { data, error } = await query
    if (error) return { error: error.message }
    return { columns: data }
  } catch (err) {
    return { error: 'Failed to fetch columns' }
  }
}

export async function createKanbanColumn(workspaceId: string, title: string, orderIndex: number, isPersonal: boolean = false) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('kanban_columns')
      .insert({
        workspace_id: workspaceId,
        user_id: isPersonal && user ? user.id : null,
        title,
        order_index: orderIndex
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { column: data }
  } catch (err) {
    return { error: 'Failed to create column' }
  }
}

export async function updateColumnOrder(updates: { id: string; order_index: number }[]) {
  try {
    const supabase = await createClient()
    for (const update of updates) {
      await supabase.from('kanban_columns').update({ order_index: update.order_index }).eq('id', update.id)
    }
    return { success: true }
  } catch (err) {
    return { error: 'Failed to update column order' }
  }
}

export async function fetchTeamMembers() {
  try {
    const cookieStore = await cookies()
    const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value
    if (!activeWorkspaceId) return { members: [] }
    const adminClient = await createAdminClient()
    const { data } = await adminClient
      .from('workspace_members')
      .select('user_id, profiles(full_name)')
      .eq('workspace_id', activeWorkspaceId)
    
    const members = (data || []).map(m => ({
      user_id: m.user_id,
      // @ts-expect-error: Joined column
      full_name: m.profiles?.full_name || 'User'
    }))
    
    return { members }
  } catch (err) {
    return { members: [] }
  }
}
export async function fetchTaskComments(taskId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('task_comments')
      .select('*, profiles:user_id(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    if (error) return { error: error.message }
    return { comments: data }
  } catch (err) {
    return { error: 'Failed to fetch comments' }
  }
}

export async function addTaskComment(taskId: string, content: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ task_id: taskId, user_id: user.id, content })
      .select('*, profiles:user_id(full_name)')
      .single()
      
    if (error) return { error: error.message }
    return { comment: data }
  } catch (err) {
    return { error: 'Failed to add comment' }
  }
}

export async function addSubtask(taskId: string, title: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('subtasks').insert({ task_id: taskId, title }).select().single()
    if (error) return { error: error.message }
    return { subtask: data }
  } catch (err) { return { error: 'Failed' } }
}

export async function updateSubtask(subtaskId: string, completed: boolean) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('subtasks').update({ completed }).eq('id', subtaskId).select().single()
    if (error) return { error: error.message }
    return { subtask: data }
  } catch (err) { return { error: 'Failed' } }
}

export async function deleteSubtask(subtaskId: string) {
  try {
    const supabase = await createClient()
    await supabase.from('subtasks').delete().eq('id', subtaskId)
    return { success: true }
  } catch (err) { return { error: 'Failed' } }
}

export async function fetchSubtasks(taskId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('subtasks').select('*').eq('task_id', taskId).order('created_at', { ascending: true })
    if (error) return { error: error.message }
    return { subtasks: data }
  } catch (err) { return { error: 'Failed' } }
}

export async function fetchLinkedTasks(taskId: string) {
  try {
    const supabase = await createClient()
    const { data: targets, error: e1 } = await supabase.from('linked_tasks').select('id, relation_type, target_task_id, tasks!target_task_id(title, status, workspace_id, workspaces(name))').eq('source_task_id', taskId)
    const { data: sources, error: e2 } = await supabase.from('linked_tasks').select('id, relation_type, source_task_id, tasks!source_task_id(title, status, workspace_id, workspaces(name))').eq('target_task_id', taskId)
    if (e1 || e2) return { error: 'Error fetching linked tasks' }
    const links = [
      ...(targets || []).map(t => ({ id: t.id, relation: t.relation_type, linked_task: t.tasks })),
      ...(sources || []).map(s => ({ id: s.id, relation: 'is ' + s.relation_type + ' by', linked_task: s.tasks }))
    ]
    return { links }
  } catch (err) { return { error: 'Failed' } }
}

export async function addLinkedTask(sourceTaskId: string, targetTaskId: string, relationType: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('linked_tasks').insert({ source_task_id: sourceTaskId, target_task_id: targetTaskId, relation_type: relationType }).select().single()
    if (error) return { error: error.message }
    return { link: data }
  } catch (err) { return { error: 'Failed' } }
}
