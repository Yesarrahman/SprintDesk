'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { fetchIndividualReportData, submitReportToManager } from '../actions'
import { IndividualReportDocument } from './individual-report-pdf'
import { pdf } from '@react-pdf/renderer'
import { toast } from 'sonner'
import type { WorkspaceRole } from '@/types'
import {
  Download,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Check,
} from 'lucide-react'

interface MemberOption {
  user_id: string
  full_name: string
  role: string
  avatar_url: string | null
}

interface IndividualReportTabProps {
  workspaceId: string
  currentUserId: string
  currentUserName: string
  currentUserRole: WorkspaceRole
  members: MemberOption[]
}

export function IndividualReportTab({
  workspaceId,
  currentUserId,
  currentUserName,
  currentUserRole,
  members,
}: IndividualReportTabProps) {
  const isManager = currentUserRole === 'owner' || currentUserRole === 'admin'

  // Default selected member: current user
  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentUserId)

  // Default date range: last 30 days
  const now = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const toIso = (d: Date) => d.toISOString().split('T')[0]

  const [range, setRange] = useState<DateRange>({
    from: toIso(thirtyDaysAgo),
    to: toIso(now),
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [reportData, setReportData] = useState<any | null>(null)

  const selectedMember = members.find((m) => m.user_id === selectedMemberId)
  const memberDisplayName = selectedMember?.full_name || (selectedMemberId === currentUserId ? currentUserName : 'Member')

  const handleGenerate = async () => {
    setIsLoading(true)
    setHasSubmitted(false)
    try {
      const res = await fetchIndividualReportData(workspaceId, selectedMemberId, range.from, range.to)
      if (res.error) {
        toast.error(res.error)
      } else {
        setReportData(res.data)
        toast.success(`Report generated for ${res.data?.memberName || 'member'}!`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!reportData) return
    setIsDownloading(true)
    try {
      const blob = await pdf(
        <IndividualReportDocument data={reportData} generatedByName={currentUserName} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SprintDesk_Report_${reportData.memberName.replace(/\s+/g, '_')}_${reportData.rangeFrom}_to_${reportData.rangeTo}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to generate PDF download.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSubmitToManager = async () => {
    if (!reportData) return
    setIsSubmitting(true)
    try {
      const res = await submitReportToManager({
        workspaceId,
        memberId: reportData.memberId,
        memberName: reportData.memberName,
        rangeFrom: reportData.rangeFrom,
        rangeTo: reportData.rangeTo,
        reportData: reportData,
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        setHasSubmitted(true)
        toast.success('Report successfully submitted to workspace managers!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* If Manager, show member dropdown */}
            {isManager && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Member:
                </span>
                <Select
                  value={selectedMemberId}
                  onValueChange={(val) => {
                    if (val) {
                      setSelectedMemberId(val)
                      setReportData(null)
                    }
                  }}
                >
                  <SelectTrigger className="w-[190px] h-9 text-xs bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id} className="text-xs">
                        {m.full_name} {m.user_id === currentUserId ? '(You)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isManager && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                <User className="h-3.5 w-3.5" />
                <span>My Performance ({currentUserName})</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Period:
              </span>
              <DateRangePicker value={range} onChange={setRange} />
            </div>

            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
          </div>

          {reportData && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs h-9"
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-2 h-3.5 w-3.5" />
                )}
                Download PDF
              </Button>

              <Button
                type="button"
                onClick={handleSubmitToManager}
                disabled={isSubmitting || hasSubmitted}
                className={
                  hasSubmitted
                    ? 'bg-emerald-600 hover:bg-emerald-600 text-white text-xs h-9'
                    : 'bg-slate-900 hover:bg-slate-800 text-white text-xs h-9'
                }
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : hasSubmitted ? (
                  <Check className="mr-2 h-3.5 w-3.5 text-white" />
                ) : (
                  <Send className="mr-2 h-3.5 w-3.5" />
                )}
                {hasSubmitted ? 'Submitted to Manager ✓' : 'Submit to Manager'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!reportData && !isLoading && (
        <div className="text-center py-16 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <User className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Generate Individual Report for {memberDisplayName}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Analyze personal task completion, overdue assignments, and share the standardized report directly with workspace managers.
          </p>
          <Button
            type="button"
            onClick={handleGenerate}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-4"
          >
            Generate Report
          </Button>
        </div>
      )}

      {/* Report Preview */}
      {reportData && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex items-center justify-between p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {reportData.memberName}
              </h2>
              <p className="text-xs text-slate-500 capitalize">
                Role: {reportData.memberRole} · {reportData.rangeFrom} to {reportData.rangeTo}
              </p>
            </div>
            <Badge className="bg-indigo-600 text-white text-xs">
              {reportData.summary.completionRate}% Completion
            </Badge>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase">Assigned</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {reportData.summary.tasksAssigned}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-purple-500 uppercase">Hours Tracked</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {reportData.summary.totalHoursLogged || '0h 0m'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-emerald-500 uppercase">Completed</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {reportData.summary.tasksCompleted}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-indigo-500 uppercase">Completion Rate</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {reportData.summary.completionRate}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-red-500 uppercase">Overdue</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {reportData.summary.overdueCount}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-blue-500 uppercase">In Progress</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {reportData.summary.inProgressCount}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Created</p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-1">
                  {reportData.summary.tasksCreated}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Completed Tasks Overview */}
          {reportData.completedList.length > 0 && (
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Completed Tasks ({reportData.completedList.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-center">Priority</TableHead>
                      <TableHead className="text-center">Time Spent</TableHead>
                      <TableHead className="text-right">Completed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.completedList.slice(0, 10).map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-xs">{t.title}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-purple-600 dark:text-purple-400">
                          {t.actual_duration || '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-400">
                          {t.completed_at ? new Date(t.completed_at).toISOString().split('T')[0] : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Overdue Tasks Alert Table */}
          {reportData.overdueList.length > 0 && (
            <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue Tasks ({reportData.overdueList.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-center">Priority</TableHead>
                      <TableHead className="text-right">Due Date</TableHead>
                      <TableHead className="text-right">Days Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.overdueList.slice(0, 8).map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-xs">{t.title}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-500">
                          {t.due_date ? new Date(t.due_date).toISOString().split('T')[0] : '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-red-600">
                          {t.days_overdue} days
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
