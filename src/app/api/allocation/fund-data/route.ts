import { NextRequest, NextResponse } from 'next/server';
import { getFundCsvRecord, buildAllocationFundData } from '@/lib/funds-csv';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schemeCode = body?.schemeCode;
    if (!schemeCode && schemeCode !== 0) {
      return NextResponse.json({ error: 'schemeCode is required' }, { status: 400 });
    }

    const record = getFundCsvRecord(schemeCode);
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
