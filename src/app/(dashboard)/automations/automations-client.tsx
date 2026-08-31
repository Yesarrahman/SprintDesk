'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { WorkspaceRole } from '@/types'
import { fetchAutomations, addAutomation, deleteAutomation, updateAutomationRule } from './actions'
import { fetchTeamMembers } from '@/app/(dashboard)/kanban/actions'

interface Automation {
  id: string
  trigger_type: string
  trigger_value: string
  action_type: string
  action_value: string
  is_active: boolean
}

export function AutomationsClient({ role }: { role: WorkspaceRole }) {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [teamMembers, setTeamMembers] = useState<{user_id: string, full_name: string}[]>([])
  const canEdit = role === 'owner' || role === 'admin'

  // Add Rule Dialog State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newTriggerType, setNewTriggerType] = useState('status_changed')
  const [newTriggerValue, setNewTriggerValue] = useState('completed')
  const [newActionType, setNewActionType] = useState('assign_to')
  const [newActionValue, setNewActionValue] = useState('unassigned')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchAutomations().then(res => {
      if (res.automations) setAutomations(res.automations)
    })
    fetchTeamMembers().then(res => {
      if (res.members) setTeamMembers(res.members)
    })
  }, [])

  const handleAddRule = async () => {
    setIsSubmitting(true)
    const newRule = {
      trigger_type: newTriggerType,
      trigger_value: newTriggerValue,
      action_type: newActionType,
      action_value: newActionValue,
      is_active: true
    }
    const res = await addAutomation(newRule)
    if (res.automation) {
      setAutomations([...automations, res.automation])
      toast.success('Automation rule added')
      setIsAddOpen(false)
    } else {
      toast.error('Failed to add rule')
    }
    setIsSubmitting(false)
  }

  const handleDeleteRule = async (id: string) => {
    await deleteAutomation(id)
    setAutomations(automations.filter(a => a.id !== id))
    toast.success('Automation rule deleted')
  }

  const handleUpdateRule = async (id: string, field: string, value: string) => {
    setAutomations(automations.map(a => a.id === id ? { ...a, [field]: value } : a))
    const res = await updateAutomationRule(id, { [field]: value })
    if (res?.error) {
      toast.error('Failed to update rule')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Automations</h2>
          <p className="text-slate-500">Configure rules to automate your team's workflow.</p>
        </div>
        {canEdit && (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {automations.map((rule) => (
          <Card key={rule.id} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
                <span className="font-semibold text-slate-700 dark:text-slate-300 w-16">WHEN</span>
                <Select disabled={!canEdit} value={rule.trigger_type} onValueChange={(val) => handleUpdateRule(rule.id, 'trigger_type', val as string)}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50">
                    <SelectValue placeholder="Trigger Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status_changed">Status Changes To</SelectItem>
                    <SelectItem value="priority_changed">Priority Changes To</SelectItem>
                  </SelectContent>
                </Select>
                <Select disabled={!canEdit} value={rule.trigger_value} onValueChange={(val) => handleUpdateRule(rule.id, 'trigger_value', val as string)}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50">
                    <SelectValue placeholder="Value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 w-16">THEN</span>
                <Select disabled={!canEdit} value={rule.action_type} onValueChange={(val) => handleUpdateRule(rule.id, 'action_type', val as string)}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assign_to">Change Assignee</SelectItem>
                    <SelectItem value="set_priority">Set Priority</SelectItem>
                  </SelectContent>
                </Select>
                <Select disabled={!canEdit} value={rule.action_value} onValueChange={(val) => handleUpdateRule(rule.id, 'action_value', val as string)}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50">
                    <SelectValue placeholder="Value" />
                  </SelectTrigger>
                  <SelectContent>
                    {rule.action_type === 'assign_to' ? (
                      <>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teamMembers.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                        ))}
                      </>
                    ) : (
                      <>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {canEdit && (
                <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {automations.length === 0 && (
          <div className="text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Zap className="h-8 w-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No Automations Active</h3>
            <p className="text-slate-500 mt-1">Create your first rule to automate repetitive tasks.</p>
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Automation Rule</DialogTitle>
            <DialogDescription>
              Create a new trigger and action for your workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <span className="font-semibold text-sm">WHEN</span>
              <Select value={newTriggerType} onValueChange={(v) => { setNewTriggerType(v as string); setNewTriggerValue(v === 'status_changed' ? 'completed' : 'urgent') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="status_changed">Status Changes To</SelectItem>
                  <SelectItem value="priority_changed">Priority Changes To</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newTriggerValue} onValueChange={(v) => setNewTriggerValue(v as string)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                   {newTriggerType === 'status_changed' ? (
                     <>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                     </>
                   ) : (
                     <>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                     </>
                   )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="font-semibold text-sm text-indigo-600">THEN</span>
              <Select value={newActionType} onValueChange={(v) => { setNewActionType(v as string); setNewActionValue(v === 'assign_to' ? 'unassigned' : 'urgent') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assign_to">Change Assignee</SelectItem>
                  <SelectItem value="set_priority">Set Priority</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newActionValue} onValueChange={(v) => setNewActionValue(v as string)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {newActionType === 'assign_to' ? (
                    <>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                      ))}
                    </>
                  ) : (
                    <>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRule} disabled={isSubmitting}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
