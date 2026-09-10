-- Phase 8: Account-Level Billing Migration
-- Ensures profiles table holds Stripe customer, subscription, and tier data.
-- Also syncs any existing workspace subscriptions to the workspace owner's profile.

-- 1. Add columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- 2. Sync existing workspace tiers and Stripe IDs to the owner's profile
UPDATE profiles p
SET
  subscription_tier = COALESCE(w.tier, 'free'),
  stripe_customer_id = COALESCE(w.stripe_customer_id, p.stripe_customer_id),
  stripe_subscription_id = COALESCE(w.stripe_subscription_id, p.stripe_subscription_id)
FROM workspaces w
WHERE w.owner_id = p.id
  AND w.tier IN ('pro', 'agency', 'enterprise');
