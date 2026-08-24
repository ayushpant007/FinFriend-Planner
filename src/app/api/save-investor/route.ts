import { NextRequest, NextResponse } from 'next/server';

import { saveInvestorProfile } from '@/lib/investor-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const personalDetails = body.personalDetails;
    const plannerData = body.plannerData;

    if (!personalDetails || !plannerData) {
      return NextResponse.json(
        { error: 'Investor details and planner data are required.' },
        { status: 400 },
      );
    }

    const result = await saveInvestorProfile({ personalDetails, plannerData });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Investor save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save investor.' },
      { status: 500 },
    );
  }
}