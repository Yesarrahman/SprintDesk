import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activeTier: string
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setActiveTier: (tier: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeTier: 'free',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTier: (tier) => set({ activeTier: tier }),
}))
