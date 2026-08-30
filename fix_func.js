const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/kanban/actions.ts', 'utf8');

const regex = /export async function updateTaskStatus\(taskId: string, newStatus: TaskStatus\) \{([\s\S]*?)\}\n\nexport async function updateTaskOrder/;

const newFunc = `export async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
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

    if (newStatus === 'completed') {
       processRecurringTask(taskId)
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error in updateTaskStatus:', err)
    return { error: 'An unexpected error occurred while updating task status' }
  }
}

export async function updateTaskOrder`;

content = content.replace(regex, newFunc);
fs.writeFileSync('src/app/(dashboard)/kanban/actions.ts', content);
