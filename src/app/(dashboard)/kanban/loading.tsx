import { Skeleton } from "@/components/ui/skeleton"

export default function KanbanLoading() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      
      <div className="flex gap-6 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
        {[1, 2, 3].map((col) => (
          <div key={col} className="flex flex-col w-[350px] shrink-0 rounded-2xl border bg-slate-100/50 dark:bg-slate-900/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((task) => (
                <Skeleton key={task} className="h-[120px] w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
