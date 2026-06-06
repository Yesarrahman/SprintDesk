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
import { updateTaskStatus, deleteTask, updateTaskOrder } from '@/app/(dashboard)/kanban/actions'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { arrayMove } from '@dnd-kit/sortable'

const ALL_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'completed', title: 'Completed' },
]

interface KanbanBoardProps {
  initialTasks: Task[]
  role?: string
  workspaceId: string
  isPersonal?: boolean
}

export function KanbanBoard({ initialTasks, role = 'owner', workspaceId, isPersonal = false }: KanbanBoardProps) {
  const { tasks, setTasks, moveTask, removeTask } = useKanbanStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const columns = isPersonal ? ALL_COLUMNS.filter(c => c.id !== 'in_review') : ALL_COLUMNS

  useEffect(() => {
    // Sort tasks by sort_order
    const sorted = [...initialTasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    setTasks(sorted)
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
    const overId = over.id

    if (activeId === overId) return

    const isActiveTask = active.data.current?.type === 'Task'
    const isOverTask = over.data.current?.type === 'Task'
    const isOverColumn = over.data.current?.type === 'Column'

    if (!isActiveTask) return

    const activeIndex = tasks.findIndex(t => t.id === activeId)
    const overIndex = tasks.findIndex(t => t.id === overId)
    
    if (activeIndex === -1) return

    if (isOverTask) {
      const overStatus = over.data.current?.task.status
      const activeStatus = tasks[activeIndex].status
      
      if (activeStatus !== overStatus) {
         // Moving across columns
         const newTasks = [...tasks]
         newTasks[activeIndex].status = overStatus
         // Place it before the over task
         const rearranged = arrayMove(newTasks, activeIndex, overIndex)
         setTasks(rearranged)
      } else {
         // Moving within same column
         const rearranged = arrayMove(tasks, activeIndex, overIndex)
         setTasks(rearranged)
      }
    } else if (isOverColumn) {
      const overStatus = over.data.current?.column.id
      const activeStatus = tasks[activeIndex].status
      if (activeStatus !== overStatus) {
         const newTasks = [...tasks]
         newTasks[activeIndex].status = overStatus
         setTasks(newTasks)
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    document.body.style.cursor = ''
    if (!activeTask) return
    setActiveTask(null)

    // The order and status in `tasks` state is now the "final" optimistic state.
    // We just need to persist the new order/status to the backend.
    
    // We update the backend with the new order for all tasks in the affected column(s)
    // To minimize calls, we could update only the affected tasks. 
    // Since we reordered, the simplest is to assign a new `sort_order` based on index.
    
    const newTasks = [...tasks].map((t, index) => ({
       ...t,
       sort_order: index
    }))
    
    setTasks(newTasks)

    // Find the task we dragged to see its new status
    const draggedTaskNow = newTasks.find(t => t.id === activeTask.id)
    if (!draggedTaskNow) return

    // If status changed, call updateTaskStatus
    if (draggedTaskNow.status !== activeTask.status) {
       const result = await updateTaskStatus(activeTask.id, draggedTaskNow.status)
       if (result?.error) toast.error('Failed to update task status')
    }

    // Persist new sort orders for the tasks that changed (to optimize, we can just send the ones in the new/old columns)
    const columnsToUpdate = [activeTask.status, draggedTaskNow.status]
    const tasksToUpdate = newTasks.filter(t => columnsToUpdate.includes(t.status))
    
    const orderUpdates = tasksToUpdate.map(t => ({
      id: t.id,
      sort_order: t.sort_order!,
      status: t.status
    }))

    const result = await updateTaskOrder(orderUpdates)
    if (result?.error) {
      toast.error('Failed to save task order')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
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
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks.filter((t) => t.status === col.id)}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
            role={role}
            isPersonal={isPersonal}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask ? (
            <div className="cursor-grabbing">
                <TaskCard task={activeTask} role={role} isPersonal={isPersonal} />
            </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
