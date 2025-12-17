import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'applications.db');
const db = new Database(dbPath);

console.log('Fixing address column to be nullable...');

try {
  // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_type TEXT NOT NULL DEFAULT 'trainee',
      name TEXT NOT NULL,
      faculty TEXT NOT NULL,
      student_id TEXT NOT NULL UNIQUE,
      national_id TEXT NOT NULL UNIQUE,
      student_level TEXT NOT NULL,
      telephone TEXT NOT NULL,
      address TEXT,
      has_laptop INTEGER DEFAULT 0,
      codeforces_profile TEXT,
      leetcode_profile TEXT,
      leetcode_data TEXT,
      codeforces_data TEXT,
      scraping_status TEXT DEFAULT 'pending',
      ip_address TEXT,
      user_agent TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Copy data from old table to new table
  db.exec(`
    INSERT INTO applications_new 
    SELECT 
      id, application_type, name, faculty, student_id, national_id, student_level, 
      telephone, address, has_laptop, codeforces_profile, leetcode_profile, 
      leetcode_data, codeforces_data, scraping_status, ip_address, user_agent, submitted_at
    FROM applications
  `);
  
  // Drop old table
  db.exec('DROP TABLE applications');
  
  // Rename new table
  db.exec('ALTER TABLE applications_new RENAME TO applications');
  
  console.log('✅ Address column is now nullable!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

db.close();

