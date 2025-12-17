import pg from 'pg';
const { Pool } = pg;

// Database pool singleton
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL is not set');
        }
        pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
    }
    return pool;
}

export async function query(text: string, params?: any[]) {
    const pool = getPool();
    return pool.query(text, params);
}
