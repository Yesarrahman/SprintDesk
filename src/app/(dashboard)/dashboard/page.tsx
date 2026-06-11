import { CheckCircle2, Clock, ListTodo, TrendingUp, Calendar as CalendarIcon, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchDashboardMetrics } from './actions'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { CreateTaskDialog } from '@/components/kanban/create-task-dialog'
import { DashboardChart } from './dashboard-chart'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { metrics } = await fetchDashboardMetrics()
  
  // Fetch inbox items for Triage Widget
  const { data: inboxItems } = await supabase.from('inbox_items').select('*').eq('user_id', user?.id || '').order('created_at', { ascending: false }).limit(5)
  
  // Fetch team workload if not personal
  let teamWorkload: any[] = []

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value
  let isPersonal = false
  
  if (user && activeWorkspaceId) {
    const adminClient = await createAdminClient()
    const { data: ws } = await adminClient
      .from('workspaces')
      .select('name, owner_id')
      .eq('id', activeWorkspaceId)
      .single()
      
    if (ws && ws.name === 'My Workspace' && ws.owner_id === user.id) {
      isPersonal = true
    }
    
    if (!isPersonal) {
       const { data: tasksData } = await supabase.from('tasks').select('assigned_to, status, profiles(full_name)').eq('workspace_id', activeWorkspaceId)
       if (tasksData) {
         const workloadMap: Record<string, { name: string, active: number, completed: number }> = {}
         tasksData.forEach(t => {
           const assignee = t.assigned_to || 'unassigned'
           const name = t.profiles?.full_name || (assignee === 'unassigned' ? 'Unassigned' : 'User')
           if (!workloadMap[assignee]) workloadMap[assignee] = { name, active: 0, completed: 0 }
           if (t.status === 'completed') workloadMap[assignee].completed++
           else if (t.status !== 'cancelled' && t.status !== 'archived') workloadMap[assignee].active++
         })
         teamWorkload = Object.values(workloadMap).sort((a, b) => b.active - a.active)
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
              Total completed tasks
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inbox Triage Widget */}
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none h-80 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Inbox Triage</CardTitle>
              <CardDescription>Unprocessed ideas and notes</CardDescription>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <a href="/inbox"><ArrowRight className="h-4 w-4" /></a>
            </Button>
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

        {/* Team Workload Widget */}
        {!isPersonal && (
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none h-80 flex flex-col">
            <CardHeader>
              <CardTitle>Team Workload</CardTitle>
              <CardDescription>Active vs Completed tasks by team member</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
               {teamWorkload.length > 0 ? (
                 teamWorkload.map((member, idx) => (
                   <div key={idx} className="flex items-center justify-between">
                     <span className="text-sm font-medium">{member.name}</span>
                     <div className="flex gap-3 text-xs">
                       <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">{member.active} active</span>
                       <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">{member.completed} done</span>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                   No team workload data available.
                 </div>
               )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
