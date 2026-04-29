import { NextRequest, NextResponse } from 'next/server';
import { analyzeFactsheet } from '@/ai/flows/analyze-factsheet-flow';
import fs from 'fs';
import path from 'path';

// Helper to clean undefined values from response
function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (Array.isArray(obj)) return obj.map(cleanUndefined).filter(v => v !== undefined);
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleanedVal = cleanUndefined(v);
      if (cleanedVal !== undefined) cleaned[k] = cleanedVal;
    }
    return cleaned;
  }
  return obj;
}

// Rate limiter
const requestLog: { [key: string]: number[] } = {};
const MAX_REQUESTS_PER_MINUTE = 5;

function getRateLimit(ip: string): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  if (!requestLog[ip]) {
    requestLog[ip] = [];
  }
  
  requestLog[ip] = requestLog[ip].filter(timestamp => timestamp > oneMinuteAgo);
  
  if (requestLog[ip].length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  requestLog[ip].push(now);
  return true;
}

// Load factsheet manifest
function loadFactsheetManifest(): Record<string, Record<string, string>> {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'factsheets.json');
    const manifestData = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(manifestData);
  } catch (error) {
    console.error('Failed to load factsheets manifest:', error);
    return {};
  }
}

// Find PDF path for a fund
function findPdfPathForFund(
  fundName: string,
  schemeName?: string,
  manifest?: Record<string, Record<string, string>>
): string | null {
  if (!manifest) {
    manifest = loadFactsheetManifest();
  }

  // Exact match first
  if (manifest[fundName]) {
    if (schemeName) {
      // Look for scheme-specific entry
      const schemeKey = Object.keys(manifest[fundName]).find(key =>
        schemeName.toLowerCase().startsWith(key.toLowerCase())
      );
      if (schemeKey) {
        return manifest[fundName][schemeKey];
      }
    }
    
    // Return first available PDF for this fund
    const pdfPath = Object.values(manifest[fundName])[0];
    if (pdfPath) {
      return pdfPath;
    }
  }

  // Case-insensitive search
  const fundKey = Object.keys(manifest).find(key =>
    key.toLowerCase() === fundName.toLowerCase()
  );
  
  if (fundKey && manifest[fundKey]) {
    if (schemeName) {
      const schemeKey = Object.keys(manifest[fundKey]).find(key =>
        schemeName.toLowerCase().startsWith(key.toLowerCase())
      );
      if (schemeKey) {
        return manifest[fundKey][schemeKey];
      }
    }
    
    return Object.values(manifest[fundKey])[0];
  }

  return null;
}

interface AnalyzeFundRequest {
  fundName: string;
  schemeName?: string;
}

interface AnalyzeFundResponse {
  success: boolean;
  data?: any;
  error?: string;
  fundName?: string;
  pdfPath?: string;
  source?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeFundResponse>> {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!getRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait before analyzing another fund. (Max 5 per minute)',
        },
        { status: 429 }
      );
    }

    const body: AnalyzeFundRequest = await request.json();
    const { fundName, schemeName } = body;

    // Validation
    if (!fundName) {
      return NextResponse.json(
        {
          success: false,
          error: 'fundName is required',
        },
        { status: 400 }
      );
    }

    // Load manifest
    const manifest = loadFactsheetManifest();
    if (Object.keys(manifest).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to load factsheet manifest. Manifest may be unavailable.',
        },
        { status: 500 }
      );
    }

    // Find PDF path
    const pdfPath = findPdfPathForFund(fundName, schemeName, manifest);
    if (!pdfPath) {
      return NextResponse.json(
        {
          success: false,
          error: `No factsheet found for fund: ${fundName}${schemeName ? ` - ${schemeName}` : ''}. Available funds: ${Object.keys(manifest).join(', ')}`,
          fundName,
        },
        { status: 404 }
      );
    }

    console.log(`[Analyze Fund] Analyzing ${fundName} from: ${pdfPath}`);

    // Analyze factsheet
    const result = await analyzeFactsheet(pdfPath);

    return NextResponse.json({
      success: true,
      fundName: fundName,
      pdfPath: pdfPath,
      data: cleanUndefined(result),
      source: 'edited-factsheets',
    });

  } catch (error: any) {
    console.error('[Analyze Fund] Error:', error);
    
    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        {
          success: false,
          error: 'API is currently busy. Please wait a moment and try again.',
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('too large')) {
      return NextResponse.json(
        {
          success: false,
          error: 'PDF file is too large for analysis. Maximum 10MB.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to analyze fund factsheet',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<any>> {
  try {
    // Load and return manifest for debugging/discovery
    const manifest = loadFactsheetManifest();
    
    const searchParams = request.nextUrl.searchParams;
    const fundName = searchParams.get('fundName');

    if (fundName) {
      // Return specific fund's available schemes
      const fund = manifest[fundName];
      if (!fund) {
        // Try case-insensitive search
        const key = Object.keys(manifest).find(k => 
          k.toLowerCase() === fundName.toLowerCase()
        );
        if (!key) {
          return NextResponse.json(
            { error: `Fund '${fundName}' not found. Available funds: ${Object.keys(manifest).join(', ')}` },
            { status: 404 }
          );
        }
        return NextResponse.json({
          fundName: key,
          schemes: manifest[key],
        });
      }

      return NextResponse.json({
        fundName: fundName,
        schemes: fund,
      });
    }

    // Return all available funds
    return NextResponse.json({
      totalFunds: Object.keys(manifest).length,
      funds: Object.keys(manifest),
      manifest: manifest,
      usage: 'POST /api/analyze-fund-by-name with { fundName: string, schemeName?: string }',
    });

  } catch (error: any) {
    console.error('[Analyze Fund GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve factsheet data' },
      { status: 500 }
    );
  }
}
