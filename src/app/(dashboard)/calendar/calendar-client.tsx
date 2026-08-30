'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { EditTaskDialog } from '@/components/kanban/edit-task-dialog'
import { updateTaskDetails } from '@/app/(dashboard)/kanban/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Task } from '@/types'

interface CalendarClientProps {
  tasks: Task[]
}

type ViewMode = 'month' | 'week' | 'day'

export function CalendarClient({ tasks: initialTasks }: CalendarClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const router = useRouter()

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
    if (view === 'month') setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    else if (view === 'week') {
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
    if (view === 'month') setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    else if (view === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 7)
      setCurrentDate(newDate)
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 1)
      setCurrentDate(newDate)
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // Necessary to allow dropping
  }

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: dateStr + 'T00:00:00Z' } : t))
    
    const formData = new FormData()
    formData.append('due_date', dateStr)
    const task = tasks.find(t => t.id === taskId)
    if (task) {
        formData.append('title', task.title)
        formData.append('status', task.status)
        formData.append('priority', task.priority)
    }
    
    const res = await updateTaskDetails(taskId, formData)
    if (res.error) {
      toast.error(res.error)
      setTasks(initialTasks) // Revert
    } else {
      toast.success('Task rescheduled')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => {
             if (!open) setSelectedTask(null)
             else router.refresh()
          }}
        />
      )}
      
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
                const d = new Date(currentYear, currentMonth, day)
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                const dayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr))
                const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth()

                return (
                  <div 
                    key={day} 
                    className={`bg-white dark:bg-slate-950 min-h-[120px] p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 relative border-t border-slate-200 dark:border-slate-800 ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, dateStr)}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-500'}`}>
                      {day}
                    </div>
                    <div className="space-y-1 mt-2">
                      {dayTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="truncate cursor-pointer"
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setSelectedTask(task)}
                        >
                          <Badge variant="outline" className={`w-full justify-start truncate text-xs ${task.status === 'completed' ? 'opacity-50 line-through' : ''} ${task.priority === 'high' || task.priority === 'urgent' ? 'border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-grab active:cursor-grabbing'}`} title={task.title}>
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

          {view === 'week' && (() => {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            
            const weekDays = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(startOfWeek);
              d.setDate(d.getDate() + i);
              return d;
            });

            return (
              <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 h-[600px]">
                {weekDays.map((date, i) => {
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const dayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr));
                  const isToday = date.toDateString() === new Date().toDateString();
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                  return (
                    <div 
                      key={i} 
                      className={`bg-white dark:bg-slate-950 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 flex flex-col ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dateStr)}
                    >
                      <div className="text-center pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{dayNames[i]}</div>
                        <div className={`text-lg font-bold mt-1 inline-flex items-center justify-center ${isToday ? 'bg-indigo-600 text-white w-8 h-8 rounded-full' : 'text-slate-700 dark:text-slate-300'}`}>
                          {date.getDate()}
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {dayTasks.map(task => (
                          <div 
                            key={task.id} 
                            className="cursor-pointer"
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => setSelectedTask(task)}
                          >
                            <Badge variant="outline" className={`w-full justify-start text-xs p-2 whitespace-normal h-auto ${task.status === 'completed' ? 'opacity-50 line-through' : ''} ${task.priority === 'high' || task.priority === 'urgent' ? 'border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-colors cursor-grab active:cursor-grabbing'}`} title={task.title}>
                              {task.title}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {view === 'day' && (() => {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            const dayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr));
            const isToday = currentDate.toDateString() === new Date().toDateString();

            return (
              <div className="max-w-3xl mx-auto bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 min-h-[500px] flex flex-col shadow-sm overflow-hidden">
                <div className={`p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''}`}>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {currentDate.toLocaleDateString('default', { weekday: 'long' })}
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">
                      {currentDate.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-full text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'}
                  </div>
                </div>
                <div className="p-6 flex-1 bg-slate-50/50 dark:bg-slate-900/20">
                  <div className="space-y-3">
                    {dayTasks.length > 0 ? dayTasks.map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)}
                        className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between ${task.status === 'completed' ? 'opacity-60 border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className={`font-semibold text-base ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                            {task.title}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-3 flex items-center justify-center">
                          <span className="text-xl">📅</span>
                        </div>
                        <p>No tasks scheduled for this day</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  )
}
