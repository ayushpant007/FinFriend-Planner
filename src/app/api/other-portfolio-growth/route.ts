import { NextResponse } from 'next/server';
import { parse } from 'date-fns';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getOtherBenchmarkFileForFund } from '@/lib/other-benchmark-mapping';

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
  const cleaned = priceStr.replace(/[₹,Rs.]/g, '').replace(/[",]/g, '').trim();
  return parseFloat(cleaned) || 0;
}

function parseBenchmarkDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    const trimmed = dateStr.trim();
    
    let date = parse(trimmed, 'dd-MM-yyyy', new Date());
    if (!isNaN(date.getTime())) return date;
    
    date = parse(trimmed, 'dd MMM yyyy', new Date());
    if (!isNaN(date.getTime())) return date;
    
    date = parse(trimmed, 'MMM dd, yyyy', new Date());
    if (!isNaN(date.getTime())) return date;
    
    return null;
  } catch {
    return null;
  }
}

function parseYearlyDate(yearStr: string): Date | null {
  if (!yearStr) return null;
  try {
    const trimmed = yearStr.trim();
    const yearMatch = trimmed.match(/^(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      return new Date(year, 11, 31);
    }
    return null;
  } catch {
    return null;
  }
}

async function loadOtherBenchmarkData(benchmarkFile: string): Promise<RawDataPoint[]> {
  const filePath = path.join(process.cwd(), 'public', 'fund benchmark (other)', benchmarkFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Other benchmark file not found: ${filePath}`);
    return [];
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(fileContent, { header: true });
  
  const data: RawDataPoint[] = [];
  
  const isYearlyFormat = benchmarkFile.includes('Gold') || benchmarkFile.includes('Silver');
  
  for (const row of parsed.data as any[]) {
    if (isYearlyFormat) {
      const yearKey = Object.keys(row).find(k => k.toLowerCase().includes('year'));
      const priceKey = Object.keys(row).find(k => k.toLowerCase().includes('price') || k.toLowerCase().includes('rate'));
      
      if (!yearKey || !priceKey || !row[yearKey] || !row[priceKey]) continue;
      
      const date = parseYearlyDate(row[yearKey]);
      const value = parsePrice(row[priceKey]);
      
      if (date && value > 0) {
        data.push({ date, value });
      }
    } else {
      if (!row.Date || !row.Price) continue;
      
      const date = parseBenchmarkDate(row.Date);
      const value = parsePrice(row.Price);
      
      if (date && value > 0) {
        data.push({ date, value });
      }
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

function findClosestValue(data: RawDataPoint[], targetDate: Date, maxDaysDiff: number = 45): number | null {
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
  if (daysDiff > maxDaysDiff) return null;
  
  return closest.value;
}

function findClosestValueYearly(data: RawDataPoint[], targetDate: Date): number | null {
  if (data.length === 0) return null;
  
  const targetYear = targetDate.getFullYear();
  
  for (const point of data) {
    if (point.date.getFullYear() === targetYear) {
      return point.value;
    }
  }
  
  let closest = data[0];
  let minDiff = Math.abs(data[0].date.getFullYear() - targetYear);
  
  for (const point of data) {
    const diff = Math.abs(point.date.getFullYear() - targetYear);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }
  
  if (minDiff <= 1) {
    return closest.value;
  }
  
  return null;
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
    
    console.log('[OtherPortfolio] Received funds:', JSON.stringify(funds, null, 2));
    
    if (funds.length === 0) {
      console.log('[OtherPortfolio] No funds provided');
      return NextResponse.json({ chartData: [] });
    }
    
    const fundNavPromises = funds.map(fund => fetchFundNavHistory(fund.schemeCode));
    const allFundNavs = await Promise.all(fundNavPromises);
    
    console.log('[OtherPortfolio] NAV data counts:', allFundNavs.map((nav, i) => `${funds[i].schemeName}: ${nav.length} points`));
    
    const benchmarkCache: { [file: string]: RawDataPoint[] } = {};
    
    const validFundsRaw: {
      fund: FundInput;
      navData: RawDataPoint[];
      benchmarkData: RawDataPoint[];
      benchmarkFile: string;
    }[] = [];
    
    for (let i = 0; i < funds.length; i++) {
      const fund = funds[i];
      const navData = allFundNavs[i];
      
      if (navData.length < 12) {
        console.warn(`[OtherPortfolio] Fund ${fund.schemeName} has insufficient NAV history: ${navData.length} points`);
        continue;
      }
      
      const benchmarkFile = getOtherBenchmarkFileForFund(fund.schemeName);
      console.log(`[OtherPortfolio] Fund "${fund.schemeName}" -> Benchmark: ${benchmarkFile}`);
      
      if (!benchmarkCache[benchmarkFile]) {
        benchmarkCache[benchmarkFile] = await loadOtherBenchmarkData(benchmarkFile);
        console.log(`[OtherPortfolio] Loaded benchmark ${benchmarkFile}: ${benchmarkCache[benchmarkFile].length} points`);
      }
      
      const benchmarkData = benchmarkCache[benchmarkFile];
      if (benchmarkData.length === 0) {
        console.warn(`[OtherPortfolio] No benchmark data for ${fund.schemeName}`);
        continue;
      }
      
      validFundsRaw.push({ fund, navData, benchmarkData, benchmarkFile });
    }
    
    console.log(`[OtherPortfolio] Valid funds after NAV/benchmark check: ${validFundsRaw.length}`);
    
    if (validFundsRaw.length === 0) {
      console.log('[OtherPortfolio] No valid funds - returning empty chartData');
      return NextResponse.json({ chartData: [] });
    }
    
    const allNavStartDates = validFundsRaw.map(vf => vf.navData[0]?.date).filter(Boolean) as Date[];
    const allNavEndDates = validFundsRaw.map(vf => vf.navData[vf.navData.length - 1]?.date).filter(Boolean) as Date[];
    const allBenchmarkStartDates = validFundsRaw.map(vf => vf.benchmarkData[0]?.date).filter(Boolean) as Date[];
    const allBenchmarkEndDates = validFundsRaw.map(vf => vf.benchmarkData[vf.benchmarkData.length - 1]?.date).filter(Boolean) as Date[];
    
    console.log('[OtherPortfolio] NAV start dates:', allNavStartDates.map(d => d.toISOString().split('T')[0]));
    console.log('[OtherPortfolio] NAV end dates:', allNavEndDates.map(d => d.toISOString().split('T')[0]));
    console.log('[OtherPortfolio] Benchmark start dates:', allBenchmarkStartDates.map(d => d.toISOString().split('T')[0]));
    console.log('[OtherPortfolio] Benchmark end dates:', allBenchmarkEndDates.map(d => d.toISOString().split('T')[0]));
    
    const commonStartDate = new Date(Math.max(
      ...allNavStartDates.map(d => d.getTime()),
      ...allBenchmarkStartDates.map(d => d.getTime())
    ));
    const commonEndDate = new Date(Math.min(
      ...allNavEndDates.map(d => d.getTime()),
      ...allBenchmarkEndDates.map(d => d.getTime())
    ));
    
    console.log(`[OtherPortfolio] Common date range: ${commonStartDate.toISOString().split('T')[0]} to ${commonEndDate.toISOString().split('T')[0]}`);
    
    if (commonStartDate >= commonEndDate) {
      console.log('[OtherPortfolio] Invalid date range - returning empty chartData');
      return NextResponse.json({ chartData: [] });
    }
    
    const validFunds: {
      fund: FundInput;
      navData: RawDataPoint[];
      benchmarkData: RawDataPoint[];
      benchmarkFile: string;
      navBaseValue: number;
      benchmarkBaseValue: number;
    }[] = [];
    
    for (const vf of validFundsRaw) {
      const navBaseValue = findClosestValue(vf.navData, commonStartDate);
      
      const isYearlyBenchmark = vf.benchmarkFile.includes('Gold') || vf.benchmarkFile.includes('Silver');
      const benchmarkBaseValue = isYearlyBenchmark 
        ? findClosestValueYearly(vf.benchmarkData, commonStartDate)
        : findClosestValue(vf.benchmarkData, commonStartDate);
      
      if (navBaseValue && benchmarkBaseValue && navBaseValue > 0 && benchmarkBaseValue > 0) {
        validFunds.push({
          ...vf,
          navBaseValue,
          benchmarkBaseValue
        });
      }
    }
    
    if (validFunds.length === 0) {
      console.log('[OtherPortfolio] No valid funds after base value check - returning empty chartData');
      return NextResponse.json({ chartData: [] });
    }
    
    console.log(`[OtherPortfolio] Valid funds for chart: ${validFunds.length}`);
    
    const monthlyDates = generateMonthlyDates(commonStartDate, commonEndDate);
    const totalWeight = validFunds.reduce((sum, vf) => sum + vf.fund.weight, 0);
    
    const chartData: TimeSeriesPoint[] = [];
    
    for (const targetDate of monthlyDates) {
      let weightedPortfolioValue = 0;
      let weightedBenchmarkValue = 0;
      let validWeightSum = 0;
      
      for (const vf of validFunds) {
        const navValue = findClosestValue(vf.navData, targetDate);
        
        const isYearlyBenchmark = vf.benchmarkFile.includes('Gold') || vf.benchmarkFile.includes('Silver');
        const benchmarkValue = isYearlyBenchmark
          ? findClosestValueYearly(vf.benchmarkData, targetDate)
          : findClosestValue(vf.benchmarkData, targetDate);
        
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
        
        const pointData: any = {
          date: monthStr,
          modelPortfolio: parseFloat(weightedPortfolioValue.toFixed(2)),
          benchmark: parseFloat(weightedBenchmarkValue.toFixed(2))
        };

        for (const vf of validFunds) {
          const navValue = findClosestValue(vf.navData, targetDate);
          const isYearlyBenchmark = vf.benchmarkFile.includes('Gold') || vf.benchmarkFile.includes('Silver');
          const benchmarkValue = isYearlyBenchmark
            ? findClosestValueYearly(vf.benchmarkData, targetDate)
            : findClosestValue(vf.benchmarkData, targetDate);
            
          if (navValue !== null) {
            const rebasedNav = (navValue / vf.navBaseValue) * 100;
            pointData[vf.fund.schemeName] = parseFloat(rebasedNav.toFixed(2));
          }
          if (benchmarkValue !== null) {
            const rebasedBenchmark = (benchmarkValue / vf.benchmarkBaseValue) * 100;
            pointData[`${vf.fund.schemeName} Benchmark`] = parseFloat(rebasedBenchmark.toFixed(2));
          }
        }
        
        chartData.push(pointData);
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
    console.error('[OtherPortfolio] Error:', error);
    return NextResponse.json({ error: 'Failed to generate other portfolio chart' }, { status: 500 });
  }
}
