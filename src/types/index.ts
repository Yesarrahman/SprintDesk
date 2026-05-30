export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed' | 'cancelled' | 'archived'
export type RecurringType = 'daily' | 'weekly'
export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'member'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
}

export interface Task {
  id: string
  workspace_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  start_date: string | null
  estimated_duration: number | null
  actual_duration: number | null
  assigned_to: string | null
  created_by: string | null
  recurring: boolean
  recurring_type: RecurringType | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  created_at: string
}

export interface Tag {
  id: string
  name: string
  color: string | null
  created_at: string
}

export interface TaskTag {
  id: string
  task_id: string
  tag_id: string
}

export interface Attachment {
  id: string
  task_id: string
  file_url: string
  file_name: string
  created_at: string
}

export interface AppNotification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface ActivityLog {
  id: string
  workspace_id: string
  user_id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  created_at: string
}
