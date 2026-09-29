import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function BillingLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800">
            <CardHeader>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-28 mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
              <Skeleton className="h-10 w-full mt-4 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
