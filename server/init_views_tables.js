import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from current directory
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is missing/undefined in .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Connecting to DB...');

        // 1. page_views table (The O(1) read table)
        // Stores the total count.
        await pool.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        views_count BIGINT DEFAULT 0,
        PRIMARY KEY (entity_type, entity_id)
      );
    `);
        console.log('✓ page_views table ensured');

        // 2. view_logs table (The Uniqueness check table)
        // Stores every unique view by a user.
        await pool.query(`
      CREATE TABLE IF NOT EXISTS view_logs (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id BIGINT NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_view UNIQUE (user_id, entity_type, entity_id)
      );
    `);
        console.log('✓ view_logs table ensured');

        console.log('✅ Migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
