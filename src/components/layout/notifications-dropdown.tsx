import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fetchNotifications, markNotificationAsRead } from '@/app/actions/notifications'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<any[]>([])
  const unreadCount = notifications.filter(n => !n.is_read).length
  const supabase = createClient()
  const router = useRouter()

  const loadNotifications = async () => {
    const res = await fetchNotifications()
    if (res.notifications) setNotifications(res.notifications)
  }

  useEffect(() => {
    loadNotifications()

    // Realtime subscription
    const channel = supabase.channel('realtime_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        setNotifications(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleRead = async (id: string, link?: string) => {
    await markNotificationAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    if (link) router.push(link)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-semibold">Notifications</h4>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="p-4 text-sm text-slate-500 text-center">No notifications yet.</p>
          )}
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              onClick={() => handleRead(notif.id)}
              className={`p-4 border-b border-slate-100 dark:border-slate-800 text-sm cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 ${!notif.is_read ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium">{notif.title}</span>
                {!notif.is_read && <span className="h-2 w-2 bg-indigo-600 rounded-full"></span>}
              </div>
              <p className="text-slate-500">{notif.message}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
