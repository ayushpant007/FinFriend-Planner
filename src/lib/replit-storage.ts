/**
 * Replit Object Storage Utility
 * Provides functions for managing factsheet PDFs in Replit App Storage
 */

import { Client } from '@replit/object-storage';

// Initialize the storage client (auto-configured in Replit environment)
const storage = new Client();

/**
 * Upload a file to Replit Object Storage
 * @param path - The storage path (e.g., "factsheets/ICICI/factsheet.pdf")
 * @param data - File data as Buffer or string
 * @returns Success status and error if any
 */
export async function uploadFile(path: string, data: Buffer | string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (typeof data === 'string') {
      const result = await storage.uploadFromText(path, data);
      if (!result.ok) {
        return { ok: false, error: result.error?.message || 'Upload failed' };
      }
      return { ok: true };
    } else {
      const result = await storage.uploadFromBytes(path, data);
      if (!result.ok) {
        return { ok: false, error: result.error?.message || 'Upload failed' };
      }
      return { ok: true };
    }
  } catch (error: any) {
    console.error('[Storage] Upload failed:', error);
    return { ok: false, error: error.message || 'Upload failed' };
  }
}

/**
 * Download a file from Replit Object Storage as text
 * @param path - The storage path
 * @returns File content as text or error
 */
export async function downloadFileAsText(path: string): Promise<{ ok: boolean; value?: string; error?: string }> {
  try {
    const result = await storage.downloadAsText(path);
    if (!result.ok) {
      return { ok: false, error: result.error?.message || 'Download failed' };
    }
    return { ok: true, value: result.value };
  } catch (error: any) {
    console.error('[Storage] Download failed:', error);
    return { ok: false, error: error.message || 'Download failed' };
  }
}

/**
 * Download a file from Replit Object Storage as bytes
 * @param path - The storage path
 * @returns File content as Buffer or error
 */
export async function downloadFileAsBytes(path: string): Promise<{ ok: boolean; value?: Buffer; error?: string }> {
  try {
    const result = await storage.downloadAsBytes(path);
    if (!result.ok) {
      return { ok: false, error: result.error?.message || 'Download failed' };
    }
    // downloadAsBytes returns [Buffer], so we extract the first element
    return { ok: true, value: result.value[0] };
  } catch (error: any) {
    console.error('[Storage] Download failed:', error);
    return { ok: false, error: error.message || 'Download failed' };
  }
}

/**
 * Get a storage path for a file (can be used to construct download URLs)
 * Note: Replit Object Storage doesn't provide public URLs directly.
 * Files must be served through your application endpoints.
 * @param path - The storage path
 * @returns Storage path that can be used with application endpoints
 */
export function getStoragePath(path: string): string {
  return path;
}

/**
 * List all files in storage (optionally with prefix filter)
 * @param prefix - Optional prefix to filter files
 * @returns List of file paths or error
 */
export async function listFiles(prefix?: string): Promise<{ ok: boolean; files?: string[]; error?: string }> {
  try {
    const result = await storage.list({ prefix });
    if (!result.ok) {
      return { ok: false, error: result.error?.message || 'Failed to list files' };
    }
    // Extract names from StorageObject array
    const fileNames = result.value.map((obj) => obj.name);
    return { ok: true, files: fileNames };
  } catch (error: any) {
    console.error('[Storage] List failed:', error);
    return { ok: false, error: error.message || 'List failed' };
  }
}

/**
 * Delete a file from storage
 * @param path - The storage path
 * @returns Success status and error if any
 */
export async function deleteFile(path: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await storage.delete(path);
    if (!result.ok) {
      return { ok: false, error: result.error?.message || 'Delete failed' };
    }
    return { ok: true };
  } catch (error: any) {
    console.error('[Storage] Delete failed:', error);
    return { ok: false, error: error.message || 'Delete failed' };
  }
}

/**
 * Check if a file exists in storage
 * @param path - The storage path
 * @returns True if file exists, false otherwise
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const result = await storage.list({ prefix: path });
    if (result.ok && result.value) {
      return result.value.some((obj) => obj.name === path);
    }
    return false;
  } catch (error) {
    return false;
  }
}
