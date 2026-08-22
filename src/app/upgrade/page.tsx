'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function UpgradePage() {
  const handleUpgrade = (tier: string) => {
    // In a real app, this redirects to Stripe Checkout
    toast.success(`Mock: Successfully upgraded to ${tier}!`)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A192F] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-7xl mb-8 flex justify-start">
        <Button variant="ghost" asChild className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
        </Button>
      </div>

      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
          Supercharge your workflow
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-xl text-slate-500 dark:text-slate-400">
          Choose the right plan for you or your team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
        {/* Free Tier */}
        <Card className="flex flex-col border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Free</CardTitle>
            <CardDescription>For individuals and small projects.</CardDescription>
            <div className="mt-4 text-5xl font-extrabold text-slate-900 dark:text-white">$0<span className="text-xl font-medium text-slate-500">/mo</span></div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-4">
              <li className="flex items-start"><Check className="h-5 w-5 text-emerald-500 shrink-0 mr-2" /> 1 Personal Workspace</li>
              <li className="flex items-start"><Check className="h-5 w-5 text-emerald-500 shrink-0 mr-2" /> 3 Team Workspaces</li>
              <li className="flex items-start"><Check className="h-5 w-5 text-emerald-500 shrink-0 mr-2" /> Max 3 members per workspace</li>
              <li className="flex items-start"><Check className="h-5 w-5 text-emerald-500 shrink-0 mr-2" /> Basic Task Flow Board</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>Current Plan</Button>
          </CardFooter>
        </Card>

        {/* Pro Tier */}
        <Card className="flex flex-col border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 backdrop-blur-xl ring-2 ring-indigo-500 transform md:-translate-y-4">
          <CardHeader>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">Most Popular</div>
            <CardTitle className="text-2xl">Pro</CardTitle>
            <CardDescription>For growing teams needing more power.</CardDescription>
            <div className="mt-4 text-5xl font-extrabold text-slate-900 dark:text-white">$8<span className="text-xl font-medium text-slate-500">/mo</span></div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-4">
              <li className="flex items-start"><Check className="h-5 w-5 text-indigo-500 shrink-0 mr-2" /> <strong>Unlimited</strong> members</li>
              <li className="flex items-start"><Check className="h-5 w-5 text-indigo-500 shrink-0 mr-2" /> <strong>The "Everything Card"</strong></li>
              <li className="flex items-start"><Check className="h-5 w-5 text-indigo-500 shrink-0 mr-2" /> Story Points & Tags</li>
              <li className="flex items-start"><Check className="h-5 w-5 text-indigo-500 shrink-0 mr-2" /> Basic Time Tracking</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleUpgrade('pro')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">Upgrade to Pro</Button>
          </CardFooter>
        </Card>

        {/* Enterprise Tier */}
        <Card className="flex flex-col border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Enterprise</CardTitle>
            <CardDescription>For organizations requiring automation.</CardDescription>
            <div className="mt-4 text-5xl font-extrabold text-slate-900 dark:text-white">$20<span className="text-xl font-medium text-slate-500">/mo</span></div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-4">
              <li className="flex items-start"><Check className="h-5 w-5 text-emerald-500 shrink-0 mr-2" /> Everything in Pro</li>
              <li className="flex items-start"><Check className="h-5 w-5 text-emerald-500 shrink-0 mr-2" /> <strong>Automations Engine</strong></li>
              <li className="flex items-start"><Check className="h-5 w-5 text-emerald-500 shrink-0 mr-2" /> Timesheets (Coming Soon)</li>
              <li className="flex items-start"><Check className="h-5 w-5 text-emerald-500 shrink-0 mr-2" /> Client Portals (Coming Soon)</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleUpgrade('enterprise')} className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">Upgrade to Enterprise</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
