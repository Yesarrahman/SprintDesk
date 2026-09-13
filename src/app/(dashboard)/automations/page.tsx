import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AutomationsClient } from './automations-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap, Sparkles } from 'lucide-react'

export default async function AutomationsPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!activeWorkspaceId) {
    return <div className="p-8">Please select a workspace first.</div>
  }

  // Get workspace tier & owner
  const adminClient = await createAdminClient()
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('tier, name, owner_id, stripe_subscription_id')
    .eq('id', activeWorkspaceId)
    .single()

  // Get user profile tier
  const { data: profile } = await adminClient
    .from('profiles')
    .select('subscription_tier, stripe_subscription_id')
    .eq('id', user.id)
    .single()

  // Verify agency tier: requires active agency plan with stripe subscription (or agency tier)
  const isAgency = (ws?.tier === 'agency' && !!ws?.stripe_subscription_id) ||
                   (profile?.subscription_tier === 'agency' && !!profile?.stripe_subscription_id)

  if (!isAgency) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
        <div className="text-center space-y-3">
          <Badge className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 text-xs px-3 py-1 font-semibold uppercase tracking-wider">
            Agency Plan Feature
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Automations Engine
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Eliminate repetitive tasks with trigger-based workflows. Automatically assign tasks, send team notifications, and update statuses based on project rules.
          </p>
        </div>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-purple-200 dark:border-purple-900/40 p-8 text-center space-y-6 shadow-xl shadow-purple-500/5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
            <Zap className="h-7 w-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Automations are locked for this workspace
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The Automations Engine is exclusively available on <strong>SprintDesk Agency</strong> ($29/mo or $26.10/mo billed annually at $313/yr). Upgrade today to unlock unlimited automated rules.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link href="/billing">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-10 px-6 gap-2 shadow-lg shadow-purple-500/25">
                <Sparkles className="h-4 w-4" />
                Upgrade to SprintDesk Agency
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // Get user role
  let role = 'member'
  if (ws?.owner_id === user.id) {
    role = 'owner'
  } else {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', activeWorkspaceId)
      .eq('user_id', user.id)
      .single()
    if (member) role = member.role
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <AutomationsClient role={role as any} />
    </div>
  )
}
