import { create } from 'zustand'
import type { Task, TaskStatus } from '@/types'

interface KanbanState {
  tasks: Task[]
  columns: { id: string; title: string; order_index: number }[]
  setTasks: (tasks: Task[]) => void
  setColumns: (columns: { id: string; title: string; order_index: number }[]) => void
  addColumn: (column: { id: string; title: string; order_index: number }) => void
  addTask: (task: Task) => void
  removeTask: (taskId: string) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  moveTask: (taskId: string, newStatus: TaskStatus) => void
}

export const useKanbanStore = create<KanbanState>((set) => ({
  tasks: [],
  columns: [],
  setTasks: (tasks) => set({ tasks }),
  setColumns: (columns) => set({ columns }),
  addColumn: (column) => set((state) => ({ columns: [...state.columns, column] })),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  removeTask: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    })),
  moveTask: (taskId, newStatus) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
    })),
}))
