'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Avoid hydration mismatch
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex gap-4">
        <div className="h-20 w-32 rounded-lg border-2 border-transparent bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-20 w-32 rounded-lg border-2 border-transparent bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          "h-20 w-32 rounded-lg border-2 flex items-center justify-center font-medium transition-all duration-200",
          theme === 'light' 
            ? "border-primary bg-slate-50 text-slate-900 shadow-sm" 
            : "border-transparent bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        )}
      >
        Light
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          "h-20 w-32 rounded-lg border-2 flex items-center justify-center font-medium transition-all duration-200",
          theme === 'dark' 
            ? "border-primary bg-[#0D2440] text-white shadow-sm" 
            : "border-transparent bg-slate-900 text-slate-400 hover:text-slate-300 dark:bg-slate-800"
        )}
      >
        Dark
      </button>
    </div>
  )
}
