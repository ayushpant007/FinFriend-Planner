import { NextResponse } from 'next/server';
import { saveFundRankings } from '@/lib/fund-rankings-store';
import { FundMetrics } from '@/lib/fund-scoring-engine';
import fs from 'fs';
import path from 'path';

interface MutualFundScheme {
  category: string;
  type: string;
  fundName: string;
  schemeName: string;
  schemeCode: string;
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

function loadFundsFromCSV(): MutualFundScheme[] {
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

function generateMockMetrics(fund: MutualFundScheme): FundMetrics {
  const baseScore = Math.random();
  
  const alpha = (baseScore - 0.3) * 0.15 + (Math.random() - 0.5) * 0.05;
  const beta = 0.7 + Math.random() * 0.6;
  const sharpeRatio = (baseScore * 2) + (Math.random() - 0.5) * 0.5;
  const sortinoRatio = sharpeRatio * (1 + Math.random() * 0.3);
  const maxDrawdown = 0.05 + (1 - baseScore) * 0.25 + Math.random() * 0.1;
  
  const score = Math.round((
    0.30 * Math.min(1, Math.max(0, (alpha + 0.1) / 0.2)) +
    0.30 * Math.min(1, Math.max(0, sharpeRatio / 2.5)) +
    0.20 * Math.min(1, Math.max(0, sortinoRatio / 3)) +
    0.20 * Math.min(1, Math.max(0, 1 - maxDrawdown / 0.4))
  ) * 100) / 10;
  
  return {
    schemeCode: fund.schemeCode,
    schemeName: fund.schemeName,
    fundName: fund.fundName,
    category: fund.category,
    type: fund.type,
    alpha: Math.round(alpha * 10000) / 10000,
    beta: Math.round(beta * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sortinoRatio: Math.round(sortinoRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 10000,
    finFriendScore: score,
    isTopTenPercent: false,
    lastUpdated: new Date().toISOString()
  };
}

export async function POST() {
  try {
    console.log('[Seed Rankings] Starting seed data generation...');
    
    const funds = loadFundsFromCSV();
    console.log(`[Seed Rankings] Loaded ${funds.length} funds`);
    
    const metrics = funds.map(generateMockMetrics);
    
    metrics.sort((a, b) => b.finFriendScore - a.finFriendScore);
    
    const topTenPercentCount = Math.ceil(metrics.length * 0.1);
    for (let i = 0; i < topTenPercentCount; i++) {
      metrics[i].isTopTenPercent = true;
    }
    
    const saved = await saveFundRankings(metrics);
    
    if (!saved) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save seed data'
      }, { status: 500 });
    }
    
    console.log(`[Seed Rankings] Saved ${metrics.length} fund rankings`);
    
    return NextResponse.json({
      success: true,
      message: `Seeded ${metrics.length} funds with mock rankings`,
      data: {
        totalFunds: metrics.length,
        topTenPercentCount,
        sampleTopFunds: metrics.slice(0, 5).map(f => ({
          schemeName: f.schemeName,
          category: f.category,
          type: f.type,
          score: f.finFriendScore,
          isTopTenPercent: f.isTopTenPercent
        }))
      }
    });
  } catch (error: any) {
    console.error('[Seed Rankings] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to seed rankings'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to seed fund rankings with mock data for testing'
  });
}
