import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import scraping functions (we'll need to extract them or recreate them)
import axios from 'axios';

const extractUsername = (url, platform) => {
  if (!url || !url.trim()) return null;
  
  try {
    const urlObj = new URL(url.trim());
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    if (platform === 'leetcode') {
      const uIndex = pathParts.indexOf('u');
      if (uIndex !== -1 && pathParts[uIndex + 1]) {
        return pathParts[uIndex + 1];
      }
      return pathParts[pathParts.length - 1] || null;
    } else if (platform === 'codeforces') {
      const profileIndex = pathParts.indexOf('profile');
      if (profileIndex !== -1 && pathParts[profileIndex + 1]) {
        return pathParts[profileIndex + 1];
      }
      return null;
    }
  } catch (e) {
    return null;
  }
  return null;
};

const scrapeCodeforces = async (username, retryCount = 0) => {
  if (!username) return null;
  
  const maxRetries = 3;
  const retryDelay = 2000;
  
  try {
    const userInfoUrl = `https://codeforces.com/api/user.info?handles=${username}`;
    const userInfoResponse = await axios.get(userInfoUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
    
    const submissionsUrl = `https://codeforces.com/api/user.status?handle=${username}&from=1&count=100`;
    const submissionsResponse = await axios.get(submissionsUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
    if ((error.response?.status === 503 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') && retryCount < maxRetries) {
      console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
      return scrapeCodeforces(username, retryCount + 1);
    }
    console.error(`Error: ${error.message}`);
    return null;
  }
};

// Main script
const dbPath = path.join(__dirname, 'applications.db');
const db = new Database(dbPath);

const applicationId = process.argv[2];

if (!applicationId) {
  console.log('Usage: node rescrape-profile.js <application_id>');
  process.exit(1);
}

const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);

if (!app) {
  console.log(`Application ID ${applicationId} not found`);
  process.exit(1);
}

console.log(`Re-scraping profiles for: ${app.name} (ID: ${applicationId})`);

(async () => {
  let leetcodeData = null;
  let codeforcesData = null;
  let scrapingStatus = 'completed';

  if (app.leetcode_profile) {
    const leetcodeUsername = extractUsername(app.leetcode_profile, 'leetcode');
    if (leetcodeUsername) {
      console.log(`Scraping LeetCode: ${leetcodeUsername}`);
      // Add LeetCode scraping here if needed
    }
  }

  if (app.codeforces_profile) {
    const codeforcesUsername = extractUsername(app.codeforces_profile, 'codeforces');
    if (codeforcesUsername) {
      console.log(`Scraping Codeforces: ${codeforcesUsername}`);
      codeforcesData = await scrapeCodeforces(codeforcesUsername);
      if (codeforcesData) {
        console.log(`Success! Data:`, JSON.stringify(codeforcesData, null, 2));
      } else {
        console.log('Failed to scrape Codeforces');
        scrapingStatus = 'failed';
      }
    }
  }

  const hasAnyProfile = app.leetcode_profile || app.codeforces_profile;
  const hasAnyData = leetcodeData !== null || codeforcesData !== null;
  
  if (hasAnyProfile) {
    if (hasAnyData) {
      scrapingStatus = 'completed';
    } else {
      scrapingStatus = 'failed';
    }
  }

  const updateStmt = db.prepare(`
    UPDATE applications 
    SET leetcode_data = ?, codeforces_data = ?, scraping_status = ?
    WHERE id = ?
  `);
  
  updateStmt.run(
    leetcodeData ? JSON.stringify(leetcodeData) : null,
    codeforcesData ? JSON.stringify(codeforcesData) : null,
    scrapingStatus,
    applicationId
  );

  console.log(`\n✅ Updated! Status: ${scrapingStatus}`);
  process.exit(0);
})();

