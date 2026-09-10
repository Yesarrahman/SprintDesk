'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CheckSquare, KanbanSquare, CalendarDays, Users, Settings, LogOut, ChevronLeft, ChevronRight, Inbox, Zap, FileText, CreditCard, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui-store'
import { logout } from '@/app/(auth)/actions'
import { WorkspaceSelector } from './workspace-selector'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Capture Inbox', href: '/inbox', icon: Inbox },
  { name: 'Kanban Board', href: '/kanban', icon: KanbanSquare },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Automations', href: '/automations', icon: Zap },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, activeTier } = useUIStore()

  const isPaid = activeTier === 'pro' || activeTier === 'agency'

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen border-r border-slate-200/40 dark:border-slate-800/60 bg-white/30 dark:bg-[#0D2440]/60 backdrop-blur-2xl transition-all duration-300 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="p-4 flex items-center justify-between shrink-0">
        {sidebarOpen && (
          <div className="flex w-full items-center justify-center pt-2">
            <Image src="/logo.png" alt="SprintDesk Logo" width={350} height={105} className="h-20 w-auto object-contain drop-shadow-sm dark:brightness-0 dark:invert" priority />
          </div>
        )}
        {!sidebarOpen && (
          <div className="mx-auto flex items-center justify-center">
            <Image src="/icon.png" alt="SD" width={32} height={32} className="h-8 w-8 object-contain" priority />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="absolute -right-4 top-5 rounded-full border shadow-sm bg-white dark:bg-slate-900 hidden md:flex"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        <WorkspaceSelector sidebarOpen={sidebarOpen} />

        <nav className="flex-1 space-y-1 p-3 mt-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2.5 transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary dark:text-primary font-medium shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white',
                  !sidebarOpen && 'justify-center px-0'
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0 transition-colors', isActive ? 'text-primary dark:text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300')} />
                {sidebarOpen && <span className="ml-3 truncate">{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-200/50 dark:border-slate-800/50 space-y-2 shrink-0">
        {/* Show Upgrade Widget ONLY if free tier */}
        {!isPaid && sidebarOpen && (
          <Link href="/billing">
            <div className="mb-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-3 text-white cursor-pointer hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-500/25">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-100">Upgrade your plan</span>
              </div>
              <p className="text-[11px] text-indigo-200 leading-snug">
                Unlock PDF Reports, unlimited members &amp; more.
              </p>
              <div className="mt-2 flex items-center gap-1 text-white text-[11px] font-semibold">
                View plans <span className="text-indigo-300">→</span>
              </div>
            </div>
          </Link>
        )}

        {!isPaid && !sidebarOpen && (
          <Link href="/billing" title="Upgrade Plan">
            <div className="flex justify-center mb-1">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center transition-all shadow-md cursor-pointer bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/25">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          </Link>
        )}

        <form action={logout}>
          <button
            type="submit"
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-50 transition-colors',
              !sidebarOpen && 'justify-center px-0'
            )}
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-slate-400" />
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
