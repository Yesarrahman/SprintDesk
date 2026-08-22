-- Phase 4 Database Schema Updates

-- 1. Automations Table
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_value TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
-- Basic RLS for automations (assuming authenticated users can read/write their workspace automations)
-- For simplicity, we just allow all authenticated users for now, RBAC handles logic in app.

-- 2. Billing Metadata on Workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free'; -- 'free', 'pro', 'enterprise'

-- Ensure tier is valid
ALTER TABLE workspaces ADD CONSTRAINT valid_tier CHECK (tier IN ('free', 'pro', 'enterprise'));
