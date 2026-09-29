import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {[...Array(3)].map((_, i) => (
        <Card key={i} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
