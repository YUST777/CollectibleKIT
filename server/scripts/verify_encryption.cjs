const pg = require('pg');
const CryptoJS = require('crypto-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const encryptionKey = process.env.DB_ENCRYPTION_KEY;

if (!encryptionKey) { console.error('No encryption key!'); process.exit(1); }

async function main() {
    try {
        console.log('🔍 Verifying Users Table Encryption...');
        const result = await pool.query('SELECT id, email, email_blind_index FROM users LIMIT 5');

        for (const user of result.rows) {
            const isEncryptedPref = user.email.startsWith('U2FsdGVkX1');
            let decrypted = 'FAILED';
            try {
                const bytes = CryptoJS.AES.decrypt(user.email, encryptionKey);
                const str = bytes.toString(CryptoJS.enc.Utf8);
                if (str && str.includes('@')) decrypted = str;
            } catch (e) { }

            console.log(`User #${user.id}:`);
            console.log(`   Raw: ${user.email.substring(0, 20)}...`);
            console.log(`   Is Ciphertext? ${isEncryptedPref ? 'YES' : 'NO'}`);
            console.log(`   Blind Index: ${user.email_blind_index ? user.email_blind_index.substring(0, 10) + '...' : 'MISSING'}`);
            console.log(`   Decrypted: ${decrypted}`);
            console.log('---');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
main();
