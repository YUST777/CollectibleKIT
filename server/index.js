import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dns from 'node:dns/promises';
import CryptoJS from 'crypto-js';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import speakeasy from 'speakeasy';
import axios from 'axios';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in server directory
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
// Required environment variables - throw error if missing
const requiredEnvVars = ['PORT', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'TOTP_SECRET', 'API_SECRET_KEY', 'ADMIN_API_KEY', 'ADMIN_SECRET_TOKEN'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ ERROR: Required environment variable ${envVar} is not set in .env file`);
    process.exit(1);
  }
}

const PORT = parseInt(process.env.PORT || '3001', 10);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TOTP_SECRET = process.env.TOTP_SECRET;

// Email Configuration (Brevo)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_LOGIN,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify email connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Email service connection error:', error);
  } else {
    console.log('✓ Email service is ready to take messages');
  }
});

// Initialize Database Tables
const initDB = async () => {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id bigint generated always as identity primary key,
                email text not null,
                token_hash text not null,
                expires_at timestamptz not null,
                created_at timestamptz default now()
            );
            CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
            CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
            
            CREATE TABLE IF NOT EXISTS login_logs (
                id bigint generated always as identity primary key,
                user_id bigint references users(id) on delete set null,
                ip_address text,
                user_agent text,
                logged_in_at timestamptz default now()
            );
            CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_login_logs_logged_in_at ON login_logs(logged_in_at);
        `);
    console.log('✓ Password resets table initialized');
    console.log('✓ Login logs table initialized');
  } catch (err) {
    console.error('Error initializing DB:', err);
  }
};
// initDB() call moved to after pool initialization

// Trust proxy for rate limiting to work correctly behind Nginx
app.set('trust proxy', 1);

// HTTPS enforcement middleware (production only)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if request is secure (HTTPS)
    const isSecure = req.secure ||
      req.headers['x-forwarded-proto'] === 'https' ||
      req.headers['x-forwarded-ssl'] === 'on';

    // Redirect HTTP to HTTPS
    if (!isSecure && req.method === 'GET') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }

    // Set HSTS header
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    next();
  });
}

// MANUAL CORS HEADERS - MUST BE FIRST (before everything else)
// MANUAL CORS HEADERS - MUST BE FIRST (before everything else)
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // In development, allow all localhost origins
  // In production, check against allowed list
  const allowedOrigins = ['https://icpchue.xyz', 'http://icpchue.xyz', 'https://www.icpchue.xyz', 'http://www.icpchue.xyz'];
  const isLocalhost = origin && origin.includes('localhost');
  const isAllowed = isLocalhost || allowedOrigins.includes(origin);

  // DEBUG LOGGING
  console.log(`[CORS] Request from Origin: ${origin || 'NO_ORIGIN'} (Allowed: ${isAllowed}) Method: ${req.method} Path: ${req.path}`);

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, x-api-key, x-admin-key'); // Added explicitly needed headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests immediately - return before any other middleware
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Security middleware (after CORS)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.google.com", "https://www.gstatic.com", "data:"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc.) for admin panel
      imgSrc: ["'self'", "data:", "https:", "https://unavatar.io"],
      connectSrc: ["'self'", "https://www.google.com", "https://unavatar.io"],
      frameSrc: ["'self'", "https://www.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Bot/Crawler detection and blocking middleware
const blockBots = (req, res, next) => {
  // Always allow OPTIONS preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return next();
  }

  const userAgent = (req.get('user-agent') || '').toLowerCase();

  // List of known bot/crawler user agents (removed axios/fetch - those are used by browsers)
  const botPatterns = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'sogou', 'exabot', 'facebot', 'ia_archiver',
    'msnbot', 'ahrefsbot', 'semrushbot', 'dotbot', 'mj12bot',
    'moz.com', 'spider', 'crawler', 'scraper', 'crawl',
    'curl', 'wget', 'python-requests', 'scrapy', 'httpclient',
    'okhttp', 'go-http-client', 'java/', 'apache-httpclient',
    'postman', 'insomnia', 'httpie'
  ];

  // Check if user agent matches bot patterns
  const isBot = botPatterns.some(pattern => userAgent.includes(pattern));

  // Block bots from accessing admin or API endpoints
  const isAdminPath = req.path.startsWith('/admin');
  const isApiPath = req.path.startsWith('/api') &&
    !req.path.startsWith('/api/health') &&
    !req.path.startsWith('/api/get-ip') &&
    !req.path.startsWith('/api/auth'); // Allow auth endpoints

  // Allow localhost/127.0.0.1 for testing
  const isLocalhost = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1';

  if (isBot && (isAdminPath || isApiPath) && !isLocalhost) {
    const ip = req.ip || 'unknown';
    console.log(`🚫 BLOCKED BOT: ${userAgent} from IP: ${ip} attempting to access: ${req.path}`);

    return res.status(403).json({
      error: 'Access denied',
      message: 'Automated access is not allowed'
    });
  }

  next();
};

// Apply bot blocking middleware
app.use(blockBots);

// Website analytics tracking middleware (skip API endpoints and admin)
app.use((req, res, next) => {
  // Skip tracking for API endpoints, admin panel, static files, and bots
  if (req.path.startsWith('/api') ||
    req.path.startsWith('/admin') ||
    req.path.startsWith('/_') ||
    req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webm|mp4|pdf)$/i)) {
    return next();
  }

  // Skip if it's a bot (already filtered, but double-check)
  const userAgent = (req.get('user-agent') || '').toLowerCase();
  const botPatterns = ['bot', 'crawler', 'spider', 'scraper'];
  if (botPatterns.some(pattern => userAgent.includes(pattern))) {
    return next();
  }

  // Generate session ID from IP + User Agent (simplified session tracking)
  const sessionId = CryptoJS.MD5((req.ip || 'unknown') + (userAgent || '')).toString().substring(0, 16);

  // Get real IP
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown';

  // Simple device/browser detection
  let deviceType = 'desktop';
  let browser = 'unknown';
  let os = 'unknown';

  if (/mobile|android|iphone|ipad/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) {
    browser = 'chrome';
  } else if (/firefox/i.test(userAgent)) {
    browser = 'firefox';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browser = 'safari';
  } else if (/edg/i.test(userAgent)) {
    browser = 'edge';
  }

  if (/windows/i.test(userAgent)) {
    os = 'windows';
  } else if (/mac/i.test(userAgent)) {
    os = 'macos';
  } else if (/linux/i.test(userAgent)) {
    os = 'linux';
  } else if (/android/i.test(userAgent)) {
    os = 'android';
  } else if (/ios|iphone|ipad/i.test(userAgent)) {
    os = 'ios';
  }

  // Log to database asynchronously (don't block the request)
  setImmediate(async () => {
    try {
      if (!pool) return; // Guard if pool not ready

      const query = `
        INSERT INTO website_analytics (path, ip_address, user_agent, referer, session_id, device_type, browser, os)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      await pool.query(query, [
        req.path,
        clientIP.replace(/^::ffff:/, ''),
        userAgent || null,
        req.get('referer') || null,
        sessionId,
        deviceType,
        browser,
        os
      ]);
    } catch (error) {
      // Silently fail analytics logging - don't break the app
      console.error('Analytics logging error:', error.message);
    }
  });

  next();
});

app.use(express.json({ limit: '10mb' }));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'تم تجاوز الحد المسموح. يرجى المحاولة مرة أخرى لاحقاً',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // More requests for admin
  message: {
    error: 'تم تجاوز الحد المسموح',
    retryAfter: '15 minutes'
  }
});

const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per 15 mins (reasonable for page refreshes)
  message: {
    error: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes'
  }
});

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const secretKey = process.env.API_SECRET_KEY;

  if (!secretKey) {
    console.error('❌ ERROR: API_SECRET_KEY not set in .env file');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'مفتاح API مطلوب' });
  }

  if (apiKey !== secretKey) {
    return res.status(403).json({ error: 'مفتاح API غير صحيح' });
  }

  next();
};

// Admin API Key validation
const validateAdminKey = (req, res, next) => {
  const apiKey = req.headers['x-admin-key'] || req.query.adminKey;
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    console.error('❌ ERROR: ADMIN_API_KEY not set in .env file');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'مفتاح Admin API مطلوب' });
  }

  if (apiKey !== adminKey) {
    return res.status(403).json({ error: 'مفتاح Admin API غير صحيح' });
  }

  next();
};

// Enhanced input sanitization - prevents XSS and SQL injection attempts
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return '';

  // Remove any potentially dangerous characters
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['";\\]/g, '') // Remove SQL injection characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .substring(0, 500); // Limit length to prevent DoS
};

// Enhanced HTML escaping for XSS protection
const escapeHtml = (unsafe = '') => {
  if (typeof unsafe !== 'string') return '';

  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
};

// Validate and limit string length
const validateLength = (str, maxLength, fieldName) => {
  if (!str || str.length === 0) return { valid: false, error: `${fieldName} is required` };
  if (str.length > maxLength) return { valid: false, error: `${fieldName} exceeds maximum length of ${maxLength} characters` };
  return { valid: true };
};

// Verify reCAPTCHA token
const verifyRecaptcha = async (token) => {
  if (!token) {
    console.log('⚠️ reCAPTCHA token missing');
    return true; // Don't block
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const siteKey = process.env.RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY;

  // Check if site key and secret key are the same (common mistake)
  if (secretKey && siteKey && secretKey === siteKey) {
    console.error('❌ reCAPTCHA ERROR: Site key and secret key are the SAME! They must be different.');
    console.error('   Site keys and secret keys are different in reCAPTCHA. Please get the correct secret key from Google reCAPTCHA admin console.');
    console.error('   For now, allowing submission without verification.');
    return true; // Don't block, but log the error
  }

  if (!secretKey || secretKey === 'YOUR_RECAPTCHA_SECRET_KEY') {
    // If no secret key configured, allow submission (for development)
    console.warn('⚠️ reCAPTCHA secret key not configured, skipping verification');
    return true;
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({
        secret: secretKey,
        response: token
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      }
    );

    console.log('🔍 reCAPTCHA API Response:', JSON.stringify(response.data));

    if (response.data && response.data.success) {
      // Check score (reCAPTCHA v3 returns a score from 0.0 to 1.0)
      // 1.0 is very likely a human, 0.0 is very likely a bot
      const score = response.data.score || 0.5;
      const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');

      if (score >= minScore) {
        console.log(`✅ reCAPTCHA verified - Score: ${score}`);
        return true;
      } else {
        console.log(`⚠️ reCAPTCHA score low: ${score} (minimum: ${minScore}) - Blocking request`);
        return false;
      }
    } else {
      const errorCodes = response.data?.['error-codes'] || [];
      console.error('❌ reCAPTCHA verification failed:', errorCodes);
      console.error('   Common causes:');
      console.error('   - Site key and secret key don\'t match');
      console.error('   - Token expired (tokens are only valid for 2 minutes)');
      console.error('   - Domain mismatch (key not registered for this domain)');
      console.error('   - Invalid token format');
      // Always allow - don't block users
      return true;
    }
  } catch (error) {
    console.error('❌ reCAPTCHA verification error:', error.message);
    // On error, allow submission to prevent blocking legitimate users
    // Always return true to not block users
    return true;
  }
};

// Validate and sanitize form data - Enhanced security
const validateAndSanitizeForm = async (req, res, next) => {
  try {
    const { applicationType, name, faculty, id, nationalId, studentLevel, telephone, hasLaptop, codeforcesProfile, leetcodeProfile, email, recaptchaToken } = req.body;

    // Log received data for debugging (without sensitive info)
    console.log('Received application submission:', {
      applicationType,
      hasName: !!name,
      faculty,
      hasId: !!id,
      hasNationalId: !!nationalId,
      studentLevel,
      hasTelephone: !!telephone,
      hasLaptop,
      hasCodeforces: !!codeforcesProfile,
      hasLeetcode: !!leetcodeProfile,
      hasRecaptchaToken: !!recaptchaToken
    });

    // Verify reCAPTCHA token (OPTIONAL - allow submissions without token if client reCAPTCHA fails)
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (secretKey && secretKey !== 'YOUR_RECAPTCHA_SECRET_KEY' && secretKey.trim() !== '' && recaptchaToken) {
      // Only verify if token is provided
      try {
        const recaptchaValid = await verifyRecaptcha(recaptchaToken);
        if (!recaptchaValid) {
          console.log('reCAPTCHA verification failed for request from:', req.ip);
          return res.status(400).json({ error: 'reCAPTCHA verification failed. Please refresh the page and try again.' });
        }
        console.log('✓ reCAPTCHA verified successfully');
      } catch (recaptchaError) {
        console.error('reCAPTCHA verification error:', recaptchaError.message);
        // Continue without reCAPTCHA if verification fails (key mismatch, network error, etc.)
        console.warn('⚠️ Continuing without reCAPTCHA verification');
      }
    } else if (!recaptchaToken) {
      // Log warning but allow submission (reCAPTCHA site key may not be registered for this domain)
      console.warn('⚠️ reCAPTCHA token missing from:', req.ip, '- allowing submission (reCAPTCHA may not be configured for this domain)');
    }

    // Validate application type
    if (!applicationType || !['trainee', 'trainer'].includes(applicationType)) {
      return res.status(400).json({ error: 'Invalid application type. Must be trainee or trainer' });
    }

    // Validate and verify email
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!/^[^\s@]+@horus\.edu\.eg$/i.test(email.trim())) {
      return res.status(400).json({ error: 'Email must be from Horus University (@horus.edu.eg)' });
    }

    // Validate and sanitize with length limits
    const nameVal = validateLength(name, 100, 'Name');
    if (!nameVal.valid) {
      return res.status(400).json({ error: nameVal.error });
    }

    // Validate faculty is in allowed list (prevents injection)
    const allowedFaculties = ['ai', 'medicine', 'dentistry', 'pharmacy', 'physiotherapy', 'nursing'];
    if (!allowedFaculties.includes(faculty)) {
      return res.status(400).json({ error: 'Invalid faculty selected' });
    }

    // Validate student level is in allowed list
    if (!['1', '2', '3', '4', '5'].includes(studentLevel)) {
      return res.status(400).json({ error: 'Invalid student level' });
    }

    // Trainer-specific validations
    if (applicationType === 'trainer') {
      const hasCodeforces = codeforcesProfile && codeforcesProfile.trim()
      const hasLeetcode = leetcodeProfile && leetcodeProfile.trim()

      if (!hasCodeforces && !hasLeetcode) {
        return res.status(400).json({ error: 'At least one profile (Codeforces or LeetCode) is required for trainers' });
      }

      // Validate Codeforces URL format if provided
      if (hasCodeforces && !/^https?:\/\/(www\.)?codeforces\.com\/profile\/[\w-]+/i.test(codeforcesProfile.trim())) {
        return res.status(400).json({ error: 'Invalid Codeforces profile URL' });
      }

      // Validate LeetCode URL format if provided
      if (hasLeetcode && !/^https?:\/\/(www\.)?leetcode\.com\/[\w-]+/i.test(leetcodeProfile.trim())) {
        return res.status(400).json({ error: 'Invalid LeetCode profile URL' });
      }
    }

    // Sanitize all inputs with strict rules
    req.body = {
      applicationType: applicationType,
      name: sanitizeInput(name || '').substring(0, 100),
      faculty: sanitizeInput(faculty || '').substring(0, 50),
      id: sanitizeInput(id || '').replace(/\D/g, '').substring(0, 7),
      nationalId: sanitizeInput(nationalId || '').replace(/\D/g, '').substring(0, 14),
      studentLevel: sanitizeInput(studentLevel || '').substring(0, 1),
      telephone: sanitizeInput(telephone || '').replace(/[^\d+]/g, '').substring(0, 13),
      hasLaptop: applicationType === 'trainee' ? (hasLaptop === true || hasLaptop === 'true' || hasLaptop === 1) : null,
      codeforcesProfile: sanitizeInput(codeforcesProfile || '').substring(0, 500),
      leetcodeProfile: sanitizeInput(leetcodeProfile || '').substring(0, 500),
      email: sanitizeInput(email || '').substring(0, 255)
    };

    // Additional validation for numeric fields
    if (req.body.id && !/^\d{7}$/.test(req.body.id)) {
      return res.status(400).json({ error: 'Student ID must be exactly 7 digits' });
    }

    if (req.body.nationalId && !/^\d{14}$/.test(req.body.nationalId)) {
      return res.status(400).json({ error: 'National ID must be exactly 14 digits' });
    }

    if (req.body.telephone && !/^\+20\d{10}$/.test(req.body.telephone)) {
      return res.status(400).json({ error: 'Telephone must be in format +20XXXXXXXXXX' });
    }

    next();
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(400).json({ error: 'Invalid input data' });
  }
};

// Initialize Postgres Database Connection
// Initialize Postgres Database Connection (Synchronous)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is missing in .env");
  // In serverless, we might not want to exit immediately if env vars strictly come from platform
  if (process.env.NODE_ENV !== 'production') process.exit(1);
}

// Global pool variable initialized immediately
const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }, // Required for many cloud DBs
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

console.log("✅ Database pool initialized");

// Initialize Database Tables
initDB();

// Wrappers for backward compatibility / ease of use
const db = {
  // Execute a query with parameters
  query: async (text, params) => {
    if (!pool) throw new Error("Database not initialized");
    return pool.query(text, params);
  }
};

// Encryption key for sensitive data (application-level encryption)
const encryptionKey = process.env.DB_ENCRYPTION_KEY;
if (!encryptionKey) {
  console.error('❌ ERROR: DB_ENCRYPTION_KEY not set in .env file');
  process.exit(1);
}

// Encryption/Decryption functions for sensitive fields
const encrypt = (text) => {
  if (!text) return null;
  return CryptoJS.AES.encrypt(text, encryptionKey).toString();
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return null;

  // Check if data is already decrypted (not in encrypted format)
  // Encrypted data starts with "U2FsdGVkX1" (CryptoJS format) or is much longer
  // If it looks like plain text (short, numeric, or contains @), return as-is
  if (typeof encryptedText === 'string') {
    // If it's already a plain number, phone, or email format, return as-is
    if (/^\+?\d+$/.test(encryptedText) && encryptedText.length <= 15) {
      // Looks like a phone number or ID - already decrypted
      return encryptedText;
    }
    if (encryptedText.includes('@') && encryptedText.length <= 255) {
      // Looks like an email - already decrypted
      return encryptedText;
    }
    if (!encryptedText.startsWith('U2FsdGVkX1') && encryptedText.length <= 20) {
      // Short plain text, likely already decrypted
      return encryptedText;
    }
  }

  // Try to decrypt (assuming it's encrypted)
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, encryptionKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    // If decryption resulted in empty string, data might not be encrypted
    if (!decrypted || decrypted.trim() === '') {
      // Return original if decryption failed (might be plain text)
      return encryptedText;
    }

    return decrypted;
  } catch (error) {
    // If decryption fails, assume it's already decrypted
    console.warn('Decryption failed, assuming plain text:', error.message);
    return encryptedText;
  }
};

console.log('✅ Database encryption utilities initialized');

// Scraping functions for LeetCode and Codeforces profiles
const extractUsername = (url, platform) => {
  if (!url || !url.trim()) return null;
  const input = url.trim();

  // If input doesn't contain slashes or dots, assume it's a username
  if (!input.includes('/') && !input.includes('.') && !input.includes(' ')) {
    return input;
  }

  try {
    // If it doesn't start with http, prepend it to try parsing as URL
    const urlToParse = input.startsWith('http') ? input : `https://${input}`;
    const urlObj = new URL(urlToParse);
    const pathParts = urlObj.pathname.split('/').filter(p => p);

    if (platform === 'leetcode') {
      // LeetCode: leetcode.com/username or leetcode.com/u/username
      const uIndex = pathParts.indexOf('u');
      if (uIndex !== -1 && pathParts[uIndex + 1]) {
        return pathParts[uIndex + 1];
      }
      return pathParts[pathParts.length - 1] || null;
    } else if (platform === 'codeforces') {
      // Codeforces: codeforces.com/profile/username
      const profileIndex = pathParts.indexOf('profile');
      if (profileIndex !== -1 && pathParts[profileIndex + 1]) {
        return pathParts[profileIndex + 1];
      }
      // If no /profile/, maybe it's just codeforces.com/username (not standard but possible?)
      // Standard is /profile/username.
      return null;
    }
  } catch (e) {
    console.error(`Error extracting username from ${url}:`, e);
    // If URL parsing fails but it looks like a username (logic handled above), return it.
    // The top check handles simple cases. If complex URL fails, return null.
    return null;
  }
  return null;
};

const scrapeLeetCode = async (username, retryCount = 0) => {
  if (!username) return null;

  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

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
    // Retry on network errors or 5xx status codes
    if ((error.response?.status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') && retryCount < maxRetries) {
      console.log(`LeetCode API error for ${username}, retrying... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
      return scrapeLeetCode(username, retryCount + 1);
    }
    console.error(`Error scraping LeetCode profile for ${username}:`, error.message);
    return null;
  }
};

const scrapeCodeforces = async (username, retryCount = 0) => {
  if (!username) return null;

  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  try {
    // First get user info
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

    // Then get submission stats (increase limit to 10000 to get accurate solved count)
    const submissionsUrl = `https://codeforces.com/api/user.status?handle=${username}&from=1&count=10000`;
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
    // Retry on 503 (Service Unavailable) or network errors
    if ((error.response?.status === 503 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') && retryCount < maxRetries) {
      console.log(`Codeforces API returned ${error.response?.status || error.code} for ${username}, retrying... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
      return scrapeCodeforces(username, retryCount + 1);
    }
    console.error(`Error scraping Codeforces profile for ${username}:`, error.message);
    return null;
  }
};

// Table creation handled by external Supabase migration script
// Removing SQLite table creation logic


// Table creation for logs/analytics should be handled via migrations
// Removed db.exec calls

// Logging middleware
const logAccess = (req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    // Log asynchronously
    setImmediate(async () => {
      try {
        if (!pool) return;
        const logQuery = `
              INSERT INTO api_access_log (endpoint, ip_address, user_agent, method, status_code)
              VALUES ($1, $2, $3, $4, $5)
            `;
        // With trust proxy set, req.ip already handles X-Forwarded-For from Nginx
        const ip = req.ip || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';

        await pool.query(logQuery, [
          sanitizeInput(req.path).substring(0, 500),
          sanitizeInput(ip).substring(0, 45),
          sanitizeInput(userAgent).substring(0, 255),
          sanitizeInput(req.method).substring(0, 10),
          res.statusCode
        ]);
      } catch (e) {
        console.error("Access log error:", e.message);
      }
    });

    return originalSend.call(this, data);
  };
  next();
};

app.use(logAccess);

// API endpoint to submit application (protected with rate limiting and API key)
// Security: Uses prepared statements (SQL injection protected), input validation, and sanitization

app.post('/api/submit-application', apiLimiter, validateApiKey, async (req, res, next) => {
  // Wrap validateAndSanitizeForm to handle async
  try {
    await validateAndSanitizeForm(req, res, next);
  } catch (error) {
    next(error);
  }
}, async (req, res) => {
  try {
    // Data is already sanitized and validated by validateAndSanitizeForm middleware
    const { applicationType, name, faculty, id, nationalId, studentLevel, telephone, hasLaptop, codeforcesProfile, leetcodeProfile, email } = req.body;

    // Get client info and sanitize
    // With trust proxy set, req.ip already handles X-Forwarded-For from Nginx
    const ip = sanitizeInput(req.ip || 'unknown').substring(0, 45);
    const userAgent = sanitizeInput(req.get('user-agent') || 'unknown').substring(0, 255);

    // Insert into database using parameterized query (SQL injection protected)
    // Using prepared statements with placeholders (?) ensures all values are properly escaped
    // This prevents SQL injection attacks - user input can never be executed as SQL code
    // Insert into database using parameterized query (SQL injection protected)
    // Using prepared statements with placeholders ($n) ensures all values are properly escaped
    const query = `
      INSERT INTO applications (application_type, name, faculty, student_id, national_id, student_level, telephone, address, has_laptop, codeforces_profile, leetcode_profile, email, ip_address, user_agent, scraping_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `;

    // All values are bound as parameters - SQL injection impossible
    const result = await pool.query(query, [
      applicationType, // trainee or trainer
      name,      // Already sanitized
      faculty,   // Already sanitized and validated
      id,        // Already sanitized and validated (7 digits)
      encrypt(nationalId), // Encrypt national ID (sensitive)
      studentLevel, // Already sanitized and validated
      encrypt(telephone), // Encrypt telephone (sensitive)
      null,      // Address is no longer required (set to null)
      hasLaptop ? 1 : 0, // Boolean to integer
      codeforcesProfile || null, // Already sanitized
      leetcodeProfile || null, // Already sanitized
      encrypt(email || null), // Encrypt email (sensitive)
      ip,        // Sanitized above
      userAgent,  // Sanitized above
      'pending'   // Scraping status
    ]);

    // Manual uniqueness check for encrypted fields (because encryption is non-deterministic)
    // We must decrypt and compare all existing records. 
    // This is O(N) but necessary without a schema change (Blind Index).
    const checkUniqueness = async () => {
      const allApps = await pool.query('SELECT id, national_id, telephone, email, student_id FROM applications WHERE id != $1', [result.rows[0].id]);

      const duplicates = [];
      const newNationalId = nationalId.replace(/\D/g, '');
      const newTelephone = telephone.replace(/[^\d+]/g, '');
      const newEmail = email.toLowerCase().trim();

      for (const app of allApps.rows) {
        // Check National ID
        if (app.national_id) {
          const dec = decrypt(app.national_id);
          if (dec && dec.replace(/\D/g, '') === newNationalId) {
            duplicates.push(`National ID already exists (Application ID: ${app.id})`);
          }
        }
        // Check Telephone
        if (app.telephone) {
          const dec = decrypt(app.telephone);
          if (dec && dec.replace(/[^\d+]/g, '') === newTelephone) {
            duplicates.push(`Telephone already exists (Application ID: ${app.id})`);
          }
        }
        // Check Email
        if (app.email) {
          const dec = decrypt(app.email);
          if (dec && dec.toLowerCase().trim() === newEmail) {
            duplicates.push(`Email already exists (Application ID: ${app.id})`);
          }
        }
      }

      if (duplicates.length > 0) {
        // Rollback (delete the just-inserted record)
        await pool.query('DELETE FROM applications WHERE id = $1', [result.rows[0].id]);
        throw new Error(`Duplicate Data: ${duplicates.join(', ')}`);
      }
    };

    // Run the check
    await checkUniqueness();

    const applicationId = result.rows[0].id;

    // Log database write
    logDatabaseAccess('DATABASE_WRITE', req.ip, req.get('user-agent'), {
      endpoint: '/api/submit-application',
      action: 'INSERT',
      applicationId,
      applicationType
    });

    // Scrape profiles for trainers (async, don't block response)
    if (applicationType === 'trainer') {
      // Run scraping in background (don't await to avoid blocking response)
      (async () => {
        try {
          let leetcodeData = null;
          let codeforcesData = null;
          let scrapingStatus = 'completed';

          // Scrape LeetCode if profile provided
          if (leetcodeProfile) {
            const leetcodeUsername = extractUsername(leetcodeProfile, 'leetcode');
            if (leetcodeUsername) {
              console.log(`Scraping LeetCode profile for: ${leetcodeUsername}`);
              leetcodeData = await scrapeLeetCode(leetcodeUsername);
              if (leetcodeData) {
                console.log(`LeetCode data scraped: ${JSON.stringify(leetcodeData)}`);
              }
            }
          }

          // Scrape Codeforces if profile provided
          if (codeforcesProfile) {
            const codeforcesUsername = extractUsername(codeforcesProfile, 'codeforces');
            if (codeforcesUsername) {
              console.log(`Scraping Codeforces profile for: ${codeforcesUsername}`);
              codeforcesData = await scrapeCodeforces(codeforcesUsername);
              if (codeforcesData) {
                console.log(`Codeforces data scraped: ${JSON.stringify(codeforcesData)}`);
              } else {
                console.warn(`Failed to scrape Codeforces profile for: ${codeforcesUsername}`);
              }
            }
          }

          // Determine final scraping status
          const hasLeetcodeData = leetcodeData !== null;
          const hasCodeforcesData = codeforcesData !== null;
          const hasAnyProfile = leetcodeProfile || codeforcesProfile;
          const hasAnyData = hasLeetcodeData || hasCodeforcesData;

          // Set status based on results
          if (hasAnyProfile) {
            if (hasAnyData) {
              scrapingStatus = 'completed';
            } else {
              scrapingStatus = 'failed';
            }
          } else {
            // No profiles to scrape, mark as completed
            scrapingStatus = 'completed';
          }

          // Update database with scraped data
          // Update database with scraped data
          // Use Postgres syntax ($1, $2...)
          const updateQuery = `
            UPDATE applications 
            SET leetcode_data = $1, codeforces_data = $2, scraping_status = $3
            WHERE id = $4
          `;

          await pool.query(updateQuery, [
            leetcodeData ? JSON.stringify(leetcodeData) : null,
            codeforcesData ? JSON.stringify(codeforcesData) : null,
            scrapingStatus,
            applicationId
          ]);

          console.log(`Profile scraping ${scrapingStatus} for application ID: ${applicationId}`);
        } catch (scrapingError) {
          console.error(`Error scraping profiles for application ID ${applicationId}:`, scrapingError);
          // Update status to failed
          try {
            await pool.query('UPDATE applications SET scraping_status = $1 WHERE id = $2', ['failed', applicationId]);
          } catch (updateError) {
            console.error('Error updating scraping status:', updateError);
          }
        }
      })();
    } else {
      // For trainees, immediately set scraping status to 'not_applicable' since there's nothing to scrape
      setImmediate(async () => {
        try {
          await pool.query('UPDATE applications SET scraping_status = $1 WHERE id = $2', ['not_applicable', applicationId]);
          console.log(`Trainee application ID ${applicationId} - scraping not applicable`);
        } catch (e) { console.error("Error setting not_applicable", e); }
      });
    }

    res.json({ success: true, message: 'تم إرسال الطلب بنجاح' });
  } catch (error) {
    if (error.code === '23505') { // Postgres Unique Constraint Violation
      if (error.detail && error.detail.includes('student_id')) {
        return res.status(400).json({ error: 'رقم الطالب مسجل مسبقاً. يرجى التحقق من الرقم والمحاولة مرة أخرى / Student ID already exists. Please check the number and try again.' });
      } else if (error.detail && error.detail.includes('national_id')) {
        return res.status(400).json({ error: 'الرقم القومي مسجل مسبقاً. يرجى التحقق من الرقم والمحاولة مرة أخرى / National ID already exists. Please check the number and try again.' });
      }
      return res.status(400).json({ error: 'البيانات مسجلة مسبقاً. يرجى التحقق والمحاولة مرة أخرى / Data already exists. Please check and try again.' });
    }
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء الإرسال' });
  }
});

// API endpoint to get all applications (protected with admin key and rate limiting)
// Audit logging for database access
const logDatabaseAccess = (action, ip, userAgent, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    ip: ip || 'unknown',
    userAgent: userAgent || 'unknown',
    ...details
  };
  console.log(`[AUDIT] ${action} - IP: ${ip} - ${JSON.stringify(logEntry)}`);
  // In production, you might want to write this to a separate log file or database
};

app.get('/api/applications', adminLimiter, validateAdminKey, async (req, res) => {
  try {
    // Log database access attempt
    logDatabaseAccess('DATABASE_ACCESS', req.ip, req.get('user-agent'), {
      endpoint: '/api/applications',
      method: 'GET'
    });

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Default 50, max 100
    const maxLimit = Math.min(limit, 100); // Cap at 100 records per request
    const offset = (page - 1) * maxLimit;

    // Get total count for pagination metadata
    // Async query for count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM applications');
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated results
    // Async query with parameterized limit/offset ($1, $2)
    const result = await pool.query('SELECT * FROM applications ORDER BY submitted_at DESC LIMIT $1 OFFSET $2', [maxLimit, offset]);
    const applications = result.rows;

    // Decrypt sensitive fields
    applications.forEach(app => {
      if (app.national_id) app.national_id = decrypt(app.national_id);
      if (app.telephone) app.telephone = decrypt(app.telephone);
      if (app.email) app.email = decrypt(app.email);
    });

    // Log successful access
    logDatabaseAccess('DATABASE_ACCESS_SUCCESS', req.ip, req.get('user-agent'), {
      endpoint: '/api/applications',
      recordsReturned: applications.length,
      page,
      limit: maxLimit
    });

    res.json({
      data: applications,
      pagination: {
        page,
        limit: maxLimit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / maxLimit),
        hasMore: offset + applications.length < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    logDatabaseAccess('DATABASE_ACCESS_ERROR', req.ip, req.get('user-agent'), {
      endpoint: '/api/applications',
      error: error.message
    });
    res.status(500).json({ error: 'حدث خطأ أثناء جلب البيانات' });
  }
});

// Verify TOTP code
const verifyTOTP = (token) => {
  try {
    return speakeasy.totp.verify({
      secret: TOTP_SECRET,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds) before/after current time for clock drift
    });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
};

const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  console.log('Auth attempt - Header present:', !!authHeader);

  if (!authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="ICPC Hue Admin - Requires Password + Google Authenticator Code"');
    return res.status(401).send('Authentication required');
  }

  const authParts = authHeader.split(' ');
  if (authParts.length < 2 || !authParts[1]) {
    res.set('WWW-Authenticate', 'Basic realm="ICPC Hue Admin - Requires Password + Google Authenticator Code"');
    return res.status(401).send('Invalid authentication header');
  }

  let credentials, username, passwordInput;
  try {
    const base64Credentials = authParts[1];
    credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const credParts = credentials.split(':');
    if (credParts.length < 2) {
      res.set('WWW-Authenticate', 'Basic realm="ICPC Hue Admin - Requires Password + Google Authenticator Code"');
      return res.status(401).send('Invalid credentials format');
    }
    username = credParts[0];
    passwordInput = credParts.slice(1).join(':'); // Join back in case password contains ':'
  } catch (error) {
    console.error('Error decoding credentials:', error);
    res.set('WWW-Authenticate', 'Basic realm="ICPC Hue Admin - Requires Password + Google Authenticator Code"');
    return res.status(401).send('Invalid authentication header');
  }

  // Trim whitespace in case of encoding issues
  const trimmedUsername = username ? username.trim() : '';
  const trimmedPasswordInput = passwordInput ? passwordInput.trim() : '';

  console.log('Received username:', trimmedUsername);
  console.log('Expected username:', ADMIN_USERNAME);
  console.log('Password input length:', trimmedPasswordInput.length);

  // Check username
  if (trimmedUsername !== ADMIN_USERNAME) {
    console.log('✗ Authentication failed - Invalid username');
    res.set('WWW-Authenticate', 'Basic realm="ICPC Hue Admin - Requires Password + Google Authenticator Code"');
    return res.status(401).send('Invalid credentials');
  }

  // Password format: "password,totpcode" (e.g., "Fh7^Zp3!mQ9@sL1vXc0#Nw5r,123456")
  // Or just "password" for backward compatibility (will fail TOTP check)
  let password = trimmedPasswordInput;
  let totpCode = null;

  // Check if password contains comma (format: password,totpcode)
  if (trimmedPasswordInput.includes(',')) {
    const parts = trimmedPasswordInput.split(',');
    password = parts.slice(0, -1).join(','); // In case password contains comma
    totpCode = parts[parts.length - 1].trim();
  }

  // Verify password
  if (password !== ADMIN_PASSWORD) {
    console.log('✗ Authentication failed - Invalid password');
    res.set('WWW-Authenticate', 'Basic realm="ICPC Hue Admin - Requires Password + Google Authenticator Code"');
    return res.status(401).send('Invalid credentials');
  }

  // Verify TOTP code
  if (!totpCode) {
    console.log('✗ Authentication failed - TOTP code required. Use format: password,totpcode');
    res.set('WWW-Authenticate', 'Basic realm="ICPC Hue Admin - Requires Password + Google Authenticator Code"');
    return res.status(401).send('Google Authenticator code required. Format: password,6digitcode');
  }

  const totpValid = verifyTOTP(totpCode);
  if (!totpValid) {
    console.log('✗ Authentication failed - Invalid TOTP code:', totpCode);
    res.set('WWW-Authenticate', 'Basic realm="ICPC Hue Admin - Requires Password + Google Authenticator Code"');
    return res.status(401).send('Invalid Google Authenticator code');
  }

  console.log('✓ Authentication successful - Username, Password, and TOTP verified');
  return next();
};

const renderAdminPage = (applications, currentPage = 1, totalPages = 1, totalCount = 0) => {
  const rows = applications.map((app, index) => {
    // Parse scraped data
    let codeforcesData = null;
    let leetcodeData = null;
    let codeforcesDisplay = '-';
    let leetcodeDisplay = '-';

    try {
      if (app.codeforces_data) {
        codeforcesData = JSON.parse(app.codeforces_data);
        if (codeforcesData) {
          codeforcesDisplay = `Rating: ${codeforcesData.rating || 'N/A'} | Solved: ${codeforcesData.total_solved || 0} | Rank: ${codeforcesData.rank || 'N/A'}`;
        }
      }
      if (app.leetcode_data) {
        leetcodeData = JSON.parse(app.leetcode_data);
        if (leetcodeData) {
          leetcodeDisplay = `Solved: ${leetcodeData.total_solved || 0} | Ranking: ${leetcodeData.ranking || 'N/A'}`;
        }
      }
    } catch (e) {
      // Keep default if parsing fails
    }

    // Build Codeforces display with link (especially for trainers)
    if (app.codeforces_profile) {
      const profileUrl = escapeHtml(app.codeforces_profile);
      const profileLink = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: none; font-weight: 500;">${profileUrl}</a>`;

      // Always show the link, and add scraped data below if available
      if (codeforcesDisplay !== '-') {
        // Has scraped data: show link on top, data below
        codeforcesDisplay = `${profileLink}<br><span style="color: #666; font-size: 0.9em; margin-top: 4px; display: inline-block;">${codeforcesDisplay}</span>`;
      } else {
        // No scraped data: just show link
        codeforcesDisplay = profileLink;
      }
    } else if (codeforcesDisplay === '-') {
      codeforcesDisplay = '-';
    }

    // Show LeetCode profile URL if data not scraped yet
    if (leetcodeDisplay === '-' && app.leetcode_profile) {
      const leetcodeUrl = escapeHtml(app.leetcode_profile);
      leetcodeDisplay = `<a href="${leetcodeUrl}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: none;">${leetcodeUrl}</a>`;
    }

    const scrapingStatus = app.scraping_status || 'pending';
    const statusBadge = scrapingStatus === 'completed' ? '<span style="color: green;">✓</span>' :
      scrapingStatus === 'failed' ? '<span style="color: red;">✗</span>' :
        scrapingStatus === 'not_applicable' ? '<span style="color: gray;">-</span>' :
          '<span style="color: orange;">...</span>';

    return `
      <tr>
        <td class="row-number">${index + 1}</td>
        <td>${escapeHtml(app.name)}</td>
        <td>${escapeHtml(app.faculty)}</td>
        <td>${escapeHtml(app.student_id)}</td>
        <td>${escapeHtml(app.national_id)}</td>
        <td>${escapeHtml(app.student_level)}</td>
        <td>${escapeHtml(app.telephone)}</td>
        <td>${escapeHtml(app.email || 'N/A')}</td>
        <td>${escapeHtml(app.application_type || 'trainee')}</td>
        <td>${app.has_laptop ? 'Yes' : 'No'}</td>
        <td style="font-size: 0.85rem;">${codeforcesDisplay}</td>
        <td style="font-size: 0.85rem;">${leetcodeDisplay}</td>
        <td>${statusBadge} ${scrapingStatus}</td>
        <td>${escapeHtml(new Date(app.submitted_at).toLocaleString('en-EG', { hour12: false }))}</td>
        <td>${escapeHtml(app.ip_address || 'N/A')}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="admin-token" content="${process.env.ADMIN_SECRET_TOKEN || ''}" />
      <title>ICPC Hue Admin Panel - Applications Database</title>
      <style>
        *, *::before, *::after {
          box-sizing: border-box;
        }
        html, body {
          height: auto;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          overflow-x: auto;
          background: #000000;
          background-image: linear-gradient(to bottom right, #000000, #1a1a1a, #000000);
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 1rem;
          color: rgba(255, 255, 255, 0.9);
        }
        .header {
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          color: white;
          padding: 1.5rem 2rem;
          margin: -1rem -1rem 2rem -1rem;
          border-bottom: 1px solid rgba(222, 171, 68, 0.2);
          box-shadow: 0 4px 20px rgba(222, 171, 68, 0.1);
        }
        .header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          background: linear-gradient(135deg, #ffffff 0%, #deab44 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .header .meta {
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .toolbar {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .toolbar .info {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .toolbar button {
          background: linear-gradient(135deg, #d59928 0%, #e6b04a 100%);
          color: #000;
          border: none;
          padding: 0.6rem 1.2rem;
          cursor: pointer;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(222, 171, 68, 0.3);
        }
        .toolbar button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(222, 171, 68, 0.5);
        }
        .table-wrapper {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow-x: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: transparent;
          font-size: 0.875rem;
        }
        th {
          background: rgba(222, 171, 68, 0.1);
          backdrop-filter: blur(10px);
          color: #deab44;
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          border: 1px solid rgba(222, 171, 68, 0.2);
          position: sticky;
          top: 0;
          z-index: 10;
          white-space: nowrap;
        }
        td {
          padding: 0.75rem 1rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
          text-align: left;
          vertical-align: top;
          color: rgba(255, 255, 255, 0.9);
        }
        tbody tr:nth-child(even) {
          background: rgba(255, 255, 255, 0.02);
        }
        tbody tr:hover {
          background: rgba(222, 171, 68, 0.1);
          transition: background 0.2s ease;
        }
        .row-number {
          background: rgba(222, 171, 68, 0.15);
          font-weight: 600;
          text-align: center;
          color: #deab44;
          border-right: 2px solid rgba(222, 171, 68, 0.3);
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: rgba(255, 255, 255, 0.5);
        }
        @media print {
          body {
            padding: 0;
          }
          .toolbar {
            display: none;
          }
          .table-wrapper {
            border: none;
            box-shadow: none;
          }
        }
        @media (max-width: 768px) {
          body {
            padding: 0.5rem;
          }
          .header {
            margin: -0.5rem -0.5rem 0.5rem -0.5rem;
            padding: 0.75rem 1rem;
          }
          .header h1 {
            font-size: 1.25rem;
          }
          table {
            font-size: 0.75rem;
          }
          th, td {
            padding: 0.4rem 0.5rem;
          }
        }
      </style>
      <script>
        function exportToCSV() {
          const table = document.querySelector('table');
          let csv = [];
          const rows = table.querySelectorAll('tr');
          
          for (let i = 0; i < rows.length; i++) {
            const row = [], cols = rows[i].querySelectorAll('td, th');
            for (let j = 0; j < cols.length; j++) {
              let data = cols[j].innerText.replace(/"/g, '""');
              row.push('"' + data + '"');
            }
            csv.push(row.join(','));
          }
          
          const csvContent = csv.join('\\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', 'icpc-hue-applications-' + new Date().toISOString().split('T')[0] + '.csv');
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        function printTable() {
          window.print();
        }
        
        // Refresh with authentication prompt
        function refreshWithAuth() {
          // Create modal overlay
          const overlay = document.createElement('div');
          overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center;';
          
          // Create modal dialog
          const modal = document.createElement('div');
          modal.style.cssText = 'background: rgba(0, 0, 0, 0.9); border: 1px solid rgba(222, 171, 68, 0.3); border-radius: 12px; padding: 2rem; max-width: 400px; width: 90%; box-shadow: 0 8px 32px rgba(222, 171, 68, 0.2);';
          
          modal.innerHTML = \`
            <h2 style="margin: 0 0 1.5rem 0; color: #deab44; font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
              <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              Re-authenticate to Refresh
            </h2>
            <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 1.5rem; font-size: 0.9rem;">
              Please enter your credentials to refresh the admin panel.
            </p>
            <div style="margin-bottom: 1rem;">
              <label style="display: block; color: rgba(255, 255, 255, 0.9); margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem;">Username</label>
              <input type="text" id="refresh-username" style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-size: 0.95rem; box-sizing: border-box;" placeholder="Enter username" autocomplete="username">
            </div>
            <div style="margin-bottom: 1rem;">
              <label style="display: block; color: rgba(255, 255, 255, 0.9); margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem;">Password</label>
              <input type="password" id="refresh-password" style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-size: 0.95rem; box-sizing: border-box;" placeholder="Enter password" autocomplete="current-password">
            </div>
            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; color: rgba(255, 255, 255, 0.9); margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem;">TOTP Code (6 digits)</label>
              <input type="text" id="refresh-totp" maxlength="6" style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-size: 0.95rem; box-sizing: border-box; text-align: center; letter-spacing: 0.5rem; font-family: monospace;" placeholder="000000" autocomplete="one-time-code">
            </div>
            <div id="refresh-error" style="color: #ef4444; font-size: 0.85rem; margin-bottom: 1rem; display: none;"></div>
            <div style="display: flex; gap: 0.75rem;">
              <button onclick="closeRefreshModal()" style="flex: 1; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: rgba(255, 255, 255, 0.9); cursor: pointer; font-weight: 600; transition: all 0.3s ease;">
                Cancel
              </button>
              <button onclick="performRefresh()" style="flex: 1; padding: 0.75rem; background: linear-gradient(135deg, #d59928 0%, #e6b04a 100%); border: none; border-radius: 8px; color: #000; cursor: pointer; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 10px rgba(222, 171, 68, 0.3);">
                Refresh
              </button>
            </div>
          \`;
          
          overlay.appendChild(modal);
          document.body.appendChild(overlay);
          
          // Focus on username field
          setTimeout(() => {
            document.getElementById('refresh-username').focus();
          }, 100);
          
          // Close on Escape key
          const handleEscape = (e) => {
            if (e.key === 'Escape') {
              closeRefreshModal();
            }
          };
          overlay.addEventListener('keydown', handleEscape);
          
          // Store overlay reference
          window.refreshOverlay = overlay;
        }
        
        function closeRefreshModal() {
          if (window.refreshOverlay) {
            document.body.removeChild(window.refreshOverlay);
            window.refreshOverlay = null;
          }
        }
        
        async function performRefresh() {
          const username = document.getElementById('refresh-username').value.trim();
          const password = document.getElementById('refresh-password').value.trim();
          const totp = document.getElementById('refresh-totp').value.trim();
          const errorEl = document.getElementById('refresh-error');
          
          // Clear previous error
          errorEl.style.display = 'none';
          errorEl.textContent = '';
          
          // Validate inputs
          if (!username || !password || !totp) {
            errorEl.textContent = 'Please fill in all fields';
            errorEl.style.display = 'block';
            return;
          }
          
          if (totp.length !== 6 || !/^\\d{6}$/.test(totp)) {
            errorEl.textContent = 'TOTP code must be 6 digits';
            errorEl.style.display = 'block';
            return;
          }
          
          // Format credentials for Basic Auth (password,totpcode format)
          const credentials = username + ':' + password + ',' + totp;
          const encodedCredentials = btoa(credentials);
          
          // Get current URL and admin token
          const currentUrl = new URL(window.location);
          const adminToken = currentUrl.searchParams.get('token') || document.querySelector('meta[name="admin-token"]')?.content || '';
          
          // Build the refresh URL
          let refreshUrl = window.location.pathname;
          if (adminToken) {
            refreshUrl += '?token=' + encodeURIComponent(adminToken);
            // Preserve tab parameter if exists
            const tab = currentUrl.searchParams.get('tab');
            if (tab) {
              refreshUrl += '&tab=' + encodeURIComponent(tab);
            }
            // Preserve page parameter if exists
            const page = currentUrl.searchParams.get('page');
            if (page) {
              refreshUrl += '&page=' + encodeURIComponent(page);
            }
          }
          
          // Test authentication by making a request
          try {
            const testResponse = await fetch(refreshUrl, {
              method: 'GET',
              headers: {
                'Authorization': 'Basic ' + encodedCredentials,
                'X-Admin-Token': adminToken || ''
              },
              credentials: 'include'
            });
            
            if (testResponse.status === 401) {
              errorEl.textContent = 'Invalid credentials. Please check your username, password, and TOTP code.';
              errorEl.style.display = 'block';
              return;
            }
            
            if (testResponse.ok || testResponse.status === 200) {
              // Authentication successful - close modal and reload
              closeRefreshModal();
              
              // Create a form to submit with Basic Auth
              const form = document.createElement('form');
              form.method = 'GET';
              form.action = refreshUrl;
              form.style.display = 'none';
              
              // Add hidden input to trigger Basic Auth
              const authInput = document.createElement('input');
              authInput.type = 'hidden';
              authInput.name = '_auth';
              authInput.value = encodedCredentials;
              form.appendChild(authInput);
              
              document.body.appendChild(form);
              
              // Use XMLHttpRequest to set Authorization header and reload
              const xhr = new XMLHttpRequest();
              xhr.open('GET', refreshUrl, true, username, password + ',' + totp);
              xhr.setRequestHeader('X-Admin-Token', adminToken || '');
              xhr.onload = function() {
                if (xhr.status === 200) {
                  // Replace page content
                  document.open();
                  document.write(xhr.responseText);
                  document.close();
                } else {
                  // Fallback: redirect with credentials in URL (less secure but works)
                  window.location.href = refreshUrl;
                }
              };
              xhr.onerror = function() {
                // Fallback: just reload
                window.location.href = refreshUrl;
              };
              xhr.send();
              
              // Alternative: Use fetch and replace content
              fetch(refreshUrl, {
                headers: {
                  'Authorization': 'Basic ' + encodedCredentials,
                  'X-Admin-Token': adminToken || ''
                }
              })
              .then(response => response.text())
              .then(html => {
                document.open();
                document.write(html);
                document.close();
              })
              .catch(() => {
                // Fallback: reload page
                window.location.href = refreshUrl;
              });
            } else {
              errorEl.textContent = 'Authentication failed. Please try again.';
              errorEl.style.display = 'block';
            }
          } catch (error) {
            errorEl.textContent = 'Error: ' + error.message;
            errorEl.style.display = 'block';
          }
        }
        
        // Allow Enter key to submit
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && window.refreshOverlay && document.getElementById('refresh-totp') === document.activeElement) {
            performRefresh();
          }
        });
      </script>
    </head>
    <body>
      <div id="init-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;color:#deab44;display:flex;justify-content:center;align-items:center;z-index:9999;font-size:24px;font-family:sans-serif;">
        Loading Admin Panel...
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            var overlay = document.getElementById('init-overlay');
            if(overlay) overlay.style.display = 'none';
          }, 1000);
        };
      </script>
      <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1>📊 ICPC HUE - Admin Dashboard</h1>
            <div class="meta">Last Updated: ${new Date().toLocaleString('en-US', { hour12: false })}</div>
          </div>
          <button onclick="refreshWithAuth()" style="background: rgba(222, 171, 68, 0.2); border: 1px solid rgba(222, 171, 68, 0.4); color: #deab44; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.3s ease; display: flex; align-items: center; gap: 0.5rem; hover:background: rgba(222, 171, 68, 0.3); hover:border-color: #deab44;">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      <!-- Tab Navigation -->
      <div class="tabs" style="margin-bottom: 1.5rem; display: flex; gap: 0.75rem; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); padding: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
        <button onclick="showTab('statistics')" id="tab-stats-btn" class="tab-btn active" style="flex: 1; padding: 0.875rem; background: linear-gradient(135deg, #d59928 0%, #e6b04a 100%); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.3s ease; box-shadow: 0 2px 10px rgba(222, 171, 68, 0.3);">
          <svg style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          Statistics Dashboard
        </button>
        <button onclick="showTab('applications')" id="tab-apps-btn" class="tab-btn" style="flex: 1; padding: 0.875rem; background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.3s ease;">
          <svg style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
          Applications (${totalCount})
        </button>
        <button onclick="showTab('submissions')" id="tab-submissions-btn" class="tab-btn" style="flex: 1; padding: 0.875rem; background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.3s ease;">
          <svg style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Sheet Submissions
        </button>
        <button onclick="showTab('logins')" id="tab-logins-btn" class="tab-btn" style="flex: 1; padding: 0.875rem; background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.3s ease;">
          <svg style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          Login Statistics
        </button>
      </div>
      
      <!-- Statistics Dashboard Tab -->
      <div id="statistics-tab" class="tab-content">
        <div id="stats-loading" style="text-align: center; padding: 3rem; color: rgba(255, 255, 255, 0.6);">
          <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite; color: #deab44;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <div style="font-size: 1.1rem; font-weight: 500;">Loading statistics...</div>
        </div>
        <style>
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        </style>
        <div id="stats-content" style="display: none;">
          <!-- Statistics will be loaded here via JavaScript -->
        </div>
      </div>
      
      <!-- Applications Tab -->
      <div id="applications-tab" class="tab-content" style="display: none;">
      ${totalPages > 1 ? `
      <div class="pagination" style="margin: 20px 0; text-align: center; padding: 15px; background: #f5f5f5; border-radius: 8px;">
        <button onclick="loadPage(${Math.max(1, currentPage - 1)})" ${currentPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : 'style="padding: 10px 20px; margin: 0 5px; background: #217346; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;"'} >← Previous</button>
        <span style="margin: 0 15px; color: #333; font-weight: 600; font-size: 16px;">Page ${currentPage} of ${totalPages}</span>
        <button onclick="loadPage(${Math.min(totalPages, currentPage + 1)})" ${currentPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : 'style="padding: 10px 20px; margin: 0 5px; background: #217346; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;"'} >Next →</button>
      </div>
      <script>
        function loadPage(page) {
          const url = new URL(window.location);
          url.searchParams.set('page', page);
          window.location = url.toString();
        }
      </script>
      ` : ''}
      <div class="toolbar">
        <div class="info">Viewing application records from SQLite database</div>
        <div>
          <button onclick="exportToCSV()" style="margin-right: 0.5rem;">📥 Export to CSV</button>
          <button onclick="printTable()">🖨️ Print</button>
        </div>
      </div>
      <div class="table-wrapper">
          <table>
            <thead>
              <tr>
              <th style="width: 50px;">#</th>
                <th>Name</th>
                <th>Faculty</th>
                <th>Student ID</th>
                <th>National ID</th>
                <th>Level</th>
                <th>Telephone</th>
                <th>Email</th>
              <th>Type</th>
              <th>Has Laptop</th>
              <th>Codeforces Data</th>
              <th>LeetCode Data</th>
              <th>Scraping</th>
                <th>Submitted At</th>
              <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
            ${rows || '<tr><td colspan="14" class="empty-state">No applications recorded yet</td></tr>'}
            </tbody>
          </table>
      </div>
      </div>
      
      <!-- Sheet Submissions Tab -->
      <div id="submissions-tab" class="tab-content" style="display: none;">
        <div class="toolbar">
          <div class="info">Sheet Submissions - Users and their submitted sheets</div>
        </div>
        <div id="submissions-loading" style="text-align: center; padding: 3rem; color: rgba(255, 255, 255, 0.6);">
          <div style="font-size: 1.1rem; font-weight: 500;">Loading submissions...</div>
        </div>
        <div id="submissions-content" style="display: none;"></div>
      </div>
      
      <!-- Login Statistics Tab -->
      <div id="logins-tab" class="tab-content" style="display: none;">
        <div class="toolbar">
          <div class="info">Login Statistics - User login activity</div>
        </div>
        <div id="logins-loading" style="text-align: center; padding: 3rem; color: rgba(255, 255, 255, 0.6);">
          <div style="font-size: 1.1rem; font-weight: 500;">Loading login statistics...</div>
        </div>
        <div id="logins-content" style="display: none;"></div>
      </div>
      
      <script>
        // Tab switching
        function showTab(tabName) {
          // Hide all tabs
          document.getElementById('statistics-tab').style.display = 'none';
          document.getElementById('applications-tab').style.display = 'none';
          document.getElementById('submissions-tab').style.display = 'none';
          document.getElementById('logins-tab').style.display = 'none';
          
          // Remove active class from all buttons
          const buttons = ['tab-stats-btn', 'tab-apps-btn', 'tab-submissions-btn', 'tab-logins-btn'];
          buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            btn.classList.remove('active');
            btn.style.background = 'rgba(255, 255, 255, 0.05)';
            btn.style.color = 'rgba(255, 255, 255, 0.7)';
            btn.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            btn.style.boxShadow = 'none';
          });
          
          // Show selected tab and activate button
          const activeStyle = {
            background: 'linear-gradient(135deg, #d59928 0%, #e6b04a 100%)',
            color: '#000',
            border: 'none',
            boxShadow: '0 2px 10px rgba(222, 171, 68, 0.3)'
          };
          
          if (tabName === 'statistics') {
            document.getElementById('statistics-tab').style.display = 'block';
            const btn = document.getElementById('tab-stats-btn');
            btn.classList.add('active');
            Object.assign(btn.style, activeStyle);
            loadStatistics();
          } else if (tabName === 'applications') {
            document.getElementById('applications-tab').style.display = 'block';
            const btn = document.getElementById('tab-apps-btn');
            btn.classList.add('active');
            Object.assign(btn.style, activeStyle);
          } else if (tabName === 'submissions') {
            document.getElementById('submissions-tab').style.display = 'block';
            const btn = document.getElementById('tab-submissions-btn');
            btn.classList.add('active');
            Object.assign(btn.style, activeStyle);
            loadSubmissions();
          } else if (tabName === 'logins') {
            document.getElementById('logins-tab').style.display = 'block';
            const btn = document.getElementById('tab-logins-btn');
            btn.classList.add('active');
            Object.assign(btn.style, activeStyle);
            loadLogins();
          }
        }
        
        // Load statistics from API
        async function loadStatistics() {
          const loadingEl = document.getElementById('stats-loading');
          const contentEl = document.getElementById('stats-content');
          
          try {
            // Get admin token from current URL or header
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token') || document.querySelector('meta[name="admin-token"]')?.content || '';
            const headers = {
              'X-Admin-Token': token
            };
            
            // Fetch application statistics
            const appStatsRes = await fetch('/api/admin/statistics/applications', { headers });
            const appStats = await appStatsRes.json();
            
            // Fetch analytics statistics
            const analyticsRes = await fetch('/api/admin/statistics/analytics', { headers });
            const analytics = await analyticsRes.json();
            
            if (appStats.success && analytics.success) {
              renderStatistics(appStats.data, analytics.data);
              loadingEl.style.display = 'none';
              contentEl.style.display = 'block';
            } else {
              throw new Error('Failed to load statistics');
            }
          } catch (error) {
            loadingEl.innerHTML = '<div style="color: red;">❌ Error loading statistics: ' + error.message + '</div>';
          }
        }
        
        // Render statistics dashboard
        function renderStatistics(appStats, analytics) {
          const contentEl = document.getElementById('stats-content');
          
          // SVG Icon helper
          const svgIcon = (name, size = 24, color = '#deab44') => {
            const icons = {
              clipboard: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>\`,
              chart: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>\`,
              users: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>\`,
              eye: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>\`,
              laptop: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>\`,
              calendar: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>\`,
              clock: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>\`,
              globe: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>\`,
              check: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>\`,
              x: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>\`,
              refresh: \`<svg width="\${size}" height="\${size}" fill="none" stroke="\${color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>\`
            };
            return icons[name] || icons.clipboard;
          };
          
          // Helper function to create glassy stat card
          const statCard = (title, value, iconName, color = '#deab44') => \`
            <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); transition: all 0.3s ease; hover:transform: translateY(-4px);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <div style="background: rgba(222, 171, 68, 0.1); padding: 0.5rem; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
                  \${svgIcon(iconName, 24, color)}
                </div>
                <span style="font-size: 2rem; font-weight: bold; color: \${color};">\${value}</span>
              </div>
              <div style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; font-weight: 500;">\${title}</div>
            </div>
          \`;
          
          // Helper function to create glassy chart bar
          const barChart = (label, value, max, color = '#deab44') => \`
            <div style="margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="font-size: 0.9rem; font-weight: 500; color: rgba(255, 255, 255, 0.9);">\${label}</span>
                <span style="font-size: 0.9rem; color: \${color}; font-weight: 600;">\${value}</span>
              </div>
              <div style="background: rgba(255, 255, 255, 0.05); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, \${color} 0%, \${color}dd 100%); height: 100%; width: \${Math.min((value / max) * 100, 100)}%; transition: width 0.5s ease; box-shadow: 0 0 10px rgba(222, 171, 68, 0.3);"></div>
              </div>
            </div>
          \`;
          
          // Helper function to create line chart
          const lineChart = (data, width = '100%', height = '200px', color = '#deab44') => {
            if (!data || data.length === 0) return '<div style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.5);">No data available</div>';
            const maxValue = Math.max(...data.map(d => d.count || d.views || 0));
            const minValue = Math.min(...data.map(d => d.count || d.views || 0));
            const range = maxValue - minValue || 1;
            const padding = 40;
            const chartWidth = 600;
            const chartHeight = 200;
            
            // Generate SVG path
            let pathData = 'M ';
            data.forEach((point, idx) => {
              const x = padding + (idx / (data.length - 1 || 1)) * (chartWidth - padding * 2);
              const y = chartHeight - padding - ((point.count || point.views || 0) - minValue) / range * (chartHeight - padding * 2);
              pathData += (idx === 0 ? '' : ' L ') + x + ',' + y;
            });
            
            // Area fill path
            let areaPath = pathData + ' L ' + (padding + (chartWidth - padding * 2)) + ',' + (chartHeight - padding) + ' L ' + padding + ',' + (chartHeight - padding) + ' Z';
            
            // Generate points
            const points = data.map((point, idx) => {
              const x = padding + (idx / (data.length - 1 || 1)) * (chartWidth - padding * 2);
              const y = chartHeight - padding - ((point.count || point.views || 0) - minValue) / range * (chartHeight - padding * 2);
              return { x, y, value: point.count || point.views || 0, label: point.date || point.hour || '' };
            });
            
            return \`
              <div style="position: relative; width: \${width}; height: \${height};">
                <svg width="100%" height="100%" viewBox="0 0 \${chartWidth} \${chartHeight}" style="overflow: visible;">
                  <!-- Grid lines -->
                  \${Array.from({length: 5}).map((_, i) => {
                    const y = padding + (i / 4) * (chartHeight - padding * 2);
                    const value = maxValue - (i / 4) * range;
                    return \`
                      <line x1="\${padding}" y1="\${y}" x2="\${chartWidth - padding}" y2="\${y}" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1"/>
                      <text x="\${padding - 10}" y="\${y + 4}" fill="rgba(255, 255, 255, 0.5)" font-size="10" text-anchor="end">\${Math.round(value)}</text>
                    \`;
                  }).join('')}
                  <!-- Area fill -->
                  <path d="\${areaPath}" fill="url(#gradient)" opacity="0.2"/>
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:\${color};stop-opacity:0.3" />
                      <stop offset="100%" style="stop-color:\${color};stop-opacity:0" />
                    </linearGradient>
                  </defs>
                  <!-- Line -->
                  <path d="\${pathData}" fill="none" stroke="\${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                  <!-- Points -->
                  \${points.map((p, idx) => \`
                    <circle cx="\${p.x}" cy="\${p.y}" r="4" fill="\${color}" style="transition: r 0.3s;">
                      <title>\${p.label}: \${p.value}</title>
                    </circle>
                  \`).join('')}
                  <!-- X-axis labels -->
                  \${points.filter((_, idx) => idx % Math.ceil(data.length / 6) === 0 || idx === data.length - 1).map(p => \`
                    <text x="\${p.x}" y="\${chartHeight - padding + 20}" fill="rgba(255, 255, 255, 0.6)" font-size="9" text-anchor="middle">\${p.label}</text>
                  \`).join('')}
                </svg>
              </div>
            \`;
          };
          
          // Helper function to create pie/donut chart
          const pieChart = (data, size = 200, colors = ['#deab44', '#d59928', '#60a5fa', '#f472b6', '#10b981']) => {
            if (!data || data.length === 0) return '<div style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.5);">No data</div>';
            const total = data.reduce((sum, item) => sum + (item.count || item.value || 0), 0);
            if (total === 0) return '<div style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.5);">No data</div>';
            
            const radius = size / 2 - 10;
            const center = size / 2;
            let currentAngle = -Math.PI / 2;
            
            const segments = data.map((item, idx) => {
              const value = item.count || item.value || 0;
              const percentage = (value / total) * 100;
              const angle = (value / total) * 2 * Math.PI;
              const largeArcFlag = angle > Math.PI ? 1 : 0;
              
              const x1 = center + radius * Math.cos(currentAngle);
              const y1 = center + radius * Math.sin(currentAngle);
              currentAngle += angle;
              const x2 = center + radius * Math.cos(currentAngle);
              const y2 = center + radius * Math.sin(currentAngle);
              
              const pathData = \`M \${center} \${center} L \${x1} \${y1} A \${radius} \${radius} 0 \${largeArcFlag} 1 \${x2} \${y2} Z\`;
              
              return {
                path: pathData,
                percentage: percentage.toFixed(1),
                label: item.faculty || item.type || item.label || 'Unknown',
                value: value,
                color: colors[idx % colors.length]
              };
            });
            
            return \`
              <div style="display: flex; align-items: center; gap: 2rem; flex-wrap: wrap;">
                <svg width="\${size}" height="\${size}" viewBox="0 0 \${size} \${size}">
                  \${segments.map((seg, idx) => \`
                    <path d="\${seg.path}" fill="\${seg.color}" stroke="rgba(0, 0, 0, 0.3)" stroke-width="2" opacity="0.9">
                      <title>\${seg.label}: \${seg.value} (\${seg.percentage}%)</title>
                    </path>
                  \`).join('')}
                  <circle cx="\${center}" cy="\${center}" r="\${radius * 0.6}" fill="rgba(0, 0, 0, 0.5)"/>
                  <text x="\${center}" y="\${center - 5}" fill="#deab44" font-size="24" font-weight="bold" text-anchor="middle">\${total}</text>
                  <text x="\${center}" y="\${center + 15}" fill="rgba(255, 255, 255, 0.7)" font-size="12" text-anchor="middle">Total</text>
                </svg>
                <div style="flex: 1; min-width: 200px;">
                  \${segments.map((seg, idx) => \`
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                      <div style="width: 16px; height: 16px; background: \${seg.color}; border-radius: 4px; flex-shrink: 0;"></div>
                      <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                          <span style="color: rgba(255, 255, 255, 0.9); font-size: 0.9rem; font-weight: 500;">\${seg.label}</span>
                          <span style="color: \${seg.color}; font-weight: 600; font-size: 0.9rem;">\${seg.value}</span>
                        </div>
                        <div style="background: rgba(255, 255, 255, 0.05); height: 4px; border-radius: 2px; overflow: hidden;">
                          <div style="background: \${seg.color}; height: 100%; width: \${seg.percentage}%;"></div>
                        </div>
                      </div>
                    </div>
                  \`).join('')}
                </div>
              </div>
            \`;
          };
          
          const html = \`
            <!-- ========== DASHBOARD OVERVIEW ========== -->
            <div style="margin-bottom: 3rem;">
              <h2 style="margin: 0 0 1.5rem 0; color: #deab44; font-size: 1.75rem; font-weight: 700; border-bottom: 2px solid rgba(222, 171, 68, 0.3); padding-bottom: 0.75rem; display: flex; align-items: center; gap: 0.75rem;">
                \${svgIcon('clipboard', 28, '#deab44')}
                Dashboard Overview
              </h2>
              
              <!-- Key Metrics Grid -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem;">
                \${statCard('Total Applications', appStats.total || 0, 'clipboard', '#deab44')}
                \${statCard('Recent (7 days)', appStats.recent || 0, 'calendar', '#d59928')}
                \${statCard('Avg/Day', appStats.avgPerDay || '0', 'chart', '#60a5fa')}
                \${statCard('Growth Rate', (appStats.growthRate || '0') + '%', 'chart', parseFloat(appStats.growthRate || 0) >= 0 ? '#10b981' : '#ef4444')}
                \${statCard('Completion Rate', (appStats.completionRate || '0') + '%', 'check', parseFloat(appStats.completionRate || 0) >= 80 ? '#10b981' : parseFloat(appStats.completionRate || 0) >= 50 ? '#d59928' : '#ef4444')}
                \${statCard('Total Page Views', analytics.totalViews || 0, 'eye', '#deab44')}
                \${statCard('Unique Visitors', analytics.uniqueVisitors || 0, 'users', '#d59928')}
                \${statCard('Unique Sessions', analytics.uniqueSessions || 0, 'refresh', '#60a5fa')}
              </div>
            </div>
            
            <!-- ========== APPLICATION STATISTICS ========== -->
            <div style="margin-bottom: 3rem; background: rgba(255, 255, 255, 0.02); border-radius: 16px; padding: 2rem; border: 1px solid rgba(222, 171, 68, 0.1);">
              <h2 style="margin: 0 0 2rem 0; color: #deab44; font-size: 1.75rem; font-weight: 700; border-bottom: 2px solid rgba(222, 171, 68, 0.3); padding-bottom: 0.75rem; display: flex; align-items: center; gap: 0.75rem;">
                \${svgIcon('clipboard', 28, '#deab44')}
                Application Statistics
              </h2>
              
              <!-- Key Metrics Subsection -->
              <div style="margin-bottom: 2.5rem;">
                <h3 style="margin: 0 0 1.25rem 0; color: rgba(222, 171, 68, 0.9); font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 4px; height: 20px; background: #deab44; border-radius: 2px;"></span>
                  Key Metrics
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                  \${statCard('Trainers', (appStats.byType?.trainer || 0), 'users', '#d59928')}
                  \${statCard('Trainees', (appStats.byType?.trainee || 0), 'users', '#deab44')}
                  \${statCard('Male', appStats.gender?.male || 0, 'users', '#60a5fa')}
                  \${statCard('Female', appStats.gender?.female || 0, 'users', '#f472b6')}
                  \${statCard('With Laptop', appStats.laptop?.with || 0, 'check', '#10b981')}
                  \${statCard('Without Laptop', appStats.laptop?.without || 0, 'x', '#ef4444')}
                </div>
              </div>
              
              <!-- Time-based Trends Subsection -->
              <div style="margin-bottom: 2.5rem;">
                <h3 style="margin: 0 0 1.25rem 0; color: rgba(222, 171, 68, 0.9); font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 4px; height: 20px; background: #deab44; border-radius: 2px;"></span>
                  Time-based Trends
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem;">
                  \${(appStats.dailyTrend && appStats.dailyTrend.length > 0) ? \`
                  <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Daily Trend (Last 7 Days)</h4>
                    \${lineChart(appStats.dailyTrend, '100%', '200px', '#deab44')}
                  </div>
                  \` : ''}
                  \${(appStats.hourlyPattern && appStats.hourlyPattern.length > 0) ? \`
                  <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Hourly Submission Pattern</h4>
                    \${lineChart(appStats.hourlyPattern.map(h => ({ hour: h.hour + ':00', count: h.count })), '100%', '200px', '#d59928')}
                  </div>
                  \` : ''}
                </div>
                \${(appStats.peakDay) ? \`
                <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; margin-top: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div style="text-align: center; padding: 1rem; background: rgba(222, 171, 68, 0.1); border-radius: 8px;">
                      <div style="color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; margin-bottom: 0.5rem;">Peak Day</div>
                      <div style="color: #deab44; font-size: 1.25rem; font-weight: 700;">\${new Date(appStats.peakDay.date).toLocaleDateString()}</div>
                      <div style="color: rgba(255, 255, 255, 0.9); font-size: 0.9rem; margin-top: 0.25rem;">\${appStats.peakDay.count} applications</div>
                    </div>
                  </div>
                </div>
                \` : ''}
              </div>
              
              <!-- Demographics Distribution Subsection -->
              <div style="margin-bottom: 2.5rem;">
                <h3 style="margin: 0 0 1.25rem 0; color: rgba(222, 171, 68, 0.9); font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 4px; height: 20px; background: #deab44; border-radius: 2px;"></span>
                  Demographics Distribution
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                  \${(appStats.byFaculty && appStats.byFaculty.length > 0) ? \`
                  <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Faculty Distribution</h4>
                    \${pieChart(appStats.byFaculty.map(f => ({ faculty: f.faculty.charAt(0).toUpperCase() + f.faculty.slice(1), count: f.count })))}
                  </div>
                  \` : ''}
                  \${(appStats.gender && (appStats.gender.male > 0 || appStats.gender.female > 0)) ? \`
                  <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Gender Distribution</h4>
                    \${pieChart([
                      { label: 'Male', count: appStats.gender.male || 0 },
                      { label: 'Female', count: appStats.gender.female || 0 }
                    ], 200, ['#60a5fa', '#f472b6'])}
                  </div>
                  \` : ''}
                  <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Application Type</h4>
                    \${Object.entries(appStats.byType || {}).map(([type, count]) => 
                      barChart(type.charAt(0).toUpperCase() + type.slice(1), count, appStats.total, type === 'trainer' ? '#d59928' : '#deab44')
                    ).join('')}
                  </div>
                </div>
                \${(appStats.byLevel && appStats.byLevel.length > 0) ? \`
                <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                  <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">By Student Level</h4>
                  \${(appStats.byLevel || []).map(l => 
                    barChart('Level ' + l.level, l.count, Math.max(...(appStats.byLevel || []).map(x => x.count || 0).concat([1])), '#deab44')
                  ).join('')}
                </div>
                \` : ''}
              </div>
              
              <!-- Additional Information Subsection -->
              <div>
                <h3 style="margin: 0 0 1.25rem 0; color: rgba(222, 171, 68, 0.9); font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 4px; height: 20px; background: #deab44; border-radius: 2px;"></span>
                  Additional Information
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                  \${(appStats.scrapingStatus && Object.keys(appStats.scrapingStatus).length > 0) ? \`
                  <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Scraping Status</h4>
                    \${Object.entries(appStats.scrapingStatus || {}).map(([status, count]) => 
                      barChart(status.charAt(0).toUpperCase() + status.slice(1), count, Math.max(...Object.values(appStats.scrapingStatus || {}).concat([1])), status === 'completed' ? '#10b981' : status === 'failed' ? '#ef4444' : '#deab44')
                    ).join('')}
                  </div>
                  \` : ''}
                </div>
              </div>
            </div>
            
            <!-- ========== WEBSITE ANALYTICS ========== -->
            <div style="margin-bottom: 3rem; background: rgba(255, 255, 255, 0.02); border-radius: 16px; padding: 2rem; border: 1px solid rgba(222, 171, 68, 0.1);">
              <h2 style="margin: 0 0 2rem 0; color: #deab44; font-size: 1.75rem; font-weight: 700; border-bottom: 2px solid rgba(222, 171, 68, 0.3); padding-bottom: 0.75rem; display: flex; align-items: center; gap: 0.75rem;">
                \${svgIcon('globe', 28, '#deab44')}
                Website Analytics
              </h2>
              
              <!-- Traffic Overview Subsection -->
              <div style="margin-bottom: 2.5rem;">
                <h3 style="margin: 0 0 1.25rem 0; color: rgba(222, 171, 68, 0.9); font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 4px; height: 20px; background: #deab44; border-radius: 2px;"></span>
                  Traffic Overview
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                  \${statCard('Last 24 Hours', analytics.recent24h || 0, 'clock', '#f472b6')}
                  \${statCard('Avg Views/Day', analytics.avgViewsPerDay || '0', 'chart', '#10b981')}
                  \${statCard('Avg Pages/Session', analytics.avgPagesPerSession || '0', 'chart', '#f472b6')}
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem;">
                  \${(analytics.dailyViewsTrend && analytics.dailyViewsTrend.length > 0) ? \`
                  <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Daily Page Views Trend</h4>
                    \${lineChart(analytics.dailyViewsTrend.map(d => ({ date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), views: d.views })), '100%', '200px', '#60a5fa')}
                  </div>
                  \` : ''}
                  \${(analytics.hourlyPattern && analytics.hourlyPattern.length > 0) ? \`
                  <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Hourly Traffic Pattern</h4>
                    \${lineChart(analytics.hourlyPattern.map(h => ({ hour: h.hour + ':00', views: h.views })), '100%', '200px', '#f472b6')}
                  </div>
                  \` : ''}
                </div>
              </div>
              
              <!-- User Behavior Subsection -->
              <div style="margin-bottom: 2.5rem;">
                <h3 style="margin: 0 0 1.25rem 0; color: rgba(222, 171, 68, 0.9); font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 4px; height: 20px; background: #deab44; border-radius: 2px;"></span>
                  User Behavior
                </h3>
                \${(analytics.peakHour) ? \`
                <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div style="text-align: center; padding: 1rem; background: rgba(222, 171, 68, 0.1); border-radius: 8px;">
                      <div style="color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; margin-bottom: 0.5rem;">Peak Hour</div>
                      <div style="color: #deab44; font-size: 1.5rem; font-weight: 700;">\${analytics.peakHour.hour}:00</div>
                      <div style="color: rgba(255, 255, 255, 0.9); font-size: 0.9rem; margin-top: 0.25rem;">\${analytics.peakHour.views} views</div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: rgba(222, 171, 68, 0.1); border-radius: 8px;">
                      <div style="color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; margin-bottom: 0.5rem;">Bounce Rate</div>
                      <div style="color: #deab44; font-size: 1.5rem; font-weight: 700;">\${analytics.estimatedBounceRate || '0'}%</div>
                      <div style="color: rgba(255, 255, 255, 0.9); font-size: 0.9rem; margin-top: 0.25rem;">Estimated</div>
                    </div>
                  </div>
                </div>
                \` : ''}
              </div>
              
              <!-- Technology Stack Subsection -->
              <div style="margin-bottom: 2.5rem;">
                <h3 style="margin: 0 0 1.25rem 0; color: rgba(222, 171, 68, 0.9); font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 4px; height: 20px; background: #deab44; border-radius: 2px;"></span>
                  Technology Stack
                </h3>
                \${(analytics.deviceTypes && Object.keys(analytics.deviceTypes).length > 0) ? \`
                <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                  <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Device Types Distribution</h4>
                  \${pieChart(Object.entries(analytics.deviceTypes).map(([device, count]) => ({ label: device.charAt(0).toUpperCase() + device.slice(1), count: count })))}
                </div>
                \` : ''}
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                  <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Browsers</h4>
                    \${(analytics.browsers || []).slice(0, 5).map(b => 
                      barChart(b.browser.charAt(0).toUpperCase() + b.browser.slice(1), b.count, analytics.totalViews || 1, '#deab44')
                    ).join('')}
                  </div>
                  <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Operating Systems</h4>
                    \${(analytics.operatingSystems || []).slice(0, 5).map(o => 
                      barChart(o.os.charAt(0).toUpperCase() + o.os.slice(1), o.count, analytics.totalViews || 1, '#deab44')
                    ).join('')}
                  </div>
                </div>
              </div>
              
              <!-- Content Analysis Subsection -->
              <div>
                <h3 style="margin: 0 0 1.25rem 0; color: rgba(222, 171, 68, 0.9); font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 4px; height: 20px; background: #deab44; border-radius: 2px;"></span>
                  Content Analysis
                </h3>
                <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                  <h4 style="margin: 0 0 1rem 0; color: #deab44; font-size: 1rem; font-weight: 600;">Top Pages</h4>
                  <div style="max-height: 300px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(222, 171, 68, 0.3) transparent;">
                    \${(analytics.topPages || []).length > 0 ? (analytics.topPages || []).map((page, idx) => 
                      \`<div style="display: flex; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); transition: background 0.2s;">
                        <span style="font-weight: 500; color: rgba(255, 255, 255, 0.9);">\${idx + 1}. \${page.path || '/'}</span>
                        <span style="color: #deab44; font-weight: 600;">\${page.views} views</span>
                      </div>\`
                    ).join('') : '<div style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.5);">No page views recorded yet</div>'}
                  </div>
                </div>
              </div>
            </div>
          \`;

  contentEl.innerHTML = html;
}

// Load Sheet Submissions
async function loadSubmissions() {
  const loadingEl = document.getElementById('submissions-loading');
  const contentEl = document.getElementById('submissions-content');

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || document.querySelector('meta[name="admin-token"]')?.content || '';
    const headers = { 'X-Admin-Token': token };

    const res = await fetch('/api/admin/statistics/submissions', { headers });
    const data = await res.json();

    if (data.success) {
      let html = \`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                  <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(222, 171, 68, 0.3); border-radius: 12px; padding: 1.5rem;">
                    <div style="color: rgba(255, 255, 255, 0.7); margin-bottom: 0.5rem;">Total Submissions</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #deab44;">\${data.data.totalSubmissions || 0}</div>
                  </div>
                  <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(222, 171, 68, 0.3); border-radius: 12px; padding: 1.5rem;">
                    <div style="color: rgba(255, 255, 255, 0.7); margin-bottom: 0.5rem;">Unique Submitters</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #deab44;">\${data.data.uniqueSubmitters || 0}</div>
                  </div>
                  <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(222, 171, 68, 0.3); border-radius: 12px; padding: 1.5rem;">
                    <div style="color: rgba(255, 255, 255, 0.7); margin-bottom: 0.5rem;">Total Sheets</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #deab44;">\${(data.data.submissionsPerSheet || []).length}</div>
                  </div>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
                  <h3 style="margin: 0 0 1rem 0; color: #deab44;">Top Users by Submissions</h3>
                  <div class="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>User Email</th>
                          <th>Sheets Solved</th>
                          <th>Problems Solved</th>
                          <th>Total Submissions</th>
                          <th>Sheets List</th>
                        </tr>
                      </thead>
                      <tbody>
                        \${(data.data.topUsers || []).map((user, idx) => \`
                          <tr>
                            <td style="font-weight: bold; color: \${idx < 3 ? '#deab44' : 'inherit'};">#\${idx + 1}</td>
                            <td>\${user.email || \`User \${user.user_id}\`}</td>
                            <td style="color: #deab44; font-weight: 600;">\${user.sheets_solved || 0}</td>
                            <td style="color: #4ade80; font-weight: 600;">\${user.problems_solved || 0}</td>
                            <td>\${user.submission_count || 0}</td>
                            <td style="font-size: 0.8em; color: rgba(255,255,255,0.7); max-width: 200px; overflow: hidden; text-overflow: ellipsis;">\${user.sheets_list || '-'}</td>
                          </tr>
                        \`).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem;">
                  <h3 style="margin: 0 0 1rem 0; color: #deab44;">Submissions Per Sheet</h3>
                  <div class="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Sheet Name</th>
                          <th>Total Submissions</th>
                          <th>Unique Users</th>
                        </tr>
                      </thead>
                      <tbody>
                        \${(data.data.submissionsPerSheet || []).map(sheet => \`
                          <tr>
                            <td style="font-weight: 600;">\${sheet.sheet_name}</td>
                            <td style="color: #deab44;">\${sheet.submission_count}</td>
                            <td>\${sheet.unique_users}</td>
                          </tr>
                        \`).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; margin-top: 2rem;">
                  <h3 style="margin: 0 0 1rem 0; color: #deab44;">Users by Sheets Solved (Distribution)</h3>
                  <div class="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Sheets Solved</th>
                          <th>Number of Users</th>
                          <th>Visual</th>
                        </tr>
                      </thead>
                      <tbody>
                        \${(data.data.userSheetDistribution || []).map(dist => {
                           const totalUsers = data.data.uniqueSubmitters || 1;
                           const percent = Math.round((dist.user_count / totalUsers) * 100);
                           return \`
                            <tr>
                              <td style="font-weight: 600;">\${dist.sheets_solved} Sheet\${dist.sheets_solved > 1 ? 's' : ''}</td>
                              <td style="color: #deab44; font-weight: bold;">\${dist.user_count}</td>
                              <td style="width: 50%;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                  <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                                    <div style="width: \${percent}%; height: 100%; background: #deab44;"></div>
                                  </div>
                                  <span style="font-size: 0.8em; color: rgba(255,255,255,0.5);">\${percent}%</span>
                                </div>
                              </td>
                            </tr>
                          \`;
                        }).join('')}
                      </tbody>
                    </table>
                    <div style="margin-top: 1rem; font-size: 0.9em; color: rgba(255, 255, 255, 0.5);">
                      * This table shows how many users have solved exactly X number of sheets.
                    </div>
                  </div>
                </div>
\`;

      contentEl.innerHTML = html;
      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } else {
      throw new Error(data.error || 'Failed to load submissions');
    }
  } catch (error) {
    loadingEl.innerHTML = '<div style="color: red;">❌ Error loading submissions: ' + error.message + '</div>';
  }
}

// Load Login Statistics
async function loadLogins() {
  const loadingEl = document.getElementById('logins-loading');
  const contentEl = document.getElementById('logins-content');

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || document.querySelector('meta[name="admin-token"]')?.content || '';
    const headers = { 'X-Admin-Token': token };

    const res = await fetch('/api/admin/statistics/logins', { headers });
    const data = await res.json();

    if (data.success) {
      // Calculate totals for correct percentage
      const totalGender = (data.data.genderDistribution || []).reduce((acc, item) => acc + parseInt(item.count || 0), 0) || 1;
      const totalLevel = (data.data.levelDistribution || []).reduce((acc, item) => acc + parseInt(item.count || 0), 0) || 1;
      const totalFaculty = (data.data.facultyDistribution || []).reduce((acc, item) => acc + parseInt(item.count || 0), 0) || 1;

      let html = \`
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                  <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(222, 171, 68, 0.3); border-radius: 12px; padding: 1.5rem;">
                    <div style="color: rgba(255, 255, 255, 0.7); margin-bottom: 0.5rem;">Total Registered Users</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #deab44;">\${data.data.totalUsers || 0}</div>
                  </div>
                  <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(222, 171, 68, 0.3); border-radius: 12px; padding: 1.5rem;">
                    <div style="color: rgba(255, 255, 255, 0.7); margin-bottom: 0.5rem;">Total Logins</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #deab44;">\${data.data.totalLogins || 0}</div>
                  </div>
                  <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(222, 171, 68, 0.3); border-radius: 12px; padding: 1.5rem;">
                    <div style="color: rgba(255, 255, 255, 0.7); margin-bottom: 0.5rem;">Unique Logged-in Users</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #deab44;">\${data.data.uniqueLoggedInUsers || 0}</div>
                  </div>
                  <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(222, 171, 68, 0.3); border-radius: 12px; padding: 1.5rem;">
                    <div style="color: rgba(255, 255, 255, 0.7); margin-bottom: 0.5rem;">Last 7 Days</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #4ade80;">\${data.data.loginsLast7Days || 0}</div>
                  </div>
                  <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(222, 171, 68, 0.3); border-radius: 12px; padding: 1.5rem;">
                    <div style="color: rgba(255, 255, 255, 0.7); margin-bottom: 0.5rem;">Last 30 Days</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #60a5fa;">\${data.data.loginsLast30Days || 0}</div>
                  </div>
                </div>
                
                <!-- DEMOGRAPHICS SECTION -->
                <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 2rem; margin-bottom: 2rem;">
                  <h3 style="margin: 0 0 1.5rem 0; color: #e2e8f0; font-size: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">
                    User Demographics 
                    <span style="font-size: 0.9rem; color: #94a3b8; font-weight: normal; margin-left: 0.5rem;">(Distribution of Logged-in Users)</span>
                  </h3>
                  
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                    <!-- Gender -->
                    <div style="background: rgba(30, 41, 59, 0.5); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
                      <h4 style="margin: 0 0 1.25rem 0; color: #f8fafc; font-size: 1.1rem; display: flex; align-items: center; justify-content: space-between;">
                        Gender Distribution
                        <span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px; color: #94a3b8;">Total: \${totalGender}</span>
                      </h4>
                      \${(data.data.genderDistribution || []).map(item => \`
                        <div style="margin-bottom: 1rem;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; color: #cbd5e1;">
                            <span>\${item.label}</span>
                            <span style="font-weight: 600; color: #fff;">\${item.count}</span>
                          </div>
                          <div style="width: 100%; background: #0f172a; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: \${(item.count / totalGender) * 100}%; background: \${item.label === 'Male' ? 'linear-gradient(90deg, #3b82f6, #2563eb)' : 'linear-gradient(90deg, #ec4899, #db2777)'}; height: 100%; border-radius: 4px; transition: width 1s ease-in-out;"></div>
                          </div>
                        </div>
                      \`).join('')}
                    </div>

                    <!-- Level -->
                    <div style="background: rgba(30, 41, 59, 0.5); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
                      <h4 style="margin: 0 0 1.25rem 0; color: #f8fafc; font-size: 1.1rem; display: flex; align-items: center; justify-content: space-between;">
                        Level Distribution
                         <span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px; color: #94a3b8;">Total: \${totalLevel}</span>
                      </h4>
                      \${(data.data.levelDistribution || []).map(item => \`
                        <div style="margin-bottom: 1rem;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; color: #cbd5e1;">
                            <span>\${item.label}</span>
                            <span style="font-weight: 600; color: #fff;">\${item.count}</span>
                          </div>
                          <div style="width: 100%; background: #0f172a; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: \${(item.count / totalLevel) * 100}%; background: linear-gradient(90deg, #22c55e, #16a34a); height: 100%; border-radius: 4px; transition: width 1s ease-in-out;"></div>
                          </div>
                        </div>
                      \`).join('')}
                    </div>

                    <!-- Faculty -->
                    <div style="background: rgba(30, 41, 59, 0.5); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
                      <h4 style="margin: 0 0 1.25rem 0; color: #f8fafc; font-size: 1.1rem; display: flex; align-items: center; justify-content: space-between;">
                        Faculty Distribution
                         <span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px; color: #94a3b8;">Total: \${totalFaculty}</span>
                      </h4>
                      \${(data.data.facultyDistribution || []).map(item => \`
                        <div style="margin-bottom: 1rem;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; color: #cbd5e1;">
                            <span style="text-transform: capitalize;">\${item.label}</span>
                            <span style="font-weight: 600; color: #fff;">\${item.count}</span>
                          </div>
                          <div style="width: 100%; background: #0f172a; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: \${(item.count / totalFaculty) * 100}%; background: linear-gradient(90deg, #a855f7, #9333ea); height: 100%; border-radius: 4px; transition: width 1s ease-in-out;"></div>
                          </div>
                        </div>
                      \`).join('')}
                    </div>
                  </div>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
                  <h3 style="margin: 0 0 1rem 0; color: #deab44;">Most Active Users</h3>
                  <div class="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>User Email</th>
                          <th>Total Logins</th>
                          <th>Last Login</th>
                        </tr>
                      </thead>
                      <tbody>
                        \${(data.data.topActiveUsers || []).slice(0, 10).map((user, idx) => \`
                          <tr>
                            <td style="font-weight: bold; color: \${idx < 3 ? '#deab44' : 'inherit'};">#\${idx + 1}</td>
                            <td>\${user.email || \`User \${user.user_id}\`}</td>
                            <td style="color: #deab44; font-weight: 600;">\${user.login_count || 0}</td>
                            <td style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.7);">\${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
                          </tr>
                        \`).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.5rem;">
                  <h3 style="margin: 0 0 1rem 0; color: #deab44;">Recent Login Activity</h3>
                  <div class="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>User Email</th>
                          <th>IP Address</th>
                          <th>Login Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        \${(data.data.recentLogins || []).slice(0, 20).map(log => \`
                          <tr>
                            <td>\${log.email || \`User \${log.user_id}\`}</td>
                            <td style="font-family: monospace; font-size: 0.9rem;">\${log.ip_address || 'N/A'}</td>
                            <td style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.7);">\${log.logged_in_at ? new Date(log.logged_in_at).toLocaleString() : 'N/A'}</td>
                          </tr>
                        \`).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
\`;
              
              contentEl.innerHTML = html;
              loadingEl.style.display = 'none';
              contentEl.style.display = 'block';
            } else {
              throw new Error(data.error || 'Failed to load login statistics');
            }
          } catch (error) {
            loadingEl.innerHTML = '<div style="color: red;">❌ Error loading login statistics: ' + error.message + '</div>';
          }
        }
        
        // Load statistics when page loads (if on statistics tab)
        window.addEventListener('DOMContentLoaded', function() {
          const urlParams = new URLSearchParams(window.location.search);
          const tab = urlParams.get('tab') || 'statistics';
          showTab(tab);
        });
      </script>
    </body>
  </html>`;
};

// Secret token validation middleware - Now uses header instead of URL
const validateAdminToken = (req, res, next) => {
  const secretToken = process.env.ADMIN_SECRET_TOKEN;

  if (!secretToken) {
    console.error('❌ ERROR: ADMIN_SECRET_TOKEN not set in .env file');
    return res.status(500).send('Server configuration error');
  }

  // Additional check: Block requests without proper headers (common in bots/scrapers)
  const userAgent = req.get('user-agent');
  const acceptHeader = req.get('accept');

  // Bots often don't send proper headers or send minimal headers
  if (!userAgent || (!acceptHeader && !req.headers['x-requested-with'])) {
    console.log('🚫 BLOCKED: Request without proper headers from IP:', req.ip || 'unknown');
    return res.status(403).send('Access denied');
  }

  // Check for token in header first (preferred method)
  let token = req.headers['x-admin-token'] || req.headers['admin-token'];

  // Fallback: Check query parameter for backward compatibility (deprecated)
  if (!token) {
    token = req.query.token;

    // If no token parameter, check the raw query string
    if (!token) {
      const checkUrl = req.originalUrl || req.url;
      const urlParts = checkUrl.split('?');

      if (urlParts.length > 1) {
        const queryString = urlParts[1];
        if (queryString === secretToken) {
          token = secretToken;
        } else if (queryString.startsWith(secretToken + '&')) {
          token = secretToken;
        } else {
          const queryKeys = Object.keys(req.query);
          for (const key of queryKeys) {
            if (key === secretToken || req.query[key] === secretToken) {
              token = secretToken;
              break;
            }
          }
        }
      }

      if (!token && checkUrl.includes(secretToken)) {
        token = secretToken;
      }
    }

    // Log warning if using deprecated URL method
    if (token) {
      console.warn('⚠️  Admin access using deprecated URL token method from IP:', req.ip);
    }
  }

  if (!token || token !== secretToken) {
    console.log('✗ Invalid or missing admin token from IP:', req.ip || 'unknown');
    return res.status(404).send('Not Found');
  }

  console.log('✓ Valid admin token');
  next();
};

// Statistics API endpoint - Application data statistics
// Statistics API endpoint - Application data statistics
app.get('/api/admin/statistics/applications', validateAdminToken, basicAuth, async (req, res) => {
  try {
    const stats = {};

    // Total applications
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM applications');
    stats.total = parseInt(totalResult.rows[0].total);

    // By application type
    const byTypeResult = await pool.query('SELECT application_type, COUNT(*) as count FROM applications GROUP BY application_type');
    stats.byType = {};
    byTypeResult.rows.forEach(row => {
      stats.byType[row.application_type || 'trainee'] = parseInt(row.count);
    });

    // By faculty
    const byFacultyResult = await pool.query('SELECT faculty, COUNT(*) as count FROM applications GROUP BY faculty ORDER BY count DESC');
    stats.byFaculty = byFacultyResult.rows.map(row => ({ faculty: row.faculty, count: parseInt(row.count) }));

    // By student level
    const byLevelResult = await pool.query('SELECT student_level, COUNT(*) as count FROM applications GROUP BY student_level ORDER BY student_level');
    stats.byLevel = byLevelResult.rows.map(row => ({ level: row.student_level, count: parseInt(row.count) }));

    // Laptop statistics
    const withLaptop = parseInt((await pool.query('SELECT COUNT(*) as count FROM applications WHERE has_laptop = true')).rows[0].count);
    const withoutLaptop = parseInt((await pool.query('SELECT COUNT(*) as count FROM applications WHERE has_laptop = false')).rows[0].count);
    stats.laptop = { with: withLaptop, without: withoutLaptop };

    // Gender distribution (from National ID)
    let maleCount = 0;
    let femaleCount = 0;
    const allAppsResult = await pool.query('SELECT national_id FROM applications');
    allAppsResult.rows.forEach(app => {
      const nationalID = decrypt(app.national_id);
      if (nationalID && nationalID.length === 14) {
        const genderDigit = parseInt(nationalID[12], 10); // 13th digit (index 12) determines gender
        if (!isNaN(genderDigit)) {
          if (genderDigit % 2 === 1) maleCount++;
          else femaleCount++;
        }
      }
    });
    stats.gender = { male: maleCount, female: femaleCount };

    // Recent applications (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentResult = await pool.query('SELECT COUNT(*) as count FROM applications WHERE submitted_at >= $1', [weekAgo.toISOString()]);
    const recentCount = parseInt(recentResult.rows[0].count);
    stats.recent = recentCount;

    // Applications by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const byDateResult = await pool.query(`
      SELECT DATE(submitted_at) as date, COUNT(*) as count 
      FROM applications 
      WHERE submitted_at >= $1 
      GROUP BY DATE(submitted_at) 
      ORDER BY date DESC
    `, [thirtyDaysAgo.toISOString()]);
    stats.timeline = byDateResult.rows.map(row => ({ date: row.date, count: parseInt(row.count) }));

    // Daily application trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyTrendResult = await pool.query(`
      SELECT DATE(submitted_at) as date, COUNT(*) as count 
      FROM applications 
      WHERE submitted_at >= $1 
      GROUP BY DATE(submitted_at) 
      ORDER BY date ASC
    `, [sevenDaysAgo.toISOString()]);
    stats.dailyTrend = dailyTrendResult.rows.map(row => ({ date: row.date, count: parseInt(row.count) }));

    // Hourly submission pattern (all time)
    // Postgres uses EXTRACT(HOUR FROM ...)
    const hourlyPatternResult = await pool.query(`
      SELECT EXTRACT(HOUR FROM submitted_at)::INTEGER as hour, COUNT(*) as count 
      FROM applications 
      GROUP BY hour 
      ORDER BY hour ASC
    `);
    stats.hourlyPattern = hourlyPatternResult.rows.map(row => ({ hour: row.hour, count: parseInt(row.count) }));

    // Average applications per day
    const firstAppResult = await pool.query('SELECT MIN(submitted_at) as first_date FROM applications');
    const firstApp = firstAppResult.rows[0];
    if (firstApp && firstApp.first_date) {
      const firstDate = new Date(firstApp.first_date);
      const daysSince = Math.max(1, Math.ceil((new Date() - firstDate) / (1000 * 60 * 60 * 24)));
      stats.avgPerDay = (stats.total / daysSince).toFixed(2);
    } else {
      stats.avgPerDay = '0';
    }

    // Growth rate (last 7 days vs previous 7 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const previousWeekResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM applications 
      WHERE submitted_at >= $1 AND submitted_at < $2
    `, [fourteenDaysAgo.toISOString(), sevenDaysAgo.toISOString()]);

    const currentWeekCount = recentCount;
    const previousWeekCount = parseInt(previousWeekResult.rows[0]?.count || 0);

    if (previousWeekCount > 0) {
      stats.growthRate = (((currentWeekCount - previousWeekCount) / previousWeekCount) * 100).toFixed(1);
    } else {
      stats.growthRate = currentWeekCount > 0 ? '100' : '0';
    }

    // Peak submission day and time
    const peakDayResult = await pool.query(`
      SELECT DATE(submitted_at) as date, COUNT(*) as count 
      FROM applications 
      GROUP BY DATE(submitted_at) 
      ORDER BY count DESC 
      LIMIT 1
    `);
    stats.peakDay = peakDayResult.rows[0] ? { date: peakDayResult.rows[0].date, count: parseInt(peakDayResult.rows[0].count) } : null;

    // Completion rate (scraping completed vs total trainers)
    const trainerTotal = parseInt((await pool.query("SELECT COUNT(*) as count FROM applications WHERE application_type = 'trainer'")).rows[0].count);
    const completedScraping = parseInt((await pool.query("SELECT COUNT(*) as count FROM applications WHERE application_type = 'trainer' AND scraping_status = 'completed'")).rows[0].count);
    stats.completionRate = trainerTotal > 0 ? ((completedScraping / trainerTotal) * 100).toFixed(1) : '0';

    // Scraping status
    const scrapingStatusResult = await pool.query('SELECT scraping_status, COUNT(*) as count FROM applications GROUP BY scraping_status');
    stats.scrapingStatus = {};
    scrapingStatusResult.rows.forEach(row => {
      stats.scrapingStatus[row.scraping_status || 'pending'] = parseInt(row.count);
    });

    // Top performing faculties (by application count)
    stats.topFaculties = (stats.byFaculty || []).slice(0, 3);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting application statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistics API endpoint - Website usage analytics
app.get('/api/admin/statistics/analytics', validateAdminToken, basicAuth, async (req, res) => {
  try {
    const stats = {};

    // Total page views
    const totalViewsResult = await pool.query('SELECT COUNT(*) as total FROM website_analytics');
    stats.totalViews = parseInt(totalViewsResult.rows[0].total);

    // Unique visitors (unique IPs)
    const uniqueVisitorsResult = await pool.query('SELECT COUNT(DISTINCT ip_address) as total FROM website_analytics');
    stats.uniqueVisitors = parseInt(uniqueVisitorsResult.rows[0].total);

    // Unique sessions
    const uniqueSessionsResult = await pool.query('SELECT COUNT(DISTINCT session_id) as total FROM website_analytics');
    stats.uniqueSessions = parseInt(uniqueSessionsResult.rows[0].total);

    // Page views by path
    const byPathResult = await pool.query(`
      SELECT path, COUNT(*) as count 
      FROM website_analytics 
      GROUP BY path 
      ORDER BY count DESC 
      LIMIT 10
    `);
    stats.topPages = byPathResult.rows.map(row => ({ path: row.path, views: parseInt(row.count) }));

    // Device type distribution
    const byDeviceResult = await pool.query('SELECT device_type, COUNT(*) as count FROM website_analytics GROUP BY device_type');
    stats.deviceTypes = {};
    byDeviceResult.rows.forEach(row => {
      stats.deviceTypes[row.device_type || 'unknown'] = parseInt(row.count);
    });

    // Browser distribution
    const byBrowserResult = await pool.query('SELECT browser, COUNT(*) as count FROM website_analytics GROUP BY browser ORDER BY count DESC');
    stats.browsers = byBrowserResult.rows.map(row => ({ browser: row.browser || 'unknown', count: parseInt(row.count) }));

    // OS distribution
    const byOSResult = await pool.query('SELECT os, COUNT(*) as count FROM website_analytics GROUP BY os ORDER BY count DESC');
    stats.operatingSystems = byOSResult.rows.map(row => ({ os: row.os || 'unknown', count: parseInt(row.count) }));

    // Page views over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const viewsOverTimeResult = await pool.query(`
      SELECT DATE(visited_at) as date, COUNT(*) as count 
      FROM website_analytics 
      WHERE visited_at >= $1 
      GROUP BY DATE(visited_at) 
      ORDER BY date DESC
    `, [thirtyDaysAgo.toISOString()]);
    stats.timeline = viewsOverTimeResult.rows.map(row => ({ date: row.date, views: parseInt(row.count) }));

    // Recent activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentViewsResult = await pool.query('SELECT COUNT(*) as count FROM website_analytics WHERE visited_at >= $1', [yesterday.toISOString()]);
    stats.recent24h = parseInt(recentViewsResult.rows[0].count);

    // Peak hours (hour of day)
    const byHourResult = await pool.query(`
      SELECT EXTRACT(HOUR FROM visited_at)::INTEGER as hour, COUNT(*) as count 
      FROM website_analytics 
      GROUP BY hour 
      ORDER BY count DESC 
      LIMIT 5
    `);
    stats.peakHours = byHourResult.rows.map(row => ({ hour: row.hour, views: parseInt(row.count) }));

    // Hourly pattern (all hours)
    const allHoursResult = await pool.query(`
      SELECT EXTRACT(HOUR FROM visited_at)::INTEGER as hour, COUNT(*) as count 
      FROM website_analytics 
      GROUP BY hour 
      ORDER BY hour ASC
    `);
    stats.hourlyPattern = allHoursResult.rows.map(row => ({ hour: row.hour, views: parseInt(row.count) }));

    // Daily page views trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyViewsResult = await pool.query(`
      SELECT DATE(visited_at) as date, COUNT(*) as count 
      FROM website_analytics 
      WHERE visited_at >= $1 
      GROUP BY DATE(visited_at) 
      ORDER BY date ASC
    `, [sevenDaysAgo.toISOString()]);
    stats.dailyViewsTrend = dailyViewsResult.rows.map(row => ({ date: row.date, views: parseInt(row.count) }));

    // Average page views per day
    const firstViewResult = await pool.query('SELECT MIN(visited_at) as first_date FROM website_analytics');
    const firstView = firstViewResult.rows[0];
    if (firstView && firstView.first_date) {
      const firstDate = new Date(firstView.first_date);
      const daysSince = Math.max(1, Math.ceil((new Date() - firstDate) / (1000 * 60 * 60 * 24)));
      stats.avgViewsPerDay = (stats.totalViews / daysSince).toFixed(2);
    } else {
      stats.avgViewsPerDay = '0';
    }

    // Peak hour (single hour with most views)
    const peakHourResult = await pool.query(`
      SELECT EXTRACT(HOUR FROM visited_at)::INTEGER as hour, COUNT(*) as count 
      FROM website_analytics 
      GROUP BY hour 
      ORDER BY count DESC 
      LIMIT 1
    `);
    stats.peakHour = peakHourResult.rows[0] ? { hour: peakHourResult.rows[0].hour, views: parseInt(peakHourResult.rows[0].count) } : null;

    // Bounce rate estimation (single page views per session)
    const singlePageSessionsResult = await pool.query(`
      SELECT session_id, COUNT(*) as page_count 
      FROM website_analytics 
      GROUP BY session_id 
      HAVING COUNT(*) = 1
    `);
    const bounceRate = stats.uniqueSessions > 0 ? ((singlePageSessionsResult.rows.length / stats.uniqueSessions) * 100).toFixed(1) : '0';
    stats.estimatedBounceRate = bounceRate;

    // Average pages per session
    const avgPagesPerSession = stats.uniqueSessions > 0 ? (stats.totalViews / stats.uniqueSessions).toFixed(2) : '0';
    stats.avgPagesPerSession = avgPagesPerSession;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting analytics statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for React Admin Dashboard - Get Applications
app.get('/api/admin/applications', validateAdminToken, basicAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM applications');
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated applications
    const result = await pool.query(
      'SELECT * FROM applications ORDER BY submitted_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const applications = result.rows;

    // Decrypt sensitive fields
    applications.forEach(app => {
      if (app.national_id) app.national_id = decrypt(app.national_id);
      if (app.telephone) app.telephone = decrypt(app.telephone);
      if (app.email) app.email = decrypt(app.email);
    });

    res.json({
      success: true,
      applications,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalCount
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for React Admin Dashboard - Get Sheet Submissions
app.get('/api/admin/submissions', validateAdminToken, basicAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM sheet_submissions');
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated submissions with user email
    const result = await pool.query(`
      SELECT 
        s.id,
        s.user_id,
        s.sheet_name,
        s.problem_name,
        s.file_name,
        s.submitted_at,
        LENGTH(s.file_content) as file_size,
        u.email as user_email
      FROM sheet_submissions s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.submitted_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      success: true,
      submissions: result.rows,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalCount
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin route - Now supports header-based token (preferred) or URL token (backward compatibility)
app.get('/admin', validateAdminToken, basicAuth, async (req, res) => {
  try {
    // Log admin panel access
    logDatabaseAccess('ADMIN_PANEL_ACCESS', req.ip, req.get('user-agent'), {
      endpoint: '/admin',
      method: 'GET'
    });

    // Get pagination parameters from query (for admin panel)
    const page = parseInt(req.query.page) || 1;
    const limit = 100; // Admin panel shows more records
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM applications');
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated results
    const result = await pool.query('SELECT * FROM applications ORDER BY submitted_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const applications = result.rows;

    // Decrypt sensitive fields for admin panel
    applications.forEach(app => {
      if (app.national_id) app.national_id = decrypt(app.national_id);
      if (app.telephone) app.telephone = decrypt(app.telephone);
      if (app.email) app.email = decrypt(app.email);
    });

    // Log successful access
    logDatabaseAccess('ADMIN_PANEL_ACCESS_SUCCESS', req.ip, req.get('user-agent'), {
      endpoint: '/admin',
      recordsReturned: applications.length,
      page,
      totalRecords: totalCount
    });

    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.send(renderAdminPage(applications, page, Math.ceil(totalCount / limit), totalCount));
  } catch (error) {
    console.error('Error rendering admin panel:', error);
    logDatabaseAccess('ADMIN_PANEL_ACCESS_ERROR', req.ip, req.get('user-agent'), {
      endpoint: '/admin',
      error: error.message
    });
    res.status(500).send('حدث خطأ في لوحة التحكم');
  }
});

// Also handle /admin/ path
app.get('/admin/', validateAdminToken, basicAuth, async (req, res) => {
  try {
    // Log admin panel access
    logDatabaseAccess('ADMIN_PANEL_ACCESS', req.ip, req.get('user-agent'), {
      endpoint: '/admin/',
      method: 'GET'
    });

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM applications');
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated results
    const result = await pool.query('SELECT * FROM applications ORDER BY submitted_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const applications = result.rows;

    // Decrypt sensitive fields for admin panel
    applications.forEach(app => {
      if (app.national_id) app.national_id = decrypt(app.national_id);
      if (app.telephone) app.telephone = decrypt(app.telephone);
      if (app.email) app.email = decrypt(app.email);
    });

    // Log successful access
    logDatabaseAccess('ADMIN_PANEL_ACCESS_SUCCESS', req.ip, req.get('user-agent'), {
      endpoint: '/admin/',
      recordsReturned: applications.length,
      page,
      totalRecords: totalCount
    });

    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.send(renderAdminPage(applications, page, Math.ceil(totalCount / limit), totalCount));
  } catch (error) {
    console.error('Error rendering admin panel:', error);
    logDatabaseAccess('ADMIN_PANEL_ACCESS_ERROR', req.ip, req.get('user-agent'), {
      endpoint: '/admin/',
      error: error.message
    });
    res.status(500).send('حدث خطأ في لوحة التحكم');
  }
});

// Serve robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Disallow: /admin
Disallow: /admin/
Disallow: /api
Disallow: /api/
Disallow: /*?*

# Block common crawlers specifically
User-agent: Googlebot
Disallow: /admin
Disallow: /admin/
Disallow: /api

User-agent: Bingbot
Disallow: /admin
Disallow: /admin/
Disallow: /api

# Allow indexing of public pages only
Allow: /
Allow: /images/
Allow: /logos/
Allow: /videos/
`);
});

// Health check endpoint (no auth required)
// Root route for simple health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'ICPC HUE Server is running' });
});

app.get('/api/health', (req, res) => {
  console.log('[HEALTH] Health check from', req.headers['x-forwarded-for'] || req.ip);
  res.json({ status: 'ok', timestamp: new Date(), version: '1.0.0' });
});

// Get client IP endpoint (for maintenance bypass check)
// This endpoint must be accessible without bot blocking
app.get('/api/get-ip', (req, res) => {
  // Get real IP from headers (handles proxies/load balancers)
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown';

  // Remove IPv6 prefix if present
  const cleanIP = clientIP.replace(/^::ffff:/, '');

  res.json({ ip: cleanIP });
});

// ============================================
// USER AUTHENTICATION ENDPOINTS
// ============================================

// JWT Secret - MUST be set in production (fail if missing)
const JWT_SECRET = process.env.API_SECRET_KEY || process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET (API_SECRET_KEY or JWT_SECRET) is not set in .env file');
  console.error('❌ This is a critical security requirement. Application cannot start without it.');
  process.exit(1);
}
const JWT_EXPIRES_IN = '1d'; // 1 day (reduced from 7 days for better security)

// Auth rate limiter (stricter than general API)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per window
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// POST /api/auth/check-email - Check if email exists in applications
app.post('/api/auth/check-email', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    console.log('📧 Checking email:', email);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email exists in applications table (decrypt stored emails to compare)
    console.log('🔍 Querying applications table...');
    const result = await pool.query('SELECT id, email FROM applications');
    console.log(`📊 Found ${result.rows.length} applications`);

    let applicationId = null;
    let foundEmail = null;

    for (const app of result.rows) {
      if (app.email) {
        try {
          const decryptedEmail = decrypt(app.email);
          if (decryptedEmail && decryptedEmail.toLowerCase() === email.toLowerCase()) {
            applicationId = app.id;
            foundEmail = decryptedEmail;
            console.log(`✅ Found matching application: ID ${applicationId}`);
            break;
          }
        } catch (decryptErr) {
          console.warn(`⚠️ Error decrypting email for app ${app.id}:`, decryptErr.message);
          // Continue to next record
        }
      }
    }

    if (applicationId) {
      // Check if user already has an account - handle case where users table doesn't exist
      let hasAccount = false;
      try {
        const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        hasAccount = userResult.rows.length > 0;
      } catch (userErr) {
        console.warn('⚠️ Users table might not exist:', userErr.message);
        // If users table doesn't exist, assume no account
        hasAccount = false;
      }

      return res.json({
        exists: true,
        hasAccount,
        applicationId,
        message: hasAccount ? 'Account exists. Please login.' : 'Email found. You can create an account.'
      });
    }

    console.log('❌ Email not found in applications');
    return res.json({
      exists: false,
      hasAccount: false,
      message: 'Email not found in applications. Please apply first.'
    });

  } catch (error) {
    console.error('❌ Error checking email:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// POST /api/auth/register - Register a new user account
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    // Find the application by email
    const appsResult = await pool.query('SELECT id, email, name FROM applications');

    let applicationId = null;
    let applicantName = null;

    for (const app of appsResult.rows) {
      if (app.email) {
        const decryptedEmail = decrypt(app.email);
        if (decryptedEmail && decryptedEmail.toLowerCase() === email.toLowerCase()) {
          applicationId = app.id;
          applicantName = app.name;
          break;
        }
      }
    }

    if (!applicationId) {
      return res.status(404).json({
        error: 'Email not found in applications. Please apply first.',
        redirect: '/apply'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Account already exists. Please login.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const insertResult = await pool.query(
      'INSERT INTO users (email, password_hash, application_id) VALUES ($1, $2, $3) RETURNING id, email, created_at',
      [email.toLowerCase(), passwordHash, applicationId]
    );

    const newUser = insertResult.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, applicationId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`✅ New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: applicantName
      }
    });

  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login - Login with email and password
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, password_hash, application_id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login time
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, userId: user.id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Update last_login_at
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Log successful login
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    try {
      await pool.query(
        'INSERT INTO login_logs (user_id, ip_address, user_agent) VALUES ($1, $2, $3)',
        [user.id, clientIP, userAgent]
      );
      console.log(`✓ Login logged for user ${user.id} from IP ${clientIP}`);
    } catch (logError) {
      console.error('Error logging login:', logError);
      // Don't fail login if logging fails
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password Endpoint
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);

    // Cleanup old/unexpired tokens for this email to prevent flooding
    await pool.query('DELETE FROM password_resets WHERE email = $1', [normalizedEmail]);

    if (userResult.rows.length === 0) {
      // Timing attack mitigation: Simulate work similar to token generation/hashing
      // Not perfect but better than immediate return
      await new Promise(resolve => setTimeout(resolve, 200));

      // Return success even if user not found (security best practice)
      return res.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 86400000); // 24 hours

    // Store in DB
    await pool.query('INSERT INTO password_resets (email, token_hash, expires_at) VALUES ($1, $2, $3)', [normalizedEmail, tokenHash, expiresAt]);

    // Send Email
    const resetLink = `https://icpchue.xyz/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

    const mailOptions = {
      from: `"${process.env.SENDER_NAME}" <${process.env.SENDER_EMAIL}>`,
      to: normalizedEmail,
      subject: 'إعادة تعيين كلمة المرور - ICPC HUE',
      html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إعادة تعيين كلمة المرور - ICPC HUE</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #050505;
            font-family: Arial, Tahoma, sans-serif;
            color: #e4e6eb;
            line-height: 1.6;
        }

        table {
            border-spacing: 0;
            width: 100%;
        }

        td {
            padding: 0;
        }

        .wrapper {
            width: 100%;
            background-color: #050505;
            padding: 20px 0;
        }

        .container {
            margin: 0 auto;
            width: 100%;
            max-width: 600px;
            background-color: #1a1a1a;
            border: 1px solid #333333;
            border-radius: 8px;
        }

        .header {
            padding: 20px;
            border-bottom: 1px solid #333333;
            text-align: right;
        }

        .logo-text {
            font-size: 20px;
            font-weight: bold;
            color: #ffffff;
        }

        .user-name {
            color: #b0b3b8;
            font-size: 14px;
            float: left;
        }

        .body-content {
            padding: 30px 20px;
            text-align: right;
        }

        .heading {
            font-size: 22px;
            font-weight: bold;
            color: #d6a034;
            margin-bottom: 20px;
            text-align: center;
        }

        .text-paragraph {
            font-size: 16px;
            color: #e4e6eb;
            margin-bottom: 15px;
        }

        /* Keeping the style for the note box but adapting it for security warnings */
        .security-box {
            background-color: #252525;
            border: 1px solid #333333;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #b0b3b8;
            font-size: 14px;
        }

        .btn {
            display: block;
            width: 100%;
            background-color: #0088cc;
            color: #ffffff;
            text-decoration: none;
            padding: 15px 0;
            border-radius: 6px;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            margin-top: 25px;
            transition: background-color 0.3s;
        }
        
        .btn:hover {
            background-color: #0077b3;
        }

        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666666;
            direction: ltr;
        }
        
        .link-muted {
            color: #666;
            text-decoration: underline;
        }
    </style>
</head>

<body>
    <div class="wrapper">
        <table align="center" class="container">
            <tr>
                <td class="header">
                    <span class="user-name">MEMBER</span>
                    <span class="logo-text">ICPC HUE</span>
                </td>
            </tr>
            <tr>
                <td class="body-content">
                    <div class="heading">إعادة تعيين كلمة المرور</div>

                    <div class="text-paragraph">
                        مرحباً،
                    </div>
                    
                    <div class="text-paragraph">
                        لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>ICPC HUE</strong>. لا تقلق، يمكننا مساعدتك في استعادة الوصول إلى حسابك وتأمين بياناتك.
                    </div>

                    <div class="text-paragraph">
                        لإتمام العملية وإنشاء كلمة مرور جديدة، يرجى الضغط على الزر أدناه. هذا الرابط صالح لمدة 24 ساعة فقط.
                    </div>

                    <a href="${resetLink}" class="btn">تغيير كلمة المرور</a>

                    <div class="security-box">
                        <strong>⚠️ تنويه أمني:</strong><br>
                        إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان. لن يتم إجراء أي تغييرات على حسابك حتى تقوم بالضغط على الرابط أعلاه وإنشاء كلمة مرور جديدة.
                    </div>

                    <div class="text-paragraph" style="font-size: 14px; color: #b0b3b8; margin-top: 20px; text-align: center;">
                        إذا كنت تواجه مشاكل في النقر على الزر، يمكنك نسخ الرابط التالي ولصقه في متصفحك:<br>
                        <span style="color: #0088cc; word-break: break-all;">${resetLink}</span>
                    </div>
                </td>
            </tr>
            <tr>
                <td class="footer">
                    © 2024 ICPC HUE Team<br>
                    New Damietta City, Egypt<br>
                    <br>
                    <a href="#" class="link-muted">Privacy Policy</a> • <a href="#" class="link-muted">Support</a>
                </td>
            </tr>
        </table>
    </div>
</body>

</html>
      `
    };

    // Try to send email, but don't fail if email server is down
    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${normalizedEmail}`);
    } catch (emailError) {
      console.error('❌ [Email Error] Failed to send password reset email:', emailError.message);
      console.error('SMTP Config:', {
        host: process.env.SMTP_SERVER,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_LOGIN ? '***configured***' : 'NOT SET',
        sender: process.env.SENDER_EMAIL
      });

      // For development/testing: Still save the token but log the reset link
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔗 [DEV] Password reset link:', resetLink);
      }

      // Don't expose email error to user, but log it for debugging
      // Still return success to prevent email enumeration
    }

    res.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });

  } catch (error) {
    console.error('❌ [Forgot Password] Error:', error.message);
    console.error('Stack trace:', error.stack);

    // More specific error messages for debugging
    if (error.code === '42P01') {
      console.error('⚠️  Database table "password_resets" does not exist! Run create_password_resets_table.sql');
      return res.status(500).json({ error: 'Database configuration error. Please contact support.' });
    }

    res.status(500).json({ error: 'Failed to process request. Please try again later.' });
  }
});

// Verify National ID for Password Reset (Alternative Method)
app.post('/api/auth/verify-id-reset', authLimiter, async (req, res) => {
  try {
    const { email, nationalId } = req.body;

    if (!email || !nationalId) {
      return res.status(400).json({ error: 'Email and National ID are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedId = nationalId.trim();

    // Verify that the email and National ID match a user in the applications table
    const userCheck = await pool.query(
      `SELECT a.id, a.email, a.national_id, u.id as user_id
       FROM applications a
       LEFT JOIN users u ON LOWER(u.email) = LOWER(a.email)
       WHERE LOWER(a.email) = $1`,
      [normalizedEmail]
    );

    if (userCheck.rows.length === 0) {
      // User not found - return generic error for security
      await new Promise(resolve => setTimeout(resolve, 200)); // Timing attack mitigation
      return res.status(401).json({ error: 'Invalid email or National ID' });
    }

    const application = userCheck.rows[0];

    // Decrypt and verify National ID
    let decryptedId;
    try {
      decryptedId = decrypt(application.national_id);
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return res.status(500).json({ error: 'System error. Please try email method or contact support.' });
    }

    if (decryptedId !== normalizedId) {
      // IDs don't match - timing attack mitigation
      await new Promise(resolve => setTimeout(resolve, 200));
      return res.status(401).json({ error: 'Invalid email or National ID' });
    }

    // Verify user account exists
    if (!application.user_id) {
      return res.status(401).json({ error: 'No account found. Please register first.' });
    }

    // Generate a temporary reset token (shorter expiry for ID verification)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1800000); // 30 minutes only (more secure)

    // Store in DB
    await pool.query(
      'INSERT INTO password_resets (email, token_hash, expires_at) VALUES ($1, $2, $3)',
      [normalizedEmail, tokenHash, expiresAt]
    );

    console.log(`✅ [ID Verification] User ${normalizedEmail} verified identity with National ID`);

    res.json({
      success: true,
      token: resetToken,
      message: 'Identity verified successfully!'
    });

  } catch (error) {
    console.error('❌ [ID Verification] Error:', error.message);
    res.status(500).json({ error: 'Failed to verify identity. Please try again later.' });
  }
});

// Reset Password Endpoint
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Password strength validation for password reset
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Verify token
    const resetResult = await pool.query(
      'SELECT * FROM password_resets WHERE email = $1 AND token_hash = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [normalizedEmail, tokenHash]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, normalizedEmail]);

    // Delete used/all tokens for this email to prevent reuse
    await pool.query('DELETE FROM password_resets WHERE email = $1', [normalizedEmail]);

    res.json({ success: true, message: 'Password has been reset successfully. You can now login.' });

  } catch (error) {
    console.error('Reset Password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /api/auth/me - Get current user profile
app.get('/api/auth/me', standardLimiter, authenticateToken, async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const { id } = req.user;
    const userId = id;
    console.log(`[DEBUG] /api/auth/me - req.user:`, req.user, 'userId:', userId);

    // Get user data (including telegram_username and role from users table)
    const userResult = await pool.query(
      'SELECT id, email, is_verified, last_login_at, created_at, application_id, telegram_username, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get application data (profile info)
    let profile = null;
    if (user.application_id) {
      const appResult = await pool.query(
        'SELECT id, name, faculty, student_id, student_level, codeforces_profile, leetcode_profile, telegram_username, application_type, submitted_at, codeforces_data FROM applications WHERE id = $1',
        [user.application_id]
      );

      if (appResult.rows.length > 0) {
        profile = appResult.rows[0];
        // Parse codeforces_data if it's a string
        if (profile.codeforces_data && typeof profile.codeforces_data === 'string') {
          try {
            profile.codeforces_data = JSON.parse(profile.codeforces_data);
          } catch (e) {
            console.error('Error parsing codeforces_data:', e);
            profile.codeforces_data = null;
          }
        }
      }
    }

    // If no profile or profile doesn't have telegram_username, use user's telegram_username
    if (!profile) {
      profile = {};
    }
    // Prioritize applications.telegram_username, fallback to users.telegram_username
    if (!profile.telegram_username && user.telegram_username) {
      profile.telegram_username = user.telegram_username;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.is_verified,
        lastLogin: user.last_login_at,
        createdAt: user.created_at,
        role: user.role || 'trainee'
      },
      profile
    });

  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profile/:studentId - Get public profile by email prefix (no auth required)
app.get('/api/profile/:studentId', standardLimiter, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find user by email prefix (e.g., 8241043 from 8241043@horus.edu.eg)
    const userResult = await pool.query(
      `SELECT u.id, u.role, u.profile_visibility, u.created_at, u.application_id
       FROM users u
       WHERE u.email LIKE $1`,
      [studentId + '@%']
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const user = userResult.rows[0];

    // Check if profile is private
    if (user.profile_visibility === 'private') {
      return res.status(403).json({ error: 'This profile is private' });
    }

    // Get application data
    const appResult = await pool.query(
      `SELECT a.id, a.name, a.faculty, a.student_level, a.codeforces_profile, a.leetcode_profile, 
              a.codeforces_data, a.application_type, a.submitted_at
       FROM applications a
       WHERE a.id = $1`,
      [user.application_id]
    );

    const application = appResult.rows[0] || {};

    // Parse codeforces_data if it's a string
    let codeforcesData = null;
    if (application.codeforces_data) {
      try {
        codeforcesData = typeof application.codeforces_data === 'string'
          ? JSON.parse(application.codeforces_data)
          : application.codeforces_data;
      } catch (e) {
        codeforcesData = null;
      }
    }

    // Calculate unlocked achievements
    const isInstructorUnlocked = user.role === 'instructor' || user.role === 'owner';
    const is500PtsUnlocked = codeforcesData?.rating >= 500;

    const achievements = [
      { id: 'welcome', name: 'First Steps', unlocked: true, rarity: 'common' },
      { id: 'approval', name: 'Approval Camp Master', unlocked: false, rarity: 'rare' }, // TODO: Check actual progress
      { id: '500pts', name: '500 Points Master', unlocked: is500PtsUnlocked, rarity: 'rare' },
      { id: 'instructor', name: 'ICPC HUE Instructor', unlocked: isInstructorUnlocked, rarity: 'legendary' },
    ];

    // Build public profile response (safe data only)
    res.json({
      success: true,
      profile: {
        name: application.name,
        faculty: application.faculty,
        studentLevel: application.student_level,
        applicationType: application.application_type,
        role: user.role || 'trainee',
        joinedAt: user.created_at || application.submitted_at,
        codeforces: {
          profile: application.codeforces_profile,
          rating: codeforcesData?.rating || null,
          maxRating: codeforcesData?.maxRating || null,
          rank: codeforcesData?.rank || null,
          totalSolved: codeforcesData?.total_solved || 0,
        },
        leetcode: {
          profile: application.leetcode_profile,
        },
        achievements: achievements,
        achievementsCount: achievements.filter(a => a.unlocked).length,
      }
    });

  } catch (error) {
    console.error('Error getting public profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/user/privacy - Update profile visibility
app.post('/api/user/privacy', standardLimiter, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { visibility } = req.body;

    if (!['public', 'private'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid visibility. Use "public" or "private".' });
    }

    await pool.query(
      'UPDATE users SET profile_visibility = $1 WHERE id = $2',
      [visibility, userId]
    );

    res.json({ success: true, visibility });
  } catch (error) {
    console.error('Error updating privacy:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/update-profile -// Endpoint to trigger manual refresh of Codeforces data
app.post('/api/user/refresh-cf', standardLimiter, authenticateToken, async (req, res) => {
  // Support both 'id' and 'userId' for backward compatibility
  const userId = req.user.id || req.user.userId;

  try {
    const userResult = await pool.query('SELECT application_id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const appId = userResult.rows[0].application_id;
    const appResult = await pool.query('SELECT codeforces_profile FROM applications WHERE id = $1', [appId]);

    if (appResult.rows.length === 0 || !appResult.rows[0].codeforces_profile) {
      return res.status(400).json({ error: 'No Codeforces profile linked' });
    }

    const profileUrl = appResult.rows[0].codeforces_profile;
    const username = extractUsername(profileUrl, 'codeforces');

    if (!username) {
      return res.status(400).json({ error: 'Invalid Codeforces profile URL' });
    }

    console.log(`Manual refresh: Scraping Codeforces for ${username}`);
    const codeforcesData = await scrapeCodeforces(username);

    if (codeforcesData) {
      await pool.query(
        'UPDATE applications SET codeforces_data = $1, scraping_status = $2 WHERE id = $3',
        [JSON.stringify(codeforcesData), 'completed', appId]
      );
      res.json({ success: true, data: codeforcesData });
    } else {
      console.warn(`Scraping returned null for ${username}`);
      res.status(500).json({ error: 'Failed to scrape Codeforces data (API returned null)' });
    }

  } catch (error) {
    console.error('Error refreshing Codeforces:', error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

// GET /api/leaderboard - Get top students by Codeforces rating
app.get('/api/leaderboard', standardLimiter, async (req, res) => {
  try {
    // Disable caching to ensure live updates
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const result = await pool.query(
      `SELECT name, codeforces_profile, codeforces_data 
       FROM applications 
       WHERE codeforces_data IS NOT NULL`
    );

    const leaderboard = result.rows.map(row => {
      let data = {};
      try {
        data = typeof row.codeforces_data === 'string' ? JSON.parse(row.codeforces_data) : row.codeforces_data;
      } catch (e) {
        data = {};
      }

      const rating = parseInt(data.rating || 0, 10);
      const username = extractUsername(row.codeforces_profile, 'codeforces') || '?';

      return {
        name: row.name,
        handle: username,
        rating: rating,
        maxRating: parseInt(data.maxRating || 0, 10),
        rank: data.rank || 'unrated',
        profileUrl: row.codeforces_profile
      };
    })
      .filter(user => user.rating > 0) // Optional: only show rated users? Or show all. Let's show all > 0 for now.
      .sort((a, b) => b.rating - a.rating);

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
});

// Update user profile endpointelegram, codeforces, leetcode)
app.post('/api/auth/update-profile', apiLimiter, authenticateToken, async (req, res) => {
  try {
    const { userId, applicationId } = req.user;
    const { telegram_username, codeforces_profile, leetcode_profile } = req.body;

    // Sanitize telegram_username if provided
    let sanitizedTelegram = null;
    if (telegram_username !== undefined) {
      sanitizedTelegram = telegram_username && telegram_username.trim()
        ? telegram_username.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 32)
        : null;
    }

    // Check for duplicate telegram_username if provided
    if (sanitizedTelegram) {
      // Check in users table
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE telegram_username = $1 AND id != $2',
        [sanitizedTelegram, userId]
      );
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Telegram username already in use' });
      }

      // Check in applications table if applicationId exists
      if (applicationId) {
        const appCheck = await pool.query(
          'SELECT id FROM applications WHERE telegram_username = $1 AND id != $2',
          [sanitizedTelegram, applicationId]
        );
        if (appCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Telegram username already in use' });
        }
      }
    }

    // Update users table for telegram_username (always available)
    if (telegram_username !== undefined) {
      await pool.query(
        'UPDATE users SET telegram_username = $1 WHERE id = $2',
        [sanitizedTelegram, userId]
      );
    }

    // Update applications table if applicationId exists and other fields are provided
    if (applicationId) {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (telegram_username !== undefined) {
        updates.push(`telegram_username = $${paramIndex++}`);
        values.push(sanitizedTelegram);
      }

      if (codeforces_profile !== undefined) {
        const sanitized = codeforces_profile
          ? codeforces_profile.replace(/[^a-zA-Z0-9_.-]/g, '').substring(0, 24)
          : null;
        updates.push(`codeforces_profile = $${paramIndex++}`);
        values.push(sanitized);
      }

      if (leetcode_profile !== undefined) {
        const sanitized = leetcode_profile
          ? leetcode_profile.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 24)
          : null;
        updates.push(`leetcode_profile = $${paramIndex++}`);
        values.push(sanitized);
      }

      if (updates.length > 0) {
        values.push(applicationId);
        const query = `UPDATE applications SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await pool.query(query, values);
        const updatedApp = result.rows[0];

        // If Codeforces profile was updated, trigger a scrape immediately
        if (codeforces_profile !== undefined && updatedApp.codeforces_profile) {
          setImmediate(async () => {
            try {
              const username = extractUsername(updatedApp.codeforces_profile, 'codeforces');
              if (username) {
                console.log(`Auto-scraping Codeforces for updated profile: ${username}`);
                const cfData = await scrapeCodeforces(username);
                if (cfData) {
                  await pool.query(
                    'UPDATE applications SET codeforces_data = $1, scraping_status = $2 WHERE id = $3',
                    [JSON.stringify(cfData), 'completed', applicationId]
                  );
                }
              }
            } catch (err) {
              console.error(`Auto-scrape failed for ${applicationId}:`, err);
            }
          });
        }
      }
    }

    // Log the update
    const updateFields = [];
    if (telegram_username !== undefined) updateFields.push('telegram_username');
    if (codeforces_profile !== undefined) updateFields.push('codeforces_profile');
    if (leetcode_profile !== undefined) updateFields.push('leetcode_profile');

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    console.log(`User ${userId} updated profile: ${updateFields.join(', ')}`);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// SHEET SUBMISSIONS ENDPOINTS
// ============================================

// POST /api/sheets/submit - Submit a .cpp, .c, or .txt solution for a sheet problem
app.post('/api/sheets/submit', apiLimiter, authenticateToken, async (req, res) => {
  try {
    // Support both 'id' and 'userId' for backward compatibility
    const userId = req.user.id || req.user.userId;
    const { sheet_name, problem_name, file_name, file_content } = req.body;

    console.log('[DEBUG] /api/sheets/submit - userId:', userId, 'sheet:', sheet_name, 'problem:', problem_name);

    // Validate required fields
    if (!sheet_name || !problem_name || !file_name || !file_content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate file name (must be .cpp, .c, or .txt)
    if (!file_name.endsWith('.cpp') && !file_name.endsWith('.c') && !file_name.endsWith('.txt')) {
      return res.status(400).json({ error: 'Only .cpp, .c, or .txt files are allowed' });
    }

    // Validate file content size (max 100KB)
    if (file_content.length > 100 * 1024) {
      return res.status(400).json({ error: 'File too large. Maximum 100KB allowed.' });
    }

    // Sanitize inputs
    const sanitizedSheetName = sheet_name.substring(0, 100);
    const sanitizedProblemName = problem_name.substring(0, 100);
    const sanitizedFileName = file_name.substring(0, 255);

    // Check for existing active submission
    const existingCheck = await pool.query(
      'SELECT id FROM sheet_submissions WHERE user_id = $1 AND sheet_name = $2 AND problem_name = $3',
      [userId, sanitizedSheetName, sanitizedProblemName]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Submission already exists. Please delete the old one first.' });
    }

    // Insert submission into database
    const result = await pool.query(
      `INSERT INTO sheet_submissions (user_id, sheet_name, problem_name, file_name, file_content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, submitted_at`,
      [userId, sanitizedSheetName, sanitizedProblemName, sanitizedFileName, file_content]
    );

    console.log(`📝 Sheet submission: User ${userId} submitted ${sanitizedFileName} for ${sanitizedSheetName}/${sanitizedProblemName}`);

    res.status(201).json({
      success: true,
      message: 'Solution submitted successfully',
      submission: {
        id: result.rows[0].id,
        submitted_at: result.rows[0].submitted_at
      }
    });

  } catch (error) {
    console.error('Error submitting solution:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sheets/my-submissions - Get current user's submissions
app.get('/api/sheets/my-submissions', standardLimiter, authenticateToken, async (req, res) => {
  try {
    // Support both 'id' and 'userId' for backward compatibility
    const userId = req.user.id || req.user.userId;

    console.log('[DEBUG] /api/sheets/my-submissions - userId:', userId, 'req.user:', req.user);

    const result = await pool.query(
      `SELECT id, sheet_name, problem_name, file_name, submitted_at
       FROM sheet_submissions
       WHERE user_id = $1
       ORDER BY submitted_at DESC`,
      [userId]
    );

    console.log('[DEBUG] Found submissions:', result.rows.length);

    res.json({
      success: true,
      submissions: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error getting submissions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/sheets/submission/:id - Delete a specific submission
app.delete('/api/sheets/submission/:id', authenticateToken, async (req, res) => {
  try {
    // Support both 'id' and 'userId' for backward compatibility
    const userId = req.user.id || req.user.userId;
    const submissionId = req.params.id;

    console.log('[DEBUG] /api/sheets/submission DELETE - userId:', userId, 'submissionId:', submissionId);

    // Verify ownership and delete in one go
    const result = await pool.query(
      'DELETE FROM sheet_submissions WHERE id = $1 AND user_id = $2 RETURNING id',
      [submissionId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Submission not found or unauthorized' });
    }

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Statistics API endpoint - Website Analytics
app.get('/api/admin/statistics/website', validateAdminToken, basicAuth, async (req, res) => {
  try {
    const stats = {};

    // Total registered users
    const totalUsersResult = await pool.query('SELECT COUNT(*) as total FROM users');
    stats.totalUsers = parseInt(totalUsersResult.rows[0].total);

    // Total applications
    const totalApplicationsResult = await pool.query('SELECT COUNT(*) as total FROM applications');
    stats.totalApplications = parseInt(totalApplicationsResult.rows[0].total);

    // Applications by status
    const applicationsByStatusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM applications
      GROUP BY status
      ORDER BY count DESC
    `);
    stats.applicationsByStatus = applicationsByStatusResult.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count)
    }));

    // Users with Codeforces profiles
    const cfUsersResult = await pool.query('SELECT COUNT(*) as total FROM applications WHERE codeforces_profile IS NOT NULL AND codeforces_profile != \'\'');
    stats.usersWithCodeforces = parseInt(cfUsersResult.rows[0].total);

    // Users with LeetCode profiles
    const lcUsersResult = await pool.query('SELECT COUNT(*) as total FROM applications WHERE leetcode_profile IS NOT NULL AND leetcode_profile != \'\'');
    stats.usersWithLeetcode = parseInt(lcUsersResult.rows[0].total);

    // Users with Telegram usernames
    const tgUsersResult = await pool.query('SELECT COUNT(*) as total FROM applications WHERE telegram_username IS NOT NULL AND telegram_username != \'\'');
    stats.usersWithTelegram = parseInt(tgUsersResult.rows[0].total);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching website analytics:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Statistics API endpoint - Sheet Submissions
app.get('/api/admin/statistics/submissions', validateAdminToken, basicAuth, async (req, res) => {
  try {
    const stats = {};

    // Total submissions
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM sheet_submissions');
    stats.totalSubmissions = parseInt(totalResult.rows[0].total);

    // Submissions per user (top 20)
    const perUserResult = await pool.query(`
      SELECT 
        u.id,
        u.email,
        COUNT(s.id) as submission_count,
        COUNT(DISTINCT s.sheet_name) as sheets_attempted,
        COUNT(DISTINCT s.problem_name) as problems_solved,
        STRING_AGG(DISTINCT s.sheet_name, ', ') as sheets_list
      FROM users u
      LEFT JOIN sheet_submissions s ON u.id = s.user_id
      GROUP BY u.id, u.email
      HAVING COUNT(s.id) > 0
      ORDER BY submission_count DESC
      LIMIT 100
    `);
    stats.topUsers = perUserResult.rows.map(row => ({
      email: row.email,
      submission_count: parseInt(row.submission_count),
      sheets_solved: parseInt(row.sheets_attempted),
      problems_solved: parseInt(row.problems_solved),
      sheets_list: row.sheets_list || ''
    }));

    // Distribution of sheets solved per user
    const distributionResult = await pool.query(`
      WITH UserSheetCounts AS (
        SELECT user_id, COUNT(DISTINCT sheet_name) as sheets_solved
        FROM sheet_submissions
        GROUP BY user_id
      )
      SELECT sheets_solved, COUNT(*) as user_count
      FROM UserSheetCounts
      GROUP BY sheets_solved
      ORDER BY sheets_solved ASC
    `);

    stats.userSheetDistribution = distributionResult.rows.map(row => ({
      sheets_solved: parseInt(row.sheets_solved),
      user_count: parseInt(row.user_count)
    }));

    // Submissions per sheet
    const perSheetResult = await pool.query(`
      SELECT 
        sheet_name,
        COUNT(*) as total_submissions,
        COUNT(DISTINCT user_id) as unique_users
      FROM sheet_submissions
      GROUP BY sheet_name
      ORDER BY total_submissions DESC
    `);
    stats.submissionsPerSheet = perSheetResult.rows.map(row => ({
      sheet_name: row.sheet_name,
      submission_count: parseInt(row.total_submissions),
      unique_users: parseInt(row.unique_users)
    }));

    // Unique users who submitted
    const uniqueUsersResult = await pool.query('SELECT COUNT(DISTINCT user_id) as count FROM sheet_submissions');
    stats.uniqueSubmitters = parseInt(uniqueUsersResult.rows[0].count);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching submission statistics:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Statistics API endpoint - Login Analytics
app.get('/api/admin/statistics/logins', validateAdminToken, basicAuth, async (req, res) => {
  try {
    const stats = {};

    // Total registered users
    const totalUsersResult = await pool.query('SELECT COUNT(*) as total FROM users');
    stats.totalUsers = parseInt(totalUsersResult.rows[0].total);

    // Total logins (all time)
    const totalLoginsResult = await pool.query('SELECT COUNT(*) as total FROM login_logs');
    stats.totalLogins = parseInt(totalLoginsResult.rows[0].total);

    // Unique users who logged in
    const uniqueLoginsResult = await pool.query('SELECT COUNT(DISTINCT user_id) as count FROM login_logs');
    stats.uniqueLoggedInUsers = parseInt(uniqueLoginsResult.rows[0].count);

    // Logins in last 7 days
    const last7DaysResult = await pool.query(`
      SELECT COUNT(*) as count FROM login_logs 
      WHERE logged_in_at >= NOW() - INTERVAL '7 days'
    `);
    stats.loginsLast7Days = parseInt(last7DaysResult.rows[0].count);

    // Logins in last 30 days
    const last30DaysResult = await pool.query(`
      SELECT COUNT(*) as count FROM login_logs 
      WHERE logged_in_at >= NOW() - INTERVAL '30 days'
    `);
    stats.loginsLast30Days = parseInt(last30DaysResult.rows[0].count);

    // Top 10 most active users
    // Top 100 most active users (based on last login)
    // Top 100 most active users (based on last login)
    const topUsersResult = await pool.query(`
      SELECT 
        id,
        email,
        (SELECT COUNT(*) FROM login_logs WHERE user_id = users.id) as login_count,
        last_login_at as last_login
      FROM users
      WHERE last_login_at IS NOT NULL
      ORDER BY last_login_at DESC
      LIMIT 100
    `);
    stats.topActiveUsers = topUsersResult.rows.map(row => ({
      email: row.email,
      login_count: parseInt(row.login_count || 0),
      last_login: row.last_login
    }));

    // Demographics: Gender Distribution (Derived from National ID)
    // National ID is encrypted, so we must decrypt it first
    const usersWithNationalId = await pool.query(`
      SELECT a.national_id
      FROM users u
      JOIN applications a ON u.application_id = a.id
      WHERE u.last_login_at IS NOT NULL
    `);

    let maleCount = 0;
    let femaleCount = 0;

    usersWithNationalId.rows.forEach(row => {
      try {
        if (row.national_id) {
          const decryptedId = decrypt(row.national_id);
          // 13th digit: Odd = Male, Even = Female
          if (decryptedId && decryptedId.length >= 13) {
            const genderDigit = parseInt(decryptedId.charAt(12));
            if (!isNaN(genderDigit)) {
              if (genderDigit % 2 !== 0) {
                maleCount++;
              } else {
                femaleCount++;
              }
            }
          }
        }
      } catch (err) {
        // Ignore decryption errors for individual records
        console.error('Error decrypting national ID during stats:', err.message);
      }
    });

    stats.genderDistribution = [
      { label: 'Male', count: maleCount },
      { label: 'Female', count: femaleCount }
    ];

    // Demographics: Student Level Distribution
    const levelResult = await pool.query(`
      SELECT a.student_level, COUNT(*) as count
      FROM users u
      JOIN applications a ON u.application_id = a.id
      WHERE u.last_login_at IS NOT NULL
      GROUP BY a.student_level
      ORDER BY a.student_level ASC
    `);
    stats.levelDistribution = levelResult.rows.map(row => ({
      label: `Level ${row.student_level}`,
      count: parseInt(row.count)
    }));

    // Demographics: Faculty Distribution
    const facultyResult = await pool.query(`
      SELECT a.faculty, COUNT(*) as count
      FROM users u
      JOIN applications a ON u.application_id = a.id
      WHERE u.last_login_at IS NOT NULL
      GROUP BY a.faculty
      ORDER BY count DESC
    `);
    stats.facultyDistribution = facultyResult.rows.map(row => ({
      label: row.faculty,
      count: parseInt(row.count)
    }));

    // Distribution of sheets solved per user
    const distributionResult = await pool.query(`
      WITH UserSheetCounts AS (
        SELECT user_id, COUNT(DISTINCT sheet_name) as sheets_solved
        FROM sheet_submissions
        GROUP BY user_id
      )
      SELECT sheets_solved, COUNT(*) as user_count
      FROM UserSheetCounts
      GROUP BY sheets_solved
      ORDER BY sheets_solved ASC
    `);

    stats.userSheetDistribution = distributionResult.rows.map(row => ({
      sheets_solved: parseInt(row.sheets_solved),
      user_count: parseInt(row.user_count)
    }));

    // Recent login activity (last 50)
    const recentLoginsResult = await pool.query(`
      SELECT 
        l.id,
        u.email,
        l.ip_address,
        l.logged_in_at
      FROM login_logs l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.logged_in_at DESC
      LIMIT 50
    `);
    stats.recentLogins = recentLoginsResult.rows;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching login statistics:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= STATIC FILE SERVING =================
// Serve static files from the Vite build output (dist folder)
const distPath = path.join(__dirname, '..', 'dist');
console.log('📂 Serving static files from:', distPath);

// Serve static assets with proper MIME types
app.use(express.static(distPath, {
  maxAge: '1y', // Cache static assets for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set proper MIME types for JavaScript modules
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    }
  }
}));

// SPA Catch-all route - must be LAST, after all API routes
// This sends index.html for any route that doesn't match an API endpoint
app.get('*', (req, res) => {
  // Don't catch API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Send index.html for all other routes (SPA client-side routing)
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

// Start server only if run directly
// Always start server
if (true) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Secret Key: ${process.env.API_SECRET_KEY ? 'Set ✓' : 'NOT SET ❌'}`);
  });

  // Handle server errors gracefully
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', error);
      process.exit(1);
    }
  });
}

export default app;

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit - let PM2 handle restarts
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - let PM2 handle restarts
});

