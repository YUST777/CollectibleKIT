-- Shadow Ban System Migration
-- Run this in Supabase SQL Editor

-- Add shadow ban columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_shadow_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cheating_flags INTEGER DEFAULT 0;

-- Create index for efficient leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_shadow_banned ON users(is_shadow_banned);

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('is_shadow_banned', 'cheating_flags');
