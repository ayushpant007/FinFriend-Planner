import { NextResponse } from 'next/server';
import { getInvestorPlannerData } from '@/lib/investor-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const report = await getInvestorPlannerData(id);
    if (!report) return NextResponse.json({ error: 'No saved report found' }, { status: 404 });
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load report' }, { status: 500 });
  }
}