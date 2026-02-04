const https = require('https');

// Test convert and withdraw for user 7660176383
const userId = 7660176383;
const testAuthHeader = encodeURIComponent(JSON.stringify({
  id: userId,
  first_name: 'The01Studio Support'
}));

async function testFlow() {
  console.log('🧪 Testing convert and withdraw flow...\n');
  
  // Step 1: Convert 50 credits to TON
  console.log('📊 Step 1: Converting 50 credits to TON...');
  
  const convertResult = await makeRequest('convert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': `user=${testAuthHeader}&auth_date=${Date.now() / 1000}&hash=test`
    },
    body: JSON.stringify({
      creditsToSpend: 50
    })
  });
  
  console.log('Convert result:', JSON.stringify(convertResult, null, 2));
  
  if (!convertResult.success) {
    console.log('❌ Convert failed. Cannot proceed with withdraw.');
    return;
  }
  
  console.log('\n✅ Convert successful!');
  console.log(`TON earned: ${convertResult.tonEarned}`);
  console.log(`New TON balance: ${convertResult.newTonBalance}`);
  
  // Step 2: Withdraw 0.2 TON
  console.log('\n💸 Step 2: Withdrawing 0.2 TON...');
  
  // Need to get wallet address first
  const userInfo = await makeRequest('user/info', {
    method: 'GET',
    headers: {
      'X-Telegram-Init-Data': `user=${testAuthHeader}&auth_date=${Date.now() / 1000}&hash=test`
    }
  });
  
  console.log('User info:', JSON.stringify(userInfo, null, 2));
  
  if (!userInfo.wallet_address) {
    console.log('❌ No wallet connected. Please connect your wallet first in the app.');
    return;
  }
  
  const withdrawResult = await makeRequest('withdraw-rewards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': `user=${testAuthHeader}&auth_date=${Date.now() / 1000}&hash=test`
    },
    body: JSON.stringify({
      amount: 0.2,
      walletAddress: userInfo.wallet_address
    })
  });
  
  console.log('\nWithdraw result:', JSON.stringify(withdrawResult, null, 2));
  
  if (withdrawResult.success) {
    console.log('\n✅ Withdraw successful! Check your wallet for 0.2 TON');
  } else {
    console.log('\n❌ Withdraw failed:', withdrawResult.error);
  }
}

function makeRequest(endpoint, options) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://collectablekit.01studio.xyz/api/${endpoint}`);
    const hostname = url.hostname;
    const path = url.pathname;
    const port = 443;

    const reqOptions = {
      hostname: hostname,
      path: path,
      port: port,
      method: options.method,
      headers: options.headers || {},
      rejectUnauthorized: false  // Allow self-signed certs
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

testFlow().catch(console.error);

