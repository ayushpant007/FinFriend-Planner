import { NextRequest, NextResponse } from 'next/server';
import { storeDetailedReport, storeSipOptimizerReport, setLatestReportId } from '@/lib/replit-db';
import { saveReportToDriveInFolder } from '@/lib/google-drive';

// Helper to safely serialize data and remove non-JSON-serializable values
function sanitizeForJSON(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeForJSON(item));
    }
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'function' || typeof value === 'symbol') continue;
      if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeForJSON(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, userId, detailedReport, sipReport } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Sanitize data before storing
    const sanitizedDetailedReport = sanitizeForJSON(detailedReport);
    const sanitizedSipReport = sanitizeForJSON(sipReport);

    // Store both reports in parallel
    const [detailedResult, sipResult] = await Promise.all([
      storeDetailedReport(reportId, sanitizedDetailedReport),
      storeSipOptimizerReport(reportId, sanitizedSipReport),
    ]);

    // Store latest report ID for user
    if (userId && userId !== 'guest') {
      await setLatestReportId(userId, reportId);
    }

    if (!detailedResult.ok || !sipResult.ok) {
      return NextResponse.json(
        { error: 'Failed to store one or more reports' },
        { status: 500 }
      );
    }

    // Save to Google Drive (non-blocking, don't fail if Drive save fails)
    let driveLink: string | null = null;
    try {
      const reportDataForDrive = {
        reportId,
        userId,
        generatedAt: new Date().toISOString(),
        detailedReport: sanitizedDetailedReport,
        sipReport: sanitizedSipReport,
      };
      driveLink = await saveReportToDriveInFolder(reportId, reportDataForDrive);
    } catch (driveError) {
      console.error('Google Drive save failed (non-critical):', driveError);
    }

    return NextResponse.json({ success: true, reportId, driveLink });
  } catch (error: any) {
    console.error('Error in store-report API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store reports' },
      { status: 500 }
    );
  }
}
