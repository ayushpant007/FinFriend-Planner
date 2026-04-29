import fs from 'fs';
import path from 'path';

export type FundCsvCategory = 'Equity' | 'Debt' | 'Hybrid' | 'Solutions' | 'Commodities';

export interface FundCsvRecord {
  category: FundCsvCategory;
  schemeCode: string;
  fundName: string;
  schemeName: string;
  isin: string;
  plan: string;
  schemeCategory: string;
  raw: Record<string, string>;
}

interface CsvFileSpec {
  category: FundCsvCategory;
  file: string;
}

const FILES: CsvFileSpec[] = [
  { category: 'Equity', file: 'equity.csv' },
  { category: 'Debt', file: 'debt.csv' },
  { category: 'Hybrid', file: 'hybrid.csv' },
  { category: 'Solutions', file: 'solutions.csv' },
  { category: 'Commodities', file: 'commodities.csv' },
];

let cache: { byCode: Map<string, FundCsvRecord>; all: FundCsvRecord[] } | null = null;

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') {
        cur.push(field);
        field = '';
      } else if (c === '\n') {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = '';
      } else if (c === '\r') {
        // skip
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim().length > 0));
}

function loadAll(): { byCode: Map<string, FundCsvRecord>; all: FundCsvRecord[] } {
  if (cache) return cache;

  const byCode = new Map<string, FundCsvRecord>();
  const all: FundCsvRecord[] = [];
  const baseDir = path.join(process.cwd(), 'Funds');

  for (const spec of FILES) {
    const fullPath = path.join(baseDir, spec.file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[funds-csv] Missing CSV: ${fullPath}`);
      continue;
    }
    const text = fs.readFileSync(fullPath, 'utf-8');
    const rows = parseCSV(text);
    if (rows.length < 2) continue;
    const headers = rows[0].map(h => h);

    const idx = (key: string) => headers.findIndex(h => h.replace(/\s+/g, ' ').trim().toLowerCase() === key.toLowerCase());
    const codeIdx = idx('Scheme Code');
    const nameIdx = idx('Fund Name');
    const isinIdx = idx('ISIN');
    const planIdx = idx('Plan');
    const catIdx = idx('Category');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const raw: Record<string, string> = {};
      headers.forEach((h, j) => {
        raw[h] = (row[j] ?? '').trim();
      });
      const schemeCode = (codeIdx >= 0 ? row[codeIdx] : '')?.trim() || '';
      if (!schemeCode) continue;
      const record: FundCsvRecord = {
        category: spec.category,
        schemeCode,
        fundName: (nameIdx >= 0 ? row[nameIdx] : '')?.trim() || '',
        schemeName: (nameIdx >= 0 ? row[nameIdx] : '')?.trim() || '',
        isin: (isinIdx >= 0 ? row[isinIdx] : '')?.trim() || '',
        plan: (planIdx >= 0 ? row[planIdx] : '')?.trim() || '',
        schemeCategory: (catIdx >= 0 ? row[catIdx] : '')?.trim() || '',
        raw,
      };
      all.push(record);
      // last write wins; first occurrence is preserved unless duplicate code in same csv
      if (!byCode.has(schemeCode)) {
        byCode.set(schemeCode, record);
      }
    }
  }

  console.log(`[funds-csv] Loaded ${all.length} fund rows across ${FILES.length} CSVs`);
  cache = { byCode, all };
  return cache;
}

export function getFundCsvRecord(schemeCode: string | number): FundCsvRecord | null {
  if (schemeCode === undefined || schemeCode === null || schemeCode === '') return null;
  const key = String(schemeCode).trim();
  return loadAll().byCode.get(key) || null;
}

export function getAllFundCsvRecords(): FundCsvRecord[] {
  return loadAll().all;
}

function pickFirst(raw: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    const found = Object.keys(raw).find(rk => rk.replace(/\s+/g, ' ').trim().toLowerCase() === k.toLowerCase());
    if (found && raw[found] !== undefined && raw[found] !== '' && raw[found] !== '--') return raw[found];
  }
  return undefined;
}

function toNum(s: string | undefined): number | null {
  if (s === undefined) return null;
  const cleaned = String(s).replace(/[%,\s]/g, '');
  if (cleaned === '' || cleaned.toUpperCase() === 'N/A' || cleaned === '--') return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface FundMetricsView {
  category: FundCsvCategory;
  schemeCategory: string;
  benchmarkName: string | null;
  riskCategory: string | null;
  totalScore: number | null;
  alpha: number | null;
  beta: number | null;
  sharpe: number | null;
  sortino: number | null;
  stdDev: number | null;
  meanReturn: number | null;
  ytm: number | null;
  macaulayDuration: number | null;
  avgMaturity: number | null;
  avgCreditRating: string | null;
  noOfStocks: number | null;
  top10Holdings: number | null;
  top5Stocks: number | null;
  top3Sectors: number | null;
  pbRatio: number | null;
  peRatio: number | null;
}

export interface FundReturnsView {
  fund: { label: string; value: number }[];
  benchmark: { label: string; value: number }[];
}

export interface AllocationFundData {
  schemeCode: string;
  fundName: string;
  schemeCategory: string;
  category: FundCsvCategory;
  benchmarkName: string | null;
  metrics: FundMetricsView;
  returns: FundReturnsView;
  // Convenience flat returns map for the existing returns display in FundAllocationItem
  flatReturns: {
    oneYearReturn: string | null;
    threeYearReturn: string | null;
    fiveYearReturn: string | null;
    sevenYearReturn: string | null;
    tenYearReturn: string | null;
    currentNav: string | null;
  };
  yearlyComparison: { year: string; fundReturn: number; benchmarkReturn: number }[];
}

const FUND_RETURN_KEYS: Record<FundCsvCategory, { label: string; fund: string[]; bench: string[] }[]> = {
  Equity: [
    { label: '1Y', fund: ['Return_1Y'], bench: ['BM_Return_1Y'] },
    { label: '3Y', fund: ['Return_3Y'], bench: ['BM_Return_3Y'] },
    { label: '5Y', fund: ['Return_5Y'], bench: ['BM_Return_5Y'] },
    { label: '7Y', fund: ['Return_7Y'], bench: ['BM_Return_7Y'] },
    { label: '10Y', fund: ['Return_10Y'], bench: ['BM_Return_10Y'] },
  ],
  Debt: [
    { label: '1Y', fund: ['Return_1Y'], bench: ['BM_Return_1Y'] },
    { label: '3Y', fund: ['Return_3Y'], bench: ['BM_Return_3Y'] },
    { label: '5Y', fund: ['Return_5Y'], bench: ['BM_Return_5Y'] },
  ],
  Hybrid: [
    { label: '1Y', fund: ['Fund 1Y'], bench: ['Bench 1Y'] },
    { label: '3Y', fund: ['Fund 3Y'], bench: ['Bench 3Y'] },
    { label: '5Y', fund: ['Fund 5Y'], bench: ['Bench 5Y'] },
  ],
  Solutions: [
    { label: '1Y', fund: ['Fund 1Y'], bench: ['Bench 1Y'] },
    { label: '3Y', fund: ['Fund 3Y'], bench: ['Bench 3Y'] },
    { label: '5Y', fund: ['Fund 5Y'], bench: ['Bench 5Y'] },
  ],
  Commodities: [
    { label: '1Y', fund: ['Fund_Ret_1Y'], bench: ['BM_Ret_1Y'] },
    { label: '2Y', fund: ['Fund_Ret_2Y'], bench: ['BM_Ret_2Y'] },
    { label: '3Y', fund: ['Fund_Ret_3Y'], bench: ['BM_Ret_3Y'] },
  ],
};

const RISK_LABEL_KEYS = ['RISK CATEGORY', 'Risk Category', 'RISK\nLABEL', 'RISK LABEL'];
const TOTAL_SCORE_KEYS = ['TOTAL\n(/40)', 'Total Score(/40)', 'TOTAL SCORE\n(40)', 'TOTAL\nSCORE'];
const BENCHMARK_NAME_KEYS = ['Benchmark_Name', 'Benchmark Name'];

export function buildAllocationFundData(record: FundCsvRecord): AllocationFundData {
  const r = record.raw;

  const metrics: FundMetricsView = {
    category: record.category,
    schemeCategory: record.schemeCategory,
    benchmarkName: pickFirst(r, BENCHMARK_NAME_KEYS) ?? null,
    riskCategory: pickFirst(r, RISK_LABEL_KEYS) ?? null,
    totalScore: toNum(pickFirst(r, TOTAL_SCORE_KEYS)),
    alpha: toNum(pickFirst(r, ['Alpha'])),
    beta: toNum(pickFirst(r, ['Beta'])),
    sharpe: toNum(pickFirst(r, ['Sharpe'])),
    sortino: toNum(pickFirst(r, ['Sortino'])),
    stdDev: toNum(pickFirst(r, ['Std Dev', 'Standard Deviation', 'Std Dev\n(%)'])),
    meanReturn: toNum(pickFirst(r, ['Mean Return', 'Mean Return\n(%)'])),
    ytm: toNum(pickFirst(r, ['YTM (%)', 'YTM\n(%)', 'Yield to Maturity (%)'])),
    macaulayDuration: toNum(pickFirst(r, ['Macaulay Dur (yrs)', 'Mac Dur\n(yrs)', 'Macaulay Duration (yrs)'])),
    avgMaturity: toNum(pickFirst(r, ['Avg Maturity (yrs)', 'Avg Mat\n(yrs)', 'Average Maturity (yrs)'])),
    avgCreditRating: pickFirst(r, ['Avg Credit Rating', 'Avg Credit\nRating']) ?? null,
    noOfStocks: toNum(pickFirst(r, ['No. of Stocks', 'No. of\nStocks'])),
    top10Holdings: toNum(pickFirst(r, ['Top 10 Stocks (%)', 'Top 10\nHoldings %'])),
    top5Stocks: toNum(pickFirst(r, ['Top 5 Stocks (%)', 'Top 5\nStocks %'])),
    top3Sectors: toNum(pickFirst(r, ['Top 3 Sectors (%)', 'Top 3\nSectors %'])),
    pbRatio: toNum(pickFirst(r, ['P/B Ratio', 'P/B\nRatio'])),
    peRatio: toNum(pickFirst(r, ['P/E Ratio', 'P/E\nRatio'])),
  };

  const returnSpec = FUND_RETURN_KEYS[record.category];
  const fundReturns: { label: string; value: number }[] = [];
  const benchReturns: { label: string; value: number }[] = [];
  const yearly: { year: string; fundReturn: number; benchmarkReturn: number }[] = [];

  for (const spec of returnSpec) {
    const fv = toNum(pickFirst(r, spec.fund));
    const bv = toNum(pickFirst(r, spec.bench));
    if (fv !== null) fundReturns.push({ label: spec.label, value: fv });
    if (bv !== null) benchReturns.push({ label: spec.label, value: bv });
    if (fv !== null || bv !== null) {
      yearly.push({ year: spec.label, fundReturn: fv ?? 0, benchmarkReturn: bv ?? 0 });
    }
  }

  // Hybrid CSV doesn't have an explicit benchmark name column; default for that row
  let benchmarkName = metrics.benchmarkName;
  if (!benchmarkName) {
    if (record.category === 'Hybrid') benchmarkName = 'Hybrid Benchmark';
    else if (record.category === 'Solutions') benchmarkName = 'Solution Oriented Benchmark';
    else if (record.category === 'Commodities') benchmarkName = 'Commodities Benchmark';
    else if (record.category === 'Debt') benchmarkName = 'Debt Benchmark';
    else benchmarkName = 'Benchmark';
  }

  const fmt = (v: number | null) => (v === null ? null : `${v.toFixed(2)}%`);
  const findVal = (label: string) => fundReturns.find(x => x.label === label)?.value ?? null;

  return {
    schemeCode: record.schemeCode,
    fundName: record.fundName,
    schemeCategory: record.schemeCategory,
    category: record.category,
    benchmarkName,
    metrics: { ...metrics, benchmarkName },
    returns: { fund: fundReturns, benchmark: benchReturns },
    flatReturns: {
      oneYearReturn: fmt(findVal('1Y')),
      threeYearReturn: fmt(findVal('3Y')),
      fiveYearReturn: fmt(findVal('5Y')),
      sevenYearReturn: fmt(findVal('7Y')),
      tenYearReturn: fmt(findVal('10Y')),
      currentNav: null,
    },
    yearlyComparison: yearly,
  };
}

export interface PortfolioGrowthInput {
  funds: { schemeCode: string | number; weight: number }[];
}

export interface PortfolioGrowthChartPoint {
  date: string;
  modelPortfolio: number;
  benchmark: number;
}

/**
 * Build a "Growth of ₹100" curve from the CSV-stored CAGR data.
 * Picks the longest horizon present across all selected funds (intersection)
 * and compounds weighted average CAGR over time.
 */
export function buildPortfolioGrowth(
  input: PortfolioGrowthInput,
  csvCategory: FundCsvCategory,
): { chartData: PortfolioGrowthChartPoint[]; benchmarkName: string; horizonYears: number } {
  const funds = input.funds.filter(f => f.weight > 0 && f.schemeCode);
  if (funds.length === 0) {
    return { chartData: [], benchmarkName: '', horizonYears: 0 };
  }

  const totalWeight = funds.reduce((s, f) => s + f.weight, 0);
  if (totalWeight <= 0) {
    return { chartData: [], benchmarkName: '', horizonYears: 0 };
  }

  // Resolve records and the available returns horizons per fund
  const resolved = funds.map(f => {
    const rec = getFundCsvRecord(f.schemeCode);
    if (!rec) return null;
    const data = buildAllocationFundData(rec);
    return { weight: f.weight / totalWeight, data };
  }).filter((x): x is { weight: number; data: AllocationFundData } => x !== null);

  if (resolved.length === 0) {
    return { chartData: [], benchmarkName: '', horizonYears: 0 };
  }

  // Choose horizon series based on category
  const horizonOrder: { label: string; years: number }[] =
    csvCategory === 'Equity'
      ? [
          { label: '1Y', years: 1 },
          { label: '3Y', years: 3 },
          { label: '5Y', years: 5 },
          { label: '7Y', years: 7 },
          { label: '10Y', years: 10 },
        ]
      : csvCategory === 'Commodities'
      ? [
          { label: '1Y', years: 1 },
          { label: '2Y', years: 2 },
          { label: '3Y', years: 3 },
        ]
      : [
          { label: '1Y', years: 1 },
          { label: '3Y', years: 3 },
          { label: '5Y', years: 5 },
        ];

  // Find the longest horizon for which every fund has both fund and benchmark return values
  let chosenHorizon = horizonOrder[0];
  for (const h of horizonOrder) {
    const everyone = resolved.every(r => {
      const f = r.data.returns.fund.find(x => x.label === h.label);
      const b = r.data.returns.benchmark.find(x => x.label === h.label);
      return f !== undefined && b !== undefined;
    });
    if (everyone) chosenHorizon = h;
  }

  // Compute weighted CAGR for portfolio and benchmark at the chosen horizon
  let portCagr = 0;
  let benchCagr = 0;
  for (const r of resolved) {
    const f = r.data.returns.fund.find(x => x.label === chosenHorizon.label);
    const b = r.data.returns.benchmark.find(x => x.label === chosenHorizon.label);
    portCagr += (f?.value ?? 0) * r.weight;
    benchCagr += (b?.value ?? 0) * r.weight;
  }

  const benchmarkName =
    resolved
      .map(r => r.data.benchmarkName)
      .find(b => !!b) || 'Benchmark';

  // Generate a smooth growth-of-100 curve year by year
  const points: PortfolioGrowthChartPoint[] = [];
  const steps = Math.max(chosenHorizon.years, 1);
  const today = new Date();
  for (let y = 0; y <= steps; y++) {
    const d = new Date(today);
    d.setFullYear(today.getFullYear() - (steps - y));
    points.push({
      date: d.toISOString().slice(0, 10),
      modelPortfolio: Number((100 * Math.pow(1 + portCagr / 100, y)).toFixed(2)),
      benchmark: Number((100 * Math.pow(1 + benchCagr / 100, y)).toFixed(2)),
    });
  }

  return { chartData: points, benchmarkName, horizonYears: steps };
}
