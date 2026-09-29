import { fetchTasks, fetchKanbanColumns, fetchTeamMembers } from './actions'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { CreateTaskDialog } from '@/components/kanban/create-task-dialog'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import KanbanActions from '@/components/kanban/kanban-actions'

export const dynamic = 'force-dynamic'

export default async function KanbanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  let activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  let role = 'owner'
  let isPersonal = false
  let isPaid = false
  let workspaceName = 'Workspace'
  
  if (user) {
    const adminClient = await createAdminClient()

    if (!activeWorkspaceId) {
      // Default to personal workspace ('My Workspace' owned by user)
      const { data: ownedWs } = await adminClient
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .eq('name', 'My Workspace')
        .limit(1)

      if (ownedWs && ownedWs.length > 0) {
        activeWorkspaceId = ownedWs[0].id
      }
    }

    if (activeWorkspaceId) {
      // Run member check, workspace info, and profile check in parallel
      const [memberResult, wsResult, profileResult] = await Promise.all([
        supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', activeWorkspaceId)
          .eq('user_id', user.id)
          .single(),
        adminClient
          .from('workspaces')
          .select('name, owner_id, tier, stripe_subscription_id')
          .eq('id', activeWorkspaceId)
          .single(),
        adminClient
          .from('profiles')
          .select('subscription_tier, stripe_subscription_id')
          .eq('id', user.id)
          .single(),
      ])

      if (memberResult.data) role = memberResult.data.role

      const ws = wsResult.data
      const profile = profileResult.data

      if (
        (profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'agency') && !!profile?.stripe_subscription_id ||
        (ws?.tier === 'pro' || ws?.tier === 'agency') && !!ws?.stripe_subscription_id
      ) {
        isPaid = true
      }

      if (ws) {
        workspaceName = ws.name
        if (ws.name === 'My Workspace' && ws.owner_id === user.id) {
          isPersonal = true
        }
      }
    }
  }
  // Run tasks, columns, and team members in parallel
  const [tasksResult, columnsResult, membersResult] = await Promise.all([
    fetchTasks(),
    activeWorkspaceId ? fetchKanbanColumns(activeWorkspaceId, isPersonal) : Promise.resolve({ columns: [] }),
    !isPersonal ? fetchTeamMembers() : Promise.resolve({ members: [] }),
  ])

  const { tasks, error } = tasksResult
  const { columns } = columnsResult
  const { members } = membersResult

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
      
      <KanbanBoard 
        initialTasks={(tasks || []).map((t: any) => ({
          ...t,
          comments_count: t.comments?.[0]?.count || 0,
          subtasks_count: t.subtasks?.length || 0,
          completed_subtasks: t.subtasks?.filter((s: any) => s.completed)?.length || 0
        }))} 
        initialColumns={columns || []} 
        teamMembers={members || []}
        role={role} 
        workspaceId={activeWorkspaceId!} 
        isPersonal={isPersonal} 
        isPaid={isPaid}
      />
    </div>
  )
}
