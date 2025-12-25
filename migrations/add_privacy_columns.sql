-- Migration: Add granular privacy settings columns
-- Run this in Supabase SQL Editor

-- Add visibility columns for each feature
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS show_on_cf_leaderboard BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_on_sheets_leaderboard BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_public_profile BOOLEAN DEFAULT TRUE;

-- Migrate existing settings: if profile_visibility = 'private', hide from all
UPDATE users 
SET 
    show_on_cf_leaderboard = CASE WHEN profile_visibility = 'private' THEN FALSE ELSE TRUE END,
    show_on_sheets_leaderboard = CASE WHEN profile_visibility = 'private' THEN FALSE ELSE TRUE END,
    show_public_profile = CASE WHEN profile_visibility = 'private' THEN FALSE ELSE TRUE END
WHERE profile_visibility IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_cf_leaderboard ON users(show_on_cf_leaderboard);
CREATE INDEX IF NOT EXISTS idx_users_sheets_leaderboard ON users(show_on_sheets_leaderboard);
CREATE INDEX IF NOT EXISTS idx_users_public_profile ON users(show_public_profile);
