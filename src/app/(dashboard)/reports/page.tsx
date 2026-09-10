import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserTierAndRole, fetchWorkspaceMembers } from './actions'
import { ReportsClient } from './reports-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, FileText, ArrowRight, Users, Sparkles, AlertCircle } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error, context } = await getUserTierAndRole()

  if (error || !context) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Workspace Not Found</h2>
        <p className="text-sm text-slate-500">
          Please select or create an active workspace to access reports.
        </p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  // Check if personal workspace
  if (context.isPersonal) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200 dark:border-slate-800 text-center p-8">
          <Users className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold">Team Workspace Feature</CardTitle>
          <CardDescription className="text-sm text-slate-500 max-w-md mx-auto mt-2">
            The Report Generator is designed for team workspaces. To generate team velocity reports and member performance reviews, please switch to a team workspace using the workspace selector in the top-left sidebar.
          </CardDescription>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // Check Tier Gate
  if (context.tier === 'free') {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
        <div className="text-center space-y-3">
          <Badge className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs px-3 py-1 font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Pro Tier Feature
          </Badge>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Workspace Report Generator
          </h1>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Upgrade your workspace to unlock professional formatted PDF reports, team analytics, and member performance submissions.
          </p>
        </div>

        <Card className="border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-b from-indigo-50/40 via-white/60 to-white/40 dark:from-indigo-950/20 dark:via-slate-900/60 dark:to-slate-900/40 backdrop-blur-xl shadow-xl shadow-indigo-100/50 dark:shadow-none">
          <CardHeader className="text-center pb-2">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-2 shadow-lg shadow-indigo-500/30">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">Standardized PDF Reports Locked</CardTitle>
            <CardDescription className="text-xs max-w-md mx-auto">
              Get access to both Team Performance Reports and Individual Member Reports with downloadable formatted PDFs.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 space-y-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Team Performance Report</p>
                <p className="text-[11px] text-slate-500">
                  Total task velocity, completion rate, overdue alerts, and workload distribution across all members.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 space-y-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Individual Member Reports</p>
                <p className="text-[11px] text-slate-500">
                  Personal performance metrics, completed task records, and one-click "Submit to Manager" delivery.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 space-y-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Custom Date Range Picker</p>
                <p className="text-[11px] text-slate-500">
                  Quick presets for 7 days, 30 days, or custom date ranges for accurate sprint summaries.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 space-y-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Clean Branded PDF Downloads</p>
                <p className="text-[11px] text-slate-500">
                  Instant client-side PDF document generation ready to print, email, or archive.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 border-t border-indigo-100 dark:border-indigo-950">
            <Link href="/upgrade">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9 px-5 gap-2">
                Upgrade to Pro Plan <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="text-xs h-9 text-slate-600 dark:text-slate-300">
                Switch Tier in Settings (Test Mode)
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // If Pro or Enterprise: fetch members and render reports
  const { members = [] } = await fetchWorkspaceMembers(context.workspaceId)

  return (
    <ReportsClient
      workspaceId={context.workspaceId}
      workspaceName={context.workspaceName}
      userId={context.userId}
      userName={context.userName}
      role={context.role}
      tier={context.tier}
      members={members}
    />
  )
}
