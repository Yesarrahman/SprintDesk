'use client'

import { useEffect, useState } from 'react'

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return 'Good morning'
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon'
  } else {
    return 'Good evening'
  }
}

interface DashboardGreetingProps {
  userName: string
  initialGreeting?: string
}

export function DashboardGreeting({ userName, initialGreeting }: DashboardGreetingProps) {
  const [greeting, setGreeting] = useState(initialGreeting || 'Good day')

  useEffect(() => {
    setGreeting(getTimeGreeting())
  }, [])

  return (
    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
      {greeting}, {userName}
    </h1>
  )
}
