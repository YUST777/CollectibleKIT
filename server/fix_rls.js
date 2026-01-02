import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is missing");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixRls() {
    try {
        console.log('Applying RLS fixes...');

        // 1. Enable RLS
        await pool.query(`ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;`);
        await pool.query(`ALTER TABLE view_logs ENABLE ROW LEVEL SECURITY;`);
        console.log('✓ RLS enabled on tables');

        // 2. Add Read Policy for page_views (Public can see views)
        // We drop first to avoid "policy already exists" errors if re-run
        await pool.query(`DROP POLICY IF EXISTS "Public read access" ON page_views;`);
        await pool.query(`
      CREATE POLICY "Public read access" 
      ON page_views 
      FOR SELECT 
      TO public 
      USING (true);
    `);
        console.log('✓ Read policy added to page_views');

        // 3. Optional: Add policy for view_logs?
        // User backend connects as superuser usually, but "anon" shouldn't see logs.
        // Default RLS is "deny all", so enabled RLS with NO policies is secure for private tables.
        // So we don't add policies to view_logs to keep it private (except for admin).

        console.log('✅ Security fixes applied.');
    } catch (err) {
        console.error('❌ Failed to apply RLS:', err);
    } finally {
        await pool.end();
    }
}

fixRls();
