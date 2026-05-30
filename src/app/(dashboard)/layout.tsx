import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { VerificationToast } from '@/components/auth/verification-toast'
import { Suspense } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Background gradients for glassmorphism */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

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
