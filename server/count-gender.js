import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CryptoJS from 'crypto-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const dbPath = path.join(__dirname, 'applications.db');
const db = new Database(dbPath);

// Encryption key for decryption
const encryptionKey = process.env.DB_ENCRYPTION_KEY;

// Decryption function (same as in index.js)
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  
  // Check if data is already decrypted
  if (typeof encryptedText === 'string') {
    if (/^\+?\d+$/.test(encryptedText) && encryptedText.length <= 15) {
      return encryptedText;
    }
    if (encryptedText.includes('@') && encryptedText.length <= 255) {
      return encryptedText;
    }
    if (!encryptedText.startsWith('U2FsdGVkX1') && encryptedText.length <= 20) {
      return encryptedText;
    }
  }
  
  // Try to decrypt
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, encryptionKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted || decrypted.trim() === '') {
      return encryptedText;
    }
    
    return decrypted;
  } catch (error) {
    return encryptedText;
  }
};

/**
 * Extract gender from Egyptian National ID (14 digits)
 * The 12th digit (3rd from left, 0-indexed position 2) indicates gender:
 * - Odd number (1,3,5,7,9) = Male
 * - Even number (0,2,4,6,8) = Female
 */
function getGenderFromNationalID(nationalID) {
  if (!nationalID) return null;
  
  // Decrypt if needed
  const decryptedID = decrypt(nationalID);
  
  // Clean the ID (remove non-digits)
  const cleanID = String(decryptedID).replace(/\D/g, '');
  
  // Egyptian National ID should be 14 digits
  if (cleanID.length !== 14) {
    return null;
  }
  
  // Get the 12th digit (3rd from left, index 2)
  const genderDigit = parseInt(cleanID[2], 10);
  
  // Check if it's a valid digit
  if (isNaN(genderDigit)) {
    return null;
  }
  
  // Odd = Male, Even = Female
  return genderDigit % 2 === 1 ? 'male' : 'female';
}

console.log('📊 Analyzing Gender Distribution from Applications Database...\n');

try {
  // Get all applications
  const applications = db.prepare('SELECT id, name, national_id FROM applications').all();
  
  let maleCount = 0;
  let femaleCount = 0;
  let unknownCount = 0;
  const unknownIDs = [];
  
  applications.forEach(app => {
    const gender = getGenderFromNationalID(app.national_id);
    
    if (gender === 'male') {
      maleCount++;
    } else if (gender === 'female') {
      femaleCount++;
    } else {
      unknownCount++;
      unknownIDs.push({
        id: app.id,
        name: decrypt(app.name) || 'Unknown',
        national_id: app.national_id ? '****' : 'Missing'
      });
    }
  });
  
  const total = applications.length;
  const malePercentage = total > 0 ? ((maleCount / total) * 100).toFixed(1) : 0;
  const femalePercentage = total > 0 ? ((femaleCount / total) * 100).toFixed(1) : 0;
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   GENDER DISTRIBUTION - ICPC HUE APPLICATIONS');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`👨 Men/Boys:      ${maleCount.toString().padStart(4)} (${malePercentage}%)`);
  console.log(`👩 Women/Girls:   ${femaleCount.toString().padStart(4)} (${femalePercentage}%)`);
  console.log(`❓ Unknown:        ${unknownCount.toString().padStart(4)}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log(`📝 Total:          ${total.toString().padStart(4)} applications\n`);
  
  if (unknownCount > 0) {
    console.log('⚠️  Applications with unidentifiable gender:');
    unknownIDs.slice(0, 10).forEach(app => {
      console.log(`   - ID ${app.id}: ${app.name} (National ID: ${app.national_id})`);
    });
    if (unknownIDs.length > 10) {
      console.log(`   ... and ${unknownIDs.length - 10} more`);
    }
    console.log('');
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Analysis complete!`);
  console.log(`   ${maleCount} ${maleCount === 1 ? 'man' : 'men'} applied`);
  console.log(`   ${femaleCount} ${femaleCount === 1 ? 'woman' : 'women'} applied`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
} catch (error) {
  console.error('❌ Error analyzing database:', error);
  process.exit(1);
} finally {
  db.close();
}

