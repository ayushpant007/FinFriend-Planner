import { getBenchmarkFileForFund } from './benchmark-mapping';
import { getDebtBenchmarkFileForFund } from './debt-benchmark-mapping';
import { getHybridBenchmarkFileForFund } from './hybrid-benchmark-mapping';
import { getSolutionOrientedBenchmarkForFund } from './solution-oriented-benchmark-mapping';
import { getOtherBenchmarkFileForFund } from './other-benchmark-mapping';

export interface FundMetrics {
  schemeCode: string;
  schemeName: string;
  fundName: string;
  category: string;
  type: string;
  alpha: number;
  beta: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  finFriendScore: number;
  isTopTenPercent: boolean;
  lastUpdated: string;
}

export interface NAVData {
  date: string;
  nav: number;
}

export interface BenchmarkData {
  date: string;
  price: number;
}

const RISK_FREE_RATE = 0.065;
const TRADING_DAYS_PER_YEAR = 252;

export function parseDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    let year = parseInt(parts[2]);
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

export function calculateDailyReturns(data: { date: string; value: number }[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1].value > 0) {
      returns.push((data[i].value - data[i - 1].value) / data[i - 1].value);
    }
  }
  return returns;
}

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length === 0) return 0;
  const avg = mean ?? calculateMean(values);
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = calculateMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

export function calculateDownsideDeviation(returns: number[], threshold: number = 0): number {
  const downsideReturns = returns.filter(r => r < threshold).map(r => Math.pow(r - threshold, 2));
  if (downsideReturns.length === 0) return 0;
  return Math.sqrt(calculateMean(downsideReturns));
}

export function calculateBeta(fundReturns: number[], benchmarkReturns: number[]): number {
  if (fundReturns.length !== benchmarkReturns.length || fundReturns.length < 2) {
    return 1;
  }
  
  const fundMean = calculateMean(fundReturns);
  const benchMean = calculateMean(benchmarkReturns);
  
  let covariance = 0;
  let benchVariance = 0;
  
  for (let i = 0; i < fundReturns.length; i++) {
    const fundDiff = fundReturns[i] - fundMean;
    const benchDiff = benchmarkReturns[i] - benchMean;
    covariance += fundDiff * benchDiff;
    benchVariance += benchDiff * benchDiff;
  }
  
  if (benchVariance === 0) return 1;
  return covariance / benchVariance;
}

export function calculateAlpha(
  fundAnnualReturn: number,
  benchmarkAnnualReturn: number,
  beta: number,
  riskFreeRate: number = RISK_FREE_RATE
): number {
  return fundAnnualReturn - (riskFreeRate + beta * (benchmarkAnnualReturn - riskFreeRate));
}

export function calculateSharpeRatio(
  annualReturn: number,
  annualStdDev: number,
  riskFreeRate: number = RISK_FREE_RATE
): number {
  if (annualStdDev === 0) return 0;
  return (annualReturn - riskFreeRate) / annualStdDev;
}

export function calculateSortinoRatio(
  annualReturn: number,
  annualDownsideDeviation: number,
  riskFreeRate: number = RISK_FREE_RATE
): number {
  if (annualDownsideDeviation === 0) return 0;
  return (annualReturn - riskFreeRate) / annualDownsideDeviation;
}

export function calculateMaxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  let maxDrawdown = 0;
  let peak = prices[0];
  
  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }
    const drawdown = (peak - price) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

export function calculateFinFriendScore(
  alphaPercentile: number,
  sharpePercentile: number,
  sortinoPercentile: number,
  maxDrawdownPercentile: number
): number {
  const score = 
    0.30 * alphaPercentile +
    0.30 * sharpePercentile +
    0.20 * sortinoPercentile +
    0.20 * (1 - maxDrawdownPercentile);
  
  return Math.round(score * 100) / 10;
}

export function getBenchmarkFileForScheme(
  category: string,
  type: string,
  schemeName: string
): { file: string; folder: string } {
  const lowerCategory = category.toLowerCase();
  
  if (lowerCategory.includes('equity')) {
    return {
      file: getBenchmarkFileForFund(schemeName),
      folder: 'Fund Benchmark past 10 years'
    };
  }
  
  if (lowerCategory.includes('debt')) {
    return {
      file: getDebtBenchmarkFileForFund(schemeName),
      folder: 'Fund Benchmark (DEBT)'
    };
  }
  
  if (lowerCategory.includes('hybrid')) {
    return {
      file: getHybridBenchmarkFileForFund(schemeName),
      folder: 'Fund Benchmark (hybrid)'
    };
  }
  
  if (lowerCategory.includes('solution')) {
    const benchmark = getSolutionOrientedBenchmarkForFund(schemeName);
    return {
      file: benchmark.file,
      folder: 'fund benchmark (solution oriented)'
    };
  }
  
  if (lowerCategory.includes('other')) {
    return {
      file: getOtherBenchmarkFileForFund(schemeName),
      folder: 'fund benchmark (other)'
    };
  }
  
  return {
    file: 'Nifty Benchmark - Nifty 50 TRI.csv',
    folder: 'Fund Benchmark past 10 years'
  };
}

export function parseBenchmarkCSV(csvText: string): BenchmarkData[] {
  const lines = csvText.trim().split('\n');
  const data: BenchmarkData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length < 2) continue;
    
    const dateStr = parts[0].replace(/"/g, '').trim();
    let priceStr = parts[1].replace(/"/g, '').replace(/,/g, '').trim();
    
    if (priceStr.includes('%')) {
      continue;
    }
    
    const price = parseFloat(priceStr);
    if (!isNaN(price) && price > 0) {
      data.push({ date: dateStr, price });
    }
  }
  
  data.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  
  return data;
}

export function alignDataByDate(
  fundData: { date: string; value: number }[],
  benchmarkData: { date: string; value: number }[]
): { fund: number[]; benchmark: number[] } {
  const fundMap = new Map(fundData.map(d => [d.date, d.value]));
  const benchmarkMap = new Map(benchmarkData.map(d => [d.date, d.value]));
  
  const commonDates = [...fundMap.keys()].filter(date => benchmarkMap.has(date));
  commonDates.sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime());
  
  const fund: number[] = [];
  const benchmark: number[] = [];
  
  for (const date of commonDates) {
    fund.push(fundMap.get(date)!);
    benchmark.push(benchmarkMap.get(date)!);
  }
  
  return { fund, benchmark };
}

export function getThreeYearData<T extends { date: string }>(data: T[]): T[] {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  
  return data.filter(d => parseDate(d.date) >= threeYearsAgo);
}

export function computeMetricsForFund(
  fundNAVs: NAVData[],
  benchmarkPrices: BenchmarkData[],
  schemeInfo: { schemeCode: string; schemeName: string; fundName: string; category: string; type: string }
): Omit<FundMetrics, 'isTopTenPercent' | 'finFriendScore'> {
  const threeYearFundData = getThreeYearData(fundNAVs);
  const threeYearBenchmarkData = getThreeYearData(benchmarkPrices);
  
  if (threeYearFundData.length < 30 || threeYearBenchmarkData.length < 30) {
    return {
      ...schemeInfo,
      alpha: 0,
      beta: 1,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      lastUpdated: new Date().toISOString()
    };
  }
  
  const fundDataFormatted = threeYearFundData.map(d => ({ date: d.date, value: d.nav }));
  const benchmarkDataFormatted = threeYearBenchmarkData.map(d => ({ date: d.date, value: d.price }));
  
  const aligned = alignDataByDate(fundDataFormatted, benchmarkDataFormatted);
  
  if (aligned.fund.length < 30) {
    return {
      ...schemeInfo,
      alpha: 0,
      beta: 1,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      lastUpdated: new Date().toISOString()
    };
  }
  
  const fundReturns: number[] = [];
  const benchmarkReturns: number[] = [];
  
  for (let i = 1; i < aligned.fund.length; i++) {
    if (aligned.fund[i - 1] > 0 && aligned.benchmark[i - 1] > 0) {
      fundReturns.push((aligned.fund[i] - aligned.fund[i - 1]) / aligned.fund[i - 1]);
      benchmarkReturns.push((aligned.benchmark[i] - aligned.benchmark[i - 1]) / aligned.benchmark[i - 1]);
    }
  }
  
  const fundMeanDaily = calculateMean(fundReturns);
  const benchMeanDaily = calculateMean(benchmarkReturns);
  const fundStdDaily = calculateStdDev(fundReturns, fundMeanDaily);
  const fundDownsideDaily = calculateDownsideDeviation(fundReturns);
  
  const fundAnnualReturn = fundMeanDaily * TRADING_DAYS_PER_YEAR;
  const benchAnnualReturn = benchMeanDaily * TRADING_DAYS_PER_YEAR;
  const fundAnnualStdDev = fundStdDaily * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const fundAnnualDownside = fundDownsideDaily * Math.sqrt(TRADING_DAYS_PER_YEAR);
  
  const beta = calculateBeta(fundReturns, benchmarkReturns);
  const alpha = calculateAlpha(fundAnnualReturn, benchAnnualReturn, beta);
  const sharpeRatio = calculateSharpeRatio(fundAnnualReturn, fundAnnualStdDev);
  const sortinoRatio = calculateSortinoRatio(fundAnnualReturn, fundAnnualDownside);
  const maxDrawdown = calculateMaxDrawdown(aligned.fund);
  
  return {
    ...schemeInfo,
    alpha: Math.round(alpha * 10000) / 10000,
    beta: Math.round(beta * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sortinoRatio: Math.round(sortinoRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 10000,
    lastUpdated: new Date().toISOString()
  };
}

export function calculatePercentilesAndScores(
  metrics: Omit<FundMetrics, 'isTopTenPercent' | 'finFriendScore'>[]
): FundMetrics[] {
  if (metrics.length === 0) return [];
  
  const alphas = metrics.map(m => m.alpha).sort((a, b) => a - b);
  const sharpes = metrics.map(m => m.sharpeRatio).sort((a, b) => a - b);
  const sortinos = metrics.map(m => m.sortinoRatio).sort((a, b) => a - b);
  const drawdowns = metrics.map(m => m.maxDrawdown).sort((a, b) => a - b);
  
  const getPercentile = (value: number, sortedArray: number[]): number => {
    const index = sortedArray.findIndex(v => v >= value);
    if (index === -1) return 1;
    return index / sortedArray.length;
  };
  
  const result = metrics.map(m => {
    const alphaPercentile = getPercentile(m.alpha, alphas);
    const sharpePercentile = getPercentile(m.sharpeRatio, sharpes);
    const sortinoPercentile = getPercentile(m.sortinoRatio, sortinos);
    const maxDrawdownPercentile = getPercentile(m.maxDrawdown, drawdowns);
    
    const score = calculateFinFriendScore(
      alphaPercentile,
      sharpePercentile,
      sortinoPercentile,
      maxDrawdownPercentile
    );
    
    return {
      ...m,
      finFriendScore: score,
      isTopTenPercent: false
    };
  });
  
  result.sort((a, b) => b.finFriendScore - a.finFriendScore);
  
  const topTenPercentCount = Math.ceil(result.length * 0.1);
  for (let i = 0; i < topTenPercentCount; i++) {
    result[i].isTopTenPercent = true;
  }
  
  return result;
}

export function getTopFundsByCategory(
  allMetrics: FundMetrics[],
  category: string,
  type?: string,
  limit: number = 10
): FundMetrics[] {
  let filtered = allMetrics.filter(m => 
    m.category.toLowerCase() === category.toLowerCase()
  );
  
  if (type) {
    filtered = filtered.filter(m => 
      m.type.toLowerCase() === type.toLowerCase()
    );
  }
  
  return filtered
    .sort((a, b) => b.finFriendScore - a.finFriendScore)
    .slice(0, limit);
}

export function formatScore(score: number): string {
  return `${score.toFixed(1)}/10`;
}

export function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  if (score >= 4) return 'text-orange-600';
  return 'text-red-600';
}

export function getScoreBgColor(score: number): string {
  if (score >= 8) return 'bg-green-100';
  if (score >= 6) return 'bg-yellow-100';
  if (score >= 4) return 'bg-orange-100';
  return 'bg-red-100';
}
