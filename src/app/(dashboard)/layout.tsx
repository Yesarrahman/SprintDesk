import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { VerificationToast } from '@/components/auth/verification-toast'
import { RouteProgressBar } from '@/components/layout/route-progress-bar'
import { Suspense } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      <Suspense fallback={null}>
        <RouteProgressBar />
      </Suspense>

      {/* Ambient background glows - hardware accelerated without blend-mode thrashing */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/15 to-transparent rounded-full blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-purple-500/15 to-transparent rounded-full blur-3xl"></div>

      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 z-10 relative">
        <Header />
        
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto h-full">
            <Suspense fallback={null}>
              <VerificationToast />
            </Suspense>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
