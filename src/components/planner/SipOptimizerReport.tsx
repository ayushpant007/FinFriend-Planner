

"use client";

import type { SipOptimizerReportData, SipOptimizerGoal, Asset, RetirementCalculations, LifeInsuranceQuote, HealthInsuranceQuote, FundAllocation, ChartDataPoint, GoalWithCalculations, RetirementInputs, FundReturnsOutput, ReportSections } from '@/lib/types';
import type { RiskMetrics } from '@/lib/risk-metrics';
import { Button } from '../ui/button';
import { Printer, Phone, Mail, User, Calendar, Users, Target, ArrowRight, AlertTriangle, Info, Goal as GoalIcon, ShieldCheck, Wallet, PiggyBank, Briefcase, FileText, CheckCircle, TrendingUp, Banknote, CandlestickChart, Gem, Building, Calculator, BarChart3, Check, X, Download, LineChart, Loader2, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AssetAllocationChart } from '../charts/AssetAllocationChart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { getAssetAllocation, calculateAge } from '@/lib/calculations';
import { getFundReturns } from '@/ai/flows/fund-returns-flow';
import { getModelPortfolioData } from '@/ai/flows/model-portfolio-flow';
import { PortfolioNiftyChart } from '../charts/PortfolioNiftyChart';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';


const logoUrl = "/financial-friend-logo.png";

interface Props {
  data: SipOptimizerReportData & { goalsWithCalculations: GoalWithCalculations[] };
  isPreview?: boolean;
}

const formatCurrency = (value: number | '', prefix = 'Rs.') => {
    const num = typeof value === 'number' ? value : 0;
    if (isNaN(num)) return `${prefix}0`;
    return `${prefix}${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
        return format(new Date(dateString), "dd MMM yyyy");
    } catch {
        return dateString;
    }
};

const formatYears = (years: number) => {
    if (!isFinite(years) || years <= 0 || isNaN(years)) return 'N/A';
    const y = Math.floor(years);
    const m = Math.round((years - y) * 12);
    if (y > 0 && m > 0) return `${y}Y ${m}M`;
    if (y > 0) return `${y}Y`;
    if (m > 0) return `${m}M`;
    return '0M';
}

type AllocationReturns = {
    oneYearReturn: string | null;
    threeYearReturn: string | null;
    fiveYearReturn: string | null;
    sevenYearReturn: string | null;
    tenYearReturn: string | null;
    currentNav: string | null;
};

const fetchAllocationReturns = async (alloc: FundAllocation): Promise<AllocationReturns | null> => {
    if (!alloc.schemeCode) return null;

    try {
        const response = await fetch('/api/allocation/fund-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                schemeCode: alloc.schemeCode,
                schemeName: alloc.schemeName,
                fundCategory: alloc.fundCategory,
            }),
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.flatReturns ?? null;
    } catch (error) {
        console.error(`Failed to load CSV returns for ${alloc.schemeName}`, error);
        return null;
    }
};

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
    <div className="flex items-start gap-3 print:gap-2">
        <div className="bg-pink-50 rounded-full p-1.5 print:bg-pink-50">
            <Icon className="h-4 w-4 text-pink-800" />
        </div>
        <div>
            <p className="text-xs text-pink-900/70 font-medium">{label}</p>
            <p className="font-bold text-pink-950 text-sm">{value}</p>
        </div>
    </div>
);

const DetailItemWhite = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
    <div className="flex items-start gap-3 print:gap-2">
         <div className="bg-gray-100 rounded-full p-1.5 print:bg-gray-100">
            <Icon className="h-4 w-4 text-gray-600" />
        </div>
        <div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="font-bold text-gray-800 text-sm">{value}</p>
        </div>
    </div>
);

const InsuranceQuoteFeature = ({ label, value }: { label: string, value?: string | number | null }) => {
    let displayValue: React.ReactNode = <X className="h-4 w-4 text-red-500" />;
    let valueClass = "text-red-600";

    if (value === 'Covered' || value === 'Included' || value === 'No cap' || (typeof value === 'string' && value.startsWith('('))) {
        displayValue = <Check className="h-4 w-4 text-green-500" />;
        valueClass = "text-green-700";
    } else if (value) {
        displayValue = value;
        valueClass = "text-gray-800"
    }

    return (
        <div className="flex justify-between items-center text-xs py-1.5 border-b last:border-b-0">
            <p className="text-gray-600">{label}</p>
            <p className={cn("font-semibold", valueClass)}>{displayValue}</p>
        </div>
    );
};


const LifeInsuranceQuoteCard = ({ quote }: { quote: LifeInsuranceQuote }) => (
    <Card className="bg-white border-blue-200 mt-4">
        <CardHeader>
            <CardTitle className="text-md text-blue-800">{quote.planName || 'Life Insurance Plan'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
             <div className="flex justify-between"><p>Cover Amount:</p><p className="font-bold roboto">{formatCurrency(quote.coverAmount)}</p></div>
             <div className="flex justify-between"><p>Premium:</p><p className="font-bold roboto">{formatCurrency(quote.premiumAmount)}</p></div>
             <div className="flex justify-between"><p>Policy Term:</p><p className="font-bold roboto">{quote.policyTerm}</p></div>
             <div className="flex justify-between"><p>Premium Payment Term:</p><p className="font-bold roboto">{quote.premiumPaymentTerm}</p></div>
        </CardContent>
    </Card>
);

const HealthInsuranceQuoteCard = ({ quote }: { quote: HealthInsuranceQuote }) => (
    <Card className="bg-white border-green-200 mt-4">
        <CardHeader>
             <p className="text-xs text-gray-500">{quote.company || 'Health Insurance'}</p>
            <CardTitle className="text-md text-green-800 -mt-1">{quote.planName || 'Health Insurance Plan'}</CardTitle>
        </CardHeader>
        <CardContent>
             <div className="flex justify-between items-baseline mb-3">
                <p className="font-bold text-lg roboto">{quote.sumAssured || 'N/A'}</p>
                <p className="text-sm">Premium: <span className="font-bold roboto">{formatCurrency(quote.premium1Y)}</span></p>
             </div>
             <div className="space-y-1">
                <InsuranceQuoteFeature label="Pre-Hospitalization" value={quote.preHospitalization} />
                <InsuranceQuoteFeature label="Post-Hospitalization" value={quote.postHospitalization} />
                <InsuranceQuoteFeature label="Waiting Period (PED)" value={quote.waitingPeriodPED} />
                <InsuranceQuoteFeature label="Room Rent" value={quote.roomRent} />
                <InsuranceQuoteFeature label="Restore Benefit" value={quote.restoreBenefit} />
                <InsuranceQuoteFeature label="Ambulance (Road)" value={quote.ambulanceRoad} />
                <InsuranceQuoteFeature label="Ambulance (Air)" value={quote.ambulanceAir} />
                <InsuranceQuoteFeature label="Health Check-up" value={quote.healthCheckup} />
                <InsuranceQuoteFeature label="E-Consultation" value={quote.eConsultation} />
             </div>
        </CardContent>
    </Card>
);


const AssetCard = ({
    icon,
    title,
    value,
    percentage,
    colorClass,
    isNonLiquid = false,
  }: {
    icon: React.ReactNode;
    title: string;
    value: number;
    percentage?: number;
    colorClass: string;
    isNonLiquid?: boolean;
  }) => (
    <Card className={cn("border-l-4", colorClass)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold roboto">{formatCurrency(value)}</div>
            {isNonLiquid ? (
                 <p className="text-xs text-muted-foreground">(Not in liquid portfolio)</p>
            ) : (
                <p className="text-xs text-muted-foreground">{percentage?.toFixed(2)}% of liquid portfolio</p>
            )}
        </CardContent>
    </Card>
);

const RetirementAnalysisCard = ({ calcs }: { calcs: RetirementCalculations }) => (
    <Card className="bg-blue-50/50 border border-blue-200">
        <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <Calculator className="h-5 w-5" />
                Retirement Planning Analysis
            </CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
            <Table>
                <TableBody>
                     <TableRow>
                        <TableCell className="font-medium">Years to Retirement</TableCell>
                        <TableCell className="text-right font-semibold roboto">{calcs.yearsToRetirement}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-medium">Inflated Monthly Expense</TableCell>
                        <TableCell className="text-right font-semibold roboto">{formatCurrency(calcs.inflatedMonthlyExpense)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-medium">Annual Expense at Retirement</TableCell>
                        <TableCell className="text-right font-semibold roboto">{formatCurrency(calcs.annualExpenseAtRetirement)}</TableCell>
                    </TableRow>
                     <TableRow className="bg-blue-100/50">
                        <TableCell className="font-bold">Required Retirement Corpus</TableCell>
                        <TableCell className="text-right font-bold roboto">{formatCurrency(calcs.requiredRetirementCorpus)}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">Monthly Investment Needed</TableCell>
                        <TableCell className="text-right font-semibold roboto">{formatCurrency(calcs.monthlyInvestmentNeeded)}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">Incremental Monthly Investment</TableCell>
                        <TableCell className="text-right font-semibold roboto">{formatCurrency(calcs.incrementalMonthlyInvestment)}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

const FundAllocationRow = ({ alloc, goalName, data }: { alloc: FundAllocation, goalName: string, data: SipOptimizerReportData & { goalsWithCalculations: GoalWithCalculations[] } }) => {
    const [returns, setReturns] = useState<AllocationReturns | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const shortenedSchemeName = useMemo(() => {
        if (!alloc.schemeName) return 'N/A';
        return alloc.schemeName
            .replace(/ - Regular Plan/gi, '')
            .replace(/ - Growth/gi, '')
            .replace(/ Growth/gi, '')
            .replace(/ Regular/gi, '')
            .replace(/ Plan/gi, '')
            .replace(/\(formerly.*?\)/gi, '')
            .trim();
    }, [alloc.schemeName]);

    useEffect(() => {
        let cancelled = false;

        const loadReturns = async () => {
            if (!alloc.schemeCode) {
                setReturns(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            const result = await fetchAllocationReturns(alloc);
            if (!cancelled) {
                setReturns(result);
                setIsLoading(false);
            }
        };

        loadReturns();
        return () => {
            cancelled = true;
        };
    }, [alloc.schemeCode, alloc.schemeName]);

    const getGoalDisplayName = (goalId: string) => {
        if (goalId === 'retirement') return 'Retirement Goal';
        if (goalId === 'wealth_accommodation') return 'Wealth Accommodation';
        if (goalId === 'education_goal') return 'Education Goal';
        if (goalId === 'home_goal') return 'Home Goal';
        if (goalId === 'child_planning') return 'Child Planning';
        const goal = data.goalsWithCalculations.find(g => g.id === goalId);
        if (!goal) return 'Unlinked';
        return goal.otherType || goal.name;
    };

    return (
        <TableRow className="text-[10px]">
            <TableCell className="font-bold max-w-[220px] py-3 px-2" style={{ fontSize: '10px' }}>
                <p className="leading-normal whitespace-normal break-words">{shortenedSchemeName}</p>
            </TableCell>
            <TableCell className="py-3 px-2">{getGoalDisplayName(alloc.goalId)}</TableCell>
            <TableCell className="py-3 px-2 font-semibold roboto">{formatCurrency(alloc.sipRequired, '')}</TableCell>
            <TableCell className="py-3 px-2 font-semibold roboto">{typeof alloc.lumpsumAmount === 'number' && alloc.lumpsumAmount > 0 ? formatCurrency(alloc.lumpsumAmount, '') : '-'}</TableCell>
            <TableCell className="py-3 px-2">{alloc.fundCategory}</TableCell>
            <TableCell className="text-center py-3 px-2 font-semibold">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : (returns?.threeYearReturn ?? 'N/A')}
            </TableCell>
            <TableCell className="text-center py-3 px-2 font-semibold">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : (returns?.fiveYearReturn ?? 'N/A')}
            </TableCell>
            <TableCell className="text-center py-3 px-2 font-semibold">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : (returns?.tenYearReturn ?? 'N/A')}
            </TableCell>
        </TableRow>
    );
};


const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#64748b'
];


import type { FundMetricsView } from '@/lib/funds-csv';

const categoryMatches = (fundCategory: string | undefined, target: string) => {
    if (!fundCategory) return false;
    const cat = fundCategory.toLowerCase();
    const tar = target.toLowerCase();
    return cat === tar || cat.startsWith(tar);
};


const FundDetailCard = ({ 
  alloc, 
  goalName, 
  formatCurrency,
  cachedBenchmarkData
}: { 
  alloc: FundAllocation, 
  goalName: string, 
  formatCurrency: (v: number | '') => string,
  cachedBenchmarkData?: { yearlyComparison: any[]; benchmarkName: string; riskMetrics: any; csvMetrics?: FundMetricsView } | null
}) => {
  const [returns, setReturns] = useState<FundReturnsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Initialize directly from cache — no flicker, no wait
  const [benchmarkComparison, setBenchmarkComparison] = useState<any[]>(
    cachedBenchmarkData?.yearlyComparison ?? []
  );
  const [benchmarkName, setBenchmarkName] = useState<string>(
    cachedBenchmarkData?.benchmarkName ?? ''
  );
  const [isLoadingBenchmark, setIsLoadingBenchmark] = useState(
    !cachedBenchmarkData || cachedBenchmarkData.yearlyComparison.length === 0
  );
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(
    cachedBenchmarkData?.riskMetrics ?? null
  );
  const [csvMetrics, setCsvMetrics] = useState<FundMetricsView | null>(
    cachedBenchmarkData?.csvMetrics ?? null
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!alloc.schemeCode) return;
      
      setIsLoading(true);
      const csvReturns = await fetchAllocationReturns(alloc);
      let liveReturns: FundReturnsOutput | null = null;

      try {
        // Keep the live lookup for current NAV, but prefer the same CSV-backed
        // CAGR values already shown in the fund allocation form.
        liveReturns = await getFundReturns({ schemeCode: Number(alloc.schemeCode) });
      } catch (error) {
        console.error(`Failed to fetch live NAV for ${alloc.schemeName}`, error);
      } finally {
        setReturns({
          threeYearReturn: csvReturns?.threeYearReturn ?? liveReturns?.threeYearReturn ?? null,
          fiveYearReturn: csvReturns?.fiveYearReturn ?? liveReturns?.fiveYearReturn ?? null,
          tenYearReturn: csvReturns?.tenYearReturn ?? liveReturns?.tenYearReturn ?? null,
          currentNav: liveReturns?.currentNav ?? csvReturns?.currentNav ?? null,
        });
        setIsLoading(false);
      }

      // Fetch data if missing from cache
      if (!cachedBenchmarkData || !cachedBenchmarkData.csvMetrics || cachedBenchmarkData.yearlyComparison.length === 0) {
        setIsLoadingBenchmark(true);
        try {
          // First try the allocation/fund-data endpoint (CSV-based, faster)
          const csvRes = await fetch('/api/allocation/fund-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schemeCode: alloc.schemeCode }),
          });

          if (csvRes.ok) {
            const csvData = await csvRes.json();
            if (csvData.yearlyComparison?.length > 0) {
              setBenchmarkComparison(csvData.yearlyComparison);
              setBenchmarkName(csvData.benchmarkName || 'Benchmark');
              const m = csvData.metrics || {};
              setRiskMetrics({ sharpeRatio: m.sharpe ?? null, sortinoRatio: m.sortino ?? null, beta: m.beta ?? null, jensensAlpha: m.alpha ?? null, standardDeviation: m.stdDev ?? null, threeYearRollingReturn: null, threeYearCagr: null } as RiskMetrics);
              setCsvMetrics(m as FundMetricsView);
              return;
            }
          }

          // Fallback to direct benchmark comparison
          const benchmarkResponse = await fetch('/api/fund-benchmark-comparison', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              schemeCode: Number(alloc.schemeCode),
              schemeName: alloc.schemeName,
              fundCategory: alloc.fundCategory
            })
          });

          if (benchmarkResponse.ok) {
            const benchmarkData = await benchmarkResponse.json();
            setBenchmarkComparison(benchmarkData.yearlyComparison || []);
            setBenchmarkName(benchmarkData.benchmarkName || 'Benchmark');
            setRiskMetrics(benchmarkData.riskMetrics || null);
          }
        } catch (error) {
          console.error(`Failed to fetch benchmark for ${alloc.schemeName}`, error);
        } finally {
          setIsLoadingBenchmark(false);
        }
      }
    };
    fetchData();
  }, [alloc.schemeCode]);

  const fmtNum = (v: number | null | undefined, digits = 2) =>
    v === null || v === undefined || Number.isNaN(v) ? 'N/A' : v.toFixed(digits);
  const fmtPct = (v: number | null | undefined, digits = 2) =>
    v === null || v === undefined || Number.isNaN(v) ? 'N/A' : `${v.toFixed(digits)}%`;

  return (
    <Card className="overflow-visible border-primary/20 bg-white shadow-sm">
      <CardHeader className="bg-slate-50/80 border-b py-3 px-4">
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">
              {alloc.fundCategory?.toUpperCase()} - {alloc.fundType?.toUpperCase()}
            </p>
            <CardTitle className="text-sm font-extrabold text-slate-900 leading-tight">
              {alloc.schemeName}
            </CardTitle>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">GOAL</p>
            <p className="text-xs font-black text-primary">{goalName}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-5">
        <div className="flex justify-between items-center bg-primary/5 rounded-lg p-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">SIP AMOUNT</p>
            <p className="text-lg font-black roboto text-primary">{formatCurrency(alloc.sipRequired)}</p>
          </div>
          <div className="space-y-0.5 border-l border-slate-200 pl-4">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">LUMPSUM</p>
            <p className="text-lg font-black roboto text-primary">{typeof alloc.lumpsumAmount === 'number' && alloc.lumpsumAmount > 0 ? formatCurrency(alloc.lumpsumAmount) : '-'}</p>
          </div>
          <div className="text-right space-y-0.5 border-l border-slate-200 pl-4">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">CURRENT NAV</p>
            <p className="text-lg font-black roboto text-slate-800">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin ml-auto" /> : (returns?.currentNav ? `Rs. ${returns.currentNav}` : 'N/A')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '3Y CAGR', val: returns?.threeYearReturn },
            { label: '5Y CAGR', val: returns?.fiveYearReturn },
            { label: '10Y CAGR', val: returns?.tenYearReturn }
          ].map((item, i) => (
            <div key={i} className="text-center p-2 rounded-md bg-slate-50 border border-slate-100">
              <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">{item.label}</p>
              <p className="text-xs font-black text-green-600">
                {isLoading ? '...' : (item.val || 'N/A')}
              </p>
            </div>
          ))}
        </div>

        {(riskMetrics || csvMetrics) && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 py-3 border-y border-dashed border-slate-200">
            {/* Equity Metrics */}
            {riskMetrics && !categoryMatches(alloc.fundCategory, 'Debt') && [
              { label: 'Sharpe Ratio', val: fmtNum(riskMetrics.sharpeRatio) },
              { label: 'Sortino Ratio', val: fmtNum(riskMetrics.sortinoRatio) },
              { label: 'Beta', val: fmtNum(riskMetrics.beta) },
              { label: "Jensen's Alpha", val: fmtPct(riskMetrics.jensensAlpha) },
              { label: 'Std Dev', val: fmtPct(riskMetrics.standardDeviation) },
              { label: '3Y Rolling', val: fmtPct(riskMetrics.threeYearRollingReturn) }
            ].map((metric, i) => (
              <div key={`eq-${i}`} className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-400">{metric.label}</span>
                <span className="font-black text-slate-800">{metric.val}</span>
              </div>
            ))}
            
            {/* Debt/Hybrid/Solutions Metrics */}
            {csvMetrics && (
              categoryMatches(alloc.fundCategory, 'Debt') || 
              categoryMatches(alloc.fundCategory, 'Hybrid') || 
              categoryMatches(alloc.fundCategory, 'Solution')
            ) && [
              { label: 'YTM', val: fmtPct(csvMetrics.ytm) },
              { label: 'Avg Maturity', val: csvMetrics.avgMaturity ? `${csvMetrics.avgMaturity} Yrs` : 'N/A' },
              { label: 'Mac Duration', val: csvMetrics.macaulayDuration ? `${csvMetrics.macaulayDuration} Yrs` : 'N/A' },
              { label: 'Credit Rating', val: csvMetrics.avgCreditRating || 'N/A' },
            ].map((metric, i) => (
              <div key={`db-${i}`} className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-400">{metric.label}</span>
                <span className="font-black text-slate-800">{metric.val}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-primary flex items-center gap-1.5 uppercase">
              <TrendingUp className="h-3 w-3" /> 10-Year Performance vs Benchmark
            </p>
            {benchmarkName && (
              <div className="flex items-center gap-2 text-[8px] font-bold">
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[#22C55E] rounded-full" /> Fund</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[#6366F1] rounded-full" /> {benchmarkName}</span>
              </div>
            )}
          </div>
          
          <div className="h-64 w-full">
            {isLoadingBenchmark ? (
              <div className="flex items-center justify-center h-full border rounded-lg border-dashed">
                <Loader2 className="h-5 w-5 animate-spin text-primary/30" />
              </div>
            ) : benchmarkComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={benchmarkComparison} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}
                    formatter={(v: any) => [`${parseFloat(v).toFixed(2)}%`, '']}
                  />
                  <ReferenceLine y={0} stroke="#cbd5e1" />
                  <Bar dataKey="fundReturn" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={30} isAnimationActive={false} />
                  <Bar dataKey="benchmarkReturn" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={30} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full border rounded-lg border-dashed bg-slate-50 text-[10px] font-bold text-slate-400">
                Benchmark data unavailable
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function SipOptimizerReport({ data: reportData, isPreview = false }: Props) {
  const data = reportData;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGeneratedForData, setReportGeneratedForData] = useState<string>("");

  const sections: ReportSections = data.sections || {
    netWorth: true,
    cashflow: true,
    investmentStatus: true,
    goalProjections: true,
    goalsBreakdown: true,
    assetAllocation: true,
    mutualFundPortfolio: true,
    insurance: true,
    estatePlanning: true,
    retirementPlanning: true,
    modelPortfolioAnalysis: true,
    equityWeightAnalysis: true,
    debtWeightAnalysis: true,
    hybridWeightAnalysis: true,
    solutionOrientedWeightAnalysis: true,
    othersWeightAnalysis: true,
    liquidAssetAllocation: true,
  };

  const isSimplified = (data as any).isSimplified;

  const [equityChartData, setEquityChartData] = useState<ChartDataPoint[] | null>(data.chartDataCache?.equity ?? null);
  const [debtChartData, setDebtChartData] = useState<ChartDataPoint[] | null>(data.chartDataCache?.debt ?? null);
  const [hybridChartData, setHybridChartData] = useState<ChartDataPoint[] | null>(data.chartDataCache?.hybrid ?? null);
  const [solutionOrientedChartData, setSolutionOrientedChartData] = useState<ChartDataPoint[] | null>(data.chartDataCache?.solutionOriented ?? null);
  const [otherChartData, setOtherChartData] = useState<ChartDataPoint[] | null>(data.chartDataCache?.other ?? null);
  

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const reportElement = document.getElementById('report-container');
    if (!reportElement) return;

    window.scrollTo(0, 0);

    try {
        setIsGenerating(true);
        toast({ title: "Generating PDF", description: "Capturing high-fidelity report... This may take a moment." });

        // Wait for all charts and dynamic content to settle
        await new Promise(resolve => setTimeout(resolve, 2000));

        // CAPTURE ENTIRE REPORT AS ONE GIANT CANVAS (Puppeteer-style fidelity)
        const canvas = await html2canvas(reportElement, {
            scale: 2, // High resolution
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#FFFFFF',
            logging: false,
            windowWidth: 800,
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById('report-container');
                if (el) {
                    el.style.width = '800px';
                    el.style.margin = '0';
                    el.style.padding = '20px';
                    el.style.transform = 'none';
                    el.style.height = 'auto';
                    el.style.overflow = 'visible';
                    // Ensure all cards are visible
                    el.querySelectorAll('.card').forEach(c => {
                        (c as HTMLElement).style.overflow = 'visible';
                    });
                    // Force recharts SVGs to fill their containers for ResponsiveContainer charts
                    el.querySelectorAll('.recharts-responsive-container').forEach(c => {
                        (c as HTMLElement).style.width = '100%';
                        (c as HTMLElement).style.minWidth = '0';
                    });
                    el.querySelectorAll('.recharts-wrapper').forEach(c => {
                        const wrapper = c as HTMLElement;
                        const parentWidth = wrapper.parentElement?.getBoundingClientRect().width || 760;
                        wrapper.style.width = `${parentWidth}px`;
                    });
                    el.querySelectorAll('.recharts-surface').forEach(c => {
                        const svg = c as SVGElement;
                        const parentWidth = (svg.parentElement?.getBoundingClientRect().width || 760);
                        svg.setAttribute('width', String(parentWidth));
                        svg.style.width = `${parentWidth}px`;
                    });
                }
            }
        });

        const imgWidth = 210; // Use standard A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: [imgWidth, imgHeight],
            compress: true
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

        pdf.save(`${data.personalDetails.name.replace(/\s+/g, '_')}_financial_report.pdf`);
        toast({ title: "Success", description: "Report downloaded successfully!" });
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ title: "Download Failed", description: "Could not generate PDF. Please try again.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  
  const additionalSipRequired = data.totalInvestmentStatus
    ? Math.max(0, data.totalInvestmentStatus.requiredInvestment - data.totalInvestmentStatus.currentInvestment)
    : 0;
  
  const handleViewDetailedReport = () => {
    const reportId = searchParams.get('id');
    if (reportId) {
      router.push(`/report?id=${reportId}`);
    } else {
      router.push('/report');
    }
  };

  const getNum = (val: number | '' | undefined) => (typeof val === 'number' ? val : 0);
  const getNumericValue = (amount: number | ''): number => typeof amount === 'number' ? amount : 0;
  
  const liquidAssets = (data.assets || [])
    .filter(a => a.type !== 'Real Estate' && a.type && typeof a.amount === 'number');
  
  const nonLiquidAssets = (data.assets || []).filter(a => a.type === 'Real Estate' && a.type && typeof a.amount === 'number');
  
  const totalLiquidAssets = liquidAssets.reduce((sum, asset) => sum + getNumericValue(asset.amount), 0);

  const assetCategories = [
    { name: 'Indian Equity shares', icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />, color: 'hsl(var(--chart-1))' },
    { name: 'Fixed Income instruments', icon: <Banknote className="h-4 w-4 text-muted-foreground" />, color: 'hsl(var(--chart-2))' },
    { name: 'PPF', icon: <Briefcase className="h-4 w-4 text-muted-foreground" />, color: 'hsl(var(--chart-3))' },
    { name: 'EPF', icon: <Briefcase className="h-4 w-4 text-muted-foreground" />, color: 'hsl(var(--chart-3))' },
    { name: 'NPS', icon: <Briefcase className="h-4 w-4 text-muted-foreground" />, color: 'hsl(var(--chart-3))' },
    { name: 'Gold/Gold Bond/ETF/Fund', icon: <Gem className="h-4 w-4 text-muted-foreground" />, color: 'hsl(var(--chart-4))' },
    { name: 'Insurance', icon: <ShieldCheck className="h-4 w-4 text-muted-foreground" />, color: 'hsl(var(--chart-5))' },
    { name: 'Other', icon: <Briefcase className="h-4 w-4 text-muted-foreground" />, color: 'hsl(var(--chart-5))' },
  ];

  const aggregatedLiquidAssets = assetCategories.map(category => {
    const assetsInCategory = liquidAssets.filter(asset => {
        if (category.name === 'Other') {
            return !assetCategories.slice(0, -1).map(c => c.name).includes(asset.type)
        }
        return asset.type === category.name;
    });
    const totalValue = assetsInCategory.reduce((sum, asset) => sum + getNumericValue(asset.amount), 0);
    return {
      name: category.name,
      value: totalValue,
      icon: category.icon,
      color: category.color,
      percentage: totalLiquidAssets > 0 ? (totalValue / totalLiquidAssets) * 100 : 0,
    };
  }).filter(category => category.value > 0);

  const recommendedAllocation = data.assetAllocationProfile 
    ? getAssetAllocation(data.assetAllocationProfile.age, data.assetAllocationProfile.riskAppetite)
    : { equity: 0, debt: 0, hybrid: 0 };

  const portfolioAnalysis = useMemo(() => {
    if (!data.fundAllocations) return { equity: 0, hybrid: 0, debt: 0 };
    const equityTotal = data.fundAllocations.filter(a => a.fundCategory === 'Equity').reduce((sum, a) => sum + getNum(a.sipRequired), 0);
    const hybridTotal = data.fundAllocations.filter(a => a.fundCategory === 'Hybrid').reduce((sum, a) => sum + getNum(a.sipRequired), 0);
    const debtTotal = data.fundAllocations.filter(a => a.fundCategory === 'Debt').reduce((sum, a) => sum + getNum(a.sipRequired), 0);
    return { equity: equityTotal, hybrid: hybridTotal, debt: debtTotal };
  }, [data.fundAllocations?.length]);
  const getFundWeights = (category: string) => {
    const categoryAllocations = data.fundAllocations.filter(a => {
      const cached = data.fundBenchmarkCache?.[a.schemeCode];
      const csvCategory = cached?.csvMetrics?.category;
      return (categoryMatches(a.fundCategory, category) || categoryMatches(csvCategory, category)) && 
             (getNum(a.sipRequired) > 0 || getNum(a.lumpsumAmount) > 0) && 
             a.schemeCode;
    });
    const totalCategoryValue = categoryAllocations.reduce((sum, a) => sum + getNum(a.sipRequired) + getNum(a.lumpsumAmount), 0);
    if (totalCategoryValue === 0) return [];
    return categoryAllocations.map(alloc => ({
        ...alloc,
        goalName: alloc.goalId === 'retirement' ? 'Retirement Goal' :
                  alloc.goalId === 'wealth_accommodation' ? 'Wealth Accommodation' :
                  alloc.goalId === 'education_goal' ? 'Education Goal' :
                  alloc.goalId === 'home_goal' ? 'Home Goal' :
                  alloc.goalId === 'child_planning' ? 'Child Planning' :
                  (data.goalsWithCalculations?.find(g => g.id === alloc.goalId)?.name || 'Unlinked'),
        weight: ((getNum(alloc.sipRequired) + getNum(alloc.lumpsumAmount)) / totalCategoryValue) * 100,
        fundType: alloc.fundType || 'N/A'
    }));
  };

  const equityFundWeights = useMemo(() => getFundWeights('Equity'), [data.fundAllocations, data.goalsWithCalculations]);
  const debtFundWeights = useMemo(() => getFundWeights('Debt'), [data.fundAllocations, data.goalsWithCalculations]);
  const hybridFundWeights = useMemo(() => getFundWeights('Hybrid'), [data.fundAllocations, data.goalsWithCalculations]);
  const solutionOrientedFundWeights = useMemo(() => getFundWeights('Solution'), [data.fundAllocations, data.goalsWithCalculations]);
  const otherFundWeights = useMemo(() => getFundWeights('Other'), [data.fundAllocations, data.goalsWithCalculations]);


  return (
    <div className="bg-gray-100 text-gray-800 font-sans">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;700&display=swap');
        
        #report-container * {
            font-family: 'Poppins', 'Roboto', sans-serif !important;
        }
        .roboto {
            font-family: 'Roboto', sans-serif !important;
        }

           #report-container h3 { font-size: 10px !important; }
           #report-container h4 { font-size: 9px !important; }
        /* =========================================
           PIXEL-PERFECT PDF FIX STRATEGY
           ========================================= */
        
        /* 1. Global Box Sizing */
        #report-container, #report-container * {
          box-sizing: border-box !important;
        }

        /* 2. Body & Layout Reset */
        @page {
          size: A4;
          margin: 12mm; /* User requested: 12mm */
        }

        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            orphans: 3;
            widows: 3;
          }

          #report-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            overflow: visible !important;
            display: block !important;
            position: relative !important;
            transform: none !important;
            height: auto !important;
          }
           /* 3. Hide print-irrelevant elements */
          .no-print {
            display: none !important;
          }
          
          /* 4. Section & Card Pagination */
          section, .pdf-section {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .glass-card,
          .card,
          .print-avoid-break,
          #report-container div.glass-card,
          #report-container div.border,
          #report-container .rounded-xl,
          #report-container .rounded-lg {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 20px !important;
            display: block !important;
          }

          .recharts-responsive-container {
            width: 100% !important;
            height: 250px !important;
            min-height: 250px !important;
          }

          header div.relative {
            width: 192px !important;
            height: 48px !important;
          }

          header img {
            width: 192px !important;
            height: 48px !important;
            object-fit: contain !important;
          }

          /* Ensure tables still behave like tables where possible, or blocks */
          table {
            display: table !important;
            page-break-inside: auto !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          thead {
            display: table-header-group !important;
          }
          
          tr {
            display: table-row !important;
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          /* 5. Prevent Clipping */
          img {
            max-width: 100% !important;
            height: auto !important;
          }

          /* 6. Typography */
          h1, h2, h3, h4, h5 {
            page-break-after: avoid !important;
          }
          
          /* Remove specific problematic attributes */
          .h-full, .h-screen, .min-h-screen {
            height: auto !important;
            min-height: 0 !important;
          }
        }

        /* Screen view adjustments to match print structure */
        #report-container {
          overflow: visible !important;
          height: auto !important;
          min-height: min-content !important;
        }

        .pdf-section {
          overflow: visible !important;
          height: auto !important;
          width: 100% !important;
          display: block !important;
        }

        /* Debug Trick (Uncomment if needed) */
        /* 
        #report-container * {
          outline: 1px solid rgba(255, 0, 0, 0.1);
        }
        */
      `}</style>
      
      <div className="container mx-auto flex justify-end p-4 gap-4 no-print">
        <Button onClick={handlePrint} variant="default">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
        </Button>
        <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
        </Button>
        <Button onClick={handleViewDetailedReport} variant="outline">
            View Detailed Report
            <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div id="report-container" className="w-[210mm] min-h-fit mx-auto p-6 shadow-2xl border flex flex-col" style={{
        background: "linear-gradient(to bottom, #FEE7E7, #FFFFFF 60%, #FFFFFF 40%, #FFFFFF 10%)"
      }}>
        {/* Header */}
        <header className="p-4 pt-8 rounded-t-lg bg-pink-100 print:bg-pink-100 print-avoid-break flex justify-between items-center border-b border-pink-200">
            <div className="h-12 w-48">
              <img
                src={logoUrl}
                alt="Financial Friend Logo"
                style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
            <div className="text-right text-xs">
              <p><strong>RM name:</strong> {data.advisorDetails?.arnName || 'N/A'}</p>
              <p><strong>Mobile no:</strong> {data.advisorDetails?.mobile || 'N/A'}</p>
              <p><strong>Email:</strong> {data.advisorDetails?.email || 'N/A'}</p>
            </div>
        </header>


        <section className="text-center py-6 bg-white pdf-section px-4 print:bg-white print-avoid-break overflow-visible pb-2">
            <h1 className="text-xl font-bold text-gray-800 tracking-wide">Financial Planning Report</h1>
        </section>

        {/* Investor Details */}
        <section className="bg-white p-1 pdf-section px-4 print:bg-white print-avoid-break overflow-visible pb-2">
          <div className="p-3 rounded-lg bg-gray-100 text-center print:bg-gray-100 mb-3">
              <h3 className="font-bold text-gray-700">Personal Details</h3>
          </div>
          <div className="rounded-lg shadow-sm border overflow-hidden">
            <div className="grid grid-cols-2 print:grid-cols-2">
              <div className="bg-pink-50 p-4 space-y-4 print:bg-pink-50">
                <DetailItem icon={User} label="Name" value={data.personalDetails?.name || 'N/A'} />
                <DetailItem icon={Calendar} label="Date of Birth" value={formatDate(data.personalDetails?.dob || '')} />
                <DetailItem icon={User} label="Current Age" value={data.personalDetails?.dob ? `${calculateAge(data.personalDetails.dob)} Years` : 'N/A'} />
                <DetailItem icon={Users} label="Dependents" value={data.personalDetails?.dependents || 0} />
              </div>
              <div className="bg-white p-4 space-y-4 print:bg-white">
                <DetailItemWhite icon={Target} label="Retirement Age" value={data.personalDetails?.retirementAge ? `${data.personalDetails.retirementAge} Years` : 'N/A'} />
                <DetailItemWhite icon={Calculator} label="Years to Retirement" value={(data.personalDetails?.retirementAge && data.personalDetails?.dob) ? `${Number(data.personalDetails.retirementAge) - Number(calculateAge(data.personalDetails.dob))} Years` : 'N/A'} />
                <DetailItemWhite icon={Phone} label="Mobile No." value={data.personalDetails?.mobile || 'N/A'} />
                <DetailItemWhite icon={Mail} label="Email ID" value={data.personalDetails?.email || 'N/A'} />
              </div>
            </div>
          </div>
        </section>

        {sections.netWorth && (
          <section className="mt-4 pdf-section px-4 print-avoid-break overflow-visible pb-2">
              <div className="p-3 rounded-lg bg-gray-100 text-center print:bg-gray-100">
                  <h3 className="font-bold text-gray-700">Your Net Worth</h3>
              </div>
              <div className="mt-3 text-center">
                  <p className="text-4xl font-bold roboto text-blue-700">{formatCurrency(data.netWorth)}</p>
              </div>
          </section>
        )}

        <div className={isPreview ? 'relative' : ''}>
        {isPreview && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-start pt-24 pointer-events-none" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(255,255,255,0.4)' }}>
            <div className="pointer-events-auto bg-white border border-gray-200 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Unlock Full Report</h3>
              <p className="text-gray-500 text-sm mb-6">You're on the Free plan. Upgrade to Core or Pro to access the complete financial report with all sections.</p>
              <a href="/" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
                Upgrade Now
              </a>
              <a href="/" className="block mt-3 text-xs text-gray-400 hover:underline">Back to Planner</a>
            </div>
          </div>
        )}
        {sections.cashflow && (
          <section className="mt-4 pdf-section px-4 print-avoid-break overflow-visible pb-2">
            <div className="p-3 rounded-lg bg-gray-100 text-center print:bg-gray-100">
                <h3 className="font-bold text-gray-700">Your Monthly Cashflow Summary</h3>
            </div>
            <div className="mt-3 relative h-12 bg-gray-200 rounded-full overflow-visible print:bg-gray-200 mb-6">
                <div className="absolute inset-0 flex rounded-full overflow-hidden">
                    <div className="bg-red-400 h-full print:bg-red-400" style={{ width: `${((data.cashflow?.totalMonthlyExpenses || 0) / (data.cashflow?.totalMonthlyIncome || 1)) * 100}%` }}></div>
                    <div className="bg-green-400 h-full print:bg-green-400" style={{ width: `${((data.cashflow?.investibleSurplus || 0) / (data.cashflow?.totalMonthlyIncome || 1)) * 100}%` }}></div>
                </div>
                 <div className="absolute inset-0 flex justify-between items-center px-6 text-white text-[10px] font-bold">
                    <span className="drop-shadow-sm">Total expenses ({formatCurrency(data.cashflow?.totalMonthlyExpenses || 0)})</span>
                    <span className="drop-shadow-sm">Investible Surplus ({formatCurrency(data.cashflow?.investibleSurplus || 0)})</span>
                </div>
            </div>
             <div className="flex justify-between mt-1 text-xs">
                <span>Total income ({formatCurrency(data.cashflow?.totalMonthlyIncome || 0)})</span>
                <span>This is what you must invest!</span>
             </div>
          </section>
        )}
        
        {sections.investmentStatus && data.totalInvestmentStatus && (
        <section className="mt-4 pdf-section px-4 print-avoid-break overflow-visible pb-2">
            <div className="p-3 rounded-lg bg-gray-100 text-center print:bg-gray-100">
                <h3 className="font-bold text-gray-700">Investment Status</h3>
            </div>
            <div className="mt-3">
                {(data.cashflow?.investibleSurplus || 0) >= (data.totalInvestmentStatus?.requiredInvestment || 0) ? (
                    <p className="text-sm text-center leading-relaxed">
                        Your investable surplus is sufficient to meet your required investments.
                        <br/>
                        <span 
                          style={{ display: 'inline-block', marginTop: '8px' }} 
                          className="font-bold text-green-600 bg-green-100 rounded-md px-2.5 py-1 mx-1 print:bg-green-100"
                        >
                            I must invest / month = I can invest / month
                        </span>
                    </p>
                ) : (
                    <p className="text-sm text-center leading-relaxed">
                        You are currently underinvesting and need an additional SIP of 
                        <span 
                          style={{ display: 'inline-block' }} 
                          className="font-bold text-red-600 bg-red-100 rounded-md px-1.5 py-0.5 mx-1 print:bg-red-100"
                        >
                          {formatCurrency(additionalSipRequired)}
                        </span>
                        per month to stay on track and achieve your goals.
                    </p>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3 text-center text-xs">
                <div className="border border-red-200 bg-red-50 p-2 rounded-lg print:bg-red-50">
                    <p className="text-gray-600">What I am investing</p>
                    <p className="font-bold text-red-700 roboto text-lg mt-1">{formatCurrency(data.totalInvestmentStatus.currentInvestment)}</p>
                    <p className="text-gray-500">Monthly</p>
                </div>
                <div className="border border-orange-200 bg-orange-50 p-2 rounded-lg print:bg-orange-50">
                    <p className="text-gray-600">What I must invest</p>
                    <p className="font-bold text-orange-700 roboto text-lg mt-1">{formatCurrency(data.totalInvestmentStatus.requiredInvestment)}</p>
                    <p className="text-gray-500">Monthly</p>
                </div>
                <div className="border border-green-200 bg-green-50 p-2 rounded-lg print:bg-green-50">
                    <p className="text-gray-600">What I can invest</p>
                    <p className="font-bold text-green-700 roboto text-lg mt-1">{formatCurrency(data.totalInvestmentStatus.potentialInvestment)}</p>
                    <p className="text-gray-500">Monthly</p>
                </div>
            </div>
             <p className="text-xs text-gray-500 mt-2 text-left">The "What I can invest" indicates your maximum potential monthly SIP, enabling you to fast-track your progress toward achieving your goals.</p>
        </section>
        )}

        {sections.goalProjections && data.goalsWithCalculations && data.goalsWithCalculations.length > 0 && (
          <section className="mt-4 pdf-section px-4 print-avoid-break overflow-visible pb-2">
            <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                <h3 className="font-bold text-gray-700">Financial Goal Details</h3>
            </div>
            <Card className="bg-white border">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead style={{ height: 'auto' }} className="h-auto py-3">Goal Name</TableHead>
                                <TableHead style={{ height: 'auto' }} className="h-auto py-3">Target Corpus (Today's Value)</TableHead>
                                <TableHead style={{ height: 'auto' }} className="h-auto py-3">Years to Goal</TableHead>
                                <TableHead style={{ height: 'auto' }} className="h-auto py-3">Current Savings for Goal</TableHead>
                                <TableHead style={{ height: 'auto' }} className="h-auto py-3">Current Monthly SIP</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                            {data.goalsWithCalculations.map((goal, index) => (
                                <TableRow key={goal.id}>
                                    <TableCell className="font-medium">{goal.name || `Goal ${index + 1}`}</TableCell>
                                    <TableCell>{formatCurrency(goal.corpus)}</TableCell>
                                    <TableCell>{goal.years}</TableCell>
                                    <TableCell>{formatCurrency(goal.currentSave)}</TableCell>
                                    <TableCell>{formatCurrency(goal.currentSip)}</TableCell>
                                </TableRow>
                            ))}
                            {data.retirementCalculations && data.retirementInputs && (data.retirementCalculations.yearsToRetirement > 0 || data.retirementCalculations.requiredRetirementCorpus > 0 || Number(data.retirementInputs.currentSavings) > 0 || Number(data.retirementInputs.currentSip) > 0) && (
                                <TableRow>
                                    <TableCell className="font-medium">Retirement</TableCell>
                                    <TableCell>{formatCurrency(data.retirementCalculations.requiredRetirementCorpus)}</TableCell>
                                    <TableCell>{data.retirementCalculations.yearsToRetirement}</TableCell>
                                    <TableCell>{formatCurrency(data.retirementInputs.currentSavings)}</TableCell>
                                    <TableCell>{formatCurrency(data.retirementInputs.currentSip)}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </section>
        )}
        
        {sections.goalsBreakdown && (
          <section className="mt-4 pdf-section px-4 print-avoid-break overflow-visible pb-2">
              <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                  <h3 className="font-bold text-gray-700">Goals Breakdown</h3>
              </div>
              <div className="overflow-x-auto text-xs space-y-4">
                  {Array.isArray(data.goals) && data.goals.length > 0 && data.goals.map(goal => {
                      const expectedCorpusMustInvest = goal.targetCorpus * Math.pow(1.06, goal.timeline.required);
                      
                      return (
                          <div key={goal.id} className="border-b pb-4 last:border-b-0">
                              <h3 className="font-bold text-base text-gray-800 mb-2">{goal.name}</h3>
                              <div className="grid grid-cols-3 gap-2">
                                  <div className="p-2 rounded-lg border border-red-200 bg-red-50 print:bg-red-50">
                                      <h4 className="text-center font-semibold text-red-700 mb-2">What I am investing / Month</h4>
                                      <div className="flex flex-col items-center text-center space-y-1">
                                          <div className="flex flex-col"><span className="text-gray-500 text-[10px]">Current SIP</span><span className="font-bold roboto text-sm">{formatCurrency(goal.investmentStatus.currentInvestment)}</span></div>
                                          <div className="flex flex-col"><span className="text-gray-500 text-[10px]">Time</span><span className="font-bold roboto text-sm">{formatYears(goal.timeline.current)}</span></div>
                                          <div className="flex flex-col"><span className="text-gray-500 text-[10px]">Goal Amt</span><span className="font-bold roboto text-sm">{formatCurrency(goal.potentialCorpus)}</span></div>
                                      </div>
                                  </div>
                                  <div className="p-2 rounded-lg border border-orange-200 bg-orange-50 print:bg-orange-50">
                                      <h4 className="text-center font-semibold text-orange-700 mb-2">What I must invest / Month</h4>
                                      <div className="flex flex-col items-center text-center space-y-1">
                                          <div className="flex flex-col"><span className="text-gray-500 text-[10px]">Required SIP</span><span className="font-bold roboto text-sm">{formatCurrency(Math.round(goal.investmentStatus.requiredInvestment / 100) * 100)}</span></div>
                                          <div className="flex flex-col"><span className="text-gray-500 text-[10px]">Time</span><span className="font-bold roboto text-sm">{formatYears(goal.timeline.required)}</span></div>
                                          <div className="flex flex-col"><span className="text-gray-500 text-[10px]">Expected Corpus</span><span className="font-bold roboto text-sm">{formatCurrency(expectedCorpusMustInvest)}</span></div>
                                      </div>
                                  </div>
                                  <div className="p-2 rounded-lg border border-green-200 bg-green-50 print:bg-green-50">
                                      <h4 className="text-center font-semibold text-green-700 mb-2">What I can invest / Month</h4>
                                      <div className="flex flex-col items-center text-center space-y-1">
                                          <div className="flex flex-col"><span className="text-gray-500 text-[10px]">Allocated SIP</span><span className="font-bold roboto text-sm">{formatCurrency(Math.round(goal.investmentStatus.allocatedInvestment / 100) * 100)}</span></div>
                                          <div className="flex flex-col"><span className="text-gray-500 text-[10px]">Time</span><span className="font-bold roboto text-sm">{formatYears(goal.timeline.potential)}</span></div>
                                          <div className="flex flex-col"><span className="text-gray-500 text-[10px]">Expected Corpus</span><span className="font-bold roboto text-sm">{formatCurrency(goal.futureValue)}</span></div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </section>
        )}

        {sections.goalProjections && data.wealthCreationGoal && (
          <section className="mt-4 pdf-section px-4 print-avoid-break overflow-visible pb-2">
            <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                <h3 className="font-bold text-gray-700">Wealth Creation</h3>
            </div>
            <div className="p-4 rounded-lg border border-teal-200 bg-teal-50 print:bg-teal-50">
                <p className="text-center text-sm text-teal-800 mb-3">Your surplus cashflow after funding all goals has been allocated to wealth creation.</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-xs text-gray-600">Monthly SIP</p>
                        <p className="font-bold text-teal-700 roboto text-lg mt-1">{formatCurrency(data.wealthCreationGoal.sip)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600">Time Horizon</p>
                        <p className="font-bold text-teal-700 roboto text-lg mt-1">{data.wealthCreationGoal.years} Years</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600">Projected Wealth</p>
                        <p className="font-bold text-teal-700 roboto text-lg mt-1">{formatCurrency(data.wealthCreationGoal.projectedCorpus)}</p>
                    </div>
                </div>
            </div>
          </section>
        )}

        {sections.retirementPlanning && data.retirementCalculations && (
          <section className="mt-4 pdf-section px-4 print-avoid-break overflow-visible pb-2">
            <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                <h3 className="font-bold text-gray-700">Retirement Planning Analysis</h3>
            </div>
            <RetirementAnalysisCard calcs={data.retirementCalculations} />
          </section>
        )}
        
        {sections.estatePlanning && data.willStatus && (
        <section className="mt-4 pdf-section px-4 overflow-visible pb-6">
            <div className="p-3 rounded-lg bg-gray-100 text-center mb-4 print:bg-gray-100">
                <h3 className="font-bold text-gray-700">Estate Planning</h3>
            </div>
            {data.willStatus === 'yes' ? (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-green-200 bg-green-50 text-green-800 shadow-sm print:bg-green-50">
                    <CheckCircle className="h-8 w-8 shrink-0 text-green-600"/>
                    <div className="flex flex-col">
                        <p className="font-bold text-lg leading-tight text-green-900">Estate Planning Completed</p>
                        <p className="text-sm text-green-700">Your wealth transfer strategy is securely in place.</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-4 p-4 rounded-xl border border-orange-200 bg-orange-50 text-orange-800 shadow-sm print:bg-orange-50">
                    <AlertTriangle className="h-8 w-8 shrink-0 text-orange-600 mt-1"/>
                    <div className="flex flex-col">
                        <p className="font-bold text-lg leading-tight text-orange-900">Estate Planning Pending</p>
                        <p className="text-sm text-orange-700">We strongly recommend initiating this to ensure smooth wealth transfer for your family.</p>
                    </div>
                </div>
            )}
        </section>
        )}
        


        {sections.assetAllocation && recommendedAllocation && Object.entries(recommendedAllocation).some(([key, val]) => val > 0 && key !== 'Expected Return') && (
          <section className="mt-4 pdf-section px-4 print-avoid-break overflow-visible pb-2">
            <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                <h3 className="font-bold text-gray-700">Recommended Asset Allocation</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
              <div className="w-full md:w-2/3">
                <div className="rounded-lg border bg-white p-2 text-xs">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ height: 'auto' }} className="h-auto py-2.5">Asset Category</TableHead>
                        <TableHead style={{ height: 'auto' }} className="h-auto py-2.5 text-right">Allocation (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(recommendedAllocation).map(([key, value]) => {
                        if (value > 0 && key !== 'Expected Return') {
                          return (
                            <TableRow key={key}>
                              <TableCell className="font-medium py-2">{key}</TableCell>
                              <TableCell className="text-right font-bold py-2">{value}%</TableCell>
                            </TableRow>
                          );
                        }
                        return null;
                      })}
                      {recommendedAllocation['Expected Return'] !== undefined && (
                        <TableRow className="font-bold bg-gray-50 print:bg-gray-50">
                          <TableCell className="py-2">Expected Portfolio Return</TableCell>
                          <TableCell className="text-right font-bold py-2">{recommendedAllocation['Expected Return']}%</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </section>
        )}

             {sections.mutualFundPortfolio && data.fundAllocations && data.fundAllocations.length > 0 && (
            <>
            <section className="mt-4 pdf-section print-avoid-break">
                <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                    <h3 className="font-bold text-gray-700">Fund Allocation & Analysis</h3>
                </div>
                 <p className="text-xs text-gray-600 mb-3">
                    This section details your chosen mutual fund allocations for each goal, their historical returns, and an analysis of your model portfolio.
                 </p>
                 
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Fund Allocations by Goal & Returns (CAGR)</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto text-xs">
                        <Table>
                            <TableHeader>
                                <TableRow className="text-[10px] bg-gray-50/50">
                                    <TableHead className="w-[35%] py-2 px-1">Scheme</TableHead>
                                    <TableHead className="py-2 px-1 text-center">Goal</TableHead>
                                    <TableHead className="py-2 px-1 text-center">SIP</TableHead>
                                    <TableHead className="py-2 px-1 text-center">Lump</TableHead>
                                    <TableHead className="py-2 px-1 text-center">Category</TableHead>
                                    <TableHead className="text-center py-2 px-1">3Y</TableHead>
                                    <TableHead className="text-center py-2 px-1">5Y</TableHead>
                                    <TableHead className="text-center py-2 px-1">10Y</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.fundAllocations.map(alloc => (
                                    <FundAllocationRow 
                                        key={alloc.id} 
                                        alloc={alloc} 
                                        goalName={alloc.goalId === 'retirement' ? 'Retirement Goal' :
                                                  alloc.goalId === 'wealth_accommodation' ? 'Wealth Accommodation' :
                                                  alloc.goalId === 'education_goal' ? 'Education Goal' :
                                                  alloc.goalId === 'home_goal' ? 'Home Goal' :
                                                  alloc.goalId === 'child_planning' ? 'Child Planning' :
                                                  (data.goalsWithCalculations.find(g => g.id === alloc.goalId)?.name || 'Unlinked')} 
                                        data={data}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                 </Card>
            </section>
 
             {sections.modelPortfolioAnalysis && (
               <section className="mt-4 pdf-section px-4 print-avoid-break overflow-visible pb-2">
                <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                    <h3 className="font-bold text-gray-700">Model Portfolio Analysis</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6 mb-6">
                  {data.fundAllocations?.map(alloc => (
                    <FundDetailCard 
                      key={alloc.id}
                      alloc={alloc}
                      goalName={alloc.goalId === 'retirement' ? 'Retirement Goal' :
                                alloc.goalId === 'wealth_accommodation' ? 'Wealth Accommodation' :
                                alloc.goalId === 'education_goal' ? 'Education Goal' :
                                alloc.goalId === 'home_goal' ? 'Home Goal' :
                                alloc.goalId === 'child_planning' ? 'Child Planning' :
                                (data.goalsWithCalculations?.find(g => g.id === alloc.goalId)?.otherType || data.goalsWithCalculations?.find(g => g.id === alloc.goalId)?.name || 'Unlinked')}
                      formatCurrency={formatCurrency}
                      cachedBenchmarkData={data.fundBenchmarkCache?.[alloc.schemeCode] ?? null}
                    />
                  ))}
                </div>
               </section>
             )}

             <div className="grid grid-cols-1 gap-4 mt-4">
                 {sections.equityWeightAnalysis && (
                    <section className="mt-4 pdf-section px-4 overflow-visible pb-2">
                    <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                        <h3 className="font-bold text-gray-700">Equity Fund Weight Analysis</h3>
                    </div>
                     <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fund Name</TableHead>
                                    <TableHead>Fund Type</TableHead>
                                    <TableHead className="text-right">Weightage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="text-xs">
                                {equityFundWeights.length > 0 ? (
                                    equityFundWeights.map(fund => (
                                        <TableRow key={fund.id}>
                                            <TableCell className="font-medium">{fund.schemeName}</TableCell>
                                            <TableCell>{fund.fundType}</TableCell>
                                            <TableCell className="text-right font-bold text-primary roboto">{fund.weight.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-gray-500">
                                            No equity fund allocations.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                     </Card>
                     <div className="mt-4">
                        {equityChartData && equityChartData.length > 0 && (
                            <PortfolioNiftyChart 
                                data={equityChartData} 
                                isReport={true}
                                title="Equity Portfolio vs. Weighted Benchmark (Growth of Rs. 100)"
                            />
                        )}
                     </div>
                   </section>
                 )}

                 {sections.debtWeightAnalysis && debtFundWeights.length > 0 && (
                    <section className="mt-4 pdf-section">
                        <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                            <h3 className="font-bold text-gray-700">Debt Fund Weight Analysis</h3>
                        </div>
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                      <TableHead>Fund Name</TableHead>
                                      <TableHead>Fund Type</TableHead>
                                      <TableHead className="text-right">Weightage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="text-xs">
                                    {debtFundWeights.map(fund => (
                                        <TableRow key={fund.id}>
                                            <TableCell className="font-medium">{fund.schemeName}</TableCell>
                                            <TableCell>{fund.fundType}</TableCell>
                                            <TableCell className="text-right font-bold text-primary roboto">{fund.weight.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                        <div className="mt-4">
                            {debtChartData && debtChartData.length > 0 && (
                                <PortfolioNiftyChart data={debtChartData} isReport={true} title="Debt Portfolio vs. Weighted Benchmark (Growth of Rs. 100)"/>
                            )}
                        </div>
                    </section>
                  )}

                  {sections.hybridWeightAnalysis && hybridFundWeights.length > 0 && (
                    <section className="mt-4 pdf-section">
                        <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                            <h3 className="font-bold text-gray-700">Hybrid Fund Weight Analysis</h3>
                        </div>
                         <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                      <TableHead>Fund Name</TableHead>
                                      <TableHead>Fund Type</TableHead>
                                      <TableHead className="text-right">Weightage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="text-xs">
                                    {hybridFundWeights.map(fund => (
                                        <TableRow key={fund.id}>
                                            <TableCell className="font-medium">{fund.schemeName}</TableCell>
                                            <TableCell>{fund.fundType}</TableCell>
                                            <TableCell className="text-right font-bold text-primary roboto">{hybridFundWeights.length > 0 ? fund.weight.toFixed(2) : 0}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                         <div className="mt-4">
                            {hybridChartData && hybridChartData.length > 0 && (
                                <PortfolioNiftyChart data={hybridChartData} isReport={true} title="Hybrid Portfolio vs. Weighted Benchmark (Growth of Rs. 100)"/>
                            )}
                        </div>
                    </section>
                  )}

                  {sections.solutionOrientedWeightAnalysis && solutionOrientedFundWeights.length > 0 && (
                    <section className="mt-4 pdf-section">
                        <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                            <h3 className="font-bold text-gray-700">Solution Oriented Fund Weight Analysis</h3>
                        </div>
                         <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                      <TableHead>Fund Name</TableHead>
                                      <TableHead>Fund Type</TableHead>
                                      <TableHead className="text-right">Weightage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="text-xs">
                                    {solutionOrientedFundWeights.map(fund => (
                                        <TableRow key={fund.id}>
                                            <TableCell className="font-medium">{fund.schemeName}</TableCell>
                                            <TableCell>{fund.fundType}</TableCell>
                                            <TableCell className="text-right font-bold text-primary roboto">{fund.weight.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                         <div className="mt-4">
                            {solutionOrientedChartData && solutionOrientedChartData.length > 0 && (
                                <PortfolioNiftyChart data={solutionOrientedChartData} isReport={true} title="Solution Oriented Portfolio vs. Weighted Benchmark (Growth of Rs. 100)"/>
                            )}
                        </div>
                    </section>
                  )}
                  
                  {sections.othersWeightAnalysis && otherFundWeights.length > 0 && (
                    <section className="mt-4 pdf-section">
                        <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                            <h3 className="font-bold text-gray-700">Other Fund Weight Analysis</h3>
                        </div>
                         <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                      <TableHead>Fund Name</TableHead>
                                      <TableHead>Fund Type</TableHead>
                                      <TableHead className="text-right">Weightage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="text-xs">
                                    {otherFundWeights.map(fund => (
                                        <TableRow key={fund.id}>
                                            <TableCell className="font-medium">{fund.schemeName}</TableCell>
                                            <TableCell>{fund.fundType}</TableCell>
                                            <TableCell className="text-right font-bold text-primary roboto">{fund.weight.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                         <div className="mt-4">
                            {otherChartData && otherChartData.length > 0 && (
                                <PortfolioNiftyChart data={otherChartData} isReport={true} title="Other Portfolio vs. Weighted Benchmark (Growth of Rs. 100)"/>
                            )}
                        </div>
                    </section>
                  )}
             </div>
             </>
        )}

        {sections.insurance && data.insuranceAnalysis && (data.insuranceAnalysis.lifeInsurance.quotes.length > 0 || data.insuranceAnalysis.healthInsurance.quotes.length > 0) && (
            <section className="mt-4 pdf-section px-4 print-avoid-break overflow-visible pb-2">
                <div className="p-3 rounded-lg bg-gray-100 text-center mb-3 print:bg-gray-100">
                    <h3 className="font-bold text-gray-700">Insurance Quotation Analysis</h3>
                </div>

                {data.insuranceAnalysis.lifeInsurance.quotes.length > 0 && (
                    <div className="mb-6">
                        <h4 className="font-semibold text-lg text-blue-800 mb-2">Life Insurance Quotes</h4>
                        <Card>
                            <CardContent className="overflow-x-auto text-xs p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Plan Name</TableHead>
                                            <TableHead className="text-right">Cover Amount</TableHead>
                                            <TableHead className="text-right">Premium</TableHead>
                                            <TableHead>Policy Term</TableHead>
                                            <TableHead>Premium Term</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.insuranceAnalysis.lifeInsurance.quotes.map(quote => (
                                            <TableRow key={quote.id}>
                                                <TableCell className="font-bold">{quote.planName}</TableCell>
                                                <TableCell className="text-right roboto">{formatCurrency(quote.coverAmount)}</TableCell>
                                                <TableCell className="text-right roboto">{formatCurrency(quote.premiumAmount)}</TableCell>
                                                <TableCell>{quote.policyTerm}</TableCell>
                                                <TableCell>{quote.premiumPaymentTerm}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {data.insuranceAnalysis.healthInsurance.quotes.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-lg text-green-800 mb-2">Health Insurance Quotes</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.insuranceAnalysis.healthInsurance.quotes.map(quote => (
                                <HealthInsuranceQuoteCard key={quote.id} quote={quote} />
                            ))}
                        </div>
                    </div>
                )}
            </section>
        )}

        </div>

        <footer className="mt-auto pt-8 pb-12 border-t-2 border-gray-300 pdf-section px-4 print-avoid-break overflow-visible">
            <p className="text-xs text-gray-500 text-center leading-tight">
                <strong>Disclaimer:</strong> The calculators are based on past returns and are meant for illustration purposes only. This information is not investment advice. Mutual Fund investments are subject to market risks, read all scheme related documents carefully. Consult your financial advisor before investing.
            </p>
        </footer>
      </div>
    </div>
  );
}
