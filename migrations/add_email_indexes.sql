-- Create index on users.email for faster lookups during registration
-- This helps both the register and auth/me endpoints

-- Index for user email lookups (already likely exists as it's a unique column)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- For the LIKE query on email prefix (student ID lookup)
-- This helps the profile/[studentId] API
CREATE INDEX IF NOT EXISTS idx_users_email_pattern ON users(email text_pattern_ops);

-- Add email lookup column to applications if we want to avoid O(n) decrypt
-- Option 1: Store email hash for lookup (BCrypt is too slow, use SHA256)
-- ALTER TABLE applications ADD COLUMN IF NOT EXISTS email_hash TEXT;
-- CREATE INDEX IF NOT EXISTS idx_applications_email_hash ON applications(email_hash);

-- Note: For now, the application_id foreign key on users table should be the primary 
-- lookup path. The O(n) fallback only triggers when application_id is NULL or invalid.
-- Consider running a one-time migration to ensure all users have valid application_id links.

-- Verify all users have application_id set (cleanup query - run manually if needed):
-- UPDATE users u SET application_id = a.id 
-- FROM applications a 
-- WHERE u.application_id IS NULL 
-- AND u.email = decrypt_email_somehow(a.email);
