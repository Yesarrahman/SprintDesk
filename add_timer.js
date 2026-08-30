const fs = require('fs');
let content = fs.readFileSync('src/components/kanban/edit-task-dialog.tsx', 'utf8');

if (!content.includes('toggleTaskTimer')) {
  content = content.replace(
    "import { \n  updateTaskDetails",
    "import { toggleTaskTimer, fetchTaskTime } from '@/app/(dashboard)/kanban/actions';\nimport { \n  updateTaskDetails"
  );
}

if (!content.includes('timeState')) {
  content = content.replace(
    "const [newLinkRelation, setNewLinkRelation] = useState('relates_to')",
    "const [newLinkRelation, setNewLinkRelation] = useState('relates_to')\n  \n  // Timer State\n  const [timeState, setTimeState] = useState({ totalSeconds: 0, isRunning: false })\n  const [timerInterval, setTimerInterval] = useState<any>(null)"
  );
}

content = content.replace(
  "fetchLinkedTasks(task.id).then(res => { if (res.links) setLinks(res.links) })",
  "fetchLinkedTasks(task.id).then(res => { if (res.links) setLinks(res.links) })\n      fetchTaskTime(task.id).then(res => setTimeState(res as any))"
);

if (!content.includes('formatTime')) {
  content = content.replace(
    "  return (\n    <Dialog open={open} onOpenChange={onOpenChange}>",
      useEffect(() => {
    if (timeState.isRunning) {
      const interval = setInterval(() => {
        setTimeState(prev => ({ ...prev, totalSeconds: prev.totalSeconds + 1 }))
      }, 1000)
      setTimerInterval(interval)
      return () => clearInterval(interval)
    } else if (timerInterval) {
      clearInterval(timerInterval)
    }
    return () => {}
  }, [timeState.isRunning])

  const handleToggleTimer = async () => {
    setTimeState(prev => ({ ...prev, isRunning: !prev.isRunning }))
    const res = await toggleTaskTimer(task.id)
    if (res.error) {
      toast.error(res.error)
      setTimeState(prev => ({ ...prev, isRunning: !prev.isRunning }))
    } else {
      toast.success(res.status === 'started' ? 'Timer started' : 'Timer stopped')
    }
  }

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return \\\\\\:\\\:\\\\\\
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  );
}

if (!content.includes('formatTime(timeState')) {
  content = content.replace(
    "<div>\n            <DialogTitle>Edit Task</DialogTitle>",
    <div className="flex items-center gap-4">
            <DialogTitle>Edit Task</DialogTitle>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800">
               <div className="text-sm font-mono text-slate-700 dark:text-slate-300 w-20 text-center">{formatTime(timeState.totalSeconds)}</div>
               <Button size="sm" variant={timeState.isRunning ? 'destructive' : 'default'} className="h-6 text-xs px-2" onClick={handleToggleTimer}>
                 {timeState.isRunning ? 'Stop' : 'Start'}
               </Button>
            </div>
          </div>
          <div>
  );
}

fs.writeFileSync('src/components/kanban/edit-task-dialog.tsx', content);
