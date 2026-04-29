import { NextResponse } from 'next/server';
import { parse } from 'date-fns';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';
import { getDebtBenchmarkFileForFund } from '@/lib/debt-benchmark-mapping';

interface FundInput {
  schemeCode: number;
  schemeName: string;
  weight: number;
}

interface TimeSeriesPoint {
  date: string;
  modelPortfolio: number;
  benchmark: number;
}

interface RawDataPoint {
  date: Date;
  value: number;
}

function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[",]/g, '').trim();
  return parseFloat(cleaned) || 0;
}

function parseBenchmarkDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    const trimmed = dateStr.trim();
    
    // Try format "MMM dd, yyyy" (e.g., "Dec 11, 2025") - used by debt benchmark files
    let date = parse(trimmed, 'MMM dd, yyyy', new Date());
    if (!isNaN(date.getTime())) return date;
    
    // Try format "dd MMM yyyy" (e.g., "08 Dec 2025")
    date = parse(trimmed, 'dd MMM yyyy', new Date());
    if (!isNaN(date.getTime())) return date;
    
    // Try format "dd-MM-yyyy" (e.g., "08-12-2025")
    date = parse(trimmed, 'dd-MM-yyyy', new Date());
    if (!isNaN(date.getTime())) return date;
    
    return null;
  } catch {
    return null;
  }
}

async function loadDebtBenchmarkData(benchmarkFile: string): Promise<RawDataPoint[]> {
  const filePath = path.join(process.cwd(), 'public', 'Fund Benchmark (DEBT)', benchmarkFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Debt benchmark file not found: ${filePath}`);
    return [];
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(fileContent, { header: true });
  
  const data: RawDataPoint[] = [];
  for (const row of parsed.data as any[]) {
    if (!row.Date || !row.Price) continue;
    const date = parseBenchmarkDate(row.Date);
    const value = parsePrice(row.Price);
    if (date && value > 0) {
      data.push({ date, value });
    }
  }
  
  data.sort((a, b) => a.date.getTime() - b.date.getTime());
  return data;
}

async function fetchFundNavHistory(schemeCode: number): Promise<RawDataPoint[]> {
  const today = new Date();
  const tenYearsAgo = new Date(today);
  tenYearsAgo.setFullYear(today.getFullYear() - 10);
  
  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };
  
  const startDate = formatDate(tenYearsAgo);
  const endDate = formatDate(today);
  
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}?from=${startDate}&to=${endDate}`);
    if (!response.ok) {
      console.error(`Failed to fetch NAV for scheme ${schemeCode}`);
      return [];
    }
    
    const result = await response.json();
    const navData: { date: string; nav: string }[] = result.data || [];
    
    const parsed: RawDataPoint[] = [];
    for (const point of navData) {
      const date = parse(point.date, 'dd-MM-yyyy', new Date());
      const value = parseFloat(point.nav);
      if (!isNaN(date.getTime()) && value > 0) {
        parsed.push({ date, value });
      }
    }
    
    parsed.sort((a, b) => a.date.getTime() - b.date.getTime());
    return parsed;
  } catch (error) {
    console.error(`Error fetching NAV for scheme ${schemeCode}:`, error);
    return [];
  }
}

function findClosestValue(data: RawDataPoint[], targetDate: Date): number | null {
  if (data.length === 0) return null;
  
  let closest = data[0];
  let minDiff = Math.abs(data[0].date.getTime() - targetDate.getTime());
  
  for (const point of data) {
    const diff = Math.abs(point.date.getTime() - targetDate.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }
  
  const daysDiff = minDiff / (1000 * 60 * 60 * 24);
  if (daysDiff > 45) return null;
  
  return closest.value;
}

function generateMonthlyDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setDate(1);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  
  return dates;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const funds: FundInput[] = body.funds || [];
    
    console.log('[DebtPortfolio] Received funds:', JSON.stringify(funds, null, 2));
    
    if (funds.length === 0) {
      console.log('[DebtPortfolio] No funds provided');
      return NextResponse.json({ chartData: [] });
    }
    
    const fundNavPromises = funds.map(fund => fetchFundNavHistory(fund.schemeCode));
    const allFundNavs = await Promise.all(fundNavPromises);
    
    console.log('[DebtPortfolio] NAV data counts:', allFundNavs.map((nav, i) => `${funds[i].schemeName}: ${nav.length} points`));
    
    const benchmarkCache: { [file: string]: RawDataPoint[] } = {};
    
    const validFundsRaw: {
      fund: FundInput;
      navData: RawDataPoint[];
      benchmarkData: RawDataPoint[];
    }[] = [];
    
    for (let i = 0; i < funds.length; i++) {
      const fund = funds[i];
      const navData = allFundNavs[i];
      
      if (navData.length < 12) {
        console.warn(`[DebtPortfolio] Fund ${fund.schemeName} has insufficient NAV history: ${navData.length} points`);
        continue;
      }
      
      const benchmarkFile = getDebtBenchmarkFileForFund(fund.schemeName);
      console.log(`[DebtPortfolio] Fund "${fund.schemeName}" -> Benchmark: ${benchmarkFile}`);
      
      if (!benchmarkCache[benchmarkFile]) {
        benchmarkCache[benchmarkFile] = await loadDebtBenchmarkData(benchmarkFile);
        console.log(`[DebtPortfolio] Loaded benchmark ${benchmarkFile}: ${benchmarkCache[benchmarkFile].length} points`);
      }
      
      const benchmarkData = benchmarkCache[benchmarkFile];
      if (benchmarkData.length === 0) {
        console.warn(`[DebtPortfolio] No benchmark data for ${fund.schemeName}`);
        continue;
      }
      
      validFundsRaw.push({ fund, navData, benchmarkData });
    }
    
    console.log(`[DebtPortfolio] Valid funds after NAV/benchmark check: ${validFundsRaw.length}`);
    
    if (validFundsRaw.length === 0) {
      console.log('[DebtPortfolio] No valid funds - returning empty chartData');
      return NextResponse.json({ chartData: [] });
    }
    
    const allNavStartDates = validFundsRaw.map(vf => vf.navData[0]?.date).filter(Boolean) as Date[];
    const allNavEndDates = validFundsRaw.map(vf => vf.navData[vf.navData.length - 1]?.date).filter(Boolean) as Date[];
    const allBenchmarkStartDates = validFundsRaw.map(vf => vf.benchmarkData[0]?.date).filter(Boolean) as Date[];
    const allBenchmarkEndDates = validFundsRaw.map(vf => vf.benchmarkData[vf.benchmarkData.length - 1]?.date).filter(Boolean) as Date[];
    
    console.log('[DebtPortfolio] NAV start dates:', allNavStartDates.map(d => d.toISOString().split('T')[0]));
    console.log('[DebtPortfolio] NAV end dates:', allNavEndDates.map(d => d.toISOString().split('T')[0]));
    console.log('[DebtPortfolio] Benchmark start dates:', allBenchmarkStartDates.map(d => d.toISOString().split('T')[0]));
    console.log('[DebtPortfolio] Benchmark end dates:', allBenchmarkEndDates.map(d => d.toISOString().split('T')[0]));
    
    const commonStartDate = new Date(Math.max(
      ...allNavStartDates.map(d => d.getTime()),
      ...allBenchmarkStartDates.map(d => d.getTime())
    ));
    const commonEndDate = new Date(Math.min(
      ...allNavEndDates.map(d => d.getTime()),
      ...allBenchmarkEndDates.map(d => d.getTime())
    ));
    
    console.log(`[DebtPortfolio] Common date range: ${commonStartDate.toISOString().split('T')[0]} to ${commonEndDate.toISOString().split('T')[0]}`);
    
    if (commonStartDate >= commonEndDate) {
      console.log('[DebtPortfolio] Invalid date range - returning empty chartData');
      return NextResponse.json({ chartData: [] });
    }
    
    const validFunds: {
      fund: FundInput;
      navData: RawDataPoint[];
      benchmarkData: RawDataPoint[];
      navBaseValue: number;
      benchmarkBaseValue: number;
    }[] = [];
    
    for (const vf of validFundsRaw) {
      const navBaseValue = findClosestValue(vf.navData, commonStartDate);
      const benchmarkBaseValue = findClosestValue(vf.benchmarkData, commonStartDate);
      
      if (navBaseValue && benchmarkBaseValue && navBaseValue > 0 && benchmarkBaseValue > 0) {
        validFunds.push({
          ...vf,
          navBaseValue,
          benchmarkBaseValue
        });
      }
    }
    
    if (validFunds.length === 0) {
      console.log('[DebtPortfolio] No valid funds after base value check - returning empty chartData');
      return NextResponse.json({ chartData: [] });
    }
    
    console.log(`[DebtPortfolio] Valid funds for chart: ${validFunds.length}`);
    
    const monthlyDates = generateMonthlyDates(commonStartDate, commonEndDate);
    const totalWeight = validFunds.reduce((sum, vf) => sum + vf.fund.weight, 0);
    
    const chartData: TimeSeriesPoint[] = [];
    
    for (const targetDate of monthlyDates) {
      let weightedPortfolioValue = 0;
      let weightedBenchmarkValue = 0;
      let validWeightSum = 0;
      
      for (const vf of validFunds) {
        const navValue = findClosestValue(vf.navData, targetDate);
        const benchmarkValue = findClosestValue(vf.benchmarkData, targetDate);
        
        if (navValue !== null && benchmarkValue !== null) {
          const rebasedNav = (navValue / vf.navBaseValue) * 100;
          const rebasedBenchmark = (benchmarkValue / vf.benchmarkBaseValue) * 100;
          
          const normalizedWeight = (vf.fund.weight / totalWeight) * 100;
          weightedPortfolioValue += (rebasedNav * normalizedWeight) / 100;
          weightedBenchmarkValue += (rebasedBenchmark * normalizedWeight) / 100;
          validWeightSum += normalizedWeight;
        }
      }
      
      if (validWeightSum > 50) {
        const monthStr = targetDate.toLocaleDateString('en-IN', { 
          month: 'short', 
          year: '2-digit' 
        });
        
        chartData.push({
          date: monthStr,
          modelPortfolio: parseFloat(weightedPortfolioValue.toFixed(2)),
          benchmark: parseFloat(weightedBenchmarkValue.toFixed(2))
        });
      }
    }
    
    if (chartData.length > 0) {
      const firstPoint = chartData[0];
      if (Math.abs(firstPoint.modelPortfolio - 100) > 1 || Math.abs(firstPoint.benchmark - 100) > 1) {
        console.warn(`Rebasing verification: First point should be ~100. Got portfolio=${firstPoint.modelPortfolio}, benchmark=${firstPoint.benchmark}`);
      }
    }
    
    return NextResponse.json({ chartData });
    
  } catch (error) {
    console.error('[DebtPortfolio] Error:', error);
    return NextResponse.json({ error: 'Failed to generate debt portfolio chart' }, { status: 500 });
  }
}
