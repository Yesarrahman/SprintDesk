'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, MoreHorizontal, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'

import type { Task, TaskStatus } from '@/types'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditTaskDialog } from './edit-task-dialog'

interface TaskWithProfile extends Task {
  profiles?: { full_name: string | null }
}

interface TaskCardProps {
  task: TaskWithProfile
  role?: string
  onDelete?: (taskId: string) => void
  onMove?: (taskId: string, newStatus: TaskStatus) => void
  isPersonal?: boolean
}

const priorityBgColors = {
  low: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
  medium: 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400',
  high: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400',
  urgent: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
}

export function TaskCard({ task, role = 'owner', onDelete, onMove, isPersonal = false }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  })

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const assigneeName = task.profiles?.full_name || 'User'
  const initials = assigneeName.charAt(0).toUpperCase()

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 border-2 border-dashed border-primary/50 rounded-xl h-[120px] bg-slate-50 dark:bg-slate-900 cursor-grabbing"
      />
    )
  }

  return (
    <>
      <EditTaskDialog task={task} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} isPersonal={isPersonal} />
      <motion.div
        layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (e.defaultPrevented) return;
        setIsEditDialogOpen(true);
      }}
      className={cn(
        'group p-4 bg-white/50 dark:bg-[#0D2440]/60 backdrop-blur-xl rounded-xl border border-white/60 dark:border-slate-700/50 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(46,94,153,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer',
        'hover:border-primary/40 dark:hover:border-primary/40'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2 items-center">
          <span
            className={cn(
              'text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full',
              priorityBgColors[task.priority]
            )}
          >
            {task.priority}
          </span>
        </div>
        
        {/* We stop propagation here so dropdown click doesn't trigger drag */}
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <div className="px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Actions</div>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditDialogOpen(true); }}>
                Edit Task
              </DropdownMenuItem>
              {/* Other dropdown items requested by user */}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditDialogOpen(true); }}>
                Change Due Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditDialogOpen(true); }}>
                Change Assignee
              </DropdownMenuItem>
              
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-1" />
              <div className="px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Move to</div>
              {task.status !== 'backlog' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove?.(task.id, 'backlog'); }}>
                  Backlog
                </DropdownMenuItem>
              )}
              {task.status !== 'todo' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove?.(task.id, 'todo'); }}>
                  To Do
                </DropdownMenuItem>
              )}
              {task.status !== 'in_progress' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove?.(task.id, 'in_progress'); }}>
                  In Progress
                </DropdownMenuItem>
              )}
              {!isPersonal && task.status !== 'in_review' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove?.(task.id, 'in_review'); }}>
                  In Review
                </DropdownMenuItem>
              )}
              {task.status !== 'completed' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove?.(task.id, 'completed'); }}>
                  Completed
                </DropdownMenuItem>
              )}
              {task.status !== 'cancelled' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove?.(task.id, 'cancelled'); }}>
                  Cancelled
                </DropdownMenuItem>
              )}
              {role !== 'member' && (
                <>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-1" />
                  <DropdownMenuItem
                    className="text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 focus:text-red-600"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(task.id); }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1 leading-snug">
        {task.title}
      </h4>
      
      {task.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
          {task.due_date && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.due_date), 'MMM d')}</span>
            </div>
          )}
          {task.estimated_duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.estimated_duration}m</span>
            </div>
          )}
        </div>

        <Avatar className="h-7 w-7 border border-white dark:border-slate-800 shadow-sm" title={assigneeName}>
          <AvatarImage src="" />
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-[10px]">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </motion.div>
    </>
  )
}
