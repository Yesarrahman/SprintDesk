'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IndividualReportDocument } from '../../components/individual-report-pdf'
import { pdf } from '@react-pdf/renderer'
import { toast } from 'sonner'
import { ArrowLeft, Download, Loader2, CheckCircle2, AlertTriangle, User, Calendar } from 'lucide-react'

export function SubmittedReportClientView({ report }: { report: any }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const reportData = report.report_data || {}
  const summary = reportData.summary || {}
  const completedList = reportData.completedList || []
  const overdueList = reportData.overdueList || []

  const handleDownloadPdf = async () => {
    setIsDownloading(true)
    try {
      const blob = await pdf(
        <IndividualReportDocument data={reportData} generatedByName={report.member_name} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SprintDesk_Submitted_${report.member_name.replace(/\s+/g, '_')}_${report.range_from}_to_${report.range_to}.pdf`
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href="/reports">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Button>
        </Link>
        <Button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4"
        >
          {isDownloading ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-2 h-3.5 w-3.5" />
          )}
          Download PDF Document
        </Button>
      </div>

      {/* Submission Banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-wider">
                Submitted Performance Snapshot
              </Badge>
              <span className="text-xs text-slate-400">
                Submitted on {new Date(report.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              <User className="h-6 w-6 text-indigo-500" />
              {report.member_name}
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Reporting Period: <span className="font-semibold text-slate-700 dark:text-slate-300">{report.range_from} – {report.range_to}</span>
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold text-slate-400 uppercase">Completion Rate</p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary.completionRate ?? 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase">Assigned</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {summary.tasksAssigned || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-emerald-500 uppercase">Completed</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {summary.tasksCompleted || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-indigo-500 uppercase">Rate</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {summary.completionRate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-red-500 uppercase">Overdue</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {summary.overdueCount || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-blue-500 uppercase">In Progress</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {summary.inProgressCount || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Created</p>
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-1">
              {summary.tasksCreated || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Completed Tasks Table */}
      {completedList.length > 0 && (
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Completed Tasks in Submitted Range ({completedList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                  <TableHead className="text-right">Completed Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedList.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-xs">{t.title}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {t.priority}
                      </Badge>
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
      {overdueList.length > 0 && (
        <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-900/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue Tasks at Time of Submission ({overdueList.length})
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
                {overdueList.map((t: any) => (
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
  )
}
