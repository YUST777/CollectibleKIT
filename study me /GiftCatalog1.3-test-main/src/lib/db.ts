import fs from 'fs-extra';
import path from 'path';
import mysql from 'mysql2/promise';

// Gifts/Collections DB connection config (old DB)
const giftsDbConfig = {
  host: process.env.MYSQL_GIFTS_HOST,
  port: Number.parseInt(process.env.MYSQL_GIFTS_PORT || '3306'),
  user: process.env.MYSQL_GIFTS_USER,
  password: process.env.MYSQL_GIFTS_PASSWORD,
  database: process.env.MYSQL_GIFTS_DATABASE,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000
};

// Referrals DB connection config (new DB)
const refDbConfig = {
  host: process.env.MYSQL_REF_HOST,
  port: Number.parseInt(process.env.MYSQL_REF_PORT || '3306'),
  user: process.env.MYSQL_REF_USER,
  password: process.env.MYSQL_REF_PASSWORD,
  database: process.env.MYSQL_REF_DATABASE,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000
};

// Create pools (singletons)
let giftsPool: mysql.Pool | null = null;
let refPool: mysql.Pool | null = null;

export function getGiftsPool(): mysql.Pool {
  if (!giftsPool) {
    console.log(`Creating Gifts MySQL pool at ${giftsDbConfig.host}:${giftsDbConfig.port}`);
    giftsPool = mysql.createPool(giftsDbConfig);
  }
  return giftsPool;
}

export function getRefPool(): mysql.Pool {
  if (!refPool) {
    console.log(`Creating Referrals MySQL pool at ${refDbConfig.host}:${refDbConfig.port}`);
    refPool = mysql.createPool(refDbConfig);
  }
  return refPool;
}

export type Item = {
  id: number;
  name: string;
  description?: string; // Make description optional
  image?: string;
  lottie?: string;
  attributes: any[];
  isOnTelegram?: boolean; // Keep as optional
  isOnBlockchain?: boolean; // Keep as optional
};

export type DbResult = {
  items: Item[];
  totalItems: number;
  page: number;
  totalPages: number;
};

export type GiftInfo = {
  name: string;
  total: number;
};

export type AttributeWithPercentage = {
  [key: string]: {
    [value: string]: {
      count: number;
      percentage: string;
    };
  };
};

export type Gift = {
  name: string;
  total: number;
};

/**
 * Connect to the MySQL database (legacy method, use with caution)
 * @deprecated Use getConnectionPool() instead for better performance
 */
export async function connectDB(): Promise<mysql.Connection> {
  try {
    console.log(`Connecting to MySQL database at ${giftsDbConfig.host}:${giftsDbConfig.port}`);
    const connection = await mysql.createConnection(giftsDbConfig);
    return connection;
  } catch (error) {
    console.error('Failed to connect to MySQL database:', error);
    throw error;
  }
}

// Cache for frequently accessed data
interface Cache {
  attributes: Map<string, { data: AttributeWithPercentage; timestamp: number }>;
  collections: { data: GiftInfo[]; timestamp: number } | null;
  stats: Map<string, { totalItems: number; timestamp: number }>;
}

const cache: Cache = {
  attributes: new Map(),
  collections: null,
  stats: new Map()
};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get items from a gift collection database
 */
export async function getItems(
  giftName: string,
  page = 1,
  limit = 12,
  sort = 'id-asc',
  attributes: Record<string, string[]> = {}
): Promise<DbResult> {
  const pool = getGiftsPool();

  // Convert limit and page to numbers to ensure they're treated correctly
  const limitNum = Number(limit);
  const pageNum = Number(page);

  // Use pluralized table name for the collection
  const tableName = getCollectionTableName(giftName);
  // Build the base query for the new structure
  let baseQuery = `SELECT id, base_name, attributes FROM \`${tableName}\``;
  const whereClauses: string[] = [];
  const params: any[] = [];

  // Apply attribute filters
  if (Object.keys(attributes).length > 0) {
    for (const [trait, values] of Object.entries(attributes)) {
      if (Array.isArray(values) && values.length > 0) {
        for (const value of values) {
          whereClauses.push(`JSON_SEARCH(attributes, 'one', ?) IS NOT NULL`);
          params.push(value);
        }
        // Optionally, filter by trait_type as well
        // whereClauses.push(`JSON_SEARCH(attributes, 'one', ?) IS NOT NULL`);
        // params.push(trait);
      }
    }
  }

  if (whereClauses.length > 0) {
    baseQuery += ' WHERE ' + whereClauses.join(' AND ');
  }

  // Apply sorting
  const [field, direction] = sort.split('-');
  const sortField = field === 'id' ? 'id' : field;
  baseQuery += ` ORDER BY ${sortField} ${direction.toUpperCase()}`;

  // Count total items for pagination
  let countQuery = `SELECT COUNT(*) as total FROM \`${tableName}\``;
  if (whereClauses.length > 0) {
    countQuery += ' WHERE ' + whereClauses.join(' AND ');
  }
  const [countRows] = await pool.execute(countQuery, params);
  const totalItems = (countRows as any)[0].total;
  const totalPages = Math.ceil(totalItems / limitNum);

  // Apply pagination
  const offset = (pageNum - 1) * limitNum;
  const query = `${baseQuery} LIMIT ${limitNum} OFFSET ${offset}`;

  // Execute the query
  const [rows] = await pool.execute(query, params);

  // Parse attributes JSON and return the new structure
  const parsedItems = (rows as any[]).map(item => ({
    id: item.id,
    base_name: item.base_name,
    name: `${item.base_name} #${item.id}`,
    description: '',
    image: '',
    lottie: '',
    isOnTelegram: false,
    isOnBlockchain: false,
    attributes: typeof item.attributes === 'string'
      ? JSON.parse(item.attributes || '[]')
      : item.attributes
  }));

  return {
    items: parsedItems,
    totalItems,
    page: pageNum,
    totalPages,
  };
}

/**
 * Get attributes for a gift collection
 */
export async function getAttributes(giftName: string): Promise<AttributeWithPercentage> {
  const now = Date.now();
  const cached = cache.attributes.get(giftName);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const pool = getGiftsPool();
  const tableName = getCollectionTableName(giftName);

  const [rows] = await pool.execute(
    `SELECT attributes FROM \`${tableName}\` WHERE attributes IS NOT NULL`
  );

  const attributes: Record<string, Record<string, number>> = {};

  (rows as any[]).forEach(row => {
    let attrs;
    try {
      attrs = JSON.parse(row.attributes || '[]');
    } catch (error) {
      console.warn(`Failed to parse attributes for row in ${giftName}:`, row.attributes);
      attrs = [];
    }

    attrs.forEach((attr: { trait_type: string; value: string }) => {
      const traitType = attr.trait_type;
      const value = attr.value;

      if (!attributes[traitType]) attributes[traitType] = {};
      if (!attributes[traitType][value]) attributes[traitType][value] = 0;
      attributes[traitType][value]++;
    });
  });

  // Focus specifically on Model, Backdrop, and Symbol traits
  const priorityTraits = ['Model', 'Backdrop', 'Symbol'];
  const filteredAttributes: Record<string, Record<string, number>> = {};

  priorityTraits.forEach(trait => {
    // Case-insensitive search for trait types
    const matchedTrait = Object.keys(attributes).find(
      key => key.toLowerCase() === trait.toLowerCase()
    );

    if (matchedTrait && attributes[matchedTrait]) {
      filteredAttributes[matchedTrait] = attributes[matchedTrait];
    } else if (attributes[trait]) {
      // Direct match
      filteredAttributes[trait] = attributes[trait];
    }
  });

  // Calculate percentages
  const totalItems = (rows as any[]).length || 1;
  const attributesWithPercentages: AttributeWithPercentage = {};

  Object.entries(filteredAttributes).forEach(([trait, values]) => {
    attributesWithPercentages[trait] = {};

    Object.entries(values).forEach(([value, count]) => {
      // Calculate percentage with 2 decimal places precision
      const percentage = ((count / totalItems) * 100).toFixed(2);
      attributesWithPercentages[trait][value] = { count, percentage };
    });
  });

  cache.attributes.set(giftName, { data: attributesWithPercentages, timestamp: now });

  return attributesWithPercentages;
}

/**
 * Get stats for a gift collection
 */
export async function getStats(giftName: string): Promise<{ totalItems: number }> {
  const now = Date.now();
  const cached = cache.stats.get(giftName);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return { totalItems: cached.totalItems };
  }

  const pool = getGiftsPool();
  const tableName = getCollectionTableName(giftName);

  const [rows] = await pool.execute(
    `SELECT COUNT(*) as totalItems FROM \`${tableName}\``
  );

  const totalItems = (rows as any)[0].totalItems;
  cache.stats.set(giftName, { totalItems, timestamp: now });

  return { totalItems };
}

function toDisplayName(tableName: string): string {
  // Remove trailing 's', split on word boundaries, capitalize each word
  let base = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
  // Insert space before each uppercase letter (if any), then capitalize
  base = base.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Capitalize first letter of each word
  return base.replace(/\b\w/g, c => c.toUpperCase());
}

export async function listExports(): Promise<{ db: GiftInfo[] }> {
  const now = Date.now();
  if (cache.collections && now - cache.collections.timestamp < CACHE_TTL) {
    return { db: cache.collections.data };
  }

  const pool = getGiftsPool();

  try {
    const [tables] = await pool.execute(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name LIKE '%s'",
      [giftsDbConfig.database]
    );
    console.log('Found tables:', tables);

    const collections: GiftInfo[] = [];
    for (const table of tables as any[]) {
      const tableName = table.TABLE_NAME;
      if (!tableName) {
        console.warn('Skipping invalid table entry:', table);
        continue;
      }
      const [count] = await pool.execute(
        `SELECT COUNT(*) as total FROM \`${tableName}\``
      );
      const displayName = toDisplayName(tableName);
      console.log('Processing table:', tableName, '-> displayName:', displayName, 'count:', (count as any)[0].total);
      collections.push({
        name: displayName,
        total: (count as any)[0].total
      });
    }
    cache.collections = { data: collections, timestamp: now };
    return { db: collections };
  } catch (error) {
    console.error('Error in listExports:', error);
    throw error;
  }
}

/**
 * Check if a gift collection exists
 */
export async function checkFile(giftName: string): Promise<{ db: boolean }> {
  const pool = getGiftsPool();
  const tableName = getCollectionTableName(giftName);

  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM \`${tableName}\``
  );

  return { db: (rows as any)[0].count > 0 };
}

function getCollectionTableName(collectionName: string): string {
  // Remove numbers and special characters
  let cleanName = collectionName.replace(/[#\d]/g, '');
  // Convert camelCase to lowercase and remove spaces
  cleanName = cleanName.replace(/([A-Z])/g, '$1').toLowerCase().replace(/\s+/g, '');
  // Add 's' for plural if not already plural
  if (!cleanName.endsWith('s')) {
    cleanName += 's';
  }
  return cleanName;
}

// Referral system DB logic
export async function addReferral(referrerId: number, invitedId: number, invitedName: string, invitedPhoto: string): Promise<void> {
  const pool = getRefPool();
  await pool.execute(
    'INSERT IGNORE INTO referrals (referrer_id, invited_id, invited_name, invited_photo) VALUES (?, ?, ?, ?)',
    [referrerId, invitedId, invitedName, invitedPhoto]
  );
}

export async function getInvitedUsers(referrerId: number): Promise<{ invited_id: number, invited_name: string, invited_photo: string, created_at: string }[]> {
  const pool = getRefPool();
  const [rows] = await pool.execute(
    'SELECT invited_id, invited_name, invited_photo, created_at FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC',
    [referrerId]
  );
  return rows as any[];
}
