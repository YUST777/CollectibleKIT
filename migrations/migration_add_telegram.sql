-- Copy and paste this into your Supabase SQL Editor to fix the database schema
-- 1. Add the missing Telegram Username column
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS telegram_username text;
-- 2. Ensure other profile columns exist (just in case)
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS codeforces_profile text;
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS leetcode_profile text;
-- 3. Verify it worked by selecting one row
SELECT id,
    telegram_username
FROM applications
LIMIT 1;