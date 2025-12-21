const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

// 1. Load Environment Variables (Key & DB URL)
let encryptionKey = '';
let databaseUrl = '';

try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const matchKey = line.match(/^DB_ENCRYPTION_KEY=(.*)$/);
            if (matchKey) encryptionKey = matchKey[1].trim().replace(/^["']|["']$/g, '');

            const matchDb = line.match(/^DATABASE_URL=(.*)$/);
            if (matchDb) databaseUrl = matchDb[1].trim().replace(/^["']|["']$/g, '');
        });
    }
} catch (e) {
    console.error('Error loading .env', e);
}

if (!encryptionKey) {
    console.error("❌ No DB_ENCRYPTION_KEY found in .env");
    process.exit(1);
}
if (!databaseUrl) {
    console.error("❌ No DATABASE_URL found in .env");
    process.exit(1);
}

// 2. Setup DB
const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false // Use false for direct connection if needed, or check environment
});

// 3. Decrypt Function
const decrypt = (encryptedText) => {
    if (!encryptedText) return null;

    // Heuristic: If it looks like a plain email already, return it
    if (encryptedText.includes('@') && !encryptedText.startsWith('U2FsdGVkX1')) {
        return { success: true, plaintext: encryptedText, type: 'plaintext' };
    }

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, encryptionKey);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (decrypted && decrypted.length > 0) {
            return { success: true, plaintext: decrypted, type: 'decrypted' };
        } else {
            return { success: false, error: 'Empty result (Wrong Key)' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 4. Run Scan
async function scan() {
    console.log("🔍 Starting Encryption Health Scan...");
    console.log(`🔑 Using Key: ${encryptionKey.substring(0, 10)}...`);

    try {
        const res = await pool.query("SELECT id, student_id, name, email FROM applications");
        const total = res.rows.length;
        let failedCount = 0;
        let plaintextCount = 0;
        let decryptedCount = 0;
        const failedExamples = [];

        console.log(`📊 Processing ${total} records...`);

        for (const row of res.rows) {
            const result = decrypt(row.email);

            if (result && result.success) {
                if (result.type === 'plaintext') plaintextCount++;
                else decryptedCount++;
            } else {
                failedCount++;
                failedExamples.push({
                    id: row.id,
                    student_id: row.student_id,
                    name: row.name,
                    raw_email_start: row.email ? row.email.substring(0, 15) + '...' : 'null'
                });
            }
        }

        console.log("\n--- RESULTS ---");
        console.log(`Total Records: ${total}`);
        console.log(`✅ Plaintext (Legacy): ${plaintextCount}`);
        console.log(`✅ Successfully Decrypted: ${decryptedCount}`);
        console.log(`❌ FAILED to Decrypt: ${failedCount}`);
        console.log(`🔥 Failure Rate: ${((failedCount / total) * 100).toFixed(2)}%`);

        if (failedCount > 0) {
            console.log("\n--- EXAMPLES OF FAILED RECORDS (Top 10) ---");
            console.table(failedExamples.slice(0, 10));
        }

    } catch (err) {
        console.error('Database Error:', err);
    } finally {
        pool.end();
    }
}

scan();
