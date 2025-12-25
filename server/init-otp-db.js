import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config(); // Loads .env from current directory

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS email_verification_otps (
        email VARCHAR(255) PRIMARY KEY,
        otp_code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
`;

async function run() {
    try {
        console.log('Connecting to DB...');
        await pool.query(createTableQuery);
        console.log('✅ OTP table created successfully.');
    } catch (err) {
        console.error('❌ Error creating table:', err);
    } finally {
        await pool.end();
    }
}

run();
