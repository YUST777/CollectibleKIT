import type { AttributeWithPercentage, DbResult, GiftInfo, Item } from './db';
import type { Filters, GiftCollectionData } from './state';

const API_BASE_URL = '/api';

// Add maximum items limit constant
const MAX_ITEMS_LIMIT = 96;

/**
 * Get items from a gift collection
 */
export async function getItems(
  giftName: string,
  page = 1,
  limit = 12,
  filters: Filters = { attributes: {} },
  sort = 'id-asc'
): Promise<DbResult> {
  // Enforce maximum items limit
  const actualLimit = Math.min(limit, MAX_ITEMS_LIMIT);

  const params = new URLSearchParams({
    page: page.toString(),
    limit: actualLimit.toString(),
    sort,
  });

  if (filters.attributes && Object.keys(filters.attributes).length > 0) {
    params.append('attributes', JSON.stringify(filters.attributes));
  }

  const response = await fetch(`${API_BASE_URL}/items/${giftName}?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch items: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get attributes for a gift collection
 */
export async function getAttributes(giftName: string): Promise<AttributeWithPercentage> {
  const response = await fetch(`${API_BASE_URL}/attributes/${giftName}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch attributes: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get stats for a gift collection
 */
export async function getStats(giftName: string): Promise<{ totalItems: number }> {
  const response = await fetch(`${API_BASE_URL}/stats/${giftName}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch stats: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get all collection data including items, attributes, and stats in a single request
 * This helps reduce multiple API calls and makes loading faster
 */
export async function getCollectionData(
  giftName: string,
  page = 1,
  limit = 12,
  filters: Filters = { attributes: {} },
  sort = 'id-asc',
  includeAttributes = true,
  options?: { signal?: AbortSignal }
): Promise<{
  collectionData: GiftCollectionData;
  attributes: AttributeWithPercentage;
  stats: { totalItems: number };
}> {
  // Enforce maximum items limit
  const actualLimit = Math.min(limit, MAX_ITEMS_LIMIT);

  const params = new URLSearchParams({
    page: page.toString(),
    limit: actualLimit.toString(),
    sort,
    include_attributes: includeAttributes.toString()
  });

  if (filters.attributes && Object.keys(filters.attributes).length > 0) {
    params.append('attributes', JSON.stringify(filters.attributes));
  }

  const response = await fetch(`${API_BASE_URL}/collection-data/${giftName}?${params.toString()}`, {
    signal: options?.signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch collection data: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  // Return data with corrected structure for compatibility
  return {
    collectionData: {
      giftName: data.collectionData.giftName,
      items: data.collectionData.items,
      totalItems: data.collectionData.totalItems,
      totalPages: data.collectionData.totalPages,
    },
    attributes: data.attributes,
    stats: data.stats
  };
}

/**
 * List all available gift databases
 */
export async function listExports(): Promise<{ db: GiftInfo[] }> {
  const response = await fetch(`${API_BASE_URL}/list-exports`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch exports list: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Check if a database file exists
 */
export async function checkFile(giftName: string): Promise<{ db: boolean }> {
  const response = await fetch(`${API_BASE_URL}/check-file/${giftName}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to check file: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get wallet address
 */
export async function getWallet(): Promise<{ address: string }> {
  const response = await fetch(`${API_BASE_URL}/wallet`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch wallet: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Validate Telegram init data
 */
export async function validateInitData(initData: string): Promise<{ valid: boolean; user?: any; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/validate-init-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ initData }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to validate init data: ${response.status} ${errorText}`);
  }

  return response.json();
}
