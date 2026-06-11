import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getInboxItems } from './actions'
import { InboxClient } from './inbox-client'

export const metadata = {
  title: 'Capture Inbox | SprintDesk',
  description: 'Your personal holding area for tasks and ideas.',
}

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { items } = await getInboxItems()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
          Capture Inbox
        </h1>
        <p className="text-slate-500 mt-2">
          Quickly jot down ideas, tasks, or notes. Triage them later into your Task Flow Board or Team Sprint Boards.
        </p>
      </div>

      <InboxClient initialItems={items || []} />
    </div>
  )
}
