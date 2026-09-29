import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function InboxLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Input area */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800">
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="flex justify-end">
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Inbox items */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800">
            <CardContent className="pt-4 pb-4 flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <div className="flex gap-2 shrink-0">
                <Skeleton className="h-8 w-20 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
