-- Phase 7: Reports Feature
-- Adds subscription_tier tracking and submitted_reports storage

-- 1. Add subscription_tier to profiles
-- Tier is stored at the workspace level (workspaces.tier already exists from phase4).
-- We also track it at the profile level for individual user checks.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD CONSTRAINT valid_profile_tier
  CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));

-- 2. Create submitted_reports table
-- Stores report data saved when a member clicks "Submit to Manager".
-- report_data is the full computed JSON snapshot at submission time.
CREATE TABLE IF NOT EXISTS submitted_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  member_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  member_name   TEXT NOT NULL,
  range_from    DATE NOT NULL,
  range_to      DATE NOT NULL,
  report_data   JSONB NOT NULL,
  submitted_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE submitted_reports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Members can insert their own reports
CREATE POLICY "Members can submit their own reports"
  ON submitted_reports FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- Members can only read their own submitted reports
CREATE POLICY "Members can view own submitted reports"
  ON submitted_reports FOR SELECT
  USING (auth.uid() = member_id);

-- Workspace admins and owners can read all submitted reports for their workspace
-- (App-level role check handles admin/owner distinction)
CREATE POLICY "Workspace members can view submitted reports in their workspace"
  ON submitted_reports FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
