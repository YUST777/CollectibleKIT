-- Migration: Add blind index columns for O(1) lookups
-- This prevents the O(N) decryption bottleneck and fixes race conditions

-- Add blind index columns
ALTER TABLE applications ADD COLUMN IF NOT EXISTS email_blind_index TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS national_id_blind_index TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS telephone_blind_index TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS student_id_blind_index TEXT;

-- Create unique indexes (enforces uniqueness at DB level - fixes race conditions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_email_blind 
ON applications(email_blind_index) 
WHERE email_blind_index IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_national_id_blind 
ON applications(national_id_blind_index) 
WHERE national_id_blind_index IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_telephone_blind 
ON applications(telephone_blind_index) 
WHERE telephone_blind_index IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_student_id_blind 
ON applications(student_id_blind_index) 
WHERE student_id_blind_index IS NOT NULL;

-- Add index on users table for email lookup
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_blind_index TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_blind 
ON users(email_blind_index) 
WHERE email_blind_index IS NOT NULL;
