-- Reset all profiles and workspaces to Free tier
-- Run this in your Supabase SQL Editor to clear any manual testing tiers

UPDATE profiles
SET
  subscription_tier = 'free',
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL;

UPDATE workspaces
SET
  tier = 'free',
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL;
