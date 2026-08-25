import { NextRequest, NextResponse } from 'next/server';
import { listInvestors, updateInvestorConverted } from '@/lib/investor-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ investors: await listInvestors() });
  } catch (error: any) {
    console.error('Failed to load investors:', error);
    return NextResponse.json({ error: error.message || 'Failed to load clients' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, converted } = await request.json();
    if (!id || typeof converted !== 'boolean') {
      return NextResponse.json({ error: 'Client ID and converted status are required' }, { status: 400 });
    }
    await updateInvestorConverted(id, converted);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update investor:', error);
    return NextResponse.json({ error: error.message || 'Failed to update client' }, { status: 500 });
  }
}