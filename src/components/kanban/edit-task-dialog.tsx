'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2, Plus, Trash2, Link as LinkIcon, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  updateTaskDetails, 
  fetchSubtasks, 
  addSubtask, 
  updateSubtask, 
  deleteSubtask,
  fetchTaskComments,
  addTaskComment,
  fetchLinkedTasks,
  addLinkedTask
} from '@/app/(dashboard)/kanban/actions'
import { useKanbanStore } from '@/store/kanban-store'
import type { Task } from '@/types'
import { format } from 'date-fns'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'completed', 'cancelled', 'archived']),
  due_date: z.string().optional(),
  estimated_duration: z.string().optional(),
  assigned_to: z.string().optional(),
  recurring_type: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface EditTaskDialogProps {
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  isPersonal?: boolean
}

export function EditTaskDialog({ task, open, onOpenChange, isPersonal = false }: EditTaskDialogProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments' | 'links'>('details')
  const [isLoading, setIsLoading] = useState(false)
  const [teamMembers, setTeamMembers] = useState<{user_id: string, full_name: string}[]>([])
  
  // Subtasks State
  const [subtasks, setSubtasks] = useState<any[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  
  // Comments State
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  
  // Links State
  const [links, setLinks] = useState<any[]>([])
  const [newLinkTarget, setNewLinkTarget] = useState('')
  const [newLinkRelation, setNewLinkRelation] = useState('relates_to')

  const updateTask = useKanbanStore((state) => state.updateTask)

  useEffect(() => {
    if (!isPersonal && open) {
      import('@/app/(dashboard)/kanban/actions').then(m => {
        m.fetchTeamMembers().then(res => {
          if (res.members) setTeamMembers(res.members)
        })
      })
    }
  }, [isPersonal, open])

  useEffect(() => {
    if (open) {
      setActiveTab('details')
      fetchSubtasks(task.id).then(res => { if (res.subtasks) setSubtasks(res.subtasks) })
      fetchTaskComments(task.id).then(res => { if (res.comments) setComments(res.comments) })
      fetchLinkedTasks(task.id).then(res => { if (res.links) setLinks(res.links) })
    }
  }, [open, task.id])

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      estimated_duration: task.estimated_duration ? task.estimated_duration.toString() : '',
      assigned_to: task.assigned_to || 'unassigned',
      recurring_type: (task as any).recurring_type || 'none',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        estimated_duration: task.estimated_duration ? task.estimated_duration.toString() : '',
        assigned_to: task.assigned_to || 'unassigned',
        recurring_type: (task as any).recurring_type || 'none',
      })
    }
  }, [open, task, form])

  async function onSubmit(data: TaskFormValues) {
    setIsLoading(true)
    const formData = new FormData()
    formData.append('title', data.title)
    if (data.description) formData.append('description', data.description)
    formData.append('priority', data.priority)
    formData.append('status', data.status)
    if (data.due_date) formData.append('due_date', data.due_date)
    if (data.estimated_duration) formData.append('estimated_duration', data.estimated_duration)
    if (data.assigned_to && data.assigned_to !== 'unassigned') formData.append('assigned_to', data.assigned_to)
    if (data.assigned_to === 'unassigned') formData.append('assigned_to', 'unassigned')
    if (data.recurring_type) formData.append('recurring_type', data.recurring_type)

    const result = await updateTaskDetails(task.id, formData)

    if (result?.error) {
      toast.error(result.error)
    } else if (result?.task) {
      updateTask(task.id, result.task)
      toast.success('Task updated')
      onOpenChange(false)
    }
    setIsLoading(false)
  }
  
  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return
    const res = await addSubtask(task.id, newSubtask)
    if (res.subtask) {
      setSubtasks([...subtasks, res.subtask])
      setNewSubtask('')
    }
  }

  const handleToggleSubtask = async (id: string, completed: boolean) => {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed } : s))
    await updateSubtask(id, completed)
  }

  const handleDeleteSubtask = async (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id))
    await deleteSubtask(id)
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    const res = await addTaskComment(task.id, newComment)
    if (res.comment) {
      setComments([...comments, res.comment])
      setNewComment('')
    }
  }

  const handleAddLink = async () => {
    if (!newLinkTarget.trim()) return
    const res = await addLinkedTask(task.id, newLinkTarget, newLinkRelation)
    if (res.link) {
      fetchLinkedTasks(task.id).then(r => { if (r.links) setLinks(r.links) })
      setNewLinkTarget('')
      toast.success('Task linked')
    } else if (res.error) {
      toast.error(res.error)
    }
  }

  // Timer functionality
  const [timeState, setTimeState] = useState({ totalSeconds: 0, isRunning: false })
  const [timerInterval, setTimerInterval] = useState<any>(null)

  useEffect(() => {
    if (open) {
      import('@/app/(dashboard)/kanban/actions').then(m => {
        m.fetchTaskTime(task.id).then(res => setTimeState(res as any))
      })
    }
  }, [open, task.id])

  useEffect(() => {
    if (timeState.isRunning) {
      const interval = setInterval(() => {
        setTimeState(prev => ({ ...prev, totalSeconds: prev.totalSeconds + 1 }))
      }, 1000)
      setTimerInterval(interval)
      return () => clearInterval(interval)
    } else if (timerInterval) {
      clearInterval(timerInterval)
    }
    return () => {}
  }, [timeState.isRunning])

  const handleToggleTimer = async () => {
    setTimeState(prev => ({ ...prev, isRunning: !prev.isRunning }))
    import('@/app/(dashboard)/kanban/actions').then(async m => {
      const res = await m.toggleTaskTimer(task.id)
      if (res.error) {
        toast.error(res.error)
        setTimeState(prev => ({ ...prev, isRunning: !prev.isRunning }))
      } else {
        toast.success(res.status === 'started' ? 'Timer started' : 'Timer stopped')
      }
    })
  }

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-white/20 dark:border-slate-800/50"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <DialogTitle>Edit Task</DialogTitle>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800">
                 <div className="text-sm font-mono text-slate-700 dark:text-slate-300 w-16 text-center">{formatTime(timeState.totalSeconds)}</div>
                 <Button size="sm" variant={timeState.isRunning ? 'destructive' : 'default'} className="h-6 text-xs px-2" onClick={handleToggleTimer}>
                   {timeState.isRunning ? 'Stop' : 'Start'}
                 </Button>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
               ID: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{task.id.split('-')[0]}</span>
               <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => {
                  navigator.clipboard.writeText(task.id)
                  toast.success('Task ID copied to clipboard')
               }}>Copy Full ID</Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
          <Button variant={activeTab === 'details' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('details')}>Details</Button>
          <Button variant={activeTab === 'subtasks' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('subtasks')}>Subtasks ({subtasks.length})</Button>
          <Button variant={activeTab === 'comments' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('comments')}>Comments ({comments.length})</Button>
          <Button variant={activeTab === 'links' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('links')}>Links ({links.length})</Button>
        </div>

        {activeTab === 'details' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} className="bg-white/50 dark:bg-slate-900/50" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="resize-none bg-white/50 dark:bg-slate-900/50" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="bg-white/50 dark:bg-slate-900/50"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="backlog">Backlog</SelectItem><SelectItem value="todo">To Do</SelectItem><SelectItem value="in_progress">In Progress</SelectItem>
                        {!isPersonal && <SelectItem value="in_review">In Review</SelectItem>}<SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="bg-white/50 dark:bg-slate-900/50"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>
              {!isPersonal && (
                <FormField control={form.control} name="assigned_to" render={({ field }) => (
                  <FormItem><FormLabel>Assignee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                      <FormControl><SelectTrigger className="bg-white/50 dark:bg-slate-900/50"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teamMembers.map(m => (<SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              )}
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="due_date" render={({ field }) => (
                  <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} className="bg-white/50 dark:bg-slate-900/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="estimated_duration" render={({ field }) => (
                  <FormItem><FormLabel>Est. Minutes</FormLabel><FormControl><Input type="number" {...field} className="bg-white/50 dark:bg-slate-900/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="recurring_type" render={({ field }) => (
                  <FormItem><FormLabel>Recurring</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="bg-white/50 dark:bg-slate-900/50"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">Cancel</Button>
                <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                </Button>
              </div>
            </form>
          </Form>
        )}

        {activeTab === 'subtasks' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="New subtask..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask() }} />
              <Button onClick={handleAddSubtask}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-2 rounded border bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={sub.completed} onCheckedChange={(c) => handleToggleSubtask(sub.id, c === true)} />
                    <span className={sub.completed ? "line-through text-slate-400" : ""}>{sub.title}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeleteSubtask(sub.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              {subtasks.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No subtasks yet.</p>}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8"><AvatarFallback>{comment.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg rounded-tl-none">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold">{comment.profiles?.full_name || 'User'}</span>
                      <span className="text-[10px] text-slate-400">{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No comments yet.</p>}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Input placeholder="Write a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddComment() }} />
              <Button onClick={handleAddComment}><MessageSquare className="h-4 w-4 mr-2" /> Send</Button>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <Select value={newLinkRelation} onValueChange={(v) => setNewLinkRelation(v as string)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relates_to">Relates to</SelectItem>
                  <SelectItem value="blocks">Blocks</SelectItem>
                  <SelectItem value="blocked_by">Blocked by</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Target Task ID (Paste here)" value={newLinkTarget} onChange={e => setNewLinkTarget(e.target.value)} />
              <Button onClick={handleAddLink}><LinkIcon className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {links.map(link => (
                <div key={link.id} className="p-3 rounded border bg-slate-50 dark:bg-slate-900 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium capitalize text-indigo-600 dark:text-indigo-400">{link.relation.replace('_', ' ')}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">{link.linked_task?.status}</span>
                  </div>
                  <p className="font-semibold">{link.linked_task?.title}</p>
                  <p className="text-xs text-slate-500 mt-1">Workspace: {link.linked_task?.workspaces?.name}</p>
                </div>
              ))}
              {links.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No linked tasks.</p>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
