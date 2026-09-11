'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { fetchTeamReportData } from '../actions'
import { TeamReportDocument } from './team-report-pdf'
import { pdf } from '@react-pdf/renderer'
import { toast } from 'sonner'
import {
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BarChart3,
  Users,
  Calendar,
  Layers,
} from 'lucide-react'

interface TeamReportTabProps {
  workspaceId: string
  userName: string
}

export function TeamReportTab({ workspaceId, userName }: TeamReportTabProps) {
  // Default range: last 30 days
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
  const [reportData, setReportData] = useState<any | null>(null)

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const res = await fetchTeamReportData(workspaceId, range.from, range.to)
      if (res.error) {
        toast.error(res.error)
      } else {
        setReportData(res.data)
        toast.success('Team report generated!')
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
      const blob = await pdf(<TeamReportDocument data={reportData} generatedByName={userName} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SprintDesk_Team_Report_${reportData.rangeFrom}_to_${reportData.rangeTo}.pdf`
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

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Report Period:
            </span>
            <DateRangePicker value={range} onChange={setRange} />
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
                'Generate Team Report'
              )}
            </Button>
          </div>

          {reportData && (
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
              Download PDF Report
            </Button>
          )}
        </CardContent>
      </Card>

      {!reportData && !isLoading && (
        <div className="text-center py-16 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Select date range and generate report
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Get an in-depth breakdown of your team's velocity, workload distribution, and overdue task status.
          </p>
          <Button
            type="button"
            onClick={handleGenerate}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-4"
          >
            Generate Last 30 Days
          </Button>
        </div>
      )}

      {/* Report Preview */}
      {reportData && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase">Total Tasks</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {reportData.summary.totalTasks}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-purple-500 uppercase">Hours Tracked</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {reportData.summary.totalTeamHours || '0h 0m'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-emerald-500 uppercase">Completed</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {reportData.summary.completedCount}
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
                <p className="text-xs font-semibold text-slate-500 uppercase">Cancelled</p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-1">
                  {reportData.summary.cancelledCount}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Member Workload Table */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                Team Member Workload & Hours
              </CardTitle>
              <CardDescription className="text-xs">
                Performance and time logged per member within the selected timeframe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.memberWorkload.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No member activity recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-center">Assigned</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center">Hours Logged</TableHead>
                      <TableHead className="text-center">Overdue</TableHead>
                      <TableHead className="text-right">Completion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.memberWorkload.map((m: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{m.member_name}</TableCell>
                        <TableCell className="text-center text-xs">{m.assigned}</TableCell>
                        <TableCell className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          {m.completed}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-purple-600 dark:text-purple-400 font-medium">
                          {m.hours_logged || '0h 0m'}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {m.overdue > 0 ? (
                            <span className="text-red-500 font-semibold">{m.overdue}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {m.completion_rate}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Overdue Tasks Alert Table */}
          {reportData.overdueTasks.length > 0 && (
            <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Critical Overdue Tasks ({reportData.overdueTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="text-center">Priority</TableHead>
                      <TableHead className="text-right">Overdue By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.overdueTasks.slice(0, 8).map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-xs">{t.title}</TableCell>
                        <TableCell className="text-xs text-slate-500">{t.assigned_to_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {t.priority}
                          </Badge>
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

          {/* Completed Tasks Overview */}
          {reportData.completedTasksList.length > 0 && (
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Completed Tasks in Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Completed By</TableHead>
                      <TableHead className="text-right">Completed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.completedTasksList.slice(0, 10).map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-xs">{t.title}</TableCell>
                        <TableCell className="text-xs text-slate-500">{t.assigned_to_name}</TableCell>
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
        </div>
      )}
    </div>
  )
}
