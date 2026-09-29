import { Skeleton } from '@/components/ui/skeleton'

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-white/20 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-3 text-center">
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
        </div>
        {/* Calendar rows */}
        {[...Array(5)].map((_, row) => (
          <div key={row} className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 last:border-0">
            {[...Array(7)].map((_, col) => (
              <div key={col} className="min-h-[100px] p-2 border-r border-slate-200 dark:border-slate-800 last:border-0">
                <Skeleton className="h-4 w-6 mb-2" />
                {Math.random() > 0.6 && <Skeleton className="h-5 w-full rounded mb-1" />}
                {Math.random() > 0.8 && <Skeleton className="h-5 w-3/4 rounded" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
