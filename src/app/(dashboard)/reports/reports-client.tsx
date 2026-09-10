'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TeamReportTab } from './components/team-report-tab'
import { IndividualReportTab } from './components/individual-report-tab'
import { SubmittedReportsTab } from './components/submitted-reports-tab'
import { BarChart3, User, FileCheck, Sparkles } from 'lucide-react'
import type { WorkspaceRole } from '@/types'

interface ReportsClientProps {
  workspaceId: string
  workspaceName: string
  userId: string
  userName: string
  role: WorkspaceRole
  tier: 'free' | 'pro' | 'enterprise'
  members: any[]
}

export function ReportsClient({
  workspaceId,
  workspaceName,
  userId,
  userName,
  role,
  tier,
  members,
}: ReportsClientProps) {
  const isManager = role === 'owner' || role === 'admin'

  // If member, default and only tab is individual
  const [activeTab, setActiveTab] = useState<'team' | 'individual' | 'submitted'>(
    isManager ? 'team' : 'individual'
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Workspace Reports
            </h1>
            <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-bold tracking-wider">
              {tier.toUpperCase()} PLAN
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standard formatted PDF analytics and member review records for <span className="font-semibold text-slate-700 dark:text-slate-300">{workspaceName}</span>.
          </p>
        </div>

        {/* Tab Switcher */}
        {isManager ? (
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'team'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Team Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'individual'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Individual Member
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('submitted')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'submitted'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              Submitted Inbox
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-lg text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            <User className="h-3.5 w-3.5" />
            <span>Member Self-Report Mode</span>
          </div>
        )}
      </div>

      {/* Tab Contents */}
      {isManager && activeTab === 'team' && (
        <TeamReportTab workspaceId={workspaceId} userName={userName} />
      )}

      {activeTab === 'individual' && (
        <IndividualReportTab
          workspaceId={workspaceId}
          currentUserId={userId}
          currentUserName={userName}
          currentUserRole={role}
          members={members}
        />
      )}

      {isManager && activeTab === 'submitted' && (
        <SubmittedReportsTab workspaceId={workspaceId} userName={userName} />
      )}
    </div>
  )
}
