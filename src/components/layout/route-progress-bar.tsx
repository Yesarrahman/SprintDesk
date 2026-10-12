'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function RouteProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // When pathname or searchParams change, the navigation has completed
    setIsNavigating(false)
    setProgress(100)
    const timeout = setTimeout(() => {
      setProgress(0)
    }, 250)
    return () => clearTimeout(timeout)
  }, [pathname, searchParams])

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isNavigating) {
      setProgress(15)
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) return prev
          const step = Math.max(1, (85 - prev) * 0.2)
          return prev + step
        })
      }, 100)
    }

    return () => clearInterval(timer)
  }, [isNavigating])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Only trigger for internal links that differ from current url
      if (
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !target.getAttribute('target') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const currentUrl = window.location.pathname + window.location.search
        if (href !== currentUrl) {
          setIsNavigating(true)
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #3b82f6 100%)',
        boxShadow: '0 0 10px rgba(99, 102, 241, 0.7), 0 0 5px rgba(168, 85, 247, 0.5)',
        opacity: progress === 100 ? 0 : 1,
      }}
    />
  )
}
