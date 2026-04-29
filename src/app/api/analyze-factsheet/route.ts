import { NextRequest, NextResponse } from 'next/server';
import { analyzeFactsheet } from '@/ai/flows/analyze-factsheet-flow';
import { getFactsheetDataBySchemeCode } from '@/lib/mock-funds';

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

// Simple rate limiter: track requests per IP
const requestLog: { [key: string]: number[] } = {};
const MAX_REQUESTS_PER_MINUTE = 2; // Allow 2 requests per minute per IP

function getRateLimit(ip: string): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  if (!requestLog[ip]) {
    requestLog[ip] = [];
  }
  
  // Remove old entries
  requestLog[ip] = requestLog[ip].filter(timestamp => timestamp > oneMinuteAgo);
  
  // Check if limit exceeded
  if (requestLog[ip].length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  // Add current request
  requestLog[ip].push(now);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfUrl, fundName, schemeCode } = body;
    
    if (!pdfUrl) {
      return NextResponse.json(
        { error: 'PDF URL is required' },
        { status: 400 }
      );
    }
    
    // Check if this is a mock fund (e.g., 360 ONE Mutual Fund)
    if (fundName && fundName.includes('360 ONE') && schemeCode) {
      const mockData = getFactsheetDataBySchemeCode(fundName, parseInt(schemeCode));
      if (mockData && mockData.scheme && mockData.industryAllocation && mockData.portfolioHoldings) {
        return NextResponse.json({
          fundName: fundName,
          schemeName: mockData.scheme.schemeName,
          schemeCode: schemeCode,
          industryAllocation: mockData.industryAllocation.map(a => ({
            sector: a.sector,
            weight: a.weight,
          })),
          portfolioHoldings: mockData.portfolioHoldings.map(h => ({
            company: h.stock,
            weight: h.weight,
          })),
          source: 'mock-data',
        });
      }
    }
    
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Check rate limit
    if (!getRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before analyzing another factsheet. (Max 2 per minute)' },
        { status: 429 }
      );
    }
    
    const result = await analyzeFactsheet(pdfUrl);
    return NextResponse.json(cleanUndefined(result));
  } catch (error: any) {
    console.error('Error in analyze-factsheet API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze factsheet' },
      { status: 500 }
    );
  }
}
