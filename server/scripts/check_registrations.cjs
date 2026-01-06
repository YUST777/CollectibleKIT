const pg = require('pg');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const encryptionKey = process.env.DB_ENCRYPTION_KEY;

async function main() {
    try {
        console.log('=== REGISTRATION STATUS REPORT ===\n');

        // Get all applications with their blind indexes
        const appsResult = await pool.query(`
            SELECT a.id, a.email, a.email_blind_index, a.scraping_status
            FROM applications a
            ORDER BY a.id DESC
        `);

        // Get all registered users
        const usersResult = await pool.query(`
            SELECT email_blind_index FROM users WHERE email_blind_index IS NOT NULL
        `);

        const registeredBlindIndexes = new Set(usersResult.rows.map(u => u.email_blind_index));

        let notRegistered = [];
        let registered = [];
        let missingBlindIndex = [];

        for (const app of appsResult.rows) {
            if (!app.email_blind_index) {
                missingBlindIndex.push(app.id);
                continue;
            }

            if (registeredBlindIndexes.has(app.email_blind_index)) {
                registered.push(app.id);
            } else {
                notRegistered.push({
                    id: app.id,
                    scraping: app.scraping_status,
                    hasBlindIndex: !!app.email_blind_index
                });
            }
        }

        console.log(`Total Applications: ${appsResult.rows.length}`);
        console.log(`Registered Users: ${registered.length}`);
        console.log(`Applications WITHOUT registration: ${notRegistered.length}`);
        console.log(`Applications MISSING blind index: ${missingBlindIndex.length}`);

        if (missingBlindIndex.length > 0) {
            console.log(`\n❌ CRITICAL: These applications are MISSING blind index (cannot register):`);
            console.log(`   App IDs: ${missingBlindIndex.join(', ')}`);
        }

        console.log(`\n--- Applications pending registration (last 20) ---`);
        const recent = notRegistered.slice(0, 20);
        for (const app of recent) {
            console.log(`App #${app.id} - scraping: ${app.scraping} - blind_index: ${app.hasBlindIndex ? 'OK' : 'MISSING'}`);
        }

    } finally {
        await pool.end();
    }
}
main();
