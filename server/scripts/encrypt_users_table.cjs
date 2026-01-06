const pg = require('pg');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Load env from server directory

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const encryptionKey = process.env.DB_ENCRYPTION_KEY;
const blindIndexSalt = process.env.BLIND_INDEX_SALT || encryptionKey;

if (!encryptionKey) {
    console.error('❌ ERROR: DB_ENCRYPTION_KEY not set in .env');
    process.exit(1);
}

// Helper: Encrypt
const encrypt = (text) => {
    if (!text) return null;
    return CryptoJS.AES.encrypt(text, encryptionKey).toString();
};

// Helper: Decrypt (to check if already encrypted)
const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        if (!encryptedText.startsWith('U2FsdGVkX1')) return null; // Not encrypted
        const bytes = CryptoJS.AES.decrypt(encryptedText, encryptionKey);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText || null;
    } catch (e) {
        return null;
    }
};

// Helper: Blind Index
const createBlindIndex = (value) => {
    if (!value) return null;
    return crypto.createHmac('sha256', blindIndexSalt).update(value.toString().toLowerCase().trim()).digest('hex');
};

async function main() {
    console.log('🔒 Starting Users Table Encryption Migration...');

    try {
        // 1. Ensure email_blind_index column exists
        console.log('1. Checking schema...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS email_blind_index TEXT;
        `);

        // 2. Fetch all users
        const { rows: users } = await pool.query('SELECT id, email, email_blind_index FROM users');
        console.log(`Found ${users.length} users to check.`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            const email = user.email;

            // Check if already encrypted
            if (email.startsWith('U2FsdGVkX1')) {
                // Already encrypted. Ensure blind index exists.
                if (!user.email_blind_index) {
                    const decrypted = decrypt(email);
                    if (decrypted) {
                        const blindIndex = createBlindIndex(decrypted);
                        await pool.query('UPDATE users SET email_blind_index = $1 WHERE id = $2', [blindIndex, user.id]);
                        console.log(`✓ Fixed missing blind index for User #${user.id}`);
                    }
                } else {
                    skippedCount++;
                }
                continue;
            }

            // Needs encryption
            console.log(`Encrypting User #${user.id}...`);
            const encryptedEmail = encrypt(email);
            const blindIndex = createBlindIndex(email);

            await pool.query(`
                UPDATE users 
                SET email = $1, email_blind_index = $2 
                WHERE id = $3
            `, [encryptedEmail, blindIndex, user.id]);

            updatedCount++;
        }

        console.log(`Encryption complete. Encrypted: ${updatedCount}, Skipped: ${skippedCount}`);

        // 3. Add Unique Index (Atomic safety)
        console.log('3. Applying UNIQUE INDEX to email_blind_index...');
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_blind_index 
            ON users(email_blind_index);
        `);
        console.log('✓ Unique index applied.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
