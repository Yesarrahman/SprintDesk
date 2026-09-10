'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fetchSubmittedReports } from '../actions'
import { IndividualReportDocument } from './individual-report-pdf'
import { pdf } from '@react-pdf/renderer'
import { toast } from 'sonner'
import Link from 'next/link'
import { FileText, Download, ExternalLink, Loader2, Inbox, Calendar, User } from 'lucide-react'

interface SubmittedReportsTabProps {
  workspaceId: string
  userName: string
}

export function SubmittedReportsTab({ workspaceId, userName }: SubmittedReportsTabProps) {
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const loadReports = async () => {
    setIsLoading(true)
    try {
      const res = await fetchSubmittedReports(workspaceId)
      if (res.error) {
        toast.error(res.error)
      } else {
        setReports(res.reports || [])
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load submitted reports')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [workspaceId])

  const handleDownloadPdf = async (report: any) => {
    setDownloadingId(report.id)
    try {
      const blob = await pdf(
        <IndividualReportDocument data={report.report_data} generatedByName={report.member_name} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SprintDesk_Submitted_Report_${report.member_name.replace(/\s+/g, '_')}_${report.range_from}_to_${report.range_to}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to generate PDF download.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              Member Submitted Reports
            </CardTitle>
            <CardDescription className="text-xs">
              Performance reports submitted by workspace members for manager review.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadReports}
            disabled={isLoading}
            className="text-xs h-8"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Refresh List
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-xs">Loading submitted reports...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Inbox className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No reports submitted yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                When team members generate their individual reports and click "Submit to Manager", they will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Reporting Period</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead className="text-center">Completion</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => {
                  const compRate = r.report_data?.summary?.completionRate ?? 0
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{r.member_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {r.range_from} – {r.range_to}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {new Date(r.submitted_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {compRate}%
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/reports/submitted/${r.id}`}>
                            <Button variant="ghost" size="sm" className="text-xs h-8 text-indigo-600 hover:text-indigo-700">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPdf(r)}
                            disabled={downloadingId === r.id}
                            className="text-xs h-8"
                          >
                            {downloadingId === r.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Download className="h-3 w-3 mr-1" />
                            )}
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
