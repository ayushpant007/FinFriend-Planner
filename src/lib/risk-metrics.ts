interface DataPoint {
  date: Date;
  value: number;
}

export interface RiskMetrics {
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  beta: number | null;
  jensensAlpha: number | null;
  standardDeviation: number | null;
  threeYearRollingReturn: number | null;
  threeYearCagr: number | null;
}

const RISK_FREE_RATE = 6.5;

function toMonthlyClosingSeries(data: DataPoint[]): DataPoint[] {
  if (data.length === 0) return [];
  const sorted = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  const monthly = new Map<string, DataPoint>();
  for (const p of sorted) {
    const key = `${p.date.getFullYear()}-${p.date.getMonth()}`;
    monthly.set(key, p);
  }
  return Array.from(monthly.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function toMonthlyReturns(monthly: DataPoint[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < monthly.length; i++) {
    const prev = monthly[i - 1].value;
    const curr = monthly[i].value;
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }
  return returns;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const sqDiffs = arr.map(v => (v - m) ** 2);
  return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / (arr.length - 1));
}

function downsideDeviation(arr: number[], target: number): number {
  if (arr.length === 0) return 0;
  const downside = arr.map(v => Math.min(0, v - target) ** 2);
  return Math.sqrt(downside.reduce((s, v) => s + v, 0) / arr.length);
}

function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (n - 1);
}

function variance(a: number[]): number {
  const sd = stdDev(a);
  return sd * sd;
}

function findClosestPoint(data: DataPoint[], target: Date): DataPoint | null {
  if (data.length === 0) return null;
  let closest = data[0];
  let bestDiff = Math.abs(closest.date.getTime() - target.getTime());
  for (const p of data) {
    const diff = Math.abs(p.date.getTime() - target.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      closest = p;
    }
  }
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  return bestDiff <= ninetyDays ? closest : null;
}

function calculateCagrFromPoints(start: DataPoint, end: DataPoint): number | null {
  const years = (end.date.getTime() - start.date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 0 || start.value <= 0) return null;
  return (Math.pow(end.value / start.value, 1 / years) - 1) * 100;
}

function alignSeries(fund: DataPoint[], bench: DataPoint[]): { fund: number[]; bench: number[] } {
  const fMonthly = toMonthlyClosingSeries(fund);
  const bMonthly = toMonthlyClosingSeries(bench);
  const fMap = new Map<string, number>();
  const bMap = new Map<string, number>();
  for (const p of fMonthly) fMap.set(`${p.date.getFullYear()}-${p.date.getMonth()}`, p.value);
  for (const p of bMonthly) bMap.set(`${p.date.getFullYear()}-${p.date.getMonth()}`, p.value);
  const commonKeys = Array.from(fMap.keys()).filter(k => bMap.has(k)).sort();
  const fundReturns: number[] = [];
  const benchReturns: number[] = [];
  for (let i = 1; i < commonKeys.length; i++) {
    const fPrev = fMap.get(commonKeys[i - 1])!;
    const fCurr = fMap.get(commonKeys[i])!;
    const bPrev = bMap.get(commonKeys[i - 1])!;
    const bCurr = bMap.get(commonKeys[i])!;
    if (fPrev > 0 && bPrev > 0) {
      fundReturns.push((fCurr - fPrev) / fPrev);
      benchReturns.push((bCurr - bPrev) / bPrev);
    }
  }
  return { fund: fundReturns, bench: benchReturns };
}

export function computeRiskMetrics(
  fundNav: DataPoint[],
  benchmarkData: DataPoint[]
): RiskMetrics {
  const monthlyRfDecimal = RISK_FREE_RATE / 100 / 12;

  const fundMonthly = toMonthlyClosingSeries(fundNav);
  const fundReturns = toMonthlyReturns(fundMonthly);

  const annualisedStdDev =
    fundReturns.length >= 12 ? stdDev(fundReturns) * Math.sqrt(12) * 100 : null;

  const meanMonthly = fundReturns.length > 0 ? mean(fundReturns) : 0;
  const annualisedReturn = (Math.pow(1 + meanMonthly, 12) - 1) * 100;

  const sharpe =
    fundReturns.length >= 12 && annualisedStdDev && annualisedStdDev > 0
      ? (annualisedReturn - RISK_FREE_RATE) / annualisedStdDev
      : null;

  const downside = fundReturns.length >= 12 ? downsideDeviation(fundReturns, monthlyRfDecimal) * Math.sqrt(12) * 100 : 0;
  const sortino =
    fundReturns.length >= 12 && downside > 0
      ? (annualisedReturn - RISK_FREE_RATE) / downside
      : null;

  let beta: number | null = null;
  let jensensAlpha: number | null = null;
  if (benchmarkData.length > 0) {
    const aligned = alignSeries(fundNav, benchmarkData);
    if (aligned.fund.length >= 12) {
      const cov = covariance(aligned.fund, aligned.bench);
      const varB = variance(aligned.bench);
      if (varB > 0) {
        beta = cov / varB;
        const fundAnnualised = (Math.pow(1 + mean(aligned.fund), 12) - 1) * 100;
        const benchAnnualised = (Math.pow(1 + mean(aligned.bench), 12) - 1) * 100;
        jensensAlpha = fundAnnualised - (RISK_FREE_RATE + beta * (benchAnnualised - RISK_FREE_RATE));
      }
    }
  }

  let threeYearCagr: number | null = null;
  let threeYearRollingReturn: number | null = null;
  if (fundMonthly.length > 0) {
    const latest = fundMonthly[fundMonthly.length - 1];
    const targetStart = new Date(latest.date);
    targetStart.setFullYear(targetStart.getFullYear() - 3);
    const startPoint = findClosestPoint(fundMonthly, targetStart);
    if (startPoint && startPoint.value > 0) {
      threeYearCagr = calculateCagrFromPoints(startPoint, latest);
      if (threeYearCagr !== null) {
        threeYearRollingReturn = ((latest.value - startPoint.value) / startPoint.value) * 100;
      }
    }
  }

  return {
    sharpeRatio: sharpe !== null && isFinite(sharpe) ? sharpe : null,
    sortinoRatio: sortino !== null && isFinite(sortino) ? sortino : null,
    beta: beta !== null && isFinite(beta) ? beta : null,
    jensensAlpha: jensensAlpha !== null && isFinite(jensensAlpha) ? jensensAlpha : null,
    standardDeviation: annualisedStdDev !== null && isFinite(annualisedStdDev) ? annualisedStdDev : null,
    threeYearRollingReturn: threeYearRollingReturn !== null && isFinite(threeYearRollingReturn) ? threeYearRollingReturn : null,
    threeYearCagr: threeYearCagr !== null && isFinite(threeYearCagr) ? threeYearCagr : null,
  };
}
