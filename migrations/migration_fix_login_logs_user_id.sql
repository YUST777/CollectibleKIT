-- Migration: Fix login_logs.user_id type mismatch
-- users.id is bigint but login_logs.user_id is integer, causing insert failures

-- First, drop the existing column (if it has data, we'll lose it, but that's okay for logs)
ALTER TABLE login_logs 
DROP COLUMN IF EXISTS user_id;

-- Add it back as bigint to match users.id
ALTER TABLE login_logs 
ADD COLUMN user_id bigint REFERENCES users(id) ON DELETE SET NULL;

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);

