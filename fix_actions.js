const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/kanban/actions.ts', 'utf8');

// Find the index of "export async function updateTaskStatus"
const startIndex = code.indexOf('export async function updateTaskStatus');

const before = code.substring(0, startIndex);
// Find deleteTask
const deleteIndex = code.indexOf('export async function deleteTask');
const after = code.substring(deleteIndex);

const correctFunctions = `export async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
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
      executeAutomations(data.workspace_id, taskId, 'status_changed', newStatus)
    }

    if (newStatus === 'completed') {
       processRecurringTask(taskId)
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

`;

fs.writeFileSync('src/app/(dashboard)/kanban/actions.ts', before + correctFunctions + after);
