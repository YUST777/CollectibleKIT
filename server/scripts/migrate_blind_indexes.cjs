const { Pool } = require('pg');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;
const BLIND_INDEX_SALT = process.env.BLIND_INDEX_SALT || process.env.DB_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    console.error('❌ DB_ENCRYPTION_KEY is missing');
    process.exit(1);
}

// Decrypt function (with heuristic for migration purposes only)
const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        // Check if likely encrypted (CryptoJS standard prefix)
        if (typeof encryptedText === 'string' && !encryptedText.startsWith('U2FsdGVkX1')) {
            return encryptedText; // Assume plaintext
        }
        const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText || encryptedText;
    } catch (error) {
        return encryptedText; // Return original if decryption fails
    }
};

const createBlindIndex = (value) => {
    if (!value) return null;
    const normalized = value.toString().toLowerCase().trim();
    return crypto.createHmac('sha256', BLIND_INDEX_SALT).update(normalized).digest('hex');
};

const MIGRATION_SQL = `
-- Add blind index columns
ALTER TABLE applications ADD COLUMN IF NOT EXISTS email_blind_index TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS national_id_blind_index TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS telephone_blind_index TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS student_id_blind_index TEXT;

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_email_blind 
ON applications(email_blind_index) 
WHERE email_blind_index IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_national_id_blind 
ON applications(national_id_blind_index) 
WHERE national_id_blind_index IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_telephone_blind 
ON applications(telephone_blind_index) 
WHERE telephone_blind_index IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_student_id_blind 
ON applications(student_id_blind_index) 
WHERE student_id_blind_index IS NOT NULL;

-- Add index on users table for email lookup
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_blind_index TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_blind 
ON users(email_blind_index) 
WHERE email_blind_index IS NOT NULL;
`;

const runMigration = async () => {
    const client = await pool.connect();
    console.log('🔌 Connected to database');

    try {
        // 1. Run SQL to add columns
        console.log('🛠 Adding blind index columns...');
        await client.query(MIGRATION_SQL);
        console.log('✅ Columns added successfully');

        // 2. Populate Applications
        console.log('📊 Populating applications blind indexes...');
        const appsResult = await client.query('SELECT id, email, national_id, telephone, student_id FROM applications');

        let updatedApps = 0;
        for (const app of appsResult.rows) {
            const email = decrypt(app.email);
            const nationalId = decrypt(app.national_id);
            const telephone = decrypt(app.telephone);
            const studentId = app.student_id;

            const emailBlindIndex = createBlindIndex(email);
            const nationalIdBlindIndex = createBlindIndex(nationalId);
            const telephoneBlindIndex = createBlindIndex(telephone);
            const studentIdBlindIndex = createBlindIndex(studentId);

            try {
                await client.query(
                    `UPDATE applications SET 
              email_blind_index = $1, 
              national_id_blind_index = $2, 
              telephone_blind_index = $3, 
              student_id_blind_index = $4 
             WHERE id = $5`,
                    [emailBlindIndex, nationalIdBlindIndex, telephoneBlindIndex, studentIdBlindIndex, app.id]
                );
                updatedApps++;
            } catch (err) {
                if (err.code === '23505') {
                    console.warn(`⚠️ Skipping duplicate application ID ${app.id} (Blind index conflict).`);
                } else {
                    throw err;
                }
            }
            if (updatedApps % 50 === 0) process.stdout.write('.');
        }
        console.log(`\n✅ Updated ${updatedApps} applications.`);

        // 3. Populate Users
        console.log('👤 Populating users blind indexes...');
        const usersResult = await client.query('SELECT id, email FROM users');

        let updatedUsers = 0;
        for (const user of usersResult.rows) {
            const email = decrypt(user.email);
            const emailBlindIndex = createBlindIndex(email);

            try {
                await client.query(
                    'UPDATE users SET email_blind_index = $1 WHERE id = $2',
                    [emailBlindIndex, user.id]
                );
                updatedUsers++;
            } catch (err) {
                if (err.code === '23505') {
                    console.warn(`⚠️ Skipping duplicate user ID ${user.id} (Blind index conflict).`);
                } else {
                    throw err;
                }
            }
            if (updatedUsers % 50 === 0) process.stdout.write('.');
        }
        console.log(`\n✅ Updated ${updatedUsers} users.`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
};

runMigration();
