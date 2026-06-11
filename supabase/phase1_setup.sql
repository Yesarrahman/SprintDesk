-- Phase 1 Database Schema Updates

-- 1. Kanban Columns
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- null if team workspace
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inbox Items (Capture Inbox)
CREATE TABLE IF NOT EXISTS inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update Tasks table to reference kanban_column instead of string status
-- Wait, the `status` enum might be better kept, and we just map columns to status or let column act as a wrapper.
-- To be safe, we can add a `column_id` to tasks.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS column_id UUID REFERENCES kanban_columns(id) ON DELETE SET NULL;

-- 4. Subtasks
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tags & Task_Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(task_id, tag_id)
);

-- Note: We might need RLS policies for these tables.
-- For simplicity, if RLS is enabled, we should add policies:
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Basic policies (assuming authenticated users)
CREATE POLICY "Users can manage their inbox" ON inbox_items FOR ALL USING (auth.uid() = user_id);
-- (Add other policies as needed depending on existing workspace logic)
