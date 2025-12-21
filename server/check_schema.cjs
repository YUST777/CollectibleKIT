require('dotenv').config({ path: '/root/icpchue/server/.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function checkColumns() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
        console.table(res.rows);
        pool.end();
    } catch (err) {
        console.error(err);
    }
}

checkColumns();
