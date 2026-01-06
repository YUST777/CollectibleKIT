const crypto = require('crypto');
require('dotenv').config();

const encryptionKey = process.env.DB_ENCRYPTION_KEY;
const blindIndexSalt = process.env.BLIND_INDEX_SALT || encryptionKey;

console.log('DB_ENCRYPTION_KEY set:', !!encryptionKey);
console.log('BLIND_INDEX_SALT set:', !!process.env.BLIND_INDEX_SALT);
console.log('Using blindIndexSalt from:', process.env.BLIND_INDEX_SALT ? 'BLIND_INDEX_SALT' : 'DB_ENCRYPTION_KEY fallback');

const email = '8241504@horus.edu.eg';
const normalized = email.toLowerCase().trim();
const computedIndex = crypto.createHmac('sha256', blindIndexSalt).update(normalized).digest('hex');

const storedIndex = 'ee5bb705ace4965ac53c0c92a51a4401a4cb790d93d1e77f3c8bf0c5ba2caa99';

console.log('Computed:', computedIndex);
console.log('Stored:  ', storedIndex);
console.log('MATCH:', computedIndex === storedIndex);
