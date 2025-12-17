-- Migration: Add telegram_username to users table
-- This allows users without applications to still link their Telegram account

ALTER TABLE users
ADD COLUMN IF NOT EXISTS telegram_username text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_username ON users(telegram_username) WHERE telegram_username IS NOT NULL;

-- Comment on the column
COMMENT ON COLUMN users.telegram_username IS 'Telegram username for users who may not have an application yet';

