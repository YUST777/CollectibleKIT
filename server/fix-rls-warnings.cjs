const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixRLS() {
    const client = await pool.connect();
    try {
        console.log('Fixing RLS policies...');

        // 1. email_verification_otps
        // It's sensitive. Explicitly deny all access (except superuser/backend).
        // If a policy exists, drop it first to be safe or create if not exists.
        console.log('Processing email_verification_otps...');
        await client.query(`ALTER TABLE IF EXISTS email_verification_otps ENABLE ROW LEVEL SECURITY;`);
        await client.query(`DROP POLICY IF EXISTS "explicit_deny_all" ON email_verification_otps;`);
        await client.query(`
            CREATE POLICY "explicit_deny_all" ON email_verification_otps
            FOR ALL USING (false);
        `);
        console.log('✓ email_verification_otps policy created (Deny All)');

        // 2. view_logs
        // It tracks views. Explicitly deny direct access for now, assuming backend handles everything.
        // If we want public stats later, we can change this. Backend bypasses RLS if superuser.
        console.log('Processing view_logs...');
        await client.query(`ALTER TABLE IF EXISTS view_logs ENABLE ROW LEVEL SECURITY;`);
        await client.query(`DROP POLICY IF EXISTS "explicit_deny_all" ON view_logs;`);
        await client.query(`
            CREATE POLICY "explicit_deny_all" ON view_logs
            FOR ALL USING (false);
        `);
        console.log('✓ view_logs policy created (Deny All)');

        console.log('\n✅ RLS policies fixed!');

    } catch (error) {
        console.error('❌ Error fixing RLS:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixRLS();
