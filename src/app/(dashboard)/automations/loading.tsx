import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AutomationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800">
            <CardContent className="pt-5 pb-5 flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
