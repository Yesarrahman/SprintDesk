import { CheckCircle2, Clock, ListTodo, TrendingUp, Calendar as CalendarIcon, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchDashboardMetrics } from './actions'
import { createClient } from '@/lib/supabase/server'
import { CreateTaskDialog } from '@/components/kanban/create-task-dialog'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { metrics } = await fetchDashboardMetrics()

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Good morning, {userName}
          </h1>
          <p className="text-slate-500 mt-1">Here&apos;s your productivity overview for today.</p>
        </div>
        <CreateTaskDialog />
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
            <div className="text-3xl font-bold text-slate-900 dark:text-white">--</div>
            <p className="text-xs text-slate-500 mt-1">
              Requires more velocity data
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
            <CardContent className="flex-1 flex items-center justify-center">
              {/* Recharts placeholder */}
              <div className="flex flex-col items-center text-slate-400">
                <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
                <p>Chart data will populate as you complete more tasks</p>
              </div>
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
    </div>
  )
}
