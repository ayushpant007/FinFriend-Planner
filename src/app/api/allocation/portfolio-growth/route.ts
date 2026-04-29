import { NextRequest, NextResponse } from 'next/server';
import { buildPortfolioGrowth, FundCsvCategory } from '@/lib/funds-csv';

export const runtime = 'nodejs';

const VALID: Record<string, FundCsvCategory> = {
  equity: 'Equity',
  debt: 'Debt',
  hybrid: 'Hybrid',
  solutions: 'Solutions',
  'solution-oriented': 'Solutions',
  commodities: 'Commodities',
  other: 'Commodities',
  others: 'Commodities',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCategory: string = String(body?.category ?? '').toLowerCase();
    const category = VALID[rawCategory];
    if (!category) {
      return NextResponse.json(
        { error: `Unsupported category: ${body?.category}` },
        { status: 400 },
      );
    }

    const funds: { schemeCode: string | number; weight: number; schemeName?: string }[] = Array.isArray(body?.funds) ? body.funds : [];
    if (funds.length === 0) {
      return NextResponse.json({ chartData: [], benchmarkName: '', horizonYears: 0 });
    }

    const result = buildPortfolioGrowth({ funds }, category);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/allocation/portfolio-growth] error:', err);
    return NextResponse.json({ error: 'Failed to compute portfolio growth' }, { status: 500 });
  }
}
