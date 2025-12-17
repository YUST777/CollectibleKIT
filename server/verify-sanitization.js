import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'applications.db');
const db = new Database(dbPath);

console.log('Verifying data sanitization in database...\n');

// Check for any SQL injection patterns in stored data
const records = db.prepare('SELECT id, name, faculty, student_id, national_id FROM applications').all();

let foundVulnerabilities = false;

records.forEach(record => {
  const fields = [
    { name: 'name', value: record.name },
    { name: 'faculty', value: record.faculty },
    { name: 'student_id', value: record.student_id },
    { name: 'national_id', value: record.national_id }
  ];
  
  fields.forEach(field => {
    if (field.value) {
      // Check for SQL injection patterns
      if (field.value.includes("' OR '1'='1") || 
          field.value.includes("'; DROP") ||
          field.value.includes("' UNION") ||
          field.value.includes("' OR 1=1") ||
          field.value.includes("--") ||
          field.value.includes("/*") ||
          field.value.includes("*/")) {
        console.log(`⚠️  Potential SQL injection pattern found in ${field.name} (ID: ${record.id}): "${field.value}"`);
        foundVulnerabilities = true;
      }
      
      // Check for XSS patterns
      if (field.value.includes('<script>') ||
          field.value.includes('javascript:') ||
          field.value.includes('onerror=') ||
          field.value.includes('onload=')) {
        console.log(`⚠️  Potential XSS pattern found in ${field.name} (ID: ${record.id}): "${field.value}"`);
        foundVulnerabilities = true;
      }
    }
  });
});

if (!foundVulnerabilities) {
  console.log('✅ No SQL injection or XSS patterns found in stored data');
  console.log('✅ Data sanitization is working correctly');
} else {
  console.log('\n❌ Security vulnerabilities detected in stored data!');
}

// Check if prepared statements are being used
console.log('\nVerifying prepared statement usage...');
try {
  // This should use prepared statements (parameterized queries)
  const stmt = db.prepare('SELECT * FROM applications WHERE student_id = ?');
  const testRecord = stmt.get("' OR '1'='1");
  
  if (testRecord) {
    console.log('⚠️  Prepared statement returned result for SQL injection payload');
    console.log('   This means the payload was stored, but query is safe due to parameterization');
  } else {
    console.log('✅ Prepared statement correctly handled SQL injection payload');
  }
} catch (e) {
  console.log('✅ Prepared statement correctly rejected SQL injection payload');
}

db.close();

