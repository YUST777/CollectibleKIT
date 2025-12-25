-- Migration: Add email_hash column for O(1) email lookups
-- This replaces O(n) decryption scans with indexed hash lookups

-- Add email_hash column (SHA256 hex, 64 chars)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_applications_email_hash ON applications(email_hash);

-- Note: After running this migration, run the backfill script to populate 
-- email_hash for existing applications, then deploy the updated code.
