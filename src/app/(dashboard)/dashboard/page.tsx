import { CheckCircle2, Clock, ListTodo, TrendingUp, Calendar as CalendarIcon, ArrowRight, AlertTriangle, Activity, Users, KanbanSquare } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchDashboardMetrics } from './actions'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { CreateTaskDialog } from '@/components/kanban/create-task-dialog'
import { DashboardChart } from './dashboard-chart'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { metrics } = await fetchDashboardMetrics()
  
  // Fetch inbox items for Triage Widget
  const { data: inboxItems } = await supabase.from('inbox_items').select('*').eq('user_id', user?.id || '').order('created_at', { ascending: false }).limit(5)
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value
  let isPersonal = false
  let workspaceName = 'Workspace'
  
  // Team dashboard data
  let teamWorkload: any[] = []
  let totalTasks = 0
  let completedTasks = 0
  let urgentBlockers = 0
  let upcomingTeamTasks: any[] = []
  let recentActivity: any[] = []
  
  if (user && activeWorkspaceId) {
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
    
    if (!isPersonal) {
      // Fetch all tasks for this team workspace
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, assigned_to, completed_at, updated_at, profiles:assigned_to(full_name)')
        .eq('workspace_id', activeWorkspaceId)
        .order('updated_at', { ascending: false })

      if (tasksData) {
        totalTasks = tasksData.length
        completedTasks = tasksData.filter(t => t.status === 'completed').length
        urgentBlockers = tasksData.filter(t => t.priority === 'urgent' && t.status !== 'completed' && t.status !== 'cancelled').length
        
        // Team workload
        const workloadMap: Record<string, { name: string, active: number, completed: number }> = {}
        tasksData.forEach(t => {
          const assignee = t.assigned_to || 'unassigned'
          const name = (t.profiles as any)?.full_name || (Array.isArray(t.profiles) ? (t.profiles as any)[0]?.full_name : null) || (assignee === 'unassigned' ? 'Unassigned' : 'User')
          if (!workloadMap[assignee]) workloadMap[assignee] = { name, active: 0, completed: 0 }
          if (t.status === 'completed') workloadMap[assignee].completed++
          else if (t.status !== 'cancelled' && t.status !== 'archived') workloadMap[assignee].active++
        })
        teamWorkload = Object.values(workloadMap).sort((a, b) => b.active - a.active)
        
        // Upcoming deadlines for this workspace
        const now = new Date()
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        upcomingTeamTasks = tasksData
          .filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= nextWeek && t.status !== 'completed')
          .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
          .slice(0, 5)
        
        // Recent activity (last 5 updated tasks)
        recentActivity = tasksData.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assignee: (t.profiles as any)?.full_name || (Array.isArray(t.profiles) ? (t.profiles as any)[0]?.full_name : null) || 'Someone',
          updated_at: t.updated_at,
        }))
      }
    }
  }

  const hour = new Date().getHours()
  let greeting = 'Good evening'
  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning'
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon'
  }

  // ──────────────────────────────────────────────
  // TEAM DASHBOARD
  // ──────────────────────────────────────────────
  if (!isPersonal) {
    const sprintProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-10">
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              {workspaceName}
            </h1>
            <p className="text-slate-500 mt-1 flex items-center gap-4">
              <span>Team Command Center</span>
              
              {/* Avatar Group */}
              {metrics?.teamMembers && metrics.teamMembers.length > 0 && (
                <span className="flex items-center -space-x-2">
                  {metrics.teamMembers.slice(0, 5).map((member: any, i: number) => (
                    <Avatar
                      key={member.id}
                      className="h-7 w-7 border-2 border-white dark:border-slate-950 ring-0"
                      style={{ zIndex: 10 - i }}
                      title={member.full_name || 'Team member'}
                    >
                      <AvatarImage src={member.avatar_url || ''} alt={member.full_name || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-bold">
                        {member.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {metrics.teamMembers.length > 5 && (
                    <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-950 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 z-0">
                      +{metrics.teamMembers.length - 5}
                    </div>
                  )}
                  <span className="ml-3 text-xs text-slate-400">
                    {metrics.teamMembers.length} member{metrics.teamMembers.length !== 1 ? 's' : ''}
                  </span>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/kanban" className={buttonVariants({ variant: "outline" })}>
              <KanbanSquare className="h-4 w-4 mr-2" /> Go to Sprint Board
            </Link>
            <CreateTaskDialog isPersonal={false} />
          </div>
        </div>

        {/* Top Row: Sprint Progress, Velocity, Blockers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sprint Progress */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Sprint Progress</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{sprintProgress}%</div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 mt-3">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${sprintProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">{completedTasks} of {totalTasks} tasks completed</p>
            </CardContent>
          </Card>

          {/* Team Velocity */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Team Velocity</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{completedTasks}</div>
              <p className="text-xs text-slate-500 mt-1">Tasks completed this sprint</p>
            </CardContent>
          </Card>

          {/* Open Blockers */}
          <Card className={`backdrop-blur-xl border-white/20 shadow-xl shadow-slate-200/20 dark:shadow-none ${urgentBlockers > 0 ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'bg-white/60 dark:bg-slate-900/60 dark:border-slate-800'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Open Blockers</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${urgentBlockers > 0 ? 'text-red-500' : 'text-slate-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${urgentBlockers > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{urgentBlockers}</div>
              <p className="text-xs text-slate-500 mt-1">{urgentBlockers > 0 ? 'Urgent tasks need attention!' : 'No blockers. Smooth sailing!'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row: Team Workload + Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Workload */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none h-80 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-indigo-500" /> Team Workload</CardTitle>
              <CardDescription>Active vs Completed tasks by team member</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {teamWorkload.length > 0 ? (
                teamWorkload.map((member, idx) => {
                  const total = member.active + member.completed
                  const completionPct = total > 0 ? Math.round((member.completed / total) * 100) : 0
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{member.name}</span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">{member.active} active</span>
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">{member.completed} done</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${completionPct}%` }} />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  No team members with tasks yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none h-80 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-purple-500" /> Recent Activity</CardTitle>
              <CardDescription>Latest updates in this workspace</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((item) => {
                  const statusColors: Record<string, string> = {
                    'completed': 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30',
                    'in_progress': 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30',
                    'in_review': 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30',
                    'todo': 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-800',
                    'backlog': 'text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-800',
                  }
                  return (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="mt-0.5 rounded-full p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <Activity className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[item.status] || 'text-slate-500 bg-slate-50'}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-400">by {item.assignee}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  No recent activity yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Upcoming Deadlines */}
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>Tasks due in the next 7 days</CardDescription>
            </div>
            <Link href="/calendar" className={buttonVariants({ variant: "ghost", size: "icon" })}>
              <CalendarIcon className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingTeamTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingTeamTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="mt-0.5 rounded-full p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{task.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      {((task.profiles as any)?.full_name || (Array.isArray(task.profiles) ? (task.profiles as any)[0]?.full_name : null)) && (
                        <p className="text-xs text-indigo-500 mt-0.5">
                          {(task.profiles as any)?.full_name || (Array.isArray(task.profiles) ? (task.profiles as any)[0]?.full_name : null)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-slate-500">No upcoming deadlines this week. 🎉</div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ──────────────────────────────────────────────
  // PERSONAL DASHBOARD (unchanged)
  // ──────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            {greeting}, {userName}
          </h1>
          <p className="text-slate-500 mt-1">Here&apos;s your productivity overview for today.</p>
        </div>
        <CreateTaskDialog isPersonal={isPersonal} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat Cards */}
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Tasks Due Today</CardTitle>
            <ListTodo className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{metrics?.dueToday || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              {metrics?.highPriorityDueToday ? (
                <span className="text-red-500 font-medium">{metrics.highPriorityDueToday} high priority</span>
              ) : (
                <span>No high priority tasks</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{metrics?.completed || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              {metrics?.completedToday || 0} completed today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Est. Finish Time</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
               {metrics?.estimatedFinishDate ? new Date(metrics.estimatedFinishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {metrics?.estimatedFinishDate ? 'Based on recent velocity' : 'Requires more velocity data'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Productivity</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{metrics?.productivity || 0}%</div>
            <p className="text-xs text-slate-500 mt-1">
              Overall completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none h-96 flex flex-col">
            <CardHeader>
              <CardTitle>Productivity Trends</CardTitle>
              <CardDescription>Tasks completed over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-0">
               {metrics?.trends && metrics.trends.some((t: any) => t.completed > 0) ? (
                 <DashboardChart data={metrics.trends} />
               ) : (
                 <div className="flex flex-col items-center text-slate-400">
                   <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
                   <p>Chart data will populate as you complete more tasks</p>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none h-96 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Upcoming</CardTitle>
                <CardDescription>Next deadlines</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 overflow-y-auto">
              {metrics?.upcoming && metrics.upcoming.length > 0 ? (
                metrics.upcoming.map((task: { id: string; title: string; due_date: string }) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                    <div className="mt-0.5 rounded-full p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{task.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Due {new Date(task.due_date).toISOString().split('T')[0]}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 text-sm text-slate-500">
                  No upcoming tasks
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inbox Triage Widget */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none h-80 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inbox Triage</CardTitle>
            <CardDescription>Unprocessed ideas and notes</CardDescription>
          </div>
          <Link href="/inbox" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-3">
           {inboxItems && inboxItems.length > 0 ? (
              inboxItems.map((item: any) => (
                <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-sm">
                  {item.content}
                </div>
              ))
           ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Inbox is empty. Great job!
              </div>
           )}
        </CardContent>
      </Card>
    </div>
  )
}
