-- Create password_resets table for forgot password functionality
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    used BOOLEAN DEFAULT FALSE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- Clean up expired tokens (optional, run periodically)
-- DELETE FROM password_resets WHERE expires_at < NOW() OR used = TRUE;

COMMENT ON TABLE password_resets IS 'Stores password reset tokens for forgot password functionality';
COMMENT ON COLUMN password_resets.email IS 'User email requesting password reset';
COMMENT ON COLUMN password_resets.token_hash IS 'SHA256 hash of the reset token';
COMMENT ON COLUMN password_resets.expires_at IS 'Token expiration timestamp (24 hours from creation)';
COMMENT ON COLUMN password_resets.used IS 'Whether this token has been used';

