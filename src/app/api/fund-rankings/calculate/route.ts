import { NextRequest, NextResponse } from 'next/server';
import { 
  computeMetricsForFund, 
  calculatePercentilesAndScores,
  parseBenchmarkCSV,
  getBenchmarkFileForScheme,
  NAVData
} from '@/lib/fund-scoring-engine';
import { saveFundRankings, shouldUpdateRankings } from '@/lib/fund-rankings-store';
import fs from 'fs';
import path from 'path';

interface MutualFundScheme {
  category: string;
  type: string;
  fundName: string;
  schemeName: string;
  schemeCode: string;
}

async function loadFundsFromCSV(): Promise<MutualFundScheme[]> {
  const csvPath = path.join(process.cwd(), 'public', 'fund-schemes-master.csv');
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvText.trim().split('\n');
  const funds: MutualFundScheme[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCSVLine(line);
    if (parts.length < 5) continue;
    
    funds.push({
      category: parts[0].trim(),
      type: parts[1].trim(),
      fundName: parts[2].trim(),
      schemeName: parts[3].trim(),
      schemeCode: parts[4].trim()
    });
  }
  
  return funds;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

async function fetchNAVData(schemeCode: string): Promise<NAVData[]> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      next: { revalidate: 86400 }
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }
    
    return data.data.map((item: { date: string; nav: string }) => ({
      date: item.date,
      nav: parseFloat(item.nav)
    })).filter((item: NAVData) => !isNaN(item.nav) && item.nav > 0);
  } catch (error) {
    console.error(`[NAV Fetch] Error for ${schemeCode}:`, error);
    return [];
  }
}

function loadBenchmarkData(folder: string, filename: string): { date: string; price: number }[] {
  try {
    const benchmarkPath = path.join(process.cwd(), 'public', folder, filename);
    
    if (!fs.existsSync(benchmarkPath)) {
      console.warn(`[Benchmark] File not found: ${benchmarkPath}`);
      return [];
    }
    
    const csvText = fs.readFileSync(benchmarkPath, 'utf-8');
    return parseBenchmarkCSV(csvText);
  } catch (error) {
    console.error(`[Benchmark] Error loading ${folder}/${filename}:`, error);
    return [];
  }
}

const benchmarkCache = new Map<string, { date: string; price: number }[]>();

function getCachedBenchmarkData(folder: string, filename: string): { date: string; price: number }[] {
  const key = `${folder}/${filename}`;
  
  if (benchmarkCache.has(key)) {
    return benchmarkCache.get(key)!;
  }
  
  const data = loadBenchmarkData(folder, filename);
  benchmarkCache.set(key, data);
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const { force, category, type } = await request.json().catch(() => ({ force: false, category: null, type: null }));
    
    if (!force) {
      const needsUpdate = await shouldUpdateRankings();
      if (!needsUpdate) {
        return NextResponse.json({
          success: true,
          message: 'Rankings are up to date. Use force=true to recalculate.',
          skipped: true
        });
      }
    }
    
    console.log('[Fund Rankings] Starting calculation...');
    
    const allFunds = await loadFundsFromCSV();
    console.log(`[Fund Rankings] Loaded ${allFunds.length} funds from CSV`);
    
    let fundsToProcess = allFunds;
    if (category && type) {
      fundsToProcess = allFunds.filter(f => f.category === category && f.type === type);
      console.log(`[Fund Rankings] Filtered to ${fundsToProcess.length} funds for ${category} - ${type}`);
    } else if (category) {
      fundsToProcess = allFunds.filter(f => f.category === category);
      console.log(`[Fund Rankings] Filtered to ${fundsToProcess.length} funds for ${category}`);
    }
    
    const sampleFunds = fundsToProcess.slice(0, 200);
    
    const metricsPromises = sampleFunds.map(async (fund, index) => {
      try {
        if (index > 0 && index % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const navData = await fetchNAVData(fund.schemeCode);
        
        if (navData.length < 30) {
          return null;
        }
        
        const { file, folder } = getBenchmarkFileForScheme(fund.category, fund.type, fund.schemeName);
        const benchmarkData = getCachedBenchmarkData(folder, file);
        
        if (benchmarkData.length < 30) {
          return null;
        }
        
        const metrics = computeMetricsForFund(navData, benchmarkData, {
          schemeCode: fund.schemeCode,
          schemeName: fund.schemeName,
          fundName: fund.fundName,
          category: fund.category,
          type: fund.type
        });
        
        return metrics;
      } catch (error) {
        console.error(`[Fund Rankings] Error processing ${fund.schemeCode}:`, error);
        return null;
      }
    });
    
    const metricsResults = await Promise.all(metricsPromises);
    const validMetrics = metricsResults.filter((m): m is NonNullable<typeof m> => m !== null);
    
    console.log(`[Fund Rankings] Calculated metrics for ${validMetrics.length} funds`);
    
    const finalMetrics = calculatePercentilesAndScores(validMetrics);
    
    const saved = await saveFundRankings(finalMetrics);
    
    if (!saved) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save rankings to database'
      }, { status: 500 });
    }
    
    console.log(`[Fund Rankings] Saved ${finalMetrics.length} fund rankings`);
    
    return NextResponse.json({
      success: true,
      message: `Calculated and saved rankings for ${finalMetrics.length} funds`,
      data: {
        totalProcessed: sampleFunds.length,
        successfulCalculations: finalMetrics.length,
        topFunds: finalMetrics.slice(0, 5).map(f => ({
          schemeName: f.schemeName,
          score: f.finFriendScore,
          alpha: f.alpha,
          sharpeRatio: f.sharpeRatio
        }))
      }
    });
  } catch (error: any) {
    console.error('[Fund Rankings] Calculation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to calculate fund rankings'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger fund rankings calculation',
    endpoints: {
      calculate: 'POST /api/fund-rankings/calculate',
      getRankings: 'GET /api/fund-rankings',
      getByCategory: 'GET /api/fund-rankings?category=Equity&type=Large Cap&limit=10'
    }
  });
}
