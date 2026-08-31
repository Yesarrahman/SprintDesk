const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/kanban/actions.ts', 'utf8');
code = code.replace(/export async function updateTaskStatus[\s\S]*?export async function updateTaskOrder/g, `export async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
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

export async function updateTaskOrder`);
fs.writeFileSync('src/app/(dashboard)/kanban/actions.ts', code);
