-- Fix password_resets token_hash column to support bcrypt hashes
-- Bcrypt hashes are 60 characters, VARCHAR(64) is too short for some edge cases
-- Changing to TEXT for flexibility

ALTER TABLE password_resets ALTER COLUMN token_hash TYPE TEXT;

-- Update comment to reflect actual usage
COMMENT ON COLUMN password_resets.token_hash IS 'bcrypt hash of the reset token (not SHA256 as originally documented)';
