const axios = require('axios');
const pg = require('pg');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost'; // Hitting Nginx
// Ignore self-signed certs if redirected to HTTPS
const agent = new https.Agent({ rejectUnauthorized: false });
const axiosClient = axios.create({
    baseURL: API_URL,
    httpsAgent: agent,
    maxRedirects: 5,
    validateStatus: () => true // Handle 4xx/5xx manually
});

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const encryptionKey = process.env.DB_ENCRYPTION_KEY;
const blindIndexSalt = process.env.BLIND_INDEX_SALT || encryptionKey;
const API_KEY = process.env.API_SECRET_KEY;

// Helpers
const encrypt = (text) => CryptoJS.AES.encrypt(text, encryptionKey).toString();
const createBlindIndex = (val) => crypto.createHmac('sha256', blindIndexSalt).update(val.toLowerCase().trim()).digest('hex');

const generateRandomUser = () => {
    const r = Math.floor(Math.random() * 100000);
    return {
        email: `test_user_${r}@horus.edu.eg`,
        nationalId: `3010101${r.toString().padStart(7, '0')}`,
        studentId: `2024${r.toString().padStart(3, '0')}`,
        password: 'Password123!',
        name: `Test User ${r}`,
        telephone: `+2010${r.toString().padStart(8, '0')}`
    };
};

async function main() {
    try {
        console.log('🚀 Starting Full Flow Test...');

        // ==========================================
        // SCENARIO 1: OLD USER (Pre-existing Application)
        // ==========================================
        console.log('\n--- SCENARIO 1: Existing "Old" User Registration ---');
        const oldUser = generateRandomUser();

        // 1. Manually insert application (Simulating old data)
        const oldUserEncEmail = encrypt(oldUser.email);
        const oldUserBI = createBlindIndex(oldUser.email);
        const oldUserEncNID = encrypt(oldUser.nationalId);
        const oldUserEncID = encrypt(oldUser.studentId);

        // We simulate that this app ALREADY HAS the blind index (migration ran)
        const insertRes = await pool.query(`
            INSERT INTO applications (
                name, email, email_blind_index, national_id, student_id, 
                faculty, student_level, telephone, application_type, scraping_status
            ) VALUES ($1, $2, $3, $4, $5, 'ai', '1', $6, 'trainee', 'pending')
            RETURNING id
        `, [oldUser.name, oldUserEncEmail, oldUserBI, oldUserEncNID, oldUserEncID, encrypt(oldUser.telephone)]);

        console.log(`✓ [Setup] Inserted "Old" Application (ID: ${insertRes.rows[0].id}) for ${oldUser.email}`);

        // 2. Register
        console.log(`test key: ${API_KEY}`)
        console.log('👉 Attempting Registration...');
        let res = await axiosClient.post('/api/auth/register', {
            email: oldUser.email,
            password: oldUser.password
        });

        if (res.status === 201) {
            console.log('✅ Registration Successful:', res.data.message);
        } else {
            console.error('❌ Registration Failed:', res.status, res.data);
            process.exit(1);
        }

        // 3. Login
        console.log('👉 Attempting Login...');
        res = await axiosClient.post('/api/auth/login', {
            email: oldUser.email,
            password: oldUser.password
        });

        if (res.status === 200) {
            console.log('✅ Login Successful. Token received.');
            const token = res.data.token;
            console.log('🔑 Token:', token ? token.substring(0, 20) + '...' : 'UNDEFINED');

            // Verify Me
            try {
                res = await axiosClient.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                console.log('✅ /api/auth/me verified:', res.data.email);
            } catch (err) {
                console.error('❌ /api/auth/me failed:', err.response ? err.response.status : err.message);
                if (err.response) console.error('   Error Data:', err.response.data);
            }
        } else {
            console.error('❌ Login Failed:', res.status, res.data);
        }


        // ==========================================
        // SCENARIO 2: NEW USER (Submission -> Register)
        // ==========================================
        console.log('\n--- SCENARIO 2: New User Flow ---');
        const newUser = generateRandomUser();

        // 1. Submit Application
        console.log('👉 Submitting Application...');
        res = await axiosClient.post('/api/submit-application', {
            applicationType: 'trainee',
            name: newUser.name,
            email: newUser.email,
            faculty: 'ai',
            id: newUser.studentId,
            nationalId: newUser.nationalId,
            studentLevel: '1',
            telephone: newUser.telephone,
            hasLaptop: true
        }, { headers: { 'x-api-key': API_KEY } });

        if (res.status === 201 || res.status === 200) {
            console.log('✅ Application Submitted:', res.data.message);
        } else {
            console.error('❌ Application Submission Failed:', res.status, res.data);
            // Don't exit, try verify if it failed because I forgot something
        }

        // 2. Register
        console.log('👉 Attempting Registration for New User...');
        res = await axiosClient.post('/api/auth/register', {
            email: newUser.email,
            password: newUser.password
        });

        if (res.status === 201) {
            console.log('✅ Registration Successful');
        } else {
            console.error('❌ Registration Failed:', res.status, res.data);
        }

        // 3. Login
        console.log('👉 Attempting Login for New User...');
        res = await axiosClient.post('/api/auth/login', {
            email: newUser.email,
            password: newUser.password
        });

        if (res.status === 200) {
            console.log('✅ Login Successful');
            const token = res.data.token;
            console.log('🔑 Token:', token ? token.substring(0, 20) + '...' : 'UNDEFINED');
            // Verify Me
            try {
                res = await axiosClient.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                if (res.status === 200) console.log('✅ /api/auth/me verified:', res.data.email);
            } catch (err) {
                console.error('❌ /api/auth/me failed:', err.response ? err.response.status : err.message);
                if (err.response) console.error('   Error Data:', err.response.data);
            }
        } else {
            console.error('❌ Login Failed:', res.status, res.data);
        }

    } catch (e) {
        console.error('CRITICAL ERROR:', e.message);
        if (e.response) console.error('Response:', e.response.status, e.response.data);
    } finally {
        await pool.end();
    }
}
main();
