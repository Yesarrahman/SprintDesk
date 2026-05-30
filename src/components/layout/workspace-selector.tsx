'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Plus, Building2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { fetchWorkspaces, createWorkspace, setActiveWorkspaceCookie } from '@/app/actions/workspace'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUIStore } from '@/store/ui-store'

type Workspace = {
  id: string
  name: string
  role: string
}

export function WorkspaceSelector({ sidebarOpen }: { sidebarOpen: boolean }) {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const { setSidebarOpen } = useUIStore()

  const loadWorkspaces = async () => {
    const result = await fetchWorkspaces()
    if (result.workspaces) {
      setWorkspaces(result.workspaces)
      
      if (result.workspaces.length > 0) {
        const match = document.cookie.match(/(^| )activeWorkspaceId=([^;]+)/)
        const activeId = match ? match[2] : null
        
        const found = result.workspaces.find(w => w.id === activeId)
        if (found) {
          setActiveWorkspace(found)
        } else {
          setActiveWorkspace(result.workspaces[0])
          setActiveWorkspaceCookie(result.workspaces[0].id)
        }
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadWorkspaces()
  }, [])

  const handleSelectWorkspace = async (workspace: Workspace) => {
    setActiveWorkspace(workspace)
    await setActiveWorkspaceCookie(workspace.id)
    toast.success(`Switched to ${workspace.name}`)
    
    if (window.location.pathname === '/dashboard') {
      router.push('/kanban')
    } else {
      router.refresh()
    }
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName.trim()) return

    setIsLoading(true)
    const result = await createWorkspace(newWorkspaceName)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.workspaceId) {
      toast.success('Workspace created successfully!')
      setNewWorkspaceName('')
      setIsDialogOpen(false)
      await setActiveWorkspaceCookie(result.workspaceId)
      await loadWorkspaces()
      
      // Expand the sidebar and workspaces list if not already
      setSidebarOpen(true)
      setIsExpanded(true)
      router.refresh()
    }
  }

  const handleToggleExpand = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true)
      setIsExpanded(true)
    } else {
      setIsExpanded(!isExpanded)
    }
  }

  const personalWorkspace = workspaces.find(w => w.name === 'My Workspace' && w.role === 'owner') || workspaces[0]
  const otherWorkspaces = workspaces.filter(w => w.id !== personalWorkspace?.id)

  return (
    <>
      <div className="flex flex-col mt-2 px-3 space-y-2">
        {/* Personal Workspace Button */}
        {personalWorkspace && (
          <button
            onClick={() => handleSelectWorkspace(personalWorkspace)}
            className={cn(
              'flex items-center rounded-lg px-3 py-2.5 transition-colors',
              activeWorkspace?.id === personalWorkspace.id
                ? 'bg-primary/10 text-primary font-medium shadow-sm'
                : 'text-slate-600 hover:bg-primary/10 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/20 dark:hover:text-primary',
              !sidebarOpen && 'justify-center px-0'
            )}
            title={!sidebarOpen ? 'Personal Space' : undefined}
          >
            <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
               <span className="text-xs font-bold">P</span>
            </div>
            {sidebarOpen && (
              <span className="ml-3 flex-1 text-left truncate">
                Personal Space
              </span>
            )}
            {sidebarOpen && activeWorkspace?.id === personalWorkspace.id && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </button>
        )}

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleToggleExpand}
            className={cn(
              'flex items-center rounded-lg px-3 py-2.5 transition-colors w-full text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/10 dark:hover:text-primary',
              !sidebarOpen && 'justify-center px-0'
            )}
            title={!sidebarOpen ? 'Workspaces' : undefined}
          >
            <Building2 className="h-5 w-5 flex-shrink-0 text-slate-400" />
            {sidebarOpen && (
              <>
                <span className="ml-3 font-medium flex-1 text-left truncate">
                  Team Workspaces
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                )}
              </>
            )}
          </button>

          {sidebarOpen && isExpanded && (
            <div className="mt-1 flex flex-col pl-9 space-y-1">
              {otherWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSelectWorkspace(ws)}
                  className={cn(
                    'flex items-center justify-between rounded-md px-2 py-2 text-sm transition-colors text-left truncate',
                    activeWorkspace?.id === ws.id
                      ? 'bg-primary/10 text-primary font-medium shadow-sm'
                      : 'text-slate-600 hover:bg-primary/10 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/20 dark:hover:text-primary'
                  )}
                  title={ws.name}
                >
                  <span className="truncate pr-2">{ws.name}</span>
                  {activeWorkspace?.id === ws.id && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
              
              <button
                onClick={() => setIsDialogOpen(true)}
                className="flex items-center rounded-md px-2 py-2 text-sm transition-colors text-primary hover:bg-primary/10 dark:hover:bg-primary/20 font-medium mt-1"
              >
                <Plus className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">New Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateWorkspace}>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>
                A workspace is where you and your team collaborate on tasks.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Workspace'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
