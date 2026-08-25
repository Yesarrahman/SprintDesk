'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Send, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addInboxItem, deleteInboxItem, triageInboxItem } from './actions'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchWorkspaces } from '@/app/actions/workspace'
import { fetchKanbanColumns } from '@/app/(dashboard)/kanban/actions'

interface Workspace {
  id: string
  name: string
  role: string
}

interface Column {
  id: string
  title: string
}

export function InboxClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems)
  const [newItem, setNewItem] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Triage state
  const [isTriageOpen, setIsTriageOpen] = useState(false)
  const [triagingItem, setTriagingItem] = useState<{ id: string; content: string } | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('')
  const [columns, setColumns] = useState<Column[]>([])
  const [selectedColumnId, setSelectedColumnId] = useState<string>('')
  const [priority, setPriority] = useState<string>('medium')
  const [taskTitle, setTaskTitle] = useState<string>('')
  const [isTriaging, setIsTriaging] = useState(false)

  // Fetch workspaces when triage modal opens
  const openTriage = async (item: { id: string; content: string }) => {
    setTriagingItem(item)
    setTaskTitle(item.content)
    setIsTriageOpen(true)
    
    try {
      const res = await fetchWorkspaces()
      if (res.workspaces) {
        setWorkspaces(res.workspaces)
        if (res.workspaces.length > 0) {
          // Default to the active workspace cookie if matching, else the first workspace
          const match = document.cookie.match(/(^| )activeWorkspaceId=([^;]+)/)
          const activeId = match ? match[2] : null
          const found = res.workspaces.find(w => w.id === activeId)
          
          const defaultWs = found ? found.id : res.workspaces[0].id
          setSelectedWorkspaceId(defaultWs)
        }
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err)
      toast.error('Failed to load workspaces')
    }
  }

  // Fetch columns when workspace selection changes
  useEffect(() => {
    if (!selectedWorkspaceId) return

    const loadColumns = async () => {
      try {
        const isPersonal = workspaces.find(w => w.id === selectedWorkspaceId)?.name === 'My Workspace'
        const res = await fetchKanbanColumns(selectedWorkspaceId, isPersonal)
        if (res.columns && res.columns.length > 0) {
          setColumns(res.columns)
          const todoCol = res.columns.find(c => c.id === 'todo')
          setSelectedColumnId(todoCol ? todoCol.id : res.columns[0].id)
        } else {
          // Fallback to default columns
          const defaultCols = isPersonal 
            ? [{ id: 'todo', title: 'To Do' }, { id: 'in_progress', title: 'In Progress' }, { id: 'completed', title: 'Completed' }, { id: 'backlog', title: 'Backlog' }]
            : [{ id: 'todo', title: 'To Do' }, { id: 'in_progress', title: 'In Progress' }, { id: 'in_review', title: 'In Review' }, { id: 'completed', title: 'Completed' }, { id: 'backlog', title: 'Backlog' }]
          
          setColumns(defaultCols as Column[])
          setSelectedColumnId('todo')
        }
      } catch (err) {
        console.error('Failed to load columns:', err)
        toast.error('Failed to load columns for the selected workspace')
      }
    }

    loadColumns()
  }, [selectedWorkspaceId, workspaces])

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!triagingItem || !selectedWorkspaceId || !selectedColumnId || !taskTitle.trim()) {
      toast.error('Please fill in all details')
      return
    }

    setIsTriaging(true)
    const result = await triageInboxItem(
      triagingItem.id,
      selectedWorkspaceId,
      taskTitle,
      selectedColumnId,
      priority
    )
    setIsTriaging(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Successfully triaged to board!')
      setIsTriageOpen(false)
      // Remove item from local state
      setItems(prev => prev.filter(i => i.id !== triagingItem.id))
      setTriagingItem(null)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return

    setIsSubmitting(true)
    const tempId = Math.random().toString()
    const tempItem = {
      id: tempId,
      content: newItem,
      created_at: new Date().toISOString(),
    }
    
    // Optimistic UI
    setItems((prev) => [tempItem, ...prev])
    setNewItem('')

    const result = await addInboxItem(tempItem.content)
    setIsSubmitting(false)

    if (result.error) {
      toast.error('Failed to save to inbox')
      setItems((prev) => prev.filter((i) => i.id !== tempId))
    } else {
      toast.success('Added to Inbox')
    }
  }

  const handleDelete = async (id: string) => {
    const backup = [...items]
    setItems((prev) => prev.filter((i) => i.id !== id))

    const result = await deleteInboxItem(id)
    if (result.error) {
      toast.error('Failed to delete item')
      setItems(backup)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleAdd} className="flex gap-3 relative">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="What's on your mind? (e.g., Follow up with Sarah, Fix navbar bug)"
              className="flex-1 text-lg py-6 bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
              disabled={isSubmitting}
              autoFocus
            />
            <Button 
              type="submit" 
              size="lg" 
              className="px-8 h-auto bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!newItem.trim() || isSubmitting}
            >
              <Send className="h-5 w-5 mr-2" />
              Capture
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="group bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-slate-900 dark:text-slate-100 text-lg">{item.content}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Captured {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openTriage({ id: item.id, content: item.content })}
                      className="hidden sm:flex border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Triage to Board
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {items.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center py-12 text-slate-500"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg">Your inbox is empty.</p>
              <p className="text-sm">Capture ideas as they come to you.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Triage Dialog */}
      <Dialog open={isTriageOpen} onOpenChange={setIsTriageOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleTriageSubmit}>
            <DialogHeader>
              <DialogTitle>Triage to Board</DialogTitle>
              <DialogDescription>
                Convert this idea into an actionable task in one of your workspaces.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="taskTitle">Task Title</Label>
                <Input
                  id="taskTitle"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task title"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="workspace">Workspace</Label>
                <Select value={selectedWorkspaceId} onValueChange={(val) => setSelectedWorkspaceId(val || '')}>
                  <SelectTrigger id="workspace">
                    <SelectValue placeholder="Select Workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name === 'My Workspace' ? 'Personal Space' : w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="column">Column / Status</Label>
                <Select 
                  value={selectedColumnId} 
                  onValueChange={(val) => setSelectedColumnId(val || '')}
                  disabled={columns.length === 0}
                >
                  <SelectTrigger id="column">
                    <SelectValue placeholder="Select Column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(val) => setPriority(val || 'medium')}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTriageOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isTriaging}>
                {isTriaging ? 'Triaging...' : 'Convert to Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
