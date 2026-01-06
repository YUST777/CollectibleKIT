+const pg = require('pg');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const encryptionKey = process.env.DB_ENCRYPTION_KEY;

const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        if (typeof encryptedText === 'string' && !encryptedText.startsWith('U2FsdGVkX1')) {
            return encryptedText;
        }
        const bytes = CryptoJS.AES.decrypt(encryptedText, encryptionKey);
        return bytes.toString(CryptoJS.enc.Utf8) || null;
    } catch (e) {
        return null;
    }
};

async function main() {
    try {
        // Get the 6 duplicate application IDs
        const dupeIds = [32, 116, 141, 210, 299, 318];

        console.log('=== DUPLICATE APPLICATIONS ANALYSIS ===\n');

        for (const id of dupeIds) {
            const result = await pool.query(
                'SELECT id, email, name, student_id FROM applications WHERE id = $1',
                [id]
            );

            if (result.rows.length > 0) {
                const app = result.rows[0];
                const email = decrypt(app.email);
                const name = decrypt(app.name);

                // Find the original (older) application with same email
                if (email) {
                    const origResult = await pool.query(
                        `SELECT id, email, name, student_id, email_blind_index 
                         FROM applications 
                         WHERE email_blind_index IS NOT NULL 
                         ORDER BY id ASC`
                    );

                    // Find matching blind index
                    const blindIndexKey = process.env.BLIND_INDEX_SALT || encryptionKey;
                    const normalized = email.toLowerCase().trim();
                    const expectedBI = crypto.createHmac('sha256', blindIndexKey).update(normalized).digest('hex');

                    const original = origResult.rows.find(r => r.email_blind_index === expectedBI && r.id !== id);

                    console.log(`App #${id}: ${email || 'N/A'} (${name || 'N/A'})`);
                    if (original) {
                        const origEmail = decrypt(original.email);
                        const origName = decrypt(original.name);
                        console.log(`  → Duplicate of App #${original.id}: ${origEmail} (${origName})`);
                    }
                    console.log('');
                }
            }
        }

    } finally {
        await pool.end();
    }
}
main();
