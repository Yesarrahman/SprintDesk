import { fetchTasks } from './actions'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { CreateTaskDialog } from '@/components/kanban/create-task-dialog'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import KanbanActions from '@/components/kanban/kanban-actions'

export default async function KanbanPage() {
  const { tasks, error } = await fetchTasks()
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  let role = 'owner'
  let isPersonal = false
  let workspaceName = 'Workspace'
  
  if (user && activeWorkspaceId) {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', activeWorkspaceId)
      .eq('user_id', user.id)
      .single()
      
    if (member) role = member.role
    
    // Check if it's the personal workspace (named "My Workspace" and owned by user)
    // We use adminClient because of the RLS recursion bug on the workspaces table
    const adminClient = await createAdminClient()
    const { data: ws } = await adminClient
      .from('workspaces')
      .select('name, owner_id')
      .eq('id', activeWorkspaceId)
      .single()
      
    if (ws) {
      workspaceName = ws.name
      if (ws.name === 'My Workspace' && ws.owner_id === user.id) {
        isPersonal = true
      }
    }
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-500">Failed to load tasks: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            {isPersonal ? 'Personal Space' : workspaceName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isPersonal ? 'Manage your personal tasks and projects' : 'Manage your team workflow'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {!isPersonal && <KanbanActions role={role} workspaceId={activeWorkspaceId!} />}
          {role !== 'member' && <CreateTaskDialog isPersonal={isPersonal} />}
        </div>
      </div>
      
      <KanbanBoard initialTasks={tasks || []} role={role} workspaceId={activeWorkspaceId!} isPersonal={isPersonal} />
    </div>
  )
}
