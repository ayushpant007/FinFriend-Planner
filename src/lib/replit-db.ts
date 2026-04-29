/**
 * Replit Database (KV) Utility
 * Provides persistent key-value storage as a replacement for sessionStorage
 * SERVER-SIDE ONLY - Do not import in client components
 */

import 'server-only';
import fs from 'fs';
import path from 'path';

// Local storage file path
const LOCAL_DB_PATH = path.join(process.cwd(), '.local-db.json');

// Initialize local DB if it doesn't exist
function initLocalDb() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({}));
  }
}

// Get the entire DB
function getDbData(): Record<string, any> {
  initLocalDb();
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

// Save the entire DB
function saveDbData(data: Record<string, any>) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

/**
 * Store data
 * @param key - The key to store data under
 * @param value - The value to store
 * @returns Success status
 */
export async function setData<T>(key: string, value: T): Promise<{ ok: boolean; error?: string }> {
  try {
    const dbData = getDbData();
    dbData[key] = value;
    saveDbData(dbData);
    return { ok: true };
  } catch (error: any) {
    console.error('[DB] Set failed:', error);
    return { ok: false, error: error.message || 'Failed to store data' };
  }
}

/**
 * Retrieve data
 * @param key - The key to retrieve
 * @returns The stored value or null if not found
 */
export async function getData<T>(key: string): Promise<T | null> {
  try {
    const dbData = getDbData();
    const value = dbData[key];
    if (value && typeof value === 'object' && 'ok' in value && 'value' in value) {
      return (value as { ok: boolean; value: T }).value;
    }
    return value !== undefined ? (value as T) : null;
  } catch (error: any) {
    console.error('[DB] Get failed:', error);
    return null;
  }
}

/**
 * Delete data
 * @param key - The key to delete
 * @returns Success status
 */
export async function deleteData(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const dbData = getDbData();
    delete dbData[key];
    saveDbData(dbData);
    return { ok: true };
  } catch (error: any) {
    console.error('[DB] Delete failed:', error);
    return { ok: false, error: error.message || 'Failed to delete data' };
  }
}

/**
 * List all keys
 * @param prefix - Optional prefix to filter keys
 * @returns Array of keys
 */
export async function listKeys(prefix?: string): Promise<string[]> {
  try {
    const dbData = getDbData();
    const keys = Object.keys(dbData);
    if (prefix) {
      return keys.filter(k => k.startsWith(prefix));
    }
    return keys;
  } catch (error: any) {
    console.error('[DB] List failed:', error);
    return [];
  }
}

/**
 * Check if a key exists
 * @param key - The key to check
 * @returns True if key exists, false otherwise
 */
export async function keyExists(key: string): Promise<boolean> {
  try {
    const dbData = getDbData();
    return dbData[key] !== undefined;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all data (use with caution!)
 * @param prefix - Optional prefix to clear only matching keys
 * @returns Number of keys deleted
 */
export async function clearData(prefix?: string): Promise<number> {
  try {
    const dbData = getDbData();
    const keys = Object.keys(dbData);
    let deletedCount = 0;
    for (const key of keys) {
      if (!prefix || key.startsWith(prefix)) {
        delete dbData[key];
        deletedCount++;
      }
    }
    saveDbData(dbData);
    return deletedCount;
  } catch (error: any) {
    console.error('[DB] Clear failed:', error);
    return 0;
  }
}

// Report-specific helper functions

/**
 * Store detailed report data
 * @param reportId - Unique identifier for the report (e.g., userId + timestamp)
 * @param data - Report data object
 */
export async function storeDetailedReport(reportId: string, data: any): Promise<{ ok: boolean; error?: string }> {
  return setData(`report:detailed:${reportId}`, data);
}

/**
 * Retrieve detailed report data
 * @param reportId - Unique identifier for the report
 */
export async function getDetailedReport<T>(reportId: string): Promise<T | null> {
  return getData<T>(`report:detailed:${reportId}`);
}

/**
 * Store SIP optimizer report data
 * @param reportId - Unique identifier for the report
 * @param data - SIP optimizer report data object
 */
export async function storeSipOptimizerReport(reportId: string, data: any): Promise<{ ok: boolean; error?: string }> {
  return setData(`report:sip:${reportId}`, data);
}

/**
 * Retrieve SIP optimizer report data
 * @param reportId - Unique identifier for the report
 */
export async function getSipOptimizerReport<T>(reportId: string): Promise<T | null> {
  return getData<T>(`report:sip:${reportId}`);
}

/**
 * Store the latest report ID for a user (for quick access)
 * @param userId - User identifier
 * @param reportId - Report identifier
 */
export async function setLatestReportId(userId: string, reportId: string): Promise<{ ok: boolean; error?: string }> {
  return setData(`latest:report:${userId}`, reportId);
}

/**
 * Get the latest report ID for a user
 * @param userId - User identifier
 */
export async function getLatestReportId(userId: string): Promise<string | null> {
  return getData<string>(`latest:report:${userId}`);
}
