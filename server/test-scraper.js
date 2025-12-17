import axios from 'axios';

// Copy the scraping functions from index.js
const extractUsername = (url, platform) => {
  if (!url || !url.trim()) return null;
  
  try {
    const urlObj = new URL(url.trim());
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    if (platform === 'leetcode') {
      // LeetCode: https://leetcode.com/username or https://leetcode.com/u/username
      // Handle both formats
      const uIndex = pathParts.indexOf('u');
      if (uIndex !== -1 && pathParts[uIndex + 1]) {
        return pathParts[uIndex + 1];
      }
      return pathParts[pathParts.length - 1] || null;
    } else if (platform === 'codeforces') {
      // Codeforces: https://codeforces.com/profile/username
      const profileIndex = pathParts.indexOf('profile');
      if (profileIndex !== -1 && pathParts[profileIndex + 1]) {
        return pathParts[profileIndex + 1];
      }
      return null;
    }
  } catch (e) {
    console.error(`Error extracting username from ${url}:`, e);
    return null;
  }
  return null;
};

const scrapeLeetCode = async (username) => {
  if (!username) return null;
  
  try {
    const url = 'https://leetcode.com/graphql';
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStats {
            acSubmissionNum {
              difficulty
              count
            }
          }
          profile {
            ranking
            reputation
          }
        }
      }
    `;
    
    const response = await axios.post(
      url,
      {
        query: query,
        variables: { username: username }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      }
    );
    
    if (response.status === 200 && response.data) {
      const userData = response.data.data?.matchedUser;
      
      if (userData) {
        const submitStats = userData.submitStats?.acSubmissionNum || [];
        let totalSolved = 0;
        
        for (const stat of submitStats) {
          if (stat.difficulty === 'All') {
            totalSolved = stat.count || 0;
            break;
          }
        }
        
        const profile = userData.profile || {};
        
        return {
          username: userData.username || username,
          total_solved: totalSolved,
          ranking: profile.ranking || null,
          reputation: profile.reputation || null,
          stats: submitStats
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error scraping LeetCode profile for ${username}:`, error.message);
    return null;
  }
};

const scrapeCodeforces = async (username) => {
  if (!username) return null;
  
  try {
    // First get user info
    const userInfoUrl = `https://codeforces.com/api/user.info?handles=${username}`;
    const userInfoResponse = await axios.get(userInfoUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    let rating = null;
    let maxRating = null;
    let rank = null;
    
    if (userInfoResponse.status === 200 && userInfoResponse.data?.status === 'OK') {
      const user = userInfoResponse.data.result?.[0];
      if (user) {
        rating = user.rating || null;
        maxRating = user.maxRating || null;
        rank = user.rank || null;
      }
    }
    
    // Then get submission stats
    const submissionsUrl = `https://codeforces.com/api/user.status?handle=${username}`;
    const submissionsResponse = await axios.get(submissionsUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    let totalSolved = 0;
    
    if (submissionsResponse.status === 200 && submissionsResponse.data?.status === 'OK') {
      const submissions = submissionsResponse.data.result || [];
      const solvedProblems = new Set();
      
      for (const submission of submissions) {
        if (submission.verdict === 'OK') {
          const problem = submission.problem || {};
          const contestId = problem.contestId || '';
          const index = problem.index || '';
          const problemId = `${contestId}${index}`;
          solvedProblems.add(problemId);
        }
      }
      
      totalSolved = solvedProblems.size;
    }
    
    return {
      username: username,
      total_solved: totalSolved,
      rating: rating,
      max_rating: maxRating,
      rank: rank
    };
  } catch (error) {
    console.error(`Error scraping Codeforces profile for ${username}:`, error.message);
    return null;
  }
};

// Test the scraping
async function testScraping() {
  console.log('='.repeat(60));
  console.log('TESTING PROFILE SCRAPING');
  console.log('='.repeat(60));
  
  const leetcodeUrl = 'https://leetcode.com/u/fjzzq2002/';
  const codeforcesUrl = 'https://codeforces.com/profile/ritesh_3822';
  
  console.log('\n1. Testing username extraction...');
  const leetcodeUsername = extractUsername(leetcodeUrl, 'leetcode');
  const codeforcesUsername = extractUsername(codeforcesUrl, 'codeforces');
  
  console.log(`LeetCode URL: ${leetcodeUrl}`);
  console.log(`Extracted username: ${leetcodeUsername}`);
  console.log(`\nCodeforces URL: ${codeforcesUrl}`);
  console.log(`Extracted username: ${codeforcesUsername}`);
  
  console.log('\n2. Testing LeetCode scraping...');
  if (leetcodeUsername) {
    const leetcodeData = await scrapeLeetCode(leetcodeUsername);
    if (leetcodeData) {
      console.log('✅ LeetCode scraping successful!');
      console.log(JSON.stringify(leetcodeData, null, 2));
    } else {
      console.log('❌ LeetCode scraping failed');
    }
  } else {
    console.log('❌ Failed to extract LeetCode username');
  }
  
  console.log('\n3. Testing Codeforces scraping...');
  if (codeforcesUsername) {
    const codeforcesData = await scrapeCodeforces(codeforcesUsername);
    if (codeforcesData) {
      console.log('✅ Codeforces scraping successful!');
      console.log(JSON.stringify(codeforcesData, null, 2));
    } else {
      console.log('❌ Codeforces scraping failed');
    }
  } else {
    console.log('❌ Failed to extract Codeforces username');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('TESTING COMPLETE');
  console.log('='.repeat(60));
}

testScraping().catch(console.error);

