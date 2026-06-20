import { NextRequest, NextResponse } from 'next/server';
import { getTopHoldings } from '@/lib/funds-csv';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schemeCode = body?.schemeCode;
    if (!schemeCode && schemeCode !== 0) {
      return NextResponse.json({ error: 'schemeCode is required' }, { status: 400 });
    }
    const holdings = getTopHoldings(schemeCode);
    return NextResponse.json({ holdings });
  } catch (err) {
    console.error('[/api/allocation/top-holdings] error:', err);
    return NextResponse.json({ error: 'Failed to load top holdings' }, { status: 500 });
  }
}
