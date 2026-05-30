'use client'

import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import type { Task, TaskStatus } from '@/types'
import { TaskCard } from './task-card'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  column: {
    id: TaskStatus
    title: string
  }
  tasks: Task[]
  role?: string
  onDeleteTask?: (taskId: string) => void
  onMoveTask?: (taskId: string, newStatus: TaskStatus) => void
}

const statusColors = {
  todo: 'border-slate-200 dark:border-slate-800 bg-slate-500',
  in_progress: 'border-blue-200 dark:border-blue-900 bg-blue-500',
  in_review: 'border-amber-200 dark:border-amber-900 bg-amber-500',
  completed: 'border-emerald-200 dark:border-emerald-900 bg-emerald-500',
  cancelled: 'border-red-200 dark:border-red-900 bg-red-500',
  archived: 'border-slate-200 dark:border-slate-800 bg-slate-400',
}

export function KanbanColumn({ column, tasks, role = 'owner', onDeleteTask, onMoveTask }: KanbanColumnProps) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-[350px] shrink-0 rounded-2xl border bg-slate-100/50 dark:bg-[#0D2440]/40 backdrop-blur-2xl shadow-sm transition-all duration-300',
        isOver ? 'bg-slate-200/50 dark:bg-[#0D2440]/60 border-primary/50 dark:border-primary/50 shadow-primary/20 shadow-md' : 'border-slate-200/50 dark:border-slate-700/50'
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[column.id])} />
          <h3 className="font-semibold text-slate-700 dark:text-slate-300">
            {column.title}
          </h3>
        </div>
        <div className="flex items-center justify-center bg-slate-200 dark:bg-slate-800 rounded-full h-6 px-2.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          {tasks.length}
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 min-h-[150px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} role={role} onDelete={onDeleteTask} onMove={onMoveTask} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="h-full flex items-center justify-center">
             <p className="text-sm text-slate-400 italic">No tasks here</p>
          </div>
        )}
      </div>
    </div>
  )
}
