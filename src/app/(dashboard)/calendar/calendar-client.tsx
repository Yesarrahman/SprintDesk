'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task } from '@/types'

interface CalendarClientProps {
  tasks: Task[]
}

type ViewMode = 'month' | 'week' | 'day'

export function CalendarClient({ tasks }: CalendarClientProps) {
  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  const handlePrev = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    } else if (view === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() - 7)
      setCurrentDate(newDate)
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() - 1)
      setCurrentDate(newDate)
    }
  }

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    } else if (view === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 7)
      setCurrentDate(newDate)
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 1)
      setCurrentDate(newDate)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'month' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'week' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Week
          </button>
          <button
            onClick={() => setView('day')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'day' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Day
          </button>
        </div>
      </div>

      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={() => setCurrentDate(new Date())}>Today</Button>
          </div>
          <CardTitle className="text-xl">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            {view === 'day' && `, ${currentDate.getDate()}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {view === 'month' && (
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-slate-50 dark:bg-slate-900/50 p-2 text-center text-sm font-medium text-slate-500">
                  {day}
                </div>
              ))}
              {emptyDays.map((i) => (
                <div key={`empty-${i}`} className="bg-white dark:bg-slate-950 min-h-[120px] p-2 opacity-50" />
              ))}
              {days.map((day) => {
                const dateStr = new Date(currentYear, currentMonth, day).toISOString().split('T')[0]
                const dayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr))
                const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth()

                return (
                  <div key={day} className={`bg-white dark:bg-slate-950 min-h-[120px] p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 relative border-t border-slate-200 dark:border-slate-800 ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}>
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-500'}`}>
                      {day}
                    </div>
                    <div className="space-y-1 mt-2">
                      {dayTasks.map(task => (
                        <div key={task.id} className="truncate cursor-pointer">
                          <Badge variant="outline" className={`w-full justify-start truncate text-xs ${task.status === 'completed' ? 'opacity-50 line-through' : ''} ${task.priority === 'high' || task.priority === 'urgent' ? 'border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'}`} title={task.title}>
                            {task.title}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {view === 'week' && (
             <div className="text-center py-20 text-slate-500">
                <p className="text-lg">Week View (Coming Soon)</p>
                <p className="text-sm">Drag and drop scheduling will be available here.</p>
             </div>
          )}

          {view === 'day' && (
             <div className="text-center py-20 text-slate-500">
                <p className="text-lg">Day View (Time Blocking Coming Soon)</p>
                <p className="text-sm">Drag tasks onto specific hours to block time.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
