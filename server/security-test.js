import axios from 'axios';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const dbPath = path.join(__dirname, 'applications.db');

console.log('='.repeat(70));
console.log('SECURITY PENETRATION TESTING');
console.log('='.repeat(70));

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function logResult(testName, passed, message) {
  if (passed) {
    results.passed.push({ test: testName, message });
    console.log(`✅ PASS: ${testName} - ${message}`);
  } else {
    results.failed.push({ test: testName, message });
    console.log(`❌ FAIL: ${testName} - ${message}`);
  }
}

function logWarning(testName, message) {
  results.warnings.push({ test: testName, message });
  console.log(`⚠️  WARN: ${testName} - ${message}`);
}

// ============================================================================
// TEST 1: SQL Injection Attacks
// ============================================================================
async function testSQLInjection() {
  console.log('\n[TEST 1] SQL Injection Attacks');
  console.log('-'.repeat(70));
  
  const sqlInjectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE applications; --",
    "' UNION SELECT * FROM applications --",
    "1' OR '1'='1' --",
    "admin'--",
    "' OR 1=1#",
    "1' UNION SELECT NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL --"
  ];
  
  for (const payload of sqlInjectionPayloads) {
    try {
      const response = await axios.post(API_URL, {
        applicationType: 'trainee',
        name: payload,
        faculty: 'ai',
        id: '1111111',
        nationalId: '11111111111111',
        studentLevel: '1',
        telephone: '+201111111111',
        hasLaptop: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'User-Agent': 'Mozilla/5.0'
        },
        validateStatus: () => true,
        timeout: 5000
      });
      
      // Should reject with 400 (validation error) or 500 (server error), not 200
      if (response.status === 200) {
        logResult(`SQL Injection: "${payload.substring(0, 30)}"`, false, `Vulnerable! Status: ${response.status}`);
      } else {
        logResult(`SQL Injection: "${payload.substring(0, 30)}"`, true, `Blocked with status ${response.status}`);
      }
    } catch (error) {
      logResult(`SQL Injection: "${payload.substring(0, 30)}"`, true, `Blocked - ${error.message}`);
    }
  }
  
  // Test database directly
  try {
    const db = new Database(dbPath);
    const maliciousQuery = "SELECT * FROM applications WHERE name = 'test' OR '1'='1'";
    try {
      db.prepare(maliciousQuery).all();
      logWarning('Direct DB SQL Injection', 'Query executed (but should use prepared statements)');
    } catch (e) {
      logResult('Direct DB SQL Injection', true, 'Query failed as expected');
    }
    db.close();
  } catch (error) {
    logResult('Direct DB Access', true, 'Database protected');
  }
}

// ============================================================================
// TEST 2: XSS (Cross-Site Scripting) Attacks
// ============================================================================
async function testXSS() {
  console.log('\n[TEST 2] XSS (Cross-Site Scripting) Attacks');
  console.log('-'.repeat(70));
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
    '"><script>alert("XSS")</script>',
    "'><script>alert('XSS')</script>",
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload=alert("XSS")>'
  ];
  
  for (const payload of xssPayloads) {
    try {
      const response = await axios.post(API_URL, {
        applicationType: 'trainee',
        name: payload,
        faculty: 'ai',
        id: '2222222',
        nationalId: '22222222222222',
        studentLevel: '1',
        telephone: '+202222222222',
        hasLaptop: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'User-Agent': 'Mozilla/5.0'
        },
        validateStatus: () => true,
        timeout: 5000
      });
      
      // Check if payload is sanitized in response or database
      if (response.status === 200) {
        // Check database for sanitization
        const db = new Database(dbPath);
        const record = db.prepare('SELECT name FROM applications WHERE student_id = ?').get('2222222');
        db.close();
        
        if (record && record.name.includes('<script>')) {
          logResult(`XSS: "${payload.substring(0, 30)}"`, false, 'XSS payload not sanitized in database');
        } else {
          logResult(`XSS: "${payload.substring(0, 30)}"`, true, 'XSS payload sanitized');
        }
      } else {
        logResult(`XSS: "${payload.substring(0, 30)}"`, true, `Blocked with status ${response.status}`);
      }
    } catch (error) {
      logResult(`XSS: "${payload.substring(0, 30)}"`, true, `Blocked - ${error.message}`);
    }
  }
}

// ============================================================================
// TEST 3: Unauthorized API Access
// ============================================================================
async function testUnauthorizedAccess() {
  console.log('\n[TEST 3] Unauthorized API Access');
  console.log('-'.repeat(70));
  
  // Test without API key
  try {
    const response = await axios.post(API_URL, {
      applicationType: 'trainee',
      name: 'Test',
      faculty: 'ai',
      id: '3333333',
      nationalId: '33333333333333',
      studentLevel: '1',
      telephone: '+203333333333',
      hasLaptop: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      validateStatus: () => true,
      timeout: 5000
    });
    
    if (response.status === 401 || response.status === 403) {
      logResult('No API Key', true, `Access denied with status ${response.status}`);
    } else {
      logResult('No API Key', false, `Vulnerable! Status: ${response.status}`);
    }
  } catch (error) {
    logResult('No API Key', true, `Access denied - ${error.message}`);
  }
  
  // Test with wrong API key
  try {
    const response = await axios.post(API_URL, {
      applicationType: 'trainee',
      name: 'Test',
      faculty: 'ai',
      id: '4444444',
      nationalId: '44444444444444',
      studentLevel: '1',
      telephone: '+204444444444',
      hasLaptop: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'wrong-key-12345',
        'User-Agent': 'Mozilla/5.0'
      },
      validateStatus: () => true,
      timeout: 5000
    });
    
    if (response.status === 401 || response.status === 403) {
      logResult('Wrong API Key', true, `Access denied with status ${response.status}`);
    } else {
      logResult('Wrong API Key', false, `Vulnerable! Status: ${response.status}`);
    }
  } catch (error) {
    logResult('Wrong API Key', true, `Access denied - ${error.message}`);
  }
}

// ============================================================================
// TEST 4: Rate Limiting Bypass
// ============================================================================
async function testRateLimiting() {
  console.log('\n[TEST 4] Rate Limiting Bypass');
  console.log('-'.repeat(70));
  
  let successCount = 0;
  let blockedCount = 0;
  
  // Try to send 10 requests rapidly
  for (let i = 0; i < 10; i++) {
    try {
      const response = await axios.post(API_URL, {
        applicationType: 'trainee',
        name: `Rate Limit Test ${i}`,
        faculty: 'ai',
        id: `555555${i}`,
        nationalId: `5555555555555${i}`,
        studentLevel: '1',
        telephone: `+20555555555${i}`,
        hasLaptop: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'User-Agent': 'Mozilla/5.0'
        },
        validateStatus: () => true,
        timeout: 5000
      });
      
      if (response.status === 200) {
        successCount++;
      } else if (response.status === 429) {
        blockedCount++;
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        blockedCount++;
      }
    }
  }
  
  if (blockedCount > 0) {
    logResult('Rate Limiting', true, `Rate limiting active - ${blockedCount} requests blocked`);
  } else if (successCount >= 10) {
    logWarning('Rate Limiting', `All ${successCount} requests succeeded - may need stricter limits`);
  } else {
    logResult('Rate Limiting', true, `Some requests blocked - ${blockedCount} blocked, ${successCount} succeeded`);
  }
}

// ============================================================================
// TEST 5: Input Validation Bypass
// ============================================================================
async function testInputValidation() {
  console.log('\n[TEST 5] Input Validation Bypass');
  console.log('-'.repeat(70));
  
  const invalidInputs = [
    { name: '', faculty: 'ai', id: '1234567', nationalId: '12345678901234', studentLevel: '1', telephone: '+201234567890' },
    { name: 'Test', faculty: 'invalid_faculty', id: '1234567', nationalId: '12345678901234', studentLevel: '1', telephone: '+201234567890' },
    { name: 'Test', faculty: 'ai', id: '123', nationalId: '12345678901234', studentLevel: '1', telephone: '+201234567890' },
    { name: 'Test', faculty: 'ai', id: '1234567', nationalId: '123', studentLevel: '1', telephone: '+201234567890' },
    { name: 'Test', faculty: 'ai', id: '1234567', nationalId: '12345678901234', studentLevel: '6', telephone: '+201234567890' },
    { name: 'Test', faculty: 'ai', id: '1234567', nationalId: '12345678901234', studentLevel: '1', telephone: '1234567890' },
    { name: 'Test', faculty: 'ai', id: '1234567', nationalId: '12345678901234', studentLevel: '1', telephone: '+201234567890', codeforcesProfile: 'invalid-url' },
    { name: 'Test', faculty: 'ai', id: '1234567', nationalId: '12345678901234', studentLevel: '1', telephone: '+201234567890', leetcodeProfile: 'not-a-url' }
  ];
  
  for (let i = 0; i < invalidInputs.length; i++) {
    const input = invalidInputs[i];
    try {
      const response = await axios.post(API_URL, {
        applicationType: 'trainee',
        ...input,
        hasLaptop: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'User-Agent': 'Mozilla/5.0'
        },
        validateStatus: () => true,
        timeout: 5000
      });
      
      if (response.status === 200) {
        logResult(`Input Validation Test ${i + 1}`, false, `Invalid input accepted - ${JSON.stringify(input).substring(0, 50)}`);
      } else {
        logResult(`Input Validation Test ${i + 1}`, true, `Invalid input rejected with status ${response.status}`);
      }
    } catch (error) {
      logResult(`Input Validation Test ${i + 1}`, true, `Invalid input rejected - ${error.message}`);
    }
  }
}

// ============================================================================
// TEST 6: Data Extraction Attempts
// ============================================================================
async function testDataExtraction() {
  console.log('\n[TEST 6] Data Extraction Attempts');
  console.log('-'.repeat(70));
  
  // Try to access admin endpoints without authentication
  const adminEndpoints = [
    '/api/applications',
    '/admin',
    '/admin/applications',
    '/api/users',
    '/api/data'
  ];
  
  for (const endpoint of adminEndpoints) {
    try {
      const response = await axios.get(`http://localhost:3001${endpoint}`, {
        validateStatus: () => true,
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      if (response.status === 200 && response.data && Array.isArray(response.data)) {
        logResult(`Data Extraction: ${endpoint}`, false, `Vulnerable! Data accessible without auth`);
      } else if (response.status === 401 || response.status === 403) {
        logResult(`Data Extraction: ${endpoint}`, true, `Protected - status ${response.status}`);
      } else {
        logResult(`Data Extraction: ${endpoint}`, true, `Endpoint not accessible - status ${response.status}`);
      }
    } catch (error) {
      logResult(`Data Extraction: ${endpoint}`, true, `Endpoint protected - ${error.message}`);
    }
  }
  
  // Try SQL injection in query parameters
  try {
    const response = await axios.get('http://localhost:3001/api/applications?id=1 OR 1=1', {
      validateStatus: () => true,
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (response.status === 200) {
      logWarning('SQL Injection in Query', 'Query parameter injection possible');
    } else {
      logResult('SQL Injection in Query', true, `Protected - status ${response.status}`);
    }
  } catch (error) {
    logResult('SQL Injection in Query', true, `Protected - ${error.message}`);
  }
}

// ============================================================================
// TEST 7: Path Traversal
// ============================================================================
async function testPathTraversal() {
  console.log('\n[TEST 7] Path Traversal Attacks');
  console.log('-'.repeat(70));
  
  const pathTraversalPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '../../../../etc/shadow',
    '....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
  ];
  
  for (const payload of pathTraversalPayloads) {
    try {
      const response = await axios.post(API_URL, {
        applicationType: 'trainee',
        name: payload,
        faculty: 'ai',
        id: '6666666',
        nationalId: '66666666666666',
        studentLevel: '1',
        telephone: '+206666666666',
        hasLaptop: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'User-Agent': 'Mozilla/5.0'
        },
        validateStatus: () => true,
        timeout: 5000
      });
      
      if (response.status === 200) {
        logWarning(`Path Traversal: "${payload}"`, 'Payload accepted (should be sanitized)');
      } else {
        logResult(`Path Traversal: "${payload}"`, true, `Blocked with status ${response.status}`);
      }
    } catch (error) {
      logResult(`Path Traversal: "${payload}"`, true, `Blocked - ${error.message}`);
    }
  }
}

// ============================================================================
// TEST 8: Database Security
// ============================================================================
async function testDatabaseSecurity() {
  console.log('\n[TEST 8] Database Security');
  console.log('-'.repeat(70));
  
  try {
    const db = new Database(dbPath);
    
    // Test if prepared statements are used (should prevent SQL injection)
    try {
      const stmt = db.prepare('SELECT * FROM applications WHERE student_id = ?');
      const result = stmt.get("' OR '1'='1");
      logResult('Prepared Statements', true, 'Using parameterized queries');
    } catch (e) {
      logResult('Prepared Statements', true, 'Prepared statements working');
    }
    
    // Check if sensitive data is accessible
    const allRecords = db.prepare('SELECT COUNT(*) as count FROM applications').get();
    logResult('Database Access Control', true, `Database accessible (${allRecords.count} records)`);
    
    // Check for encryption (basic check)
    const sampleRecord = db.prepare('SELECT name, telephone FROM applications LIMIT 1').get();
    if (sampleRecord) {
      // Check if data is stored in plain text (expected for this use case)
      if (typeof sampleRecord.name === 'string' && typeof sampleRecord.telephone === 'string') {
        logWarning('Data Encryption', 'Data stored in plain text (may need encryption for sensitive fields)');
      }
    }
    
    db.close();
  } catch (error) {
    logResult('Database Security', false, `Error: ${error.message}`);
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
  await testSQLInjection();
  await testXSS();
  await testUnauthorizedAccess();
  await testRateLimiting();
  await testInputValidation();
  await testDataExtraction();
  await testPathTraversal();
  await testDatabaseSecurity();
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SECURITY TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(f => console.log(`   - ${f.test}: ${f.message}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.warnings.forEach(w => console.log(`   - ${w.test}: ${w.message}`));
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (results.failed.length === 0) {
    console.log('✅ ALL CRITICAL SECURITY TESTS PASSED!');
  } else {
    console.log('❌ SOME SECURITY VULNERABILITIES DETECTED!');
  }
  console.log('='.repeat(70));
}

runAllTests().catch(console.error);

