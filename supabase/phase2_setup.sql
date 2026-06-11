-- Phase 2 Database Schema Updates

-- 1. Add Story Points to Tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_points INTEGER;

-- 2. Add Epic ID to Tasks (for future Epic grouping)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS epic_id UUID; -- references epics table when created
