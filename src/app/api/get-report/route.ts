import { NextRequest, NextResponse } from 'next/server';
import { getDetailedReport, getSipOptimizerReport } from '@/lib/replit-db';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportId = searchParams.get('id');
    const reportType = searchParams.get('type') || 'detailed';

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    let reportData = null;

    if (reportType === 'sip') {
      reportData = await getSipOptimizerReport(reportId);
    } else {
      reportData = await getDetailedReport(reportId);
    }

    if (!reportData) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: cleanUndefined(reportData) });
  } catch (error: any) {
    console.error('Error in get-report API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve report' },
      { status: 500 }
    );
  }
}
