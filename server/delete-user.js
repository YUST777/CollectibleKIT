import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Connecting to DB...');
        await client.query('BEGIN');

        // 1. Delete dependent training_submissions
        console.log('Deleting dependent training_submissions...');
        await client.query('DELETE FROM training_submissions WHERE user_id = 1');

        // 2. Try deleting user
        console.log('Deleting user 1...');
        await client.query('DELETE FROM users WHERE id = 1');

        await client.query('COMMIT');
        console.log('✅ User 1 and dependent data deleted successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error deleting user:', err.message);
        if (err.constraint) {
            console.error('Constraint blocker:', err.constraint);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

run();
