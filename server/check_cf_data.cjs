require('dotenv').config({ path: '/root/icpchue/server/.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function checkMissingData() {
    try {
        console.log('--- Checking Codeforces Data Integrity ---');

        // Count users with handle but no data
        const missingData = await pool.query(`
      SELECT count(*) 
      FROM users 
      WHERE codeforces_handle IS NOT NULL 
      AND codeforces_handle != ''
      AND (codeforces_data IS NULL OR codeforces_data::text = '{}' OR codeforces_data::text = 'null')
    `);

        console.log(`Users with handle but NO data: ${missingData.rows[0].count}`);

        // List a few examples
        if (parseInt(missingData.rows[0].count) > 0) {
            const examples = await pool.query(`
        SELECT id, email, codeforces_handle 
        FROM users 
        WHERE codeforces_handle IS NOT NULL 
        AND codeforces_handle != ''
        AND (codeforces_data IS NULL OR codeforces_data::text = '{}' OR codeforces_data::text = 'null')
        LIMIT 5
      `);
            console.table(examples.rows);
        }

        pool.end();
    } catch (err) {
        console.error('Error querying DB:', err);
    }
}

checkMissingData();
