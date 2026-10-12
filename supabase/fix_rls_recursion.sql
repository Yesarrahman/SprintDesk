-- ====================================================================
-- SprintDesk RLS Recursion Fix Migration
-- Fixes infinite recursion on workspace_members and profiles
-- ====================================================================

-- 1. Redefine get_user_workspace_ids() as SECURITY DEFINER owned by postgres
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  UNION
  SELECT id FROM public.workspaces WHERE owner_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workspace_ids() TO authenticated;

-- 2. Drop recursive policies on workspace_members
DROP POLICY IF EXISTS "Users can view workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can manage memberships" ON workspace_members;

-- 3. Non-recursive policy for workspace_members
-- A user can see their own membership and memberships of workspaces they own
CREATE POLICY "Users can view workspace memberships"
ON workspace_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Owners and admins can manage memberships"
ON workspace_members FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- 4. Secure profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Colleagues can view basic profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Colleagues can view basic profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT user_id FROM workspace_members 
    WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    UNION
    SELECT owner_id FROM workspaces 
    WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  )
);
