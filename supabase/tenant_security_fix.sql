-- ====================================================================
-- SprintDesk Full Multi-Tenant Security & RLS Recursion Fix
-- 1. Eliminates infinite recursion on workspace_members & workspaces
-- 2. Makes get_user_workspace_ids() non-inlined (plpgsql SECURITY DEFINER)
-- 3. Enables clean task queries with profiles:assigned_to joins
-- ====================================================================

-- 1. Helper function: Non-inlined plpgsql SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_user_workspace_ids() CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM workspaces WHERE owner_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workspace_ids() TO authenticated;

-- 2. Drop ALL policies on workspace_members, workspaces, tasks, automations, time_logs, profiles
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (
      SELECT policyname, tablename 
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename IN ('workspace_members', 'workspaces', 'tasks', 'automations', 'time_logs', 'profiles')
    ) LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename); 
    END LOOP; 
END $$;

-- 3. SECURE `workspaces` TABLE (No recursion)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspaces they belong to"
ON workspaces FOR SELECT
TO authenticated
USING (id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can create workspaces"
ON workspaces FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their workspaces"
ON workspaces FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces"
ON workspaces FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- 4. SECURE `workspace_members` TABLE (No recursion)
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace memberships"
ON workspace_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR workspace_id IN (SELECT public.get_user_workspace_ids())
);

CREATE POLICY "Owners and admins can manage memberships"
ON workspace_members FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT public.get_user_workspace_ids())
);

-- 5. SECURE `tasks` TABLE
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

-- 6. SECURE `automations` TABLE
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

-- 7. SECURE `time_logs` TABLE
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

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

-- 8. SECURE `profiles` TABLE (Prevents anon leak & enables colleague name joins)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

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
