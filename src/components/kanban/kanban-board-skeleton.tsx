export function KanbanBoardSkeleton() {
  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
      {[1, 2, 3].map((col) => (
        <div
          key={col}
          className="flex-shrink-0 w-80 bg-slate-100/50 dark:bg-slate-800/20 rounded-2xl p-4 flex flex-col gap-4 animate-pulse"
        >
          {/* Column Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div className="h-5 w-24 bg-slate-300 dark:bg-slate-700 rounded-md" />
            </div>
            <div className="h-6 w-8 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Task Cards Skeletons */}
          {[1, 2, 3].map((task) => (
            <div
              key={task}
              className="h-32 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
              <div className="flex justify-between items-center mt-4">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
