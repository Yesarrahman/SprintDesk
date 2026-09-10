import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { fetchSubmittedReportById } from '../../actions'
import { SubmittedReportClientView } from './submitted-client-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SubmittedReportViewPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const { report, error } = await fetchSubmittedReportById(id)

  if (error || !report) {
    notFound()
  }

  return <SubmittedReportClientView report={report} />
}
