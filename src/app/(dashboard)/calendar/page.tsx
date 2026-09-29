import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CalendarClientWrapper } from './calendar-client-wrapper'

export default async function CalendarPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase.from('tasks').select('*')
  if (activeWorkspaceId) {
    query = query.eq('workspace_id', activeWorkspaceId)
  }

  const { data: tasks, error } = await query

  return (
    <CalendarClientWrapper tasks={tasks || []} />
  )
}
