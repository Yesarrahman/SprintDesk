import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateTaskDialog } from '@/components/kanban/create-task-dialog'

export default async function TasksPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('tasks')
    .select(`
      *,
      profiles:assigned_to (
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (activeWorkspaceId) {
    query = query.eq('workspace_id', activeWorkspaceId)
  }

  const { data: tasks, error } = await query

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'todo': return <Badge variant="outline">To Do</Badge>
      case 'in_progress': return <Badge variant="secondary" className="bg-blue-100 text-blue-700">In Progress</Badge>
      case 'completed': return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive">Urgent</Badge>
      case 'high': return <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">High</Badge>
      case 'medium': return <Badge variant="secondary">Medium</Badge>
      case 'low': return <Badge variant="outline">Low</Badge>
      default: return <Badge variant="outline">{priority}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <CreateTaskDialog />
      </div>

      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500">Failed to load tasks.</p>}
          {!error && tasks && tasks.length === 0 && (
            <div className="text-center p-8 text-slate-500">
              No tasks found. Create one to get started!
            </div>
          )}
          {!error && tasks && tasks.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Assignee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>
                      {task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '-'}
                    </TableCell>
                    <TableCell>
                      {task.profiles?.full_name || 'Unassigned'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
