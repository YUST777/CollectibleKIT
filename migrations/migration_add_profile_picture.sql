-- Migration: Profile pictures are now fetched dynamically from unavatar.io
-- No database column needed - we use telegram_username to construct the URL:
-- https://unavatar.io/telegram/{telegram_username}
-- This migration file is kept for reference but no schema changes are needed.

