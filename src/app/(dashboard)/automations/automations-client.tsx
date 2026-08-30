'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { WorkspaceRole } from '@/types'
import { fetchAutomations, addAutomation, deleteAutomation } from './actions'

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
  const canEdit = role === 'owner' || role === 'admin'

  useEffect(() => {
    fetchAutomations().then(res => {
      if (res.automations) setAutomations(res.automations)
    })
  }, [])

  const handleAddRule = async () => {
    const newRule = {
      trigger_type: 'status_changed',
      trigger_value: 'completed',
      action_type: 'assign_to',
      action_value: 'unassigned',
      is_active: true
    }
    const res = await addAutomation(newRule)
    if (res.automation) {
      setAutomations([...automations, res.automation])
      toast.success('Automation rule added')
    }
  }

  const handleDeleteRule = async (id: string) => {
    await deleteAutomation(id)
    setAutomations(automations.filter(a => a.id !== id))
    toast.success('Automation rule deleted')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Automations</h2>
          <p className="text-slate-500">Configure rules to automate your team's workflow.</p>
        </div>
        {canEdit && (
          <Button onClick={handleAddRule}>
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
                <Select disabled value={rule.trigger_type}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50">
                    <SelectValue placeholder="Trigger Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status_changed">Status Changes To</SelectItem>
                    <SelectItem value="priority_changed">Priority Changes To</SelectItem>
                  </SelectContent>
                </Select>
                <Select disabled value={rule.trigger_value}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50">
                    <SelectValue placeholder="Value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 w-16">THEN</span>
                <Select disabled value={rule.action_type}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assign_to">Change Assignee</SelectItem>
                    <SelectItem value="set_priority">Set Priority</SelectItem>
                  </SelectContent>
                </Select>
                <Select disabled value={rule.action_value}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50">
                    <SelectValue placeholder="Value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
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
    </div>
  )
}
