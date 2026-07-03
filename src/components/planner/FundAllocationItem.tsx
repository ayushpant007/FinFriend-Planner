"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import type { FundAllocation, Goal, FundReturnsOutput, SipOptimizerGoal, RetirementCalculations } from '@/lib/types';
import { loadMutualFundsFromCSV, MutualFundScheme, fetchNAV, NAVData } from '@/lib/load-funds';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { RiskMetrics } from '@/lib/risk-metrics';
import type { FundMetricsView, TopHolding } from '@/lib/funds-csv';

interface YearlyComparison {
  year: string;
  fundReturn: number;
  benchmarkReturn: number;
}

interface FundAllocationItemProps {
  alloc: FundAllocation;
  availableGoals: Goal[];
  onUpdate: (id: string, field: string, value: string | number) => void;
  onRemove: (id: string) => void;
  optimizedGoals: SipOptimizerGoal[];
  fundAllocations: FundAllocation[];
  retirementCalculations: RetirementCalculations;
  hideGoalAllocationFields?: boolean;
  hideTypeAndMutualFund?: boolean;
  viewMode?: 'full' | 'allocation';
  onBenchmarkData?: (schemeCode: string, data: { yearlyComparison: YearlyComparison[]; benchmarkName: string; riskMetrics: any; csvMetrics?: FundMetricsView }) => void;
}

export function FundAllocationItem({
  alloc,
  availableGoals,
  onUpdate,
  onRemove,
  optimizedGoals,
  fundAllocations,
  retirementCalculations,
  hideGoalAllocationFields = false,
  hideTypeAndMutualFund = false,
  viewMode = 'full',
  onBenchmarkData,
}: FundAllocationItemProps) {
  const isAllocationView = viewMode === 'allocation';
  const { toast } = useToast();
  const [allFunds, setAllFunds] = useState<MutualFundScheme[]>([]);
  const [isLoadingFunds, setIsLoadingFunds] = useState(true);
  const [returns, setReturns] = useState<FundReturnsOutput | null>(null);
  const [isLoadingReturns, setIsLoadingReturns] = useState(false);
  const [navData, setNavData] = useState<NAVData | null>(null);
  const [isFetchingNAV, setIsFetchingNAV] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);
  const [benchmarkComparison, setBenchmarkComparison] = useState<YearlyComparison[]>([]);
  const [benchmarkName, setBenchmarkName] = useState<string>('');
  const [isLoadingBenchmark, setIsLoadingBenchmark] = useState(false);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [csvMetrics, setCsvMetrics] = useState<FundMetricsView | null>(null);
  const [topHoldings, setTopHoldings] = useState<TopHolding[]>([]);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const funds = await loadMutualFundsFromCSV();
        setAllFunds(funds);
      } catch (error) {
        console.error('Error loading funds:', error);
        toast({
          title: 'Error Loading Funds',
          description: 'Could not load mutual funds data from CSV',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingFunds(false);
      }
    };
    loadData();
  }, [toast]);

  const categories = useMemo(() => {
    const cats = new Set(allFunds.map(f => f.category));
    return Array.from(cats).sort();
  }, [allFunds]);

  const types = useMemo(() => {
    if (!alloc.fundCategory) return [];
    const filtered = allFunds.filter(f => f.category === alloc.fundCategory);
    const typeSet = new Set(filtered.map(f => f.type));
    return Array.from(typeSet).sort();
  }, [alloc.fundCategory, allFunds]);

  const mutualFunds = useMemo(() => {
    if (!alloc.fundCategory || !alloc.fundType) return [];
    const filtered = allFunds.filter(
      f => f.category === alloc.fundCategory && f.type === alloc.fundType
    );
    const fundSet = new Set(filtered.map(f => f.fundName));
    return Array.from(fundSet).sort();
  }, [alloc.fundCategory, alloc.fundType, allFunds]);

  const schemes = useMemo(() => {
    if (!alloc.fundCategory) return [];
    if (hideTypeAndMutualFund) {
      const filtered = allFunds.filter(f => f.category === alloc.fundCategory);
      return filtered.sort((a, b) => a.schemeName.localeCompare(b.schemeName));
    }
    if (!alloc.fundType || !alloc.fundName) return [];
    const filtered = allFunds.filter(
      f => f.category === alloc.fundCategory && 
           f.type === alloc.fundType && 
           f.fundName === alloc.fundName
    );
    return filtered.sort((a, b) => a.schemeName.localeCompare(b.schemeName));
  }, [alloc.fundCategory, alloc.fundType, alloc.fundName, allFunds, hideTypeAndMutualFund]);

  const schemeNames = useMemo(() => schemes.map(s => s.schemeName), [schemes]);

  // Shared helper: computes remainingPct, requiredSIP, requiredLumpsum for this goal
  const goalRemainingData = useMemo(() => {
    // --- Retirement goal ---
    if (alloc.goalId === 'retirement') {
      const requiredSIP = retirementCalculations.monthlyInvestmentNeeded;
      const annualRate = retirementCalculations.realRateOfReturn > 0 ? retirementCalculations.realRateOfReturn / 100 : 0;
      const yrs = retirementCalculations.yearsToRetirement;
      const requiredLumpsum = retirementCalculations.requiredRetirementCorpus > 0 && annualRate > 0 && yrs > 0
        ? retirementCalculations.requiredRetirementCorpus / Math.pow(1 + annualRate, yrs)
        : retirementCalculations.requiredRetirementCorpus;

      const currentSip = typeof alloc.sipRequired === 'number' ? alloc.sipRequired : 0;
      const currentLumpsum = typeof alloc.lumpsumAmount === 'number' ? alloc.lumpsumAmount : 0;
      const totalSip = fundAllocations
        .filter(a => a.goalId === 'retirement')
        .reduce((sum, a) => sum + (typeof a.sipRequired === 'number' ? a.sipRequired : 0), 0);
      const totalLumpsum = fundAllocations
        .filter(a => a.goalId === 'retirement')
        .reduce((sum, a) => sum + (typeof a.lumpsumAmount === 'number' ? a.lumpsumAmount : 0), 0);

      // Other cards' contributions (exclude this card)
      const otherSip = totalSip - currentSip;
      const otherLumpsum = totalLumpsum - currentLumpsum;

      const sipFraction = requiredSIP > 0 ? otherSip / requiredSIP : 0;
      const lumpsumFraction = requiredLumpsum > 0 ? otherLumpsum / requiredLumpsum : 0;
      const remainingPct = 1 - (sipFraction + lumpsumFraction);

      return { requiredSIP, requiredLumpsum, remainingPct };
    }

    // --- Non-retirement goal ---
    let selectedGoal = optimizedGoals.find(g => g.id === alloc.goalId);
    
    // Fallback: match manual options (wealth_accommodation, education_goal, home_goal, child_planning)
    // to their corresponding goals from the user form
    if (!selectedGoal && alloc.goalId) {
      const lowerId = alloc.goalId.toLowerCase();
      selectedGoal = optimizedGoals.find(g => {
        const gName = g.name.toLowerCase();
        if (lowerId === 'wealth_accommodation') return gName.includes('wealth');
        if (lowerId === 'education_goal') return gName.includes('education');
        if (lowerId === 'home_goal') return gName.includes('house') || gName.includes('home');
        if (lowerId === 'child_planning') return gName.includes('child') || gName.includes('marriage');
        return false;
      });
    }

    if (!selectedGoal) return { requiredSIP: 0, requiredLumpsum: 0, remainingPct: 1 };

    const requiredSIP = selectedGoal.investmentStatus.allocatedInvestment;
    const originalGoal = availableGoals.find(g => g.id === alloc.goalId) || (selectedGoal ? availableGoals.find(g => g.id === selectedGoal.id) : undefined);
    const annualRate = originalGoal && typeof originalGoal.rate === 'number' && originalGoal.rate > 0
      ? originalGoal.rate / 100
      : 0.12;
    const n = selectedGoal.timeline.required;
    const fv = selectedGoal.futureValue;
    const requiredLumpsum = n > 0 && annualRate > 0 ? fv / Math.pow(1 + annualRate, n) : fv;

    const currentSip = typeof alloc.sipRequired === 'number' ? alloc.sipRequired : 0;
    const currentLumpsum = typeof alloc.lumpsumAmount === 'number' ? alloc.lumpsumAmount : 0;

    // Helper to determine if an allocation belongs to the same goal
    const isSameGoal = (gId: string) => {
      if (!gId || !alloc.goalId) return false;
      if (gId === alloc.goalId) return true;
      
      const getNormalizedId = (id: string) => {
        const found = optimizedGoals.find(g => g.id === id);
        if (found) return found.id;
        
        const lowerId = id.toLowerCase();
        const matched = optimizedGoals.find(g => {
          const gName = g.name.toLowerCase();
          if (lowerId === 'wealth_accommodation') return gName.includes('wealth');
          if (lowerId === 'education_goal') return gName.includes('education');
          if (lowerId === 'home_goal') return gName.includes('house') || gName.includes('home');
          if (lowerId === 'child_planning') return gName.includes('child') || gName.includes('marriage');
          return false;
        });
        return matched ? matched.id : id;
      };
      
      return getNormalizedId(gId) === getNormalizedId(alloc.goalId);
    };

    const totalSip = fundAllocations
      .filter(a => isSameGoal(a.goalId))
      .reduce((sum, a) => sum + (typeof a.sipRequired === 'number' ? a.sipRequired : 0), 0);
    const totalLumpsum = fundAllocations
      .filter(a => isSameGoal(a.goalId))
      .reduce((sum, a) => sum + (typeof a.lumpsumAmount === 'number' ? a.lumpsumAmount : 0), 0);

    // Other cards' contributions (exclude this card)
    const otherSip = totalSip - currentSip;
    const otherLumpsum = totalLumpsum - currentLumpsum;

    const sipFraction = requiredSIP > 0 ? otherSip / requiredSIP : 0;
    const lumpsumFraction = requiredLumpsum > 0 ? otherLumpsum / requiredLumpsum : 0;
    const remainingPct = 1 - (sipFraction + lumpsumFraction);

    return { requiredSIP, requiredLumpsum, remainingPct };
  }, [alloc.goalId, alloc.sipRequired, alloc.lumpsumAmount, optimizedGoals, availableGoals, fundAllocations, retirementCalculations]);

  const remainingSip = useMemo(() => {
    return goalRemainingData.requiredSIP * goalRemainingData.remainingPct;
  }, [goalRemainingData]);

  const remainingLumpsum = useMemo(() => {
    return goalRemainingData.requiredLumpsum * goalRemainingData.remainingPct;
  }, [goalRemainingData]);

  // Unified data fetching prioritizing local CSV over mfapi fallback
  useEffect(() => {
    if (!alloc.schemeCode || alloc.schemeCode.length === 0) {
      setNavData(null);
      setNavError(null);
      setReturns(null);
      setBenchmarkComparison([]);
      setBenchmarkName('');
      setRiskMetrics(null);
      setCsvMetrics(null);
      setTopHoldings([]);
      return;
    }

    let cancelled = false;
    setIsFetchingNAV(true);
    setNavError(null);
    setIsLoadingReturns(true);
    setIsLoadingBenchmark(true);
    setIsLoadingHoldings(true);
    setTopHoldings([]);

    const run = async () => {
      // Fetch top holdings immediately in parallel — no need to wait for NAV/benchmark
      fetch('/api/allocation/top-holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemeCode: alloc.schemeCode, category: alloc.fundCategory }),
      }).then(async (hRes) => {
        if (cancelled) return;
        if (hRes.ok) {
          const hData = await hRes.json();
          if (!cancelled) setTopHoldings(hData.holdings || []);
        }
      }).catch(() => {
        // silently ignore
      }).finally(() => {
        if (!cancelled) setIsLoadingHoldings(false);
      });

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

        if (response.ok) {
          const data = await response.json();
          if (cancelled) return;

          const yearlyComp = data.yearlyComparison || [];
          const bName = data.benchmarkName || 'Benchmark';
          setBenchmarkComparison(yearlyComp);
          setBenchmarkName(bName);
          const m = data.metrics || {};
          const riskData: RiskMetrics = {
            sharpeRatio: m.sharpe ?? null,
            sortinoRatio: m.sortino ?? null,
            beta: m.beta ?? null,
            jensensAlpha: m.alpha ?? null,
            standardDeviation: m.stdDev ?? null,
            threeYearRollingReturn: null,
            threeYearCagr: null,
          } as RiskMetrics;

          setRiskMetrics(riskData);
          setCsvMetrics(m as FundMetricsView);
          setReturns(data.flatReturns || null);

          // Bubble CSV-derived data up to parent for caching
          if (alloc.schemeCode) {
            onBenchmarkData?.(alloc.schemeCode, { yearlyComparison: yearlyComp, benchmarkName: bName, riskMetrics: riskData, csvMetrics: m as FundMetricsView });
          }
        } else if (response.status === 404) {
          console.log(`[Data Fetch] Fund ${alloc.schemeCode} not found in CSV.`);
          setBenchmarkComparison([]);
          setBenchmarkName('');
          setRiskMetrics(null);
          setCsvMetrics(null);
          setReturns(null);
        } else {
          throw new Error(`Failed to load from CSV. Status: ${response.status}`);
        }
        setIsLoadingReturns(false);
        setIsLoadingBenchmark(false);

        // NAV is always fetched live from mfapi.in
        try {
          const nav = await fetchNAV(alloc.schemeCode);
          if (!cancelled) {
            if (nav) {
              setNavData(nav);
            } else {
              setNavError('NAV data currently unavailable. Please try again later.');
            }
          }
        } catch (error) {
          if (!cancelled) setNavError('NAV data currently unavailable. Please try again later.');
        } finally {
          if (!cancelled) setIsFetchingNAV(false);
        }

      } catch (error) {
        if (cancelled) return;
        console.error('[Data Fetch] Failed to load fund data:', error);
        setNavData(null);
        setNavError('Failed to load fund data.');
        setReturns(null);
        setBenchmarkComparison([]);
        setBenchmarkName('');
        setRiskMetrics(null);
        setCsvMetrics(null);
      } finally {
        if (!cancelled) {
          setIsFetchingNAV(false);
          setIsLoadingReturns(false);
          setIsLoadingBenchmark(false);
        }
      }
    };

    const timeoutId = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [alloc.schemeCode, alloc.schemeName, alloc.fundCategory]);

  const handleCategoryChange = (value: string) => {
    onUpdate(alloc.id, 'fundCategory', value);
    onUpdate(alloc.id, 'fundType', '');
    onUpdate(alloc.id, 'fundName', '');
    onUpdate(alloc.id, 'schemeName', '');
    onUpdate(alloc.id, 'schemeCode', '');
    setNavData(null);
    setNavError(null);
    setRiskMetrics(null);
    setCsvMetrics(null);
  };

  const handleTypeChange = (value: string) => {
    onUpdate(alloc.id, 'fundType', value);
    onUpdate(alloc.id, 'fundName', '');
    onUpdate(alloc.id, 'schemeName', '');
    onUpdate(alloc.id, 'schemeCode', '');
    setNavData(null);
    setNavError(null);
    setRiskMetrics(null);
    setCsvMetrics(null);
  };

  const handleMutualFundChange = (value: string) => {
    onUpdate(alloc.id, 'fundName', value);
    onUpdate(alloc.id, 'schemeName', '');
    onUpdate(alloc.id, 'schemeCode', '');
    setNavData(null);
    setNavError(null);
    setRiskMetrics(null);
    setCsvMetrics(null);
  };

  const handleSchemeChange = (value: string) => {
    onUpdate(alloc.id, 'schemeName', value);
    
    const selectedScheme = schemes.find(s => s.schemeName === value);
    if (selectedScheme && selectedScheme.schemeCode) {
      onUpdate(alloc.id, 'schemeCode', selectedScheme.schemeCode);
      if (hideTypeAndMutualFund) {
        if (selectedScheme.type && alloc.fundType !== selectedScheme.type) {
          onUpdate(alloc.id, 'fundType', selectedScheme.type);
        }
        if (selectedScheme.fundName && alloc.fundName !== selectedScheme.fundName) {
          onUpdate(alloc.id, 'fundName', selectedScheme.fundName);
        }
      }
      console.log(`[Scheme Code] Using code ${selectedScheme.schemeCode} from CSV for scheme: ${value}`);
    } else {
      onUpdate(alloc.id, 'schemeCode', '');
      console.log(`[Scheme Code] No code found in CSV for scheme: ${value}`);
    }
  };

  if (isLoadingFunds) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Loading fund data...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card key={alloc.id} className="p-4 relative">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="absolute top-2 right-2 h-7 w-7 text-destructive z-10 bg-background/80 hover:bg-background"
        onClick={() => onRemove(alloc.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {!hideGoalAllocationFields && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end mb-4">
          <div className="space-y-1.5">
            <Label htmlFor={`goalId-${alloc.id}`}>Goal Name</Label>
            <Select
              value={alloc.goalId}
              onValueChange={(value) => onUpdate(alloc.id, 'goalId', value)}
            >
              <SelectTrigger id={`goalId-${alloc.id}`}>
                <SelectValue placeholder="Select a goal" />
              </SelectTrigger>
              <SelectContent>
                {availableGoals.map(goal => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.otherType || goal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isAllocationView && (
            <>
              <div className="space-y-1.5">
                <Label className="text-green-700 dark:text-green-400">
                  Allocated SIP (remaining for this goal)
                </Label>
                <Input
                  type="text"
                  readOnly
                  value={`₹${remainingSip.toLocaleString('en-IN')}`}
                  className="bg-slate-100 dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-green-700 dark:text-green-400">
                  Required Lumpsum (remaining for this goal)
                </Label>
                <Input
                  type="text"
                  readOnly
                  value={`₹${remainingLumpsum.toLocaleString('en-IN')}`}
                  className="bg-slate-100 dark:bg-slate-800"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`sipRequired-${alloc.id}`}>SIP required for fund</Label>
            <Input
              id={`sipRequired-${alloc.id}`}
              type="number"
              placeholder="e.g., 5000"
              value={typeof alloc.sipRequired === 'number' ? alloc.sipRequired : ''}
              onChange={(e) => onUpdate(alloc.id, 'sipRequired', e.target.value ? parseInt(e.target.value) : '')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`lumpsumAmount-${alloc.id}`}>Lumpsum amount</Label>
            <Input
              id={`lumpsumAmount-${alloc.id}`}
              type="number"
              placeholder="e.g., 50000"
              value={typeof alloc.lumpsumAmount === 'number' ? alloc.lumpsumAmount : ''}
              onChange={(e) => onUpdate(alloc.id, 'lumpsumAmount', e.target.value ? parseInt(e.target.value) : '')}
            />
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 ${hideTypeAndMutualFund ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4`}>
        <div className="space-y-1.5">
          <Label htmlFor={`category-${alloc.id}`}>Category</Label>
          <SearchableSelect
            options={categories}
            value={alloc.fundCategory}
            onChange={handleCategoryChange}
            placeholder="Select category"
          />
        </div>

        {!hideTypeAndMutualFund && (
          <div className="space-y-1.5">
            <Label htmlFor={`type-${alloc.id}`}>Type</Label>
            <SearchableSelect
              options={types}
              value={alloc.fundType || ''}
              onChange={handleTypeChange}
              placeholder={alloc.fundCategory ? "Select type" : "Select category first"}
              disabled={!alloc.fundCategory}
            />
          </div>
        )}

        {!hideTypeAndMutualFund && (
          <div className="space-y-1.5">
            <Label htmlFor={`mutualFund-${alloc.id}`}>Mutual Fund</Label>
            <SearchableSelect
              options={mutualFunds}
              value={alloc.fundName}
              onChange={handleMutualFundChange}
              placeholder={alloc.fundType ? "Select mutual fund" : "Select type first"}
              disabled={!alloc.fundType}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={`scheme-${alloc.id}`}>Scheme Name</Label>
          <SearchableSelect
            options={schemeNames}
            value={alloc.schemeName}
            onChange={handleSchemeChange}
            placeholder={hideTypeAndMutualFund
              ? (alloc.fundCategory ? "Select scheme" : "Select category first")
              : (alloc.fundName ? "Select scheme" : "Select mutual fund first")}
            disabled={hideTypeAndMutualFund ? !alloc.fundCategory : !alloc.fundName}
          />
        </div>
      </div>

      {isFetchingNAV && (
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Fetching NAV...
        </div>
      )}

      {navError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{navError}</AlertDescription>
        </Alert>
      )}

      {navData && !isFetchingNAV && (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Current NAV</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{navData.nav}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">As of</p>
              <p className="font-medium">{navData.date}</p>
            </div>
          </div>
        </div>
      )}

      {isLoadingReturns && (
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading CAGR data...
        </div>
      )}

      {returns && !isLoadingReturns && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">3-Year CAGR</p>
              <p className="text-lg font-semibold text-primary">
                {returns.threeYearReturn ? returns.threeYearReturn : <span className="text-gray-400">Not Available</span>}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">5-Year CAGR</p>
              <p className="text-lg font-semibold text-primary">
                {returns.fiveYearReturn ? returns.fiveYearReturn : <span className="text-gray-400">Not Available</span>}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">10-Year CAGR</p>
              <p className="text-lg font-semibold text-primary">
                {returns.tenYearReturn ? returns.tenYearReturn : <span className="text-gray-400">Not Available</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoadingBenchmark && (
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading yearly performance comparison...
        </div>
      )}

      {benchmarkComparison.length > 0 && !isLoadingBenchmark && (
        <div className="mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h4 className="font-semibold text-indigo-800 dark:text-indigo-300">
              Returns: Fund vs {benchmarkName}
            </h4>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={benchmarkComparison}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#9CA3AF' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
                tickLine={{ stroke: '#9CA3AF' }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                labelFormatter={(label) => `Period: ${label}`}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
              />
              <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
              <Bar 
                dataKey="fundReturn" 
                name="Fund Return" 
                fill="#22C55E" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="benchmarkReturn" 
                name={benchmarkName} 
                fill="#6366F1" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Year-over-year returns comparison (in %)
          </p>
        </div>
      )}

      {riskMetrics && !isLoadingBenchmark && (
        <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Risk & Return Metrics</h4>
          <p className="text-[10px] text-amber-700/70 dark:text-amber-300/70 mb-3">
            Sourced from the fund's CSV data (Mutual Fund folder)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {riskMetrics.jensensAlpha !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Jensen's Alpha</p>
                <p className={`text-sm font-semibold ${riskMetrics.jensensAlpha >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {riskMetrics.jensensAlpha.toFixed(2)}%
                </p>
              </div>
            )}
            {riskMetrics.sortinoRatio !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Sortino Ratio</p>
                <p className={`text-sm font-semibold ${riskMetrics.sortinoRatio >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {riskMetrics.sortinoRatio.toFixed(2)}
                </p>
              </div>
            )}
            {riskMetrics.threeYearRollingReturn !== null && (
              <div>
                <p className="text-xs text-muted-foreground">3-Year Rolling Return</p>
                <p className={`text-sm font-semibold ${riskMetrics.threeYearRollingReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {riskMetrics.threeYearRollingReturn.toFixed(2)}%
                </p>
              </div>
            )}
            {riskMetrics.sharpeRatio !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{riskMetrics.sharpeRatio.toFixed(2)}</p>
              </div>
            )}
            {riskMetrics.beta !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Beta</p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{riskMetrics.beta.toFixed(2)}</p>
              </div>
            )}
            {riskMetrics.standardDeviation !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Std Dev</p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{riskMetrics.standardDeviation.toFixed(2)}%</p>
              </div>
            )}
            
            {/* CSV Metrics based on Category */}
            {csvMetrics && csvMetrics.ytm !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Yield to Maturity (YTM)</p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{csvMetrics.ytm.toFixed(2)}%</p>
              </div>
            )}
            {csvMetrics && csvMetrics.avgMaturity !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Average Maturity</p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{csvMetrics.avgMaturity.toFixed(2)} yrs</p>
              </div>
            )}
            {csvMetrics && csvMetrics.macaulayDuration !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Modified Duration</p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{csvMetrics.macaulayDuration.toFixed(2)} yrs</p>
              </div>
            )}
            {csvMetrics && csvMetrics.avgCreditRating !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Avg Credit Rating</p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{csvMetrics.avgCreditRating}</p>
              </div>
            )}
            {csvMetrics && csvMetrics.peRatio !== null && (
              <div>
                <p className="text-xs text-muted-foreground">P/E Ratio</p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{csvMetrics.peRatio.toFixed(2)}</p>
              </div>
            )}
            {csvMetrics && csvMetrics.pbRatio !== null && (
              <div>
                <p className="text-xs text-muted-foreground">P/B Ratio</p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{csvMetrics.pbRatio.toFixed(2)}</p>
              </div>
            )}
            {csvMetrics && csvMetrics.meanReturn !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Mean Return</p>
                <p className={`text-sm font-semibold ${csvMetrics.meanReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {csvMetrics.meanReturn.toFixed(2)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Top Holdings Section */}
      {isLoadingHoldings && alloc.schemeCode && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading top holdings…
        </div>
      )}

      {!isLoadingHoldings && topHoldings.length > 0 && (
        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Top Holdings</h4>
          <p className="text-[10px] text-blue-700/70 dark:text-blue-300/70 mb-3">
            Portfolio composition as of latest available data
          </p>
          <div className="overflow-x-auto">
            {(() => {
              const hasSector     = topHoldings.some(h => h.sector);
              const hasInstrument = topHoldings.some(h => h.instrument);
              const hasRating     = topHoldings.some(h => h.creditRating);
              const hasPeRatio    = topHoldings.some(h => h.peRatio !== null);
              const extraCols     = (hasSector ? 1 : 0) + (hasInstrument ? 1 : 0) + (hasRating ? 1 : 0) + (hasPeRatio ? 1 : 0);
              return (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-blue-200 dark:border-blue-700">
                      <th className="text-left py-1 pr-3 font-medium text-blue-700 dark:text-blue-300">#</th>
                      <th className="text-left py-1 pr-3 font-medium text-blue-700 dark:text-blue-300">Company / Instrument</th>
                      {hasSector     && <th className="text-left py-1 pr-3 font-medium text-blue-700 dark:text-blue-300">Sector</th>}
                      {hasInstrument && <th className="text-left py-1 pr-3 font-medium text-blue-700 dark:text-blue-300">Instrument</th>}
                      {hasRating     && <th className="text-left py-1 pr-3 font-medium text-blue-700 dark:text-blue-300">Rating</th>}
                      {hasPeRatio    && <th className="text-right py-1 pr-3 font-medium text-blue-700 dark:text-blue-300">P/E Ratio</th>}
                      <th className="text-right py-1 font-medium text-blue-700 dark:text-blue-300">% Assets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topHoldings.map((h, idx) => (
                      <tr key={idx} className="border-b border-blue-100 dark:border-blue-800/50 last:border-0">
                        <td className="py-1.5 pr-3 text-muted-foreground">{idx + 1}</td>
                        <td className="py-1.5 pr-3 font-medium text-foreground">{h.companyName}</td>
                        {hasSector     && <td className="py-1.5 pr-3 text-muted-foreground">{h.sector || '—'}</td>}
                        {hasInstrument && <td className="py-1.5 pr-3 text-muted-foreground">{h.instrument || '—'}</td>}
                        {hasRating && (
                          <td className="py-1.5 pr-3">
                            {h.creditRating ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                {h.creditRating}
                              </span>
                            ) : '—'}
                          </td>
                        )}
                        {hasPeRatio && (
                          <td className="py-1.5 pr-3 text-right text-muted-foreground">
                            {h.peRatio !== null ? h.peRatio.toFixed(2) : '—'}
                          </td>
                        )}
                        <td className="py-1.5 text-right font-semibold text-blue-700 dark:text-blue-300">
                          {h.percentOfAssets.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-blue-200 dark:border-blue-700">
                      <td colSpan={2 + extraCols} className="py-1.5 text-muted-foreground font-medium">
                        Total ({topHoldings.length} holdings)
                      </td>
                      <td className="py-1.5 text-right font-bold text-blue-700 dark:text-blue-300">
                        {topHoldings.reduce((s, h) => s + h.percentOfAssets, 0).toFixed(2)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              );
            })()}
          </div>
        </div>
      )}
    </Card>
  );
}
