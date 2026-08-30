'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { searchTasks } from '@/app/(dashboard)/kanban/actions'
import { Search } from 'lucide-react'

export function SearchCommand({ workspaceId }: { workspaceId?: string }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<any[]>([])
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  React.useEffect(() => {
    if (!workspaceId || !query) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      const res = await searchTasks(query, workspaceId)
      if (res.tasks) setResults(res.tasks)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, workspaceId])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full md:w-64 flex items-center gap-2 text-sm text-slate-500 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search tasks...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium opacity-100 dark:bg-slate-800 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search for a task..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query && results.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
          {!query && <CommandEmpty>Type to start searching...</CommandEmpty>}
          {results.length > 0 && (
            <CommandGroup heading="Tasks">
              {results.map((task) => (
                <CommandItem
                  key={task.id}
                  value={task.title}
                  onSelect={() => {
                    setOpen(false)
                    // Navigate to kanban board and pass taskId so EditTaskDialog opens
                    router.push(`/kanban?taskId=${task.id}`)
                  }}
                >
                  <div className="flex flex-col">
                    <span>{task.title}</span>
                    <span className="text-xs text-slate-500">
                      {task.status.replace('_', ' ')} • {task.priority}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
