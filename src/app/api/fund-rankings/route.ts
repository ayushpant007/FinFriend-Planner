import { NextRequest, NextResponse } from 'next/server';
import { getFundRankings, getTopFundsByType, getAvailableCategories, getAvailableTypes } from '@/lib/fund-rankings-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10');
    const action = searchParams.get('action');
    
    const rankings = await getFundRankings();
    
    if (!rankings) {
      return NextResponse.json({
        success: false,
        error: 'No rankings data available. Please wait for the daily update.',
        data: null
      }, { status: 404 });
    }
    
    if (action === 'categories') {
      const categories = getAvailableCategories(rankings);
      return NextResponse.json({
        success: true,
        data: categories
      });
    }
    
    if (action === 'types') {
      const types = getAvailableTypes(rankings, category || undefined);
      return NextResponse.json({
        success: true,
        data: types
      });
    }
    
    if (category) {
      const topFunds = getTopFundsByType(rankings, category, type || undefined, limit);
      return NextResponse.json({
        success: true,
        data: topFunds,
        meta: {
          category,
          type,
          limit,
          count: topFunds.length,
          lastUpdated: rankings.lastUpdated
        }
      });
    }
    
    const metrics = rankings.metrics || [];
    return NextResponse.json({
      success: true,
      data: metrics.slice(0, limit),
      meta: {
        totalFunds: rankings.totalFunds || 0,
        lastUpdated: rankings.lastUpdated
      }
    });
  } catch (error: any) {
    console.error('[Fund Rankings API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch fund rankings'
    }, { status: 500 });
  }
}
