import { NextRequest, NextResponse } from 'next/server';
import { getFundCsvRecord, getFundCsvRecordByName, buildAllocationFundData } from '@/lib/funds-csv';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schemeCode = body?.schemeCode;
    const schemeName: string | undefined = body?.schemeName;
    const fundCategory: string | undefined = body?.fundCategory;

    if (!schemeCode && schemeCode !== 0) {
      return NextResponse.json({ error: 'schemeCode is required' }, { status: 400 });
    }

    // Primary lookup by scheme code + category (same code can exist across CSVs)
    let record = getFundCsvRecord(schemeCode, fundCategory);

    // Fallback: Regular-plan codes aren't in the CSV — try name-based lookup
    if (!record && schemeName) {
      record = getFundCsvRecordByName(schemeName, fundCategory);
      if (record) {
        console.log(`[/api/allocation/fund-data] Scheme code ${schemeCode} not in CSV; matched by name "${schemeName}" → "${record.schemeName}" (${record.schemeCode})`);
      }
    }

    if (!record) {
      return NextResponse.json({ error: 'Fund not found in CSV', schemeCode }, { status: 404 });
    }

    const data = buildAllocationFundData(record);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/allocation/fund-data] error:', err);
    return NextResponse.json({ error: 'Failed to load fund data' }, { status: 500 });
  }
}
