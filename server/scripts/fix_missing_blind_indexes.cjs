const pg = require('pg');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const encryptionKey = process.env.DB_ENCRYPTION_KEY;
const blindIndexSalt = process.env.BLIND_INDEX_SALT || encryptionKey;

const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        if (typeof encryptedText === 'string' && !encryptedText.startsWith('U2FsdGVkX1')) {
            return encryptedText;
        }
        const bytes = CryptoJS.AES.decrypt(encryptedText, encryptionKey);
        return bytes.toString(CryptoJS.enc.Utf8) || encryptedText;
    } catch (e) {
        return encryptedText;
    }
};

const createBlindIndex = (value) => {
    if (!value) return null;
    return crypto.createHmac('sha256', blindIndexSalt).update(value.toString().toLowerCase().trim()).digest('hex');
};

async function main() {
    try {
        console.log('=== FIXING MISSING BLIND INDEXES ===\n');

        // Get applications missing blind index
        const result = await pool.query(`
            SELECT id, email, national_id, telephone, student_id
            FROM applications
            WHERE email_blind_index IS NULL
        `);

        console.log(`Found ${result.rows.length} applications missing blind index`);

        for (const app of result.rows) {
            const email = decrypt(app.email);
            const nationalId = decrypt(app.national_id);
            const telephone = decrypt(app.telephone);
            const studentId = app.student_id;

            const emailBI = createBlindIndex(email);
            const nationalIdBI = createBlindIndex(nationalId);
            const telephoneBI = createBlindIndex(telephone);
            const studentIdBI = createBlindIndex(studentId);

            try {
                await pool.query(`
                    UPDATE applications SET 
                        email_blind_index = $1,
                        national_id_blind_index = $2,
                        telephone_blind_index = $3,
                        student_id_blind_index = $4
                    WHERE id = $5
                `, [emailBI, nationalIdBI, telephoneBI, studentIdBI, app.id]);

                console.log(`✅ Fixed App #${app.id} - email: ${email ? email.substring(0, 10) + '...' : 'N/A'}`);
            } catch (err) {
                if (err.code === '23505') {
                    console.log(`⚠️ App #${app.id} - Skipped (duplicate blind index)`);
                } else {
                    console.log(`❌ App #${app.id} - Error: ${err.message}`);
                }
            }
        }

        console.log('\n=== DONE ===');

    } finally {
        await pool.end();
    }
}
main();
