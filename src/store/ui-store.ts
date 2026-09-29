import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activeTier: string
  activeWorkspaceId: string | undefined
  activeWorkspaceName: string
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setActiveTier: (tier: string) => void
  setActiveWorkspaceInfo: (id: string, name: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeTier: 'free',
  activeWorkspaceId: undefined,
  activeWorkspaceName: 'Personal Space',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTier: (tier) => set({ activeTier: tier }),
  setActiveWorkspaceInfo: (id, name) => set({ activeWorkspaceId: id, activeWorkspaceName: name }),
}))
