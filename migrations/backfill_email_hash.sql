-- Backfill email_hash for existing applications
-- Run this AFTER deploying the code with hashEmail function

-- This script should be run using Node.js to use the same hash function
-- Create a file: scripts/backfill-email-hash.ts

/*
Usage:
1. Run migration: add_email_hash.sql
2. Deploy new code
3. Run: npx ts-node scripts/backfill-email-hash.ts

Or use the self-healing approach already built into the APIs:
- check-email, register, and auth/me all auto-populate email_hash 
  when they encounter legacy data
- Just let users access the system naturally and hashes will fill in
*/
