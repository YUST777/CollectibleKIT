import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'applications.db');
const db = new Database(dbPath);

console.log('Checking scraped data for test application...\n');

const record = db.prepare('SELECT id, name, student_id, leetcode_profile, codeforces_profile, leetcode_data, codeforces_data, scraping_status, submitted_at FROM applications WHERE student_id = ?').get('9999999');

if (record) {
  console.log('Application found:');
  console.log(`  ID: ${record.id}`);
  console.log(`  Name: ${record.name}`);
  console.log(`  Student ID: ${record.student_id}`);
  console.log(`  LeetCode Profile: ${record.leetcode_profile}`);
  console.log(`  Codeforces Profile: ${record.codeforces_profile}`);
  console.log(`  Scraping Status: ${record.scraping_status}`);
  console.log(`  Submitted At: ${record.submitted_at}`);
  console.log('\n--- LeetCode Data ---');
  if (record.leetcode_data) {
    const leetcodeData = JSON.parse(record.leetcode_data);
    console.log(JSON.stringify(leetcodeData, null, 2));
  } else {
    console.log('  Not scraped yet or failed');
  }
  console.log('\n--- Codeforces Data ---');
  if (record.codeforces_data) {
    const codeforcesData = JSON.parse(record.codeforces_data);
    console.log(JSON.stringify(codeforcesData, null, 2));
  } else {
    console.log('  Not scraped yet or failed');
  }
} else {
  console.log('No application found with student_id = 9999999');
}

db.close();

