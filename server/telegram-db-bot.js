import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Telegram Bot Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8036016051:AAHhbMEZNirawQ8H9Q8v2ftyRHhKlh6B0IU';
const GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-4944651195';
const DB_PATH = path.join(__dirname, 'applications.db');

// Telegram Bot API base URL
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Send database file to Telegram group
 */
async function sendDatabaseFile() {
  try {
    // Check if database file exists
    if (!fs.existsSync(DB_PATH)) {
      console.error(`❌ Database file not found at: ${DB_PATH}`);
      return { success: false, error: 'Database file not found' };
    }

    // Get file stats
    const stats = fs.statSync(DB_PATH);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📤 Sending database file to Telegram group...`);
    console.log(`   File: ${DB_PATH}`);
    console.log(`   Size: ${fileSizeMB} MB`);

    // Read the database file
    const fileStream = fs.createReadStream(DB_PATH);
    
    // Create form data for file upload
    const form = new FormData();
    form.append('chat_id', GROUP_ID);
    form.append('document', fileStream, {
      filename: `icpc-database-${new Date().toISOString().split('T')[0]}.db`,
      contentType: 'application/x-sqlite3'
    });
    form.append('caption', `📊 ICPC HUE Database Backup\n📅 Date: ${new Date().toLocaleString()}\n📦 Size: ${fileSizeMB} MB`);

    // Send file to Telegram group
    const response = await axios.post(
      `${TELEGRAM_API_BASE}/sendDocument`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.data.ok) {
      console.log(`✅ Database file sent successfully!`);
      console.log(`   Message ID: ${response.data.result.message_id}`);
      return { success: true, messageId: response.data.result.message_id };
    } else {
      console.error(`❌ Failed to send database file:`, response.data);
      return { success: false, error: response.data.description };
    }

  } catch (error) {
    console.error(`❌ Error sending database file:`, error.message);
    if (error.response) {
      console.error(`   Telegram API Error:`, error.response.data);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Send a text message to Telegram group
 */
async function sendMessage(text) {
  try {
    const response = await axios.post(`${TELEGRAM_API_BASE}/sendMessage`, {
      chat_id: GROUP_ID,
      text: text,
      parse_mode: 'HTML'
    });

    if (response.data.ok) {
      console.log(`✅ Message sent successfully!`);
      return { success: true, messageId: response.data.result.message_id };
    } else {
      console.error(`❌ Failed to send message:`, response.data);
      return { success: false, error: response.data.description };
    }
  } catch (error) {
    console.error(`❌ Error sending message:`, error.message);
    if (error.response) {
      console.error(`   Telegram API Error:`, error.response.data);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Check bot status
 */
async function checkBotStatus() {
  try {
    const response = await axios.get(`${TELEGRAM_API_BASE}/getMe`);
    if (response.data.ok) {
      const botInfo = response.data.result;
      console.log(`✅ Bot is active:`);
      console.log(`   Username: @${botInfo.username}`);
      console.log(`   Name: ${botInfo.first_name}`);
      console.log(`   ID: ${botInfo.id}`);
      return { success: true, botInfo };
    }
    return { success: false };
  } catch (error) {
    console.error(`❌ Error checking bot status:`, error.message);
    return { success: false, error: error.message };
  }
}

// Main execution
async function main() {
  console.log(`🤖 ICPC HUE Telegram Database Bot`);
  console.log(`   Group ID: ${GROUP_ID}`);
  console.log(`   Database: ${DB_PATH}`);
  console.log(`\n`);

  // Check bot status first
  const statusCheck = await checkBotStatus();
  if (!statusCheck.success) {
    console.error(`❌ Bot is not accessible. Please check your BOT_TOKEN.`);
    process.exit(1);
  }

  // Send database file
  const result = await sendDatabaseFile();
  
  if (result.success) {
    console.log(`\n✅ Successfully sent database to Telegram group!`);
    process.exit(0);
  } else {
    console.error(`\n❌ Failed to send database: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { sendDatabaseFile, sendMessage, checkBotStatus };

