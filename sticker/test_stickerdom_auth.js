#!/usr/bin/env node
/**
 * Test script to debug Stickerdom auth endpoint
 */

const STICKERDOM_API_BASE = 'https://api.stickerdom.store';

// Sample initData format (from the error message)
// user=%7B%22id%22%3A800092886%2C%22first_name%22%3A%22yousef%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22yousefmsm1%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_wri
// This is URL-encoded: user={"id":800092886,"first_name":"yousef","last_name":"","username":"yousefmsm1","language_code":"en","is_premium":true,"allows_wri

async function testAuthEndpoint(initData) {
  const authUrl = `${STICKERDOM_API_BASE}/api/v1/auth`;
  
  console.log('\n🔍 Testing Stickerdom Auth Endpoint');
  console.log('=' .repeat(60));
  console.log('URL:', authUrl);
  console.log('initData length:', initData.length);
  console.log('initData preview:', initData.substring(0, 200));
  console.log('initData has user=:', initData.includes('user='));
  console.log('initData has hash=:', initData.includes('hash='));
  console.log('initData has auth_date=:', initData.includes('auth_date='));
  
  // Test 1: Send as raw body (like we're doing now)
  console.log('\n📤 Test 1: Sending as raw body (application/x-www-form-urlencoded)');
  try {
    const response1 = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      body: initData,
    });
    
    const responseText1 = await response1.text();
    console.log('Status:', response1.status);
    console.log('Response:', responseText1);
    
    if (response1.ok) {
      try {
        const data = JSON.parse(responseText1);
        console.log('✅ SUCCESS! Token:', data.token ? data.token.substring(0, 50) + '...' : 'No token');
        return data.token;
      } catch (e) {
        console.log('⚠️ Response OK but not JSON');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 2: Send as form field "initData"
  console.log('\n📤 Test 2: Sending as form field "initData"');
  try {
    const formBody = new URLSearchParams();
    formBody.append('initData', initData);
    
    const response2 = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      body: formBody.toString(),
    });
    
    const responseText2 = await response2.text();
    console.log('Status:', response2.status);
    console.log('Response:', responseText2);
    
    if (response2.ok) {
      try {
        const data = JSON.parse(responseText2);
        console.log('✅ SUCCESS! Token:', data.token ? data.token.substring(0, 50) + '...' : 'No token');
        return data.token;
      } catch (e) {
        console.log('⚠️ Response OK but not JSON');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 3: Send as JSON body
  console.log('\n📤 Test 3: Sending as JSON body with "initData" field');
  try {
    const response3 = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ initData: initData }),
    });
    
    const responseText3 = await response3.text();
    console.log('Status:', response3.status);
    console.log('Response:', responseText3);
    
    if (response3.ok) {
      try {
        const data = JSON.parse(responseText3);
        console.log('✅ SUCCESS! Token:', data.token ? data.token.substring(0, 50) + '...' : 'No token');
        return data.token;
      } catch (e) {
        console.log('⚠️ Response OK but not JSON');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 4: Parse initData and send individual fields
  console.log('\n📤 Test 4: Parsing initData and sending as individual form fields');
  try {
    const params = new URLSearchParams(initData);
    const user = params.get('user');
    const hash = params.get('hash');
    const authDate = params.get('auth_date');
    
    const formBody4 = new URLSearchParams();
    if (user) formBody4.append('user', user);
    if (authDate) formBody4.append('auth_date', authDate);
    if (hash) formBody4.append('hash', hash);
    
    // Add any other params
    for (const [key, value] of params.entries()) {
      if (!['user', 'hash', 'auth_date'].includes(key)) {
        formBody4.append(key, value);
      }
    }
    
    console.log('Form fields:', Array.from(formBody4.keys()));
    
    const response4 = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      body: formBody4.toString(),
    });
    
    const responseText4 = await response4.text();
    console.log('Status:', response4.status);
    console.log('Response:', responseText4);
    
    if (response4.ok) {
      try {
        const data = JSON.parse(responseText4);
        console.log('✅ SUCCESS! Token:', data.token ? data.token.substring(0, 50) + '...' : 'No token');
        return data.token;
      } catch (e) {
        console.log('⚠️ Response OK but not JSON');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  return null;
}

// Check if initData file exists
async function main() {
  const fs = require('fs');
  const path = require('path');
  
  // Try to read from init_data.txt
  const initDataFile = path.join(__dirname, 'init_data.txt');
  let initData = null;
  
  if (fs.existsSync(initDataFile)) {
    const content = fs.readFileSync(initDataFile, 'utf-8').trim();
    // Check if it's a JWT token (starts with eyJ)
    if (content.startsWith('eyJ')) {
      console.log('📝 Found JWT token in init_data.txt');
      console.log('Token preview:', content.substring(0, 50) + '...');
      console.log('\n⚠️ This is already a JWT token, not initData.');
      console.log('The auth endpoint needs raw Telegram initData, not a JWT.');
      console.log('You need fresh initData from Telegram WebApp.');
      return;
    } else {
      initData = content;
      console.log('📝 Using initData from init_data.txt');
    }
  }
  
  if (!initData) {
    console.error('❌ No initData found!');
    console.log('\nPlease provide initData as argument or in sticker/init_data.txt');
    console.log('Usage: node test_stickerdom_auth.js "<initData_string>"');
    console.log('\nOr put initData in sticker/init_data.txt');
    return;
  }
  
  // Check initData age
  try {
    const params = new URLSearchParams(initData);
    const authDate = params.get('auth_date');
    if (authDate) {
      const authTimestamp = parseInt(authDate, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const ageHours = (currentTime - authTimestamp) / 3600;
      const ageMinutes = (currentTime - authTimestamp) / 60;
      
      console.log('\n📅 initData Age Check:');
      console.log('Auth Date:', new Date(authTimestamp * 1000).toISOString());
      console.log('Current Time:', new Date().toISOString());
      console.log('Age:', ageHours.toFixed(2), 'hours', `(${ageMinutes.toFixed(0)} minutes)`);
      console.log('Status:', ageHours > 24 ? '❌ EXPIRED (>24 hours)' : '✅ Valid');
      
      if (ageHours > 24) {
        console.log('\n⚠️ WARNING: initData is expired!');
        console.log('Telegram initData expires after 24 hours.');
        console.log('You need to refresh the page in Telegram to get fresh initData.');
        return;
      }
    }
  } catch (e) {
    console.warn('⚠️ Could not check initData age:', e.message);
  }
  
  await testAuthEndpoint(initData);
}

// Allow initData as command line argument
if (process.argv.length > 2) {
  const initData = process.argv[2];
  testAuthEndpoint(initData).then(() => process.exit(0));
} else {
  main().then(() => process.exit(0));
}





