-- Phase 6 Database Schema Updates (Time Tracking)

CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View time logs" ON time_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Insert time logs" ON time_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update time logs" ON time_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Delete time logs" ON time_logs
  FOR DELETE USING (auth.uid() = user_id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_type TEXT DEFAULT 'none';
