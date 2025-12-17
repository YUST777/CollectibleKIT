-- Add last_scraped column to applications table
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS last_scraped TIMESTAMP WITH TIME ZONE;
-- Optional: Add index if querying by this column frequently (not strictly needed for profile update)
-- CREATE INDEX IF NOT EXISTS idx_applications_last_scraped ON applications(last_scraped);
-- Verify the column was added
SELECT column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'applications'
    AND column_name = 'last_scraped';