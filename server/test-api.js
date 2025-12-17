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

async function testAPI() {
  console.log('='.repeat(60));
  console.log('TESTING API ENDPOINT WITH PROFILE SCRAPING');
  console.log('='.repeat(60));
  
  const testData = {
    applicationType: 'trainer',
    name: 'Test Trainer',
    faculty: 'ai',
    id: '9999999',
    nationalId: '99999999999999',
    studentLevel: '3',
    telephone: '+201234567890',
    codeforcesProfile: 'https://codeforces.com/profile/ritesh_3822',
    leetcodeProfile: 'https://leetcode.com/u/fjzzq2002/'
  };
  
  console.log('\n1. Submitting test application...');
  console.log('Data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await axios.post(API_URL, testData, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    console.log('\n✅ API Response:', response.data);
    console.log('\n2. Waiting 5 seconds for scraping to complete...');
    
    // Wait for scraping to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n3. Check the database to verify scraped data was stored.');
    console.log('   Run: sqlite3 /root/01studio/icpchue/server/applications.db "SELECT id, name, leetcode_data, codeforces_data, scraping_status FROM applications WHERE student_id = \'9999999\';"');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

testAPI().catch(console.error);

