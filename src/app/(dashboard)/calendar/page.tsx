import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function CalendarPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase.from('tasks').select('*')
  if (activeWorkspaceId) {
    query = query.eq('workspace_id', activeWorkspaceId)
  }

  const { data: tasks, error } = await query

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Calendar</h1>

      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <CardHeader>
          <CardTitle>
            {today.toLocaleString('default', { month: 'long' })} {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500">Failed to load calendar data.</p>}
          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="bg-slate-50 dark:bg-slate-900/50 p-2 text-center text-sm font-medium text-slate-500">
                {day}
              </div>
            ))}
            
            {/* Empty Days */}
            {emptyDays.map((i) => (
              <div key={`empty-${i}`} className="bg-white dark:bg-slate-950 min-h-[120px] p-2 opacity-50" />
            ))}

            {/* Actual Days */}
            {days.map((day) => {
              const dateStr = new Date(currentYear, currentMonth, day).toISOString().split('T')[0]
              
              // Find tasks due on this day
              const dayTasks = tasks?.filter(t => t.due_date && t.due_date.startsWith(dateStr)) || []
              
              const isToday = day === today.getDate()

              return (
                <div key={day} className={`bg-white dark:bg-slate-950 min-h-[120px] p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 relative border-t border-slate-200 dark:border-slate-800 ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}>
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-500'}`}>
                    {day}
                  </div>
                  <div className="space-y-1 mt-2">
                    {dayTasks.map(task => (
                      <div key={task.id} className="truncate">
                        <Badge variant="outline" className={`w-full justify-start truncate text-xs ${task.status === 'completed' ? 'opacity-50 line-through' : ''} ${task.priority === 'high' || task.priority === 'urgent' ? 'border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-white dark:bg-slate-900'}`} title={task.title}>
                          {task.title}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
