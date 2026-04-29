import { NextRequest, NextResponse } from 'next/server';
import { summarizeFinancialStatus } from '@/ai/flows/financial-status-summary';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await summarizeFinancialStatus(body);
    return NextResponse.json(cleanUndefined(result));
  } catch (error: any) {
    console.error('Error in summarize-financial-status API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate financial summary' },
      { status: 500 }
    );
  }
}
