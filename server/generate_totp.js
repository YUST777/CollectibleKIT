
import speakeasy from 'speakeasy';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const secret = process.env.TOTP_SECRET;

if (!secret) {
    console.log('Error: TOTP_SECRET not found in .env');
    process.exit(1);
}

const token = speakeasy.totp({
    secret: secret,
    encoding: 'base32'
});

console.log('--------------------------------------------------');
console.log(`Current Server Time: ${new Date().toISOString()}`);
console.log(`Valid TOTP Code: ${token}`);
console.log('--------------------------------------------------');
