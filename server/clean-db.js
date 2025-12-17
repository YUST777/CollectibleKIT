// Script to clean all test data from the database
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'applications.db');
const db = new Database(dbPath);

try {
  console.log('🗑️  Cleaning database...');
  
  // Get count before deletion
  const countBefore = db.prepare('SELECT COUNT(*) as count FROM applications').get();
  console.log(`📊 Found ${countBefore.count} records`);
  
  // Delete all records
  const deleteStmt = db.prepare('DELETE FROM applications');
  const result = deleteStmt.run();
  
  console.log(`✅ Deleted ${result.changes} records`);
  console.log('✅ Database cleaned successfully!');
  
  // Verify
  const countAfter = db.prepare('SELECT COUNT(*) as count FROM applications').get();
  console.log(`📊 Remaining records: ${countAfter.count}`);
  
} catch (error) {
  console.error('❌ Error cleaning database:', error);
  process.exit(1);
} finally {
  db.close();
}

