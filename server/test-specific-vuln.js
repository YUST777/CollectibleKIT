import axios from 'axios';

const API_URL = 'http://localhost:3001/api/submit-application';
const API_KEY = process.env.API_SECRET_KEY;
if (!API_KEY) {
  console.error('❌ ERROR: API_SECRET_KEY not set in .env file');
  process.exit(1);
}
if (!API_KEY) {
  console.error('❌ API_KEY not set. Please set API_SECRET_KEY or VITE_API_KEY in .env file');
  process.exit(1);
}

console.log('Testing specific vulnerabilities...\n');

// Test 1: SQL Injection that got through
console.log('[1] Testing SQL Injection: " OR \'1\'=\'1"');
try {
  const response = await axios.post(API_URL, {
    applicationType: 'trainee',
    name: "' OR '1'='1",
    faculty: 'ai',
    id: '7777777',
    nationalId: '77777777777777',
    studentLevel: '1',
    telephone: '+207777777777',
    hasLaptop: false
  }, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    validateStatus: () => true,
    timeout: 5000
  });
  
  console.log(`Status: ${response.status}`);
  console.log(`Response:`, JSON.stringify(response.data, null, 2));
  
  // Check database
  const Database = (await import('better-sqlite3')).default;
  const db = new Database('/root/01studio/icpchue/server/applications.db');
  const record = db.prepare('SELECT name FROM applications WHERE student_id = ?').get('7777777');
  db.close();
  
  if (record) {
    console.log(`Database record name: "${record.name}"`);
    if (record.name.includes("' OR '1'='1")) {
      console.log('⚠️  SQL injection payload stored in database (but should be sanitized)');
    } else {
      console.log('✅ SQL injection payload was sanitized');
    }
  }
} catch (error) {
  console.log(`Error: ${error.message}`);
}

// Test 2: API Key validation
console.log('\n[2] Testing API Key validation (without key)');
try {
  const response = await axios.post(API_URL, {
    applicationType: 'trainee',
    name: 'Test',
    faculty: 'ai',
    id: '8888888',
    nationalId: '88888888888888',
    studentLevel: '1',
    telephone: '+208888888888',
    hasLaptop: false
  }, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    validateStatus: () => true,
    timeout: 5000
  });
  
  console.log(`Status: ${response.status}`);
  console.log(`Response:`, JSON.stringify(response.data, null, 2));
  
  if (response.status === 401) {
    console.log('✅ API key validation working (401 Unauthorized)');
  } else if (response.status === 403) {
    console.log('✅ API key validation working (403 Forbidden)');
  } else if (response.status === 429) {
    console.log('⚠️  Rate limiting triggered before API key check');
  } else {
    console.log('❌ API key validation not working properly');
  }
} catch (error) {
  console.log(`Error: ${error.message}`);
}

// Test 3: Wrong API Key
console.log('\n[3] Testing API Key validation (wrong key)');
try {
  const response = await axios.post(API_URL, {
    applicationType: 'trainee',
    name: 'Test',
    faculty: 'ai',
    id: '9999999',
    nationalId: '99999999999999',
    studentLevel: '1',
    telephone: '+209999999999',
    hasLaptop: false
  }, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'wrong-key-12345',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    validateStatus: () => true,
    timeout: 5000
  });
  
  console.log(`Status: ${response.status}`);
  console.log(`Response:`, JSON.stringify(response.data, null, 2));
  
  if (response.status === 401 || response.status === 403) {
    console.log('✅ Wrong API key rejected');
  } else if (response.status === 429) {
    console.log('⚠️  Rate limiting triggered before API key check');
  } else {
    console.log('❌ Wrong API key accepted!');
  }
} catch (error) {
  console.log(`Error: ${error.message}`);
}

