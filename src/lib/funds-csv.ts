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
  { category: 'Equity', file: 'Equity Funds.csv' },
  { category: 'Debt', file: 'Debt_Funds.csv' },
  { category: 'Hybrid', file: 'Hybrid Funds.csv' },
  { category: 'Solutions', file: 'Solution Funds.csv' },
  { category: 'Commodities', file: 'Commodities Funds.csv' },
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

function cleanType(val: string | undefined): string {
  if (!val) return '';
  return val.replace(/^(Debt|Hybrid|Solution|Commodities):\s*/i, '').trim();
}

function loadAll(): { byCode: Map<string, FundCsvRecord>; all: FundCsvRecord[] } {
  if (cache) return cache;

  const byCode = new Map<string, FundCsvRecord>();
  const all: FundCsvRecord[] = [];
  const baseDir = path.join(process.cwd(), 'Mutual Fund');

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

    const idx = (...keys: string[]) => {
      return headers.findIndex(h => {
        const normH = h.replace(/[\s_]+/g, ' ').trim().toLowerCase();
        return keys.some(key => {
          const normKey = key.replace(/[\s_]+/g, ' ').trim().toLowerCase();
          return normH === normKey;
        });
      });
    };
    const codeIdx = idx('Scheme Code', 'AMFI Scheme Code', 'scheme_code');
    // Some CSVs (e.g. Solution Oriented) have an empty first-column header for Fund Name
    let nameIdx = idx('Fund Name', 'fund_name', 'Scheme Name', 'scheme_name');
    if (nameIdx === -1 && headers[0] !== undefined && headers[0].trim() === '') nameIdx = 0;
    const isinIdx = idx('ISIN', 'isin', 'ISIN (Growth/Cumulative)');
    const planIdx = idx('Plan', 'plan');
    // Prefer Subcategory (specific type) over Category (broad group)
    // Use a separate lookup so 'Subcategory' is tried before 'Category' regardless of column order
    let catIdx = idx('Subcategory');
    if (catIdx === -1) catIdx = idx('Category', 'category', 'bm');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const raw: Record<string, string> = {};
      headers.forEach((h, j) => {
        raw[h] = (row[j] ?? '').trim();
      });
      const schemeCode = (codeIdx >= 0 ? row[codeIdx] : '')?.trim() || '';
      if (!schemeCode) continue;

      const rawType = (catIdx >= 0 ? row[catIdx] : '')?.trim() || '';
      const schemeCategory = cleanType(rawType);

      const record: FundCsvRecord = {
        category: spec.category,
        schemeCode,
        fundName: (nameIdx >= 0 ? row[nameIdx] : '')?.trim() || '',
        schemeName: (nameIdx >= 0 ? row[nameIdx] : '')?.trim() || '',
        isin: (isinIdx >= 0 ? row[isinIdx] : '')?.trim() || '',
        plan: (planIdx >= 0 ? row[planIdx] : '')?.trim() || '',
        schemeCategory,
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

/**
 * Fallback lookup: when a Regular plan scheme code isn't in the CSV (which stores
 * Direct plans), find the best matching Direct counterpart by normalized fund name.
 * Strips plan/option suffixes so "ABSL Banking & PSU Debt Reg" matches the Direct entry.
 */
export function getFundCsvRecordByName(
  schemeName: string,
  category?: string,
): FundCsvRecord | null {
  if (!schemeName) return null;
  const { all } = loadAll();
  const norm = normalizeFundName(schemeName);

  // Filter by category first if provided
  const pool = category
    ? all.filter(r => r.category.toLowerCase() === category.toLowerCase())
    : all;

  // Exact normalized name match (direct plan preferred)
  let match = pool.find(r => normalizeFundName(r.schemeName) === norm && r.plan.toLowerCase() === 'direct');
  if (match) return match;

  // Any plan exact match
  match = pool.find(r => normalizeFundName(r.schemeName) === norm);
  if (match) return match;

  // Substring / partial match — direct preferred
  const partial = pool.filter(r => {
    const n = normalizeFundName(r.schemeName);
    return n.includes(norm) || norm.includes(n);
  });
  if (partial.length > 0) {
    return partial.find(r => r.plan.toLowerCase() === 'direct') ?? partial[0];
  }

  return null;
}

export function getAllFundCsvRecords(): FundCsvRecord[] {
  return loadAll().all;
}

function pickFirst(raw: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    const normKey = k.replace(/[\s_]+/g, ' ').trim().toLowerCase();
    const found = Object.keys(raw).find(rk => {
      const normRk = rk.replace(/[\s_]+/g, ' ').trim().toLowerCase();
      return normRk === normKey;
    });
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
    { label: '1Y', fund: ['1Y Return (%)', 'Return_1Y', 'f1y'], bench: ['Benchmark 1Y (%)', 'BM_Return_1Y', 'b1y'] },
    { label: '3Y', fund: ['3Y Return (%)', 'Return_3Y', 'f3y'], bench: ['Benchmark 3Y (%)', 'BM_Return_3Y', 'b3y'] },
    { label: '5Y', fund: ['5Y Return (%)', 'Return_5Y', 'f5y'], bench: ['Benchmark 5Y (%)', 'BM_Return_5Y', 'b5y'] },
    { label: '7Y', fund: ['7Y Return (%)', 'Return_7Y'], bench: ['Benchmark 7Y (%)', 'BM_Return_7Y'] },
    { label: '10Y', fund: ['10Y Return (%)', 'Return_10Y'], bench: ['Benchmark 10Y (%)', 'BM_Return_10Y'] },
  ],
  Debt: [
    { label: '1Y', fund: ['1Y Return (%)', 'Return_1Y', 'f1y'], bench: ['Benchmark 1Y (%)', 'BM_Return_1Y', 'b1y'] },
    { label: '3Y', fund: ['3Y Return (%)', 'Return_3Y', 'f3y'], bench: ['Benchmark 3Y (%)', 'BM_Return_3Y', 'b3y'] },
    { label: '5Y', fund: ['5Y Return (%)', 'Return_5Y', 'f5y'], bench: ['Benchmark 5Y (%)', 'BM_Return_5Y', 'b5y'] },
  ],
  Hybrid: [
    { label: '1Y', fund: ['1Y Return (%)', 'Fund 1Y', 'f1y'], bench: ['Benchmark 1Y (%)', 'Bench 1Y', 'b1y'] },
    { label: '3Y', fund: ['3Y Return (%)', 'Fund 3Y', 'f3y'], bench: ['Benchmark 3Y (%)', 'Bench 3Y', 'b3y'] },
    { label: '5Y', fund: ['5Y Return (%)', 'Fund 5Y', 'f5y'], bench: ['Benchmark 5Y (%)', 'Bench 5Y', 'b5y'] },
  ],
  Solutions: [
    { label: '1Y', fund: ['1Y Return (%)', 'Fund 1Y', 'f1y'], bench: ['Benchmark 1Y (%)', 'Bench 1Y', 'b1y'] },
    { label: '3Y', fund: ['3Y Return (%)', 'Fund 3Y', 'f3y'], bench: ['Benchmark 3Y (%)', 'Bench 3Y', 'b3y'] },
    { label: '5Y', fund: ['5Y Return (%)', 'Fund 5Y', 'f5y'], bench: ['Benchmark 5Y (%)', 'Bench 5Y', 'b5y'] },
  ],
  Commodities: [
    { label: '1Y', fund: ['1Y Return (%)', 'Fund_Ret_1Y', 'f1y'], bench: ['Benchmark 1Y (%)', 'BM_Ret_1Y', 'b1y'] },
    { label: '3Y', fund: ['3Y Return (%)', 'Fund_Ret_3Y', 'f3y'], bench: ['Benchmark 3Y (%)', 'BM_Ret_3Y', 'b3y'] },
    { label: '5Y', fund: ['5Y Return (%)', 'Fund_Ret_5Y', 'f5y'], bench: ['Benchmark 5Y (%)', 'BM_Ret_5Y', 'b5y'] },
  ],
};

const RISK_LABEL_KEYS = ['Risk Category', 'RISK CATEGORY', 'RISK\nLABEL', 'RISK LABEL'];
const TOTAL_SCORE_KEYS = ['Total Score (40)', 'Total Score(40)', 'total_score', 'Total Score (Available)', 'TOTAL\n(/40)', 'Total Score(/40)', 'TOTAL SCORE\n(40)', 'TOTAL\nSCORE'];
const BENCHMARK_NAME_KEYS = ['Benchmark Name', 'Benchmark_Name'];

function normalizeFundName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(reg|regular|dir|direct|gr|growth|dividend|div|idcw|payout|reinvestment|plan|fund)\b/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findDirectCounterpart(record: FundCsvRecord): FundCsvRecord | null {
  if (record.plan.toLowerCase() === 'direct') {
    return null;
  }
  const allRecords = getAllFundCsvRecords();
  const normalizedName = normalizeFundName(record.schemeName);
  
  const candidates = allRecords.filter(r => 
    r.plan.toLowerCase() === 'direct' &&
    r.category === record.category
  );
  
  let best = candidates.find(r => normalizeFundName(r.schemeName) === normalizedName);
  if (best) return best;
  
  best = candidates.find(r => {
    const n = normalizeFundName(r.schemeName);
    return n.includes(normalizedName) || normalizedName.includes(n);
  });
  
  return best || null;
}

export function buildAllocationFundData(record: FundCsvRecord): AllocationFundData {
  const r = record.raw;
  const counterpart = findDirectCounterpart(record);

  const metrics: FundMetricsView = {
    category: record.category,
    schemeCategory: record.schemeCategory,
    benchmarkName: pickFirst(r, BENCHMARK_NAME_KEYS) ?? null,
    riskCategory: pickFirst(r, RISK_LABEL_KEYS) ?? null,
    totalScore: toNum(pickFirst(r, TOTAL_SCORE_KEYS)),
    alpha: toNum(pickFirst(r, ['Alpha', 'alpha'])),
    beta: toNum(pickFirst(r, ['Beta', 'beta'])),
    sharpe: toNum(pickFirst(r, ['Sharpe Ratio', 'Sharpe', 'sharpe'])),
    sortino: toNum(pickFirst(r, ['Sortino (%)', 'Sortino', 'sortino'])),
    stdDev: toNum(pickFirst(r, ['Std Dev', 'Standard Deviation', 'Std Dev\n(%)', 'std_dev'])),
    meanReturn: toNum(pickFirst(r, ['Mean Return (%)', 'Mean Return', 'Mean Return\n(%)', 'mean_return'])),
    ytm: toNum(pickFirst(r, ['YTM (%)', 'YTM\n(%)', 'Yield to Maturity (%)', 'YTM', 'ytm'])),
    macaulayDuration: toNum(pickFirst(r, ['Macaulay Dur (yrs)', 'Mac Dur\n(yrs)', 'Macaulay Duration (yrs)', 'Macaulay Duration', 'mac_duration', 'Modified Duration (yrs)', 'Modified Duration', 'mod_duration'])),
    avgMaturity: toNum(pickFirst(r, ['Avg Maturity (yrs)', 'Avg Mat\n(yrs)', 'Average Maturity (yrs)', 'Avg Maturity', 'avg_maturity'])),
    avgCreditRating: pickFirst(r, ['Avg Credit Rating', 'Avg Credit\nRating', 'avg_credit_rating']) ?? null,
    noOfStocks: toNum(pickFirst(r, ['No. of Stocks', 'No. of\nStocks', 'num_securities'])),
    top10Holdings: toNum(pickFirst(r, ['Top 10 Stocks (%)', 'Top 10\nHoldings %', 'top_10_holdings'])),
    top5Stocks: toNum(pickFirst(r, ['Top 5 Stocks (%)', 'Top 5\nStocks %', 'top_5_stocks'])),
    top3Sectors: toNum(pickFirst(r, ['Top 3 Sectors (%)', 'Top 3\nSectors %', 'top_3_sectors'])),
    pbRatio: toNum(pickFirst(r, ['P/B Ratio', 'P/B\nRatio', 'pb_ratio'])),
    peRatio: toNum(pickFirst(r, ['P/E Ratio', 'P/E\nRatio', 'pe_ratio'])),
  };

  const returnSpec = FUND_RETURN_KEYS[record.category];
  const fundReturns: { label: string; value: number }[] = [];
  const benchReturns: { label: string; value: number }[] = [];
  const yearly: { year: string; fundReturn: number; benchmarkReturn: number }[] = [];

  for (const spec of returnSpec) {
    let fv = toNum(pickFirst(r, spec.fund));
    let bv = toNum(pickFirst(r, spec.bench));

    if (fv === null && counterpart) {
      fv = toNum(pickFirst(counterpart.raw, spec.fund));
    }
    if (bv === null && counterpart) {
      bv = toNum(pickFirst(counterpart.raw, spec.bench));
    }

    if (fv !== null) fundReturns.push({ label: spec.label, value: fv });
    if (bv !== null) benchReturns.push({ label: spec.label, value: bv });
    if (fv !== null || bv !== null) {
      yearly.push({ year: spec.label, fundReturn: fv ?? 0, benchmarkReturn: bv ?? 0 });
    }
  }

  // Hybrid CSV doesn't have an explicit benchmark name column; default for that row
  let benchmarkName = metrics.benchmarkName;
  if (!benchmarkName && counterpart) {
    benchmarkName = pickFirst(counterpart.raw, BENCHMARK_NAME_KEYS) ?? null;
  }
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

export interface TopHolding {
  companyName: string;
  sector: string | null;
  holdingsType: string | null;
  instrument: string | null;
  creditRating: string | null;
  percentOfAssets: number;
  peRatio: number | null;
}

interface TopHoldingsCache {
  // key: `${fileId}:${schemeCode}` — holdings per category-file per scheme
  byCategoryAndCode: Map<string, TopHolding[]>;
}

let holdingsCache: TopHoldingsCache | null = null;

const TOP_HOLDINGS_FILES = [
  { id: 'equity',      file: 'Equity_Top_Holdings.csv',      codeCol: 'Scheme Code', companyCol: 'Company Name', sectorCol: 'Sector',   typeCol: null,           instrCol: null,        creditCol: null,            pctCol: '% of Assets', peCol: 'P/E Ratio' },
  { id: 'hybrid',      file: 'Hybrid_Top_Holdings.csv',      codeCol: 'Scheme Code', companyCol: 'Company Name', sectorCol: 'Sector',   typeCol: 'Holding Type',  instrCol: 'Instrument', creditCol: 'Credit Rating', pctCol: '% of Assets', peCol: 'P/E Ratio' },
  { id: 'debt',        file: 'Debt_Top_Holdings.csv',        codeCol: 'Scheme Code', companyCol: 'Company Name', sectorCol: null,        typeCol: null,           instrCol: 'Instrument', creditCol: 'Credit Rating', pctCol: '% of Assets', peCol: null },
  { id: 'solution',    file: 'Solution_Top_Holdings.csv',    codeCol: 'Scheme Code', companyCol: 'Company Name', sectorCol: 'Sector',   typeCol: null,           instrCol: null,        creditCol: null,            pctCol: '% of Assets', peCol: 'P/E Ratio' },
  { id: 'commodities', file: 'Commodities_Top_Holdings.csv', codeCol: 'Scheme Code', companyCol: 'Company Name', sectorCol: null,       typeCol: null,           instrCol: null,        creditCol: null,            pctCol: '% of Assets', peCol: null },
];

/**
 * Maps a raw fundCategory string (from the dropdown / fund-schemes-master.csv)
 * to the TOP_HOLDINGS_FILES id so we read from the correct file only.
 */
function normalizeCategoryId(category: string): string {
  const c = category.toLowerCase().trim();
  if (c === 'equity' || c.startsWith('equity')) return 'equity';
  if (c === 'debt'   || c.startsWith('debt'))   return 'debt';
  if (c === 'hybrid' || c.startsWith('hybrid')) return 'hybrid';
  if (c.includes('solution') || c.includes('children') || c.includes('retirement')) return 'solution';
  if (c === 'commodity' || c.includes('commodit')) return 'commodities';
  return c;
}

function loadTopHoldings(): TopHoldingsCache {
  if (holdingsCache) return holdingsCache;
  const byCategoryAndCode = new Map<string, TopHolding[]>();
  const baseDir = path.join(process.cwd(), 'Mutual Fund');

  for (const spec of TOP_HOLDINGS_FILES) {
    const fullPath = path.join(baseDir, spec.file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[funds-csv] Missing top holdings CSV: ${fullPath}`);
      continue;
    }
    const text = fs.readFileSync(fullPath, 'utf-8');
    const rows = parseCSV(text);
    if (rows.length < 2) continue;
    const headers = rows[0];

    const colIdx = (name: string | null) => {
      if (!name) return -1;
      return headers.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
    };

    const codeIdx = colIdx(spec.codeCol);
    const companyIdx = colIdx(spec.companyCol);
    const sectorIdx = colIdx(spec.sectorCol);
    const typeIdx = colIdx(spec.typeCol);
    const instrIdx = colIdx(spec.instrCol);
    const creditIdx = colIdx(spec.creditCol);
    const pctIdx = colIdx(spec.pctCol);
    const peIdx = colIdx(spec.peCol ?? null);

    if (codeIdx === -1 || companyIdx === -1 || pctIdx === -1) continue;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const code = (row[codeIdx] ?? '').trim();
      if (!code) continue;
      const company = (row[companyIdx] ?? '').trim();
      if (!company) continue;
      const pctRaw = (row[pctIdx] ?? '').trim().replace(/[%,\s]/g, '');
      const pct = parseFloat(pctRaw);
      if (!Number.isFinite(pct)) continue;

      let peRatio: number | null = null;
      if (peIdx >= 0) {
        const peRaw = (row[peIdx] ?? '').trim().replace(/[%,\s]/g, '');
        const peVal = parseFloat(peRaw);
        if (Number.isFinite(peVal)) peRatio = peVal;
      }

      const holding: TopHolding = {
        companyName: company,
        sector: sectorIdx >= 0 ? (row[sectorIdx] ?? '').trim() || null : null,
        holdingsType: typeIdx >= 0 ? (row[typeIdx] ?? '').trim() || null : null,
        instrument: instrIdx >= 0 ? (row[instrIdx] ?? '').trim() || null : null,
        creditRating: creditIdx >= 0 ? (row[creditIdx] ?? '').trim() || null : null,
        percentOfAssets: pct,
        peRatio,
      };

      const mapKey = `${spec.id}:${code}`;
      if (!byCategoryAndCode.has(mapKey)) byCategoryAndCode.set(mapKey, []);
      byCategoryAndCode.get(mapKey)!.push(holding);
    }
  }

  holdingsCache = { byCategoryAndCode };
  return holdingsCache;
}

/**
 * Returns top holdings for a fund.
 * @param schemeCode - the AMFI scheme code
 * @param category   - the fund category string from the dropdown (e.g. "equity", "debt", "hybrid").
 *                     When provided, only the matching CSV file is used, preventing cross-category pollution.
 */
export function getTopHoldings(schemeCode: string | number, category?: string): TopHolding[] {
  const code = String(schemeCode).trim();
  const cache = loadTopHoldings();

  if (category) {
    const fileId = normalizeCategoryId(category);
    return cache.byCategoryAndCode.get(`${fileId}:${code}`) ?? [];
  }

  // Fallback: search all files and deduplicate by company name
  const seen = new Set<string>();
  const result: TopHolding[] = [];
  for (const spec of TOP_HOLDINGS_FILES) {
    const holdings = cache.byCategoryAndCode.get(`${spec.id}:${code}`) ?? [];
    for (const h of holdings) {
      const k = h.companyName.toLowerCase().trim();
      if (!seen.has(k)) { seen.add(k); result.push(h); }
    }
  }
  return result;
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
          { label: '3Y', years: 3 },
          { label: '5Y', years: 5 },
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
  const points: any[] = [];
  const steps = Math.max(chosenHorizon.years, 1);
  const today = new Date();
  for (let y = 0; y <= steps; y++) {
    const d = new Date(today);
    d.setFullYear(today.getFullYear() - (steps - y));
    
    const pointData: any = {
      date: d.toISOString().slice(0, 10),
      modelPortfolio: Number((100 * Math.pow(1 + portCagr / 100, y)).toFixed(2)),
      benchmark: Number((100 * Math.pow(1 + benchCagr / 100, y)).toFixed(2)),
    };

    for (const r of resolved) {
      const f = r.data.returns.fund.find(x => x.label === chosenHorizon.label);
      const b = r.data.returns.benchmark.find(x => x.label === chosenHorizon.label);
      const cagrFund = f?.value ?? 0;
      const cagrBench = b?.value ?? 0;
      
      const fundRebased = 100 * Math.pow(1 + cagrFund / 100, y);
      const benchRebased = 100 * Math.pow(1 + cagrBench / 100, y);
      
      pointData[r.data.fundName] = Number(fundRebased.toFixed(2));
      pointData[`${r.data.fundName} Benchmark`] = Number(benchRebased.toFixed(2));
    }
    
    points.push(pointData);
  }

  return { chartData: points, benchmarkName, horizonYears: steps };
}
