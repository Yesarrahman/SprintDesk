'use client'

import { Bell, Search, Menu } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Header() {
  const { toggleSidebar } = useUIStore()
  const { user, profile } = useAuth()

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = getInitials(profile?.full_name || user?.user_metadata?.full_name)

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="max-w-md w-full relative hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search tasks..." 
            className="pl-9 bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-slate-800/50 focus-visible:ring-indigo-500/50" 
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
        </Button>
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs text-slate-500 mt-1">{user?.email}</p>
          </div>
          <Avatar className="h-9 w-9 border border-indigo-100 dark:border-indigo-900 shadow-sm">
            <AvatarImage src={profile?.avatar_url || ''} alt={displayName} />
            <AvatarFallback className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
