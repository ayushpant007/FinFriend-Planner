import { NextResponse } from 'next/server';
import { parse, format } from 'date-fns';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';
import { getBenchmarkFileForFund } from '@/lib/benchmark-mapping';
import { getDebtBenchmarkFileForFund, getDebtBenchmarkName } from '@/lib/debt-benchmark-mapping';
import { getHybridBenchmarkFileForFund, getHybridBenchmarkName } from '@/lib/hybrid-benchmark-mapping';
import { getSolutionOrientedBenchmarkForFund, getSolutionOrientedBenchmarkName } from '@/lib/solution-oriented-benchmark-mapping';
import { getOtherBenchmarkFileForFund, getOtherBenchmarkDisplayName } from '@/lib/other-benchmark-mapping';
import { computeRiskMetrics } from '@/lib/risk-metrics';

interface RawDataPoint {
  date: Date;
  value: number;
}

interface YearlyComparison {
  year: string;
  fundReturn: number;
  benchmarkReturn: number;
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

async function loadBenchmarkData(benchmarkFile: string, fundType: string): Promise<RawDataPoint[]> {
  let folder: string;
  if (fundType === 'debt') {
    folder = 'Fund Benchmark (DEBT)';
  } else if (fundType === 'hybrid') {
    folder = 'Fund Benchmark (hybrid)';
  } else if (fundType === 'solution-oriented') {
    folder = 'fund benchmark (solution oriented)';
  } else if (fundType === 'other') {
    folder = 'fund benchmark (other)';
  } else {
    folder = 'Fund Benchmark past 10 years';
  }
  const filePath = path.join(process.cwd(), 'public', folder, benchmarkFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Benchmark file not found: ${filePath}`);
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

function getYearlyReturns(data: RawDataPoint[]): Map<number, { startValue: number; endValue: number }> {
  const yearlyData = new Map<number, { startValue: number; endValue: number }>();
  
  for (const point of data) {
    const year = point.date.getFullYear();
    
    if (!yearlyData.has(year)) {
      yearlyData.set(year, { startValue: point.value, endValue: point.value });
    } else {
      const existing = yearlyData.get(year)!;
      existing.endValue = point.value;
    }
  }
  
  return yearlyData;
}

function calculateYearReturn(startValue: number, endValue: number): number {
  if (startValue <= 0) return 0;
  return ((endValue - startValue) / startValue) * 100;
}

function isDebtCategory(category: string): boolean {
  if (!category) return false;
  const lowerCat = category.toLowerCase();
  return lowerCat.includes('debt') || 
         lowerCat === 'debt scheme' || 
         lowerCat.startsWith('debt');
}

function isHybridCategory(category: string): boolean {
  if (!category) return false;
  const lowerCat = category.toLowerCase();
  return lowerCat.includes('hybrid') || 
         lowerCat === 'hybrid scheme' || 
         lowerCat.startsWith('hybrid');
}

function isSolutionOrientedCategory(category: string): boolean {
  if (!category) return false;
  const lowerCat = category.toLowerCase();
  return lowerCat.includes('solution') || 
         lowerCat.includes('solution oriented') || 
         lowerCat.includes('solution-oriented') ||
         lowerCat === 'solution oriented scheme';
}

function getFundType(category: string): 'equity' | 'debt' | 'hybrid' | 'solution-oriented' {
  if (isDebtCategory(category)) return 'debt';
  if (isHybridCategory(category)) return 'hybrid';
  if (isSolutionOrientedCategory(category)) return 'solution-oriented';
  return 'equity';
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
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schemeCode, schemeName, fundCategory } = body;
    
    if (!schemeCode || !schemeName) {
      return NextResponse.json({ error: 'Missing schemeCode or schemeName' }, { status: 400 });
    }
    
    const fundType = getFundType(fundCategory);
    console.log(`[BenchmarkComparison] Fetching data for ${schemeName} (${schemeCode}), Category: ${fundCategory}, FundType: ${fundType}`);
    
    let benchmarkFile: string = '';
    let benchmarkName: string = '';
    let fundTypeFromFolder: string = fundType;

    // Check if we can find the benchmark directly from the CSV
    try {
      const csvPath = path.join(process.cwd(), 'public', 'fund-schemes-master.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n');
      const headers = parseCSVLine(lines[0].trim());
      const codeIdx = headers.indexOf('Scheme Code');
      const benchmarkIdx = headers.indexOf('Primary Benchmark (Most Common)');
      
      if (codeIdx !== -1 && benchmarkIdx !== -1) {
        const matchingLine = lines.find(l => {
          const parts = parseCSVLine(l.trim());
          return parts[codeIdx]?.trim() === schemeCode.toString();
        });
        
        if (matchingLine) {
          const parts = parseCSVLine(matchingLine.trim());
          const directBenchmark = parts[benchmarkIdx]?.trim();
          
          if (directBenchmark && directBenchmark !== '') {
            benchmarkName = directBenchmark;
            
            // Search for the file across all benchmark folders
            const benchmarkFolders = [
              'Fund Benchmark past 10 years',
              'Fund Benchmark (DEBT)',
              'Fund Benchmark (hybrid)',
              'fund benchmark (solution oriented)',
              'fund benchmark (other)'
            ];
            
            // Try standard naming patterns
            const patterns = [
              `Nifty Benchmark - ${directBenchmark}.csv`,
              `Benchmark Debt - ${directBenchmark}.csv`,
              `benchmark (hybrid) - ${directBenchmark}.csv`,
              `Benchmark (solution oriented) - ${directBenchmark}.csv`,
              `Benchmark (other ) - ${directBenchmark}.csv`,
              `${directBenchmark}.csv`
            ];
            
            let found = false;
            for (const folder of benchmarkFolders) {
              for (const pattern of patterns) {
                const testPath = path.join(process.cwd(), 'public', folder, pattern);
                if (fs.existsSync(testPath)) {
                  benchmarkFile = pattern;
                  // Update fundType to match the folder for loadBenchmarkData
                  if (folder === 'Fund Benchmark (DEBT)') fundTypeFromFolder = 'debt';
                  else if (folder === 'Fund Benchmark (hybrid)') fundTypeFromFolder = 'hybrid';
                  else if (folder === 'fund benchmark (solution oriented)') fundTypeFromFolder = 'solution-oriented';
                  else if (folder === 'fund benchmark (other)') fundTypeFromFolder = 'other';
                  else fundTypeFromFolder = 'equity';
                  
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
          }
        }
      }
    } catch (e) {
      console.log('[BenchmarkComparison] Direct CSV lookup failed, falling back to legacy mapping', e);
    }

    const lowerName = schemeName.toLowerCase();
    const isOtherFund = fundCategory.toLowerCase().includes('other') || 
                       lowerName.includes('global') || 
                       lowerName.includes('china') || 
                       lowerName.includes('world') ||
                       lowerName.includes('overseas') ||
                       lowerName.includes('international') ||
                       lowerName.includes('business cycle') ||
                       lowerName.includes('commodities');

    if (!benchmarkFile) {
      fundTypeFromFolder = fundType;
      if (isOtherFund) {
        fundTypeFromFolder = 'other';
        benchmarkFile = getOtherBenchmarkFileForFund(schemeName);
        benchmarkName = getOtherBenchmarkDisplayName(benchmarkFile);
      } else if (fundType === 'debt') {
        benchmarkFile = getDebtBenchmarkFileForFund(schemeName);
        benchmarkName = getDebtBenchmarkName(benchmarkFile);
      } else if (fundType === 'hybrid') {
        benchmarkFile = getHybridBenchmarkFileForFund(schemeName);
        benchmarkName = getHybridBenchmarkName(benchmarkFile);
      } else if (fundType === 'solution-oriented') {
        const benchmark = getSolutionOrientedBenchmarkForFund(schemeName);
        benchmarkFile = benchmark.file;
        benchmarkName = benchmark.name;
      } else {
        benchmarkFile = getBenchmarkFileForFund(schemeName);
        benchmarkName = benchmarkFile.replace('Nifty Benchmark - ', '').replace('.csv', '');
      }
    }
    
    console.log(`[BenchmarkComparison] Using benchmark: ${benchmarkFile} (${benchmarkName})`);
    
    const benchmarkData = await loadBenchmarkData(benchmarkFile, fundTypeFromFolder);
    if (benchmarkData.length === 0) {
      return NextResponse.json({ 
        yearlyComparison: [],
        message: 'Benchmark data not available' 
      });
    }

    const fundNavData = await fetchFundNavHistory(schemeCode);
    if (fundNavData.length < 12) {
      return NextResponse.json({ 
        yearlyComparison: [],
        message: 'Insufficient fund NAV history' 
      });
    }
    
    const fundYearlyData = getYearlyReturns(fundNavData);
    const benchmarkYearlyData = getYearlyReturns(benchmarkData);
    
    const currentYear = new Date().getFullYear();
    const yearlyComparison: YearlyComparison[] = [];
    
    for (let year = currentYear - 9; year <= currentYear; year++) {
      const fundData = fundYearlyData.get(year);
      const benchmarkDataYear = benchmarkYearlyData.get(year);
      
      if (fundData && benchmarkDataYear) {
        const fundReturn = calculateYearReturn(fundData.startValue, fundData.endValue);
        const benchmarkReturn = calculateYearReturn(benchmarkDataYear.startValue, benchmarkDataYear.endValue);
        
        yearlyComparison.push({
          year: year.toString(),
          fundReturn: parseFloat(fundReturn.toFixed(2)),
          benchmarkReturn: parseFloat(benchmarkReturn.toFixed(2))
        });
      }
    }
    
    console.log(`[BenchmarkComparison] Generated ${yearlyComparison.length} yearly comparisons`);

    const riskMetrics = computeRiskMetrics(fundNavData, benchmarkData);

    return NextResponse.json({
      yearlyComparison,
      benchmarkName,
      riskMetrics,
    });
    
  } catch (error) {
    console.error('[BenchmarkComparison] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch comparison data' }, { status: 500 });
  }
}
