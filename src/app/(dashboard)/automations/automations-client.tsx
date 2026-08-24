'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Zap, Lock } from 'lucide-react'
import { toast } from 'sonner'
import type { WorkspaceRole } from '@/types'

interface Automation {
  id: string
  trigger_type: string
  trigger_value: string
  action_type: string
  action_value: string
  is_active: boolean
}

export function AutomationsClient({ 
  initialAutomations = [], 
  role, 
  tier = 'free' 
}: { 
  initialAutomations: Automation[], 
  role: WorkspaceRole,
  tier: string 
}) {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations)
  const isEnterprise = tier === 'enterprise'
  const canEdit = role === 'owner' || role === 'admin'

  const handleSave = () => {
    // In a real app, this would save to Supabase
    toast.success('Automations saved successfully')
  }

  if (!isEnterprise) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-100 dark:border-indigo-900 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Zap className="w-48 h-48 text-indigo-500" />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2 text-2xl text-indigo-900 dark:text-indigo-100">
            <Lock className="w-6 h-6" />
            Unlock Automations
          </CardTitle>
          <CardDescription className="text-indigo-700 dark:text-indigo-300 text-lg">
            Put your team's workflow on autopilot.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 space-y-6">
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
            Upgrade to the <strong>Enterprise Tier</strong> to create powerful "If THIS then THAT" rules. Automatically assign tasks, change priorities, and move items across the board based on custom triggers.
          </p>
          {role === 'owner' && (
            <Link href="/upgrade" className="inline-flex shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-all bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-4">
              Upgrade to Enterprise
            </Link>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Automations</h2>
          <p className="text-slate-500">Configure rules to automate your team's workflow.</p>
        </div>
        {canEdit && (
          <Button onClick={() => setAutomations([...automations, { id: Date.now().toString(), trigger_type: 'status_changed', trigger_value: 'completed', action_type: 'assign_to', action_value: 'unassigned', is_active: true }])}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {automations.map((rule, idx) => (
          <Card key={rule.id} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
                <span className="font-semibold text-slate-700 dark:text-slate-300 w-16">WHEN</span>
                <Select disabled={!canEdit} value={rule.trigger_type}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50">
                    <SelectValue placeholder="Trigger Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status_changed">Status Changes To</SelectItem>
                    <SelectItem value="priority_changed">Priority Changes To</SelectItem>
                  </SelectContent>
                </Select>
                <Select disabled={!canEdit} value={rule.trigger_value}>
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
                <Select disabled={!canEdit} value={rule.action_type}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assign_to">Change Assignee</SelectItem>
                    <SelectItem value="set_priority">Set Priority</SelectItem>
                  </SelectContent>
                </Select>
                <Select disabled={!canEdit} value={rule.action_value}>
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
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
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
      
      {canEdit && automations.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
}
