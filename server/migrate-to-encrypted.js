import Database from 'better-sqlite3-sqlcipher';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const oldDbPath = path.join(__dirname, 'applications.db');
const newDbPath = path.join(__dirname, 'applications.db.encrypted');
const backupPath = path.join(__dirname, 'applications.db.backup');

const encryptionKey = process.env.DB_ENCRYPTION_KEY;

if (!encryptionKey) {
  console.error('❌ ERROR: DB_ENCRYPTION_KEY not set in .env file');
  process.exit(1);
}

if (!fs.existsSync(oldDbPath)) {
  console.log('ℹ️  No existing database found. New database will be created encrypted.');
  process.exit(0);
}

console.log('🔄 Migrating database to encrypted format...');

try {
  // Open old unencrypted database
  const oldDb = new Database(oldDbPath);
  
  // Create new encrypted database
  const newDb = new Database(newDbPath);
  newDb.pragma(`key = "${encryptionKey}"`);
  
  // Copy schema and data
  const schema = oldDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  
  for (const row of schema) {
    if (row.sql) {
      newDb.exec(row.sql);
    }
  }
  
  // Get all data from old database
  const tables = oldDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  
  for (const table of tables) {
    const tableName = table.name;
    const data = oldDb.prepare(`SELECT * FROM ${tableName}`).all();
    
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const insertStmt = newDb.prepare(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`);
      
      for (const row of data) {
        insertStmt.run(...columns.map(col => row[col]));
      }
      
      console.log(`  ✓ Migrated ${data.length} rows from ${tableName}`);
    }
  }
  
  oldDb.close();
  newDb.close();
  
  // Backup old database
  fs.copyFileSync(oldDbPath, backupPath);
  console.log('  ✓ Backup created: applications.db.backup');
  
  // Replace old database with encrypted one
  fs.renameSync(newDbPath, oldDbPath);
  console.log('✅ Database migration completed successfully!');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
