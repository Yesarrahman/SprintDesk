-- ====================================================================
-- SprintDesk Multi-Tenant Security & OWASP ASVS Remediation Migration
-- Drops ALL existing duplicate/permissive policies on tasks & automations
-- and applies strict workspace membership isolation.
-- ====================================================================

-- 1. Helper function: Get user workspace IDs with SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_user_workspace_ids() CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  UNION
  SELECT id FROM workspaces WHERE owner_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workspace_ids() TO authenticated;

-- 2. Drop ALL existing policies on tasks & automations dynamically
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (
      SELECT policyname, tablename 
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename IN ('tasks', 'automations')
    ) LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename); 
    END LOOP; 
END $$;

-- 3. SECURE `tasks` TABLE
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read tasks in their workspaces"
ON tasks FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can insert tasks into their workspaces"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can update tasks in their workspaces"
ON tasks FOR UPDATE
TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can delete tasks in their workspaces"
ON tasks FOR DELETE
TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

-- 4. SECURE `automations` TABLE
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace automations"
ON automations FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can insert workspace automations"
ON automations FOR INSERT
TO authenticated
WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can update workspace automations"
ON automations FOR UPDATE
TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can delete workspace automations"
ON automations FOR DELETE
TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

-- 5. SECURE `time_logs` TABLE
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View time logs" ON time_logs;
DROP POLICY IF EXISTS "Insert time logs" ON time_logs;
DROP POLICY IF EXISTS "Update time logs" ON time_logs;
DROP POLICY IF EXISTS "Delete time logs" ON time_logs;
DROP POLICY IF EXISTS "View time logs in user workspaces" ON time_logs;
DROP POLICY IF EXISTS "Insert time logs for user tasks" ON time_logs;
DROP POLICY IF EXISTS "Update own time logs" ON time_logs;
DROP POLICY IF EXISTS "Delete own time logs" ON time_logs;

CREATE POLICY "View time logs in user workspaces"
ON time_logs FOR SELECT
TO authenticated
USING (
  task_id IN (
    SELECT id FROM tasks WHERE workspace_id IN (SELECT public.get_user_workspace_ids())
  )
);

CREATE POLICY "Insert time logs for user tasks"
ON time_logs FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND task_id IN (
    SELECT id FROM tasks WHERE workspace_id IN (SELECT public.get_user_workspace_ids())
  )
);

CREATE POLICY "Update own time logs"
ON time_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Delete own time logs"
ON time_logs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6. SECURE `profiles` TABLE
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Colleagues can view basic profiles" ON profiles;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Colleagues can view basic profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT user_id FROM workspace_members WHERE workspace_id IN (SELECT public.get_user_workspace_ids())
    UNION
    SELECT owner_id FROM workspaces WHERE id IN (SELECT public.get_user_workspace_ids())
  )
);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);
