import CryptoJS from 'crypto-js';

const encryptionKey = 'test-key-123';

const encrypt = (text) => {
    if (!text) return null;
    return CryptoJS.AES.encrypt(text, encryptionKey).toString();
};

const t1 = encrypt('12345678901234');
const t2 = encrypt('12345678901234');

console.log('Cipher 1:', t1);
console.log('Cipher 2:', t2);

if (t1 === t2) {
    console.log('Encryption is DETERMINISTIC. Unique constraints WILL work.');
} else {
    console.log('Encryption is PROBABILISTIC (Random IV). Unique constraints WILL NOT work.');
}
