-- Migration: Add profile_picture column to users table
-- Stores the filename (e.g., "uuid.webp") of the user's uploaded profile picture
-- Full path is constructed server-side for security

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(100);

-- Create index for potential future queries
CREATE INDEX IF NOT EXISTS idx_users_profile_picture ON users(profile_picture) WHERE profile_picture IS NOT NULL;
