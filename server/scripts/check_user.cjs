const pg = require('pg');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const encryptionKey = process.env.ENCRYPTION_KEY;

async function main() {
    try {
        const targetEmail = '8241504';
        const targetAppId = 339;

        // Check application 339 specifically
        const app339 = await pool.query('SELECT id, email, email_blind_index, scraping_status FROM applications WHERE id = $1', [targetAppId]);
        if (app339.rows.length > 0) {
            const app = app339.rows[0];
            console.log('APPLICATION 339 RAW:', JSON.stringify({
                id: app.id,
                email_encrypted: app.email ? app.email.substring(0, 50) + '...' : null,
                email_blind_index: app.email_blind_index || 'NULL',
                scraping: app.scraping_status
            }));
            try {
                const decrypted = CryptoJS.AES.decrypt(app.email, encryptionKey).toString(CryptoJS.enc.Utf8);
                console.log('APPLICATION 339 DECRYPTED EMAIL:', decrypted);
            } catch (e) {
                console.log('APPLICATION 339 EMAIL DECRYPTION FAILED:', e.message);
            }
        } else {
            console.log('APPLICATION 339 NOT FOUND');
        }

        // Check users table
        const usersResult = await pool.query('SELECT id, email, created_at FROM users');
        let found = false;
        for (const user of usersResult.rows) {
            try {
                const decrypted = CryptoJS.AES.decrypt(user.email, encryptionKey).toString(CryptoJS.enc.Utf8);
                if (decrypted.includes(targetEmail)) {
                    console.log('FOUND IN USERS: id=' + user.id + ', email=' + decrypted + ', created=' + user.created_at);
                    found = true;
                }
            } catch (e) { }
        }

        // Check applications table
        const appsResult = await pool.query('SELECT id, email, scraping_status FROM applications');
        for (const app of appsResult.rows) {
            try {
                const decrypted = CryptoJS.AES.decrypt(app.email, encryptionKey).toString(CryptoJS.enc.Utf8);
                if (decrypted.includes(targetEmail)) {
                    console.log('FOUND IN APPLICATIONS: id=' + app.id + ', email=' + decrypted + ', scraping=' + app.scraping_status);
                    found = true;
                }
            } catch (e) { }
        }

        if (!found) console.log('NOT FOUND: ' + targetEmail + ' does not exist in database');
    } finally {
        await pool.end();
    }
}
main();
