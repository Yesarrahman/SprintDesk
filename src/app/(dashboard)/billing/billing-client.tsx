'use client'

import React, { useState, useTransition } from 'react'
import { createCheckoutSession, createCustomerPortalSession, type BillingInfo } from './actions'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Check,
  Loader2,
  CreditCard,
  Sparkles,
  Zap,
  Building2,
  CalendarDays,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BillingClientProps {
  billingInfo: BillingInfo
}

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    icon: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyTotal: 0,
    description: 'For individuals and small teams getting started.',
    color: 'slate',
    features: [
      'Create up to 2 workspaces',
      'Invite up to 3 members per workspace',
      'Task management & Kanban board',
      'Calendar & Capture Inbox',
      'Basic notifications',
    ],
    cta: 'Current Plan',
    highlight: false,
  },
  {
    id: 'pro' as const,
    name: 'SprintDesk Pro',
    icon: Sparkles,
    monthlyPrice: 15,
    yearlyPrice: 160,
    yearlySaving: '$20',
    description: 'For growing teams needing reporting and analytics.',
    color: 'indigo',
    features: [
      'Everything in Free',
      'Unlimited workspace members',
      'Team & Individual PDF Reports',
      'Custom date range reporting',
      'Submit-to-Manager workflow',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    id: 'agency' as const,
    name: 'SprintDesk Agency',
    icon: Building2,
    monthlyPrice: 29,
    yearlyPrice: 195,
    yearlySaving: '$153',
    description: 'For agencies and power teams needing automation.',
    color: 'purple',
    features: [
      'Everything in Pro',
      'Automations engine',
      'Advanced time tracking',
      'Client portals (Coming Soon)',
      'Dedicated onboarding support',
    ],
    cta: 'Upgrade to Agency',
    highlight: false,
  },
]

export function BillingClient({ billingInfo }: BillingClientProps) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [isPending, startTransition] = useTransition()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const tier = billingInfo?.tier || 'free'
  const sub = billingInfo?.subscription

  const handleUpgrade = (planId: 'pro' | 'agency') => {
    setLoadingPlan(planId)
    startTransition(async () => {
      try {
        await createCheckoutSession(planId, billing)
      } catch (err: any) {
        toast.error(err.message || 'Failed to start checkout')
        setLoadingPlan(null)
      }
    })
  }

  const handleManageBilling = () => {
    setLoadingPlan('portal')
    startTransition(async () => {
      try {
        await createCustomerPortalSession()
      } catch (err: any) {
        toast.error(err.message || 'Failed to open billing portal')
        setLoadingPlan(null)
      }
    })
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          Billing & Subscription
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your workspace plan for{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {billingInfo?.workspaceName || 'your workspace'}
          </span>
          .
        </p>
      </div>

      {/* Dedicated Subscription Status Card */}
      {!billingInfo?.isOwner ? (
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-sm overflow-visible">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                {billingInfo?.userRole ? `${billingInfo.userRole.toUpperCase()} ACCESS` : 'MEMBER ACCESS'}
              </Badge>
              <span className="text-xs text-slate-400">Workspace: <strong className="text-slate-700 dark:text-slate-200">{billingInfo?.workspaceName}</strong></span>
              <Badge className={cn(
                'text-[10px] font-bold uppercase tracking-wider',
                tier === 'pro' ? 'bg-indigo-600 text-white' :
                tier === 'agency' ? 'bg-purple-600 text-white' :
                'bg-slate-600 text-white'
              )}>
                {tier.toUpperCase()} PLAN
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Workspace Billing is Managed by the Owner
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              You are currently an invited {billingInfo?.userRole || 'member'} in <strong>{billingInfo?.workspaceName}</strong>. You enjoy full access to this workspace, but billing, invoices, payment cards, and subscription changes can only be managed by the workspace owner.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>To create and upgrade your own workspaces, you can select a plan below for your personal account.</span>
            </div>
          </div>
        </Card>
      ) : tier === 'free' ? (
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-sm overflow-visible">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  Free Tier
                </Badge>
                <span className="text-xs text-slate-400">Workspaces: <strong className="text-slate-700 dark:text-slate-200">{billingInfo?.ownedWorkspacesCount || 1} / 2 Used</strong></span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                You are currently on the Free tier
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                Your account includes standard task tracking and team collaboration. Upgrade to SprintDesk Pro or Agency below to unlock team &amp; individual PDF reports, unlimited team members, and automations.
              </p>

              {/* Feature Highlights for Free */}
              <div className="pt-1 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Create up to <strong>2 workspaces</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Invite up to <strong>3 members</strong> each</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Kanban &amp; Calendar</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <span className="text-amber-500 font-bold">✕</span>
                  <span>PDF Reports (Locked)</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex md:flex-col items-start md:items-end justify-between gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Ready to grow?</span>
              <Button
                type="button"
                onClick={() => {
                  const el = document.getElementById('pricing-plans')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 font-semibold shadow-md shadow-indigo-500/25"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                View Upgrade Options
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className={cn(
          'rounded-2xl border p-6 backdrop-blur-xl shadow-sm overflow-visible',
          tier === 'pro'
            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50'
            : 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50'
        )}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  'text-xs font-bold uppercase tracking-wider',
                  tier === 'pro' ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
                )}>
                  {sub?.interval ? `${sub.interval} Plan` : 'Active Plan'}
                </Badge>
                <span className="text-xs text-slate-400">Workspaces: <strong className="text-slate-700 dark:text-slate-200">Unlimited ({billingInfo?.ownedWorkspacesCount || 1} created)</strong></span>
              </div>

              <div className="flex items-center gap-3">
                {tier === 'pro' ? (
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-md shadow-purple-500/30">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {tier === 'pro' ? 'SprintDesk Pro' : 'SprintDesk Agency'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                    {sub?.cancelAtPeriodEnd ? 'Access valid until' : 'Next renewal date:'}{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {sub?.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Active subscription'}
                    </strong>
                    {sub?.cancelAtPeriodEnd && (
                      <span className="text-amber-500 font-semibold">(Cancellation scheduled)</span>
                    )}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                Click <strong>Manage your plan</strong> to open the secure Stripe portal where you can cancel, change billing intervals, update payment methods, or download past invoices.
              </p>
            </div>

            <div className="shrink-0 flex md:flex-col items-start md:items-end justify-between gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                onClick={handleManageBilling}
                disabled={isPending}
                className={cn(
                  'text-xs h-10 px-5 font-semibold text-white shadow-md',
                  tier === 'pro'
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/25'
                )}
              >
                {loadingPlan === 'portal' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Manage your plan
              </Button>
              <span className="text-[11px] text-slate-400">Cancel, upgrade or invoices</span>
            </div>
          </div>
        </Card>
      )}

      {/* Billing Toggle & Plan Selection */}
      <div id="pricing-plans" className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between pt-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {tier === 'free' ? 'Choose your plan:' : 'Upgrade or change your plan:'}
        </p>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50 w-fit">
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
              billing === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling('yearly')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
              billing === 'yearly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Yearly
            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              SAVE
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
        {PLANS.map((plan) => {
          const isCurrent = tier === plan.id
          const Icon = plan.icon

          return (
            <Card
              key={plan.id}
              className={cn(
                'flex flex-col relative transition-all duration-200 overflow-visible',
                isCurrent && 'ring-2 ring-offset-2 dark:ring-offset-slate-950',
                plan.highlight && !isCurrent && 'shadow-xl shadow-indigo-100/50 dark:shadow-none border-indigo-200 dark:border-indigo-900/50',
                isCurrent && tier === 'pro' && 'ring-indigo-500',
                isCurrent && tier === 'agency' && 'ring-purple-500',
                isCurrent && tier === 'free' && 'ring-slate-300',
                'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200 dark:border-slate-800'
              )}
            >
              {isCurrent && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <Badge className={cn(
                    'text-[10px] font-bold uppercase tracking-wider shadow-md px-3 py-0.5',
                    tier === 'pro' ? 'bg-indigo-600 text-white' :
                    tier === 'agency' ? 'bg-purple-600 text-white' :
                    'bg-slate-700 text-white'
                  )}>
                    Current Plan
                  </Badge>
                </div>
              )}

              {plan.highlight && !isCurrent && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md px-3 py-0.5">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4 pt-6">
                <div className="flex items-center gap-2 mb-2">
                  {Icon && (
                    <div className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center',
                      plan.id === 'pro' ? 'bg-indigo-600' : 'bg-purple-600'
                    )}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <CardTitle className="text-lg font-bold">{plan.name}</CardTitle>
                </div>
                <CardDescription className="text-xs">{plan.description}</CardDescription>

                <div className="mt-4">
                  {plan.monthlyPrice === 0 ? (
                    <div>
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white">$0</span>
                      <span className="text-sm text-slate-500 ml-1">/forever</span>
                    </div>
                  ) : billing === 'monthly' ? (
                    <div>
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                        ${plan.monthlyPrice}
                      </span>
                      <span className="text-sm text-slate-500 ml-1">/month</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                        ${plan.yearlyPrice}
                      </span>
                      <span className="text-sm text-slate-500 ml-1">/year</span>
                      {'yearlySaving' in plan && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          Save {plan.yearlySaving} vs monthly
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2.5">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Check className={cn(
                        'h-4 w-4 shrink-0 mt-0.5',
                        plan.id === 'pro' ? 'text-indigo-500' :
                        plan.id === 'agency' ? 'text-purple-500' :
                        'text-slate-400'
                      )} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-4">
                {isCurrent ? (
                  tier !== 'free' && billingInfo?.isOwner && billingInfo?.hasStripeCustomer ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-xs h-9"
                      onClick={handleManageBilling}
                      disabled={isPending}
                    >
                      {loadingPlan === 'portal' ? (
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-3.5 w-3.5 mr-2" />
                      )}
                      Manage & Invoices
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full text-xs h-9 text-slate-500" disabled>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      Current Plan
                    </Button>
                  )
                ) : plan.id === 'free' ? (
                  <Button variant="outline" className="w-full text-xs h-9 text-slate-400" disabled>
                    Free Forever
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleUpgrade(plan.id as 'pro' | 'agency')}
                    disabled={isPending}
                    className={cn(
                      'w-full text-xs h-9 text-white font-semibold gap-2',
                      plan.id === 'pro'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    )}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    {plan.cta} ({billing === 'monthly' ? `$${plan.monthlyPrice}/mo` : `$${plan.yearlyPrice}/yr`})
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Footer Note */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        All payments are processed securely by Stripe. You can cancel or change your plan at any time from the billing portal.
      </p>
    </div>
  )
}
