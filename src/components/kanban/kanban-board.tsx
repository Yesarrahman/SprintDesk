'use client'

import { useEffect, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import type { Task, TaskStatus } from '@/types'
import { useKanbanStore } from '@/store/kanban-store'
import { KanbanColumn } from './kanban-column'
import { TaskCard } from './task-card'
import { updateTaskStatus, deleteTask } from '@/app/(dashboard)/kanban/actions'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'completed', title: 'Completed' },
]

interface KanbanBoardProps {
  initialTasks: Task[]
  role?: string
  workspaceId: string
}

export function KanbanBoard({ initialTasks, role = 'owner', workspaceId }: KanbanBoardProps) {
  const { tasks, setTasks, moveTask, removeTask } = useKanbanStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  // Ensure we are mounted before rendering DndContext to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setTasks(initialTasks)
    // eslint-disable-next-line
    setIsMounted(true)

    const supabase = createClient()
    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newTask = payload.new as Task
          if (newTask.workspace_id !== workspaceId) return;
          const currentTasks = useKanbanStore.getState().tasks
          if (!currentTasks.find((t) => t.id === newTask.id)) {
            useKanbanStore.getState().addTask(newTask)
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedTask = payload.new as Task
          useKanbanStore.getState().updateTask(updatedTask.id, updatedTask)
        } else if (payload.eventType === 'DELETE') {
          const deletedTask = payload.old
          if (deletedTask.id) {
            useKanbanStore.getState().removeTask(deletedTask.id)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialTasks, setTasks, workspaceId])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    document.body.style.cursor = 'grabbing'
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id

    if (activeId === over.id) return

    const isActiveTask = active.data.current?.type === 'Task'
    const isOverTask = over.data.current?.type === 'Task'
    const isOverColumn = over.data.current?.type === 'Column'

    if (!isActiveTask) return

    // Dropping a task over another task
    if (isActiveTask && isOverTask) {
      const overStatus = over.data.current?.task.status
      const activeStatus = active.data.current?.task.status
      if (activeStatus !== overStatus) {
         moveTask(activeId as string, overStatus)
      }
    }

    // Dropping a task over an empty column
    if (isActiveTask && isOverColumn) {
      const overStatus = over.data.current?.column.id
      const activeStatus = active.data.current?.task.status
      if (activeStatus !== overStatus) {
         moveTask(activeId as string, overStatus)
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    document.body.style.cursor = ''
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const task = tasks.find(t => t.id === activeId)
    
    if(!task) return;

    let newStatus = task.status;

    if(over.data.current?.type === 'Task'){
        newStatus = over.data.current?.task.status;
    } else if(over.data.current?.type === 'Column'){
        newStatus = over.data.current?.column.id;
    }

    if (task.status !== newStatus) {
      // Optimistic update happens in dragOver, now persist to server
      const result = await updateTaskStatus(activeId as string, newStatus)
      if (result?.error) {
        toast.error('Failed to move task')
        // We could revert the state here if needed
      }
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    // Optimistic delete
    removeTask(taskId)
    const result = await deleteTask(taskId)
    if (result?.error) {
      toast.error('Failed to delete task')
      if (task) useKanbanStore.getState().addTask(task)
    } else {
        toast.success('Task deleted')
    }
  }

  const handleMoveTask = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    const previousStatus = task.status

    // Optimistic update
    moveTask(taskId, newStatus)

    const result = await updateTaskStatus(taskId, newStatus)
    if (result?.error) {
      toast.error('Failed to move task')
      moveTask(taskId, previousStatus)
    }
  }

  if (!isMounted) return null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks.filter((t) => t.status === col.id)}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
            role={role}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask ? (
            <div className="cursor-grabbing">
                <TaskCard task={activeTask} role={role} />
            </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
