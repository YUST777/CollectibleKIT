import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const enableRlsQuery = `
    ALTER TABLE email_verification_otps ENABLE ROW LEVEL SECURITY;
`;

async function run() {
    try {
        console.log('Connecting to DB...');
        await pool.query(enableRlsQuery);
        console.log('✅ RLS enabled on email_verification_otps.');
    } catch (err) {
        console.error('❌ Error enabling RLS:', err);
    } finally {
        await pool.end();
    }
}

run();
