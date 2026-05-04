
"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import { FormSection } from './FormSection';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Wallet, PlusCircle, LineChart, Loader2, PieChart, Percent, Info } from 'lucide-react';
import { Label } from '../ui/label';
import { GoalsBreakdown } from './GoalsBreakdown';
import type { SipOptimizerGoal, FundAllocation, Goal, ModelPortfolioOutput, Fund, FundCategory, RetirementCalculations } from '@/lib/types';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { PortfolioNiftyChart } from '../charts/PortfolioNiftyChart';
import { useToast } from '@/hooks/use-toast';
import { FundAllocationItem } from './FundAllocationItem';

interface Props {
    allocations: FundAllocation[];
    setAllocations: React.Dispatch<React.SetStateAction<FundAllocation[]>>;
    investibleSurplus: number;
    optimizedGoals: SipOptimizerGoal[];
    goals: Goal[];
    retirementCalculations: RetirementCalculations;
    onChartDataUpdate?: (chartData: { equity?: import('@/lib/types').ChartDataPoint[]; debt?: import('@/lib/types').ChartDataPoint[]; hybrid?: import('@/lib/types').ChartDataPoint[]; solutionOriented?: import('@/lib/types').ChartDataPoint[]; other?: import('@/lib/types').ChartDataPoint[] }) => void;
    onBenchmarkData?: (schemeCode: string, data: { yearlyComparison: { year: string; fundReturn: number; benchmarkReturn: number }[]; benchmarkName: string; riskMetrics: any; csvMetrics?: import('@/lib/funds-csv').FundMetricsView }) => void;
    initialChartData?: { equity?: import('@/lib/types').ChartDataPoint[]; debt?: import('@/lib/types').ChartDataPoint[]; hybrid?: import('@/lib/types').ChartDataPoint[]; solutionOriented?: import('@/lib/types').ChartDataPoint[]; other?: import('@/lib/types').ChartDataPoint[] };
    hideGoalAllocationFields?: boolean;
    hideTypeAndMutualFund?: boolean;
    viewMode?: 'full' | 'allocation';
}



export function RecommendedFunds({ allocations, setAllocations, investibleSurplus, optimizedGoals, goals, retirementCalculations, onChartDataUpdate, onBenchmarkData, initialChartData, hideGoalAllocationFields = false, hideTypeAndMutualFund = false, viewMode = 'full' }: Props) {
  const isAllocationView = viewMode === 'allocation';
  const [equityChartData, setEquityChartData] = useState<ModelPortfolioOutput['chartData'] | null>(initialChartData?.equity ?? null);
  const [isEquityChartLoading, setIsEquityChartLoading] = useState(false);
  const [debtChartData, setDebtChartData] = useState<ModelPortfolioOutput['chartData'] | null>(initialChartData?.debt ?? null);
  const [isDebtChartLoading, setIsDebtChartLoading] = useState(false);
  const [hybridChartData, setHybridChartData] = useState<ModelPortfolioOutput['chartData'] | null>(initialChartData?.hybrid ?? null);
  const [isHybridChartLoading, setIsHybridChartLoading] = useState(false);
  const [solutionOrientedChartData, setSolutionOrientedChartData] = useState<ModelPortfolioOutput['chartData'] | null>(initialChartData?.solutionOriented ?? null);
  const [isSolutionOrientedChartLoading, setIsSolutionOrientedChartLoading] = useState(false);
  const [otherChartData, setOtherChartData] = useState<ModelPortfolioOutput['chartData'] | null>(initialChartData?.other ?? null);
  const [isOtherChartLoading, setIsOtherChartLoading] = useState(false);
  
  const { toast } = useToast();
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    onChartDataUpdate?.({
      equity: equityChartData ?? undefined,
      debt: debtChartData ?? undefined,
      hybrid: hybridChartData ?? undefined,
      solutionOriented: solutionOrientedChartData ?? undefined,
      other: otherChartData ?? undefined,
    });
  }, [equityChartData, debtChartData, hybridChartData, solutionOrientedChartData, otherChartData, onChartDataUpdate]);
  
  // Sync local state when initialChartData changes (e.g. on mount/hydration)
  // Only sync once when initialChartData becomes available to avoid loops
  useEffect(() => {
    if (hasHydratedRef.current) return;
    
    let hydrated = false;
    if (initialChartData?.equity && !equityChartData) {
      setEquityChartData(initialChartData.equity);
      hydrated = true;
    }
    if (initialChartData?.debt && !debtChartData) {
      setDebtChartData(initialChartData.debt);
      hydrated = true;
    }
    if (initialChartData?.hybrid && !hybridChartData) {
      setHybridChartData(initialChartData.hybrid);
      hydrated = true;
    }
    if (initialChartData?.solutionOriented && !solutionOrientedChartData) {
      setSolutionOrientedChartData(initialChartData.solutionOriented);
      hydrated = true;
    }
    if (initialChartData?.other && !otherChartData) {
      setOtherChartData(initialChartData.other);
      hydrated = true;
    }
    
    if (hydrated) {
      hasHydratedRef.current = true;
    }
  }, [initialChartData, equityChartData, debtChartData, hybridChartData, solutionOrientedChartData, otherChartData]);
  


  const handleAddAllocation = () => {
    setAllocations(prev => [...prev, {
      id: `alloc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      goalId: '',
      sipRequired: '',
      lumpsumAmount: '',
      fundCategory: '',
      fundType: '',
      fundName: '',
      schemeName: '',
      schemeCode: '',
    }]);
  };

  const handleUpdateAllocation = (id: string, field: string, value: string | number) => {
    setAllocations(prev => prev.map(alloc => {
        if (alloc.id === id) {
            const updatedAlloc = { ...alloc, [field]: value } as FundAllocation;
            return updatedAlloc;
        }
        return alloc;
    }));
  };
  
  const handleRemoveAllocation = (id: string) => {
    setAllocations(prev => prev.filter(alloc => alloc.id !== id));
  };
  
  const availableGoals = useMemo(() => {
    const regularGoals = goals.filter(g => g.name);
    // Manually add a "Retirement Goal" option
    const retirementGoal = { id: 'retirement', name: 'Retirement Goal' } as Goal;
    return [...regularGoals, retirementGoal];
  }, [goals]);



  const portfolioAnalysis = useMemo(() => {
    const getNum = (val: number | '') => typeof val === 'number' ? val : 0;
    const categoryMatches = (fundCategory: string, target: string) => {
      const cat = fundCategory.toLowerCase();
      return cat === target.toLowerCase() || cat.startsWith(target.toLowerCase());
    };
    
    const equityTotal = allocations
        .filter(a => categoryMatches(a.fundCategory, 'Equity'))
        .reduce((sum, a) => sum + getNum(a.sipRequired), 0);
        
    const hybridTotal = allocations
        .filter(a => categoryMatches(a.fundCategory, 'Hybrid'))
        .reduce((sum, a) => sum + getNum(a.sipRequired), 0);

    const debtTotal = allocations
        .filter(a => categoryMatches(a.fundCategory, 'Debt'))
        .reduce((sum, a) => sum + getNum(a.sipRequired), 0);

    const solutionOrientedTotal = allocations
        .filter(a => categoryMatches(a.fundCategory, 'Solution'))
        .reduce((sum, a) => sum + getNum(a.sipRequired), 0);

    const otherTotal = allocations
        .filter(a => categoryMatches(a.fundCategory, 'Other'))
        .reduce((sum, a) => sum + getNum(a.sipRequired), 0);
        
    return {
        equity: equityTotal,
        hybrid: hybridTotal,
        debt: debtTotal,
        solutionOriented: solutionOrientedTotal,
        other: otherTotal,
    }
  }, [allocations]);

  const getFundWeights = (category: FundCategory) => {
    const getNum = (val: number | '' | undefined) => (typeof val === 'number' ? val : 0);
    const categoryMatches = (fundCategory: string, target: string) => {
      const cat = fundCategory.toLowerCase();
      return cat === target.toLowerCase() || cat.startsWith(target.toLowerCase());
    };
    
    const categoryAllocations = allocations.filter(a => categoryMatches(a.fundCategory, category) && getNum(a.sipRequired) > 0 && a.schemeCode);
    const totalCategorySip = categoryAllocations.reduce((sum, a) => sum + getNum(a.sipRequired), 0);

    if (totalCategorySip === 0) return [];
    
    return categoryAllocations.map(alloc => {
        const goal = availableGoals.find(g => g.id === alloc.goalId);
        return {
            ...alloc,
            goalName: goal?.otherType || goal?.name || 'Unlinked',
            weight: (getNum(alloc.sipRequired) / totalCategorySip) * 100,
            schemeCode: Number(alloc.schemeCode),
            schemeName: alloc.schemeName,
        };
    });
  }
  
  const allocatedSipsByGoal = useMemo(() => {
    const sips: { [key: string]: number } = {};
    allocations.forEach(alloc => {
      if (alloc.goalId) {
        sips[alloc.goalId] = (sips[alloc.goalId] || 0) + (typeof alloc.sipRequired === 'number' ? alloc.sipRequired : 0);
      }
    });
    return sips;
  }, [allocations]);

  const equityFundWeights = useMemo(() => getFundWeights('Equity'), [allocations, availableGoals]);
  const debtFundWeights = useMemo(() => getFundWeights('Debt'), [allocations, availableGoals]);
  const hybridFundWeights = useMemo(() => getFundWeights('Hybrid'), [allocations, availableGoals]);
  const solutionOrientedFundWeights = useMemo(() => getFundWeights('Solution-Oriented'), [allocations, availableGoals]);
  const otherFundWeights = useMemo(() => getFundWeights('Others'), [allocations, availableGoals]);

  const handleGenerateEquityGraph = async () => {
    const fundsForApi = equityFundWeights
      .filter(f => f.schemeCode && f.weight > 0)
      .map(f => ({
        schemeCode: f.schemeCode!,
        schemeName: f.schemeName!,
        weight: f.weight,
      }));

    if (fundsForApi.length === 0) {
      toast({
        title: 'No Equity Funds Selected',
        description: 'Please allocate some SIP to valid equity funds to generate the comparison graph.',
        variant: "destructive"
      });
      return;
    }

    setIsEquityChartLoading(true);
    setEquityChartData(null);
    try {
      const response = await fetch(
        isAllocationView ? '/api/allocation/portfolio-growth' : '/api/equity-portfolio-growth',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isAllocationView ? { category: 'equity', funds: fundsForApi } : { funds: fundsForApi }),
        },
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch equity portfolio data');
      }
      
      const result = await response.json();
      if (result.chartData && result.chartData.length > 0) {
        setEquityChartData(result.chartData);
      } else {
        toast({
          title: "Could Not Fetch Data",
          description: "Unable to retrieve historical data for the selected funds. Some funds may not have enough history.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching equity portfolio data:', error);
      toast({
        title: "Chart Generation Failed",
        description: "An unexpected error occurred while generating the graph.",
        variant: "destructive"
      });
      setEquityChartData(null);
    } finally {
      setIsEquityChartLoading(false);
    }
  };

  const handleGenerateDebtGraph = async () => {
    const fundsForApi = debtFundWeights
      .filter(f => f.schemeCode && f.weight > 0)
      .map(f => ({
        schemeCode: f.schemeCode!,
        schemeName: f.schemeName!,
        weight: f.weight,
      }));

    if (fundsForApi.length === 0) {
      toast({
        title: 'No Debt Funds Selected',
        description: 'Please allocate some SIP to valid debt funds to generate the comparison graph.',
        variant: "destructive"
      });
      return;
    }

    setIsDebtChartLoading(true);
    setDebtChartData(null);
    try {
      const response = await fetch(
        isAllocationView ? '/api/allocation/portfolio-growth' : '/api/debt-portfolio-growth',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isAllocationView ? { category: 'debt', funds: fundsForApi } : { funds: fundsForApi }),
        },
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch debt portfolio data');
      }
      
      const result = await response.json();
      if (result.chartData && result.chartData.length > 0) {
        setDebtChartData(result.chartData);
      } else {
        toast({
          title: "Could Not Fetch Data",
          description: "Unable to retrieve historical data for the selected debt funds. Some funds may not have enough history.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching debt portfolio data:', error);
      toast({
        title: "Chart Generation Failed",
        description: "An unexpected error occurred while generating the graph.",
        variant: "destructive"
      });
      setDebtChartData(null);
    } finally {
      setIsDebtChartLoading(false);
    }
  };

  const handleGenerateHybridGraph = async () => {
    const fundsForApi = hybridFundWeights
      .filter(f => f.schemeCode && f.weight > 0)
      .map(f => ({
        schemeCode: f.schemeCode!,
        schemeName: f.schemeName!,
        weight: f.weight,
      }));

    if (fundsForApi.length === 0) {
      toast({
        title: 'No Hybrid Funds Selected',
        description: 'Please allocate some SIP to valid hybrid funds to generate the comparison graph.',
        variant: "destructive"
      });
      return;
    }

    setIsHybridChartLoading(true);
    setHybridChartData(null);
    try {
      const response = await fetch(
        isAllocationView ? '/api/allocation/portfolio-growth' : '/api/hybrid-portfolio-growth',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isAllocationView ? { category: 'hybrid', funds: fundsForApi } : { funds: fundsForApi }),
        },
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch hybrid portfolio data');
      }
      
      const result = await response.json();
      if (result.chartData && result.chartData.length > 0) {
        setHybridChartData(result.chartData);
      } else {
        toast({
          title: "Could Not Fetch Data",
          description: "Unable to retrieve historical data for the selected hybrid funds. Some funds may not have enough history.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching hybrid portfolio data:', error);
      toast({
        title: "Chart Generation Failed",
        description: "An unexpected error occurred while generating the graph.",
        variant: "destructive"
      });
      setHybridChartData(null);
    } finally {
      setIsHybridChartLoading(false);
    }
  };

  const handleGenerateSolutionOrientedGraph = async () => {
    const fundsForApi = solutionOrientedFundWeights
      .filter(f => f.schemeCode && f.weight > 0)
      .map(f => ({
        schemeCode: f.schemeCode!,
        schemeName: f.schemeName!,
        weight: f.weight,
      }));

    if (fundsForApi.length === 0) {
      toast({
        title: 'No Solution Oriented Funds Selected',
        description: 'Please allocate some SIP to valid solution oriented funds to generate the comparison graph.',
        variant: "destructive"
      });
      return;
    }

    setIsSolutionOrientedChartLoading(true);
    setSolutionOrientedChartData(null);
    try {
      const response = await fetch(
        isAllocationView ? '/api/allocation/portfolio-growth' : '/api/solution-oriented-portfolio-growth',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isAllocationView ? { category: 'solutions', funds: fundsForApi } : { funds: fundsForApi }),
        },
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch solution oriented portfolio data');
      }
      
      const result = await response.json();
      if (result.chartData && result.chartData.length > 0) {
        setSolutionOrientedChartData(result.chartData);
      } else {
        toast({
          title: "Could Not Fetch Data",
          description: "Unable to retrieve historical data for the selected solution oriented funds. Some funds may not have enough history.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching solution oriented portfolio data:', error);
      toast({
        title: "Chart Generation Failed",
        description: "An unexpected error occurred while generating the graph.",
        variant: "destructive"
      });
      setSolutionOrientedChartData(null);
    } finally {
      setIsSolutionOrientedChartLoading(false);
    }
  };

  const handleGenerateOtherGraph = async () => {
    const fundsForApi = otherFundWeights
      .filter(f => f.schemeCode && f.weight > 0)
      .map(f => ({
        schemeCode: f.schemeCode!,
        schemeName: f.schemeName!,
        weight: f.weight,
      }));

    if (fundsForApi.length === 0) {
      toast({
        title: 'No Other Funds Selected',
        description: 'Please allocate some SIP to valid other funds to generate the comparison graph.',
        variant: "destructive"
      });
      return;
    }

    setIsOtherChartLoading(true);
    setOtherChartData(null);
    try {
      const response = await fetch(
        isAllocationView ? '/api/allocation/portfolio-growth' : '/api/other-portfolio-growth',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isAllocationView ? { category: 'commodities', funds: fundsForApi } : { funds: fundsForApi }),
        },
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch other portfolio data');
      }
      
      const result = await response.json();
      if (result.chartData && result.chartData.length > 0) {
        setOtherChartData(result.chartData);
      } else {
        toast({
          title: "Could Not Fetch Data",
          description: "Unable to retrieve historical data for the selected other funds. Some funds may not have enough history.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching Other portfolio data:', error);
      toast({
        title: "Chart Generation Failed",
        description: "An unexpected error occurred while generating the graph.",
        variant: "destructive"
      });
      setOtherChartData(null);
    } finally {
      setIsOtherChartLoading(false);
    }
  };


  return (
    <FormSection
      title="Fund Allocation & Goal Analysis"
      description="Allocate funds to your specific goals and see your breakdown."
      icon={<Lightbulb className="h-6 w-6" />}
      className="xl:col-span-2"
    >
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 rounded-lg flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wallet className="h-8 w-8 text-green-700 dark:text-green-300" />
            <span className="font-bold text-lg text-green-800 dark:text-green-200">What I can Invest / Month</span>
          </div>
          <span className="font-bold text-2xl text-green-700 dark:text-green-300 font-headline">
            ₹{investibleSurplus.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>

        {optimizedGoals.length > 0 && <GoalsBreakdown optimizedGoals={optimizedGoals} />}
        
        <Separator className="my-8" />

        <h3 className="text-xl font-bold font-headline text-foreground mb-4">Fund Allocations by Goal</h3>
        
        <div className="space-y-4">
            {allocations.map((alloc) => (
              <FundAllocationItem
                key={alloc.id}
                alloc={alloc}
                availableGoals={availableGoals}
                onUpdate={handleUpdateAllocation}
                onRemove={handleRemoveAllocation}
                optimizedGoals={optimizedGoals}
                fundAllocations={allocations}
                retirementCalculations={retirementCalculations}
                hideGoalAllocationFields={hideGoalAllocationFields}
                hideTypeAndMutualFund={hideTypeAndMutualFund}
                viewMode={viewMode}
                onBenchmarkData={onBenchmarkData}
              />
            ))}
        </div>
        
        <Button variant="outline" size="sm" className="mt-4" onClick={handleAddAllocation}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Fund Allocation
        </Button>
        
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3 text-sm text-blue-800 dark:text-blue-300">
            <Info className="h-5 w-5 mt-0.5 shrink-0 text-blue-500"/>
            <p>If no suitable fund schemes are found, consider selecting "Mutual Funds" as an "Others" option. Then, proceed to search for the respective scheme within this category.</p>
        </div>
        
        <Separator className="my-8" />
        
        <h3 className="text-xl font-bold font-headline text-foreground mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Model Portfolio Analysis
        </h3>

        <Card className="p-4">
            <CardContent className="p-2 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-base">Equity Holdings</span>
                    <span className="font-bold text-lg text-primary">₹{(portfolioAnalysis.equity).toLocaleString('en-IN')}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="font-semibold text-base">Hybrid Holdings</span>
                    <span className="font-bold text-lg text-primary">₹{portfolioAnalysis.hybrid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-base">Debt Holdings</span>
                    <span className="font-bold text-lg text-primary">₹{portfolioAnalysis.debt.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-base">Solution Oriented Holdings</span>
                    <span className="font-bold text-lg text-primary">₹{portfolioAnalysis.solutionOriented.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-base">Other Holdings</span>
                    <span className="font-bold text-lg text-primary">₹{portfolioAnalysis.other.toLocaleString('en-IN')}</span>
                </div>
            </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* EQUITY ANALYSIS */}
        <h3 className="text-xl font-bold font-headline text-foreground mb-4 flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Equity Fund Weight Analysis
        </h3>

        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fund Name</TableHead>
                        <TableHead>Fund Type</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead className="text-right">Weightage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {equityFundWeights.length > 0 ? (
                        equityFundWeights.map(fund => (
                            <TableRow key={fund.id}>
                                <TableCell className="font-medium">{fund.schemeName}</TableCell>
                                <TableCell className="text-muted-foreground">{fund.fundType || 'N/A'}</TableCell>
                                <TableCell className="text-muted-foreground">{fund.goalName}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{fund.weight.toFixed(2)}%</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No equity fund allocations yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>

        <div className="mt-6 text-center">
            <Button onClick={handleGenerateEquityGraph} disabled={isEquityChartLoading}>
                {isEquityChartLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LineChart className="mr-2 h-4 w-4" />}
                Generate Equity Graph
            </Button>
        </div>
        
        {isEquityChartLoading ? (
            <div className="flex items-center justify-center h-96 mt-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Fetching and analyzing historical data...</p>
            </div>
        ) : equityChartData && equityChartData.length > 0 ? (
            <PortfolioNiftyChart 
                data={equityChartData} 
                title="Equity Portfolio vs. Weighted Benchmark (Growth of ₹100)"
            />
        ) : (
            equityChartData !== null && <div className="text-center text-muted-foreground mt-6">Click "Generate Equity Graph" to see the portfolio comparison.</div>
        )}

        <Separator className="my-8" />

        {/* DEBT ANALYSIS */}
        <h3 className="text-xl font-bold font-headline text-foreground mb-4 flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Debt Fund Weight Analysis
        </h3>

        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fund Name</TableHead>
                        <TableHead>Fund Type</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead className="text-right">Weightage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {debtFundWeights.length > 0 ? (
                        debtFundWeights.map(fund => (
                            <TableRow key={fund.id}>
                                <TableCell className="font-medium">{fund.schemeName}</TableCell>
                                <TableCell className="text-muted-foreground">{fund.fundType || 'N/A'}</TableCell>
                                <TableCell className="text-muted-foreground">{fund.goalName}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{fund.weight.toFixed(2)}%</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No debt fund allocations yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>

        <div className="mt-6 text-center">
            <Button onClick={handleGenerateDebtGraph} disabled={isDebtChartLoading}>
                {isDebtChartLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LineChart className="mr-2 h-4 w-4" />}
                Generate Debt Graph
            </Button>
        </div>
        
        {isDebtChartLoading ? (
            <div className="flex items-center justify-center h-96 mt-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Fetching and analyzing historical data...</p>
            </div>
        ) : debtChartData && debtChartData.length > 0 ? (
            <PortfolioNiftyChart 
                data={debtChartData} 
                title="Debt Portfolio vs. Weighted Benchmark (Growth of ₹100)"
            />
        ) : (
            debtChartData !== null && <div className="text-center text-muted-foreground mt-6">Click "Generate Debt Graph" to see the portfolio comparison.</div>
        )}
        
        <Separator className="my-8" />

        {/* HYBRID ANALYSIS */}
        <h3 className="text-xl font-bold font-headline text-foreground mb-4 flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Hybrid Fund Weight Analysis
        </h3>

        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fund Name</TableHead>
                        <TableHead>Fund Type</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead className="text-right">Weightage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {hybridFundWeights.length > 0 ? (
                        hybridFundWeights.map(fund => (
                            <TableRow key={fund.id}>
                                <TableCell className="font-medium">{fund.schemeName}</TableCell>
                                <TableCell className="text-muted-foreground">{fund.fundType || 'N/A'}</TableCell>
                                <TableCell className="text-muted-foreground">{fund.goalName}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{fund.weight.toFixed(2)}%</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No hybrid fund allocations yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>

        <div className="mt-6 text-center">
            <Button onClick={handleGenerateHybridGraph} disabled={isHybridChartLoading}>
                {isHybridChartLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LineChart className="mr-2 h-4 w-4" />}
                Generate Hybrid Graph
            </Button>
        </div>
        
        {isHybridChartLoading ? (
            <div className="flex items-center justify-center h-96 mt-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Fetching and analyzing historical data...</p>
            </div>
        ) : hybridChartData && hybridChartData.length > 0 ? (
            <PortfolioNiftyChart 
                data={hybridChartData} 
                title="Hybrid Portfolio vs. Weighted Benchmark (Growth of ₹100)"
            />
        ) : (
            hybridChartData !== null && <div className="text-center text-muted-foreground mt-6">Click "Generate Hybrid Graph" to see the portfolio comparison.</div>
        )}

        <Separator className="my-8" />

        {/* SOLUTION ORIENTED ANALYSIS */}
        <h3 className="text-xl font-bold font-headline text-foreground mb-4 flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Solution Oriented Fund Weight Analysis
        </h3>

        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fund Name</TableHead>
                        <TableHead>Fund Type</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead className="text-right">Weightage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {solutionOrientedFundWeights.length > 0 ? (
                        solutionOrientedFundWeights.map(fund => (
                            <TableRow key={fund.id}>
                                <TableCell className="font-medium">{fund.schemeName}</TableCell>
                                <TableCell className="text-muted-foreground">{fund.fundType || 'N/A'}</TableCell>
                                <TableCell className="text-muted-foreground">{fund.goalName}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{fund.weight.toFixed(2)}%</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No solution oriented fund allocations yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>

        <div className="mt-6 text-center">
            <Button onClick={handleGenerateSolutionOrientedGraph} disabled={isSolutionOrientedChartLoading}>
                {isSolutionOrientedChartLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LineChart className="mr-2 h-4 w-4" />}
                Generate Solution Oriented Graph
            </Button>
        </div>
        
        {isSolutionOrientedChartLoading ? (
            <div className="flex items-center justify-center h-96 mt-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Fetching and analyzing historical data...</p>
            </div>
        ) : solutionOrientedChartData && solutionOrientedChartData.length > 0 ? (
            <PortfolioNiftyChart 
                data={solutionOrientedChartData} 
                title="Solution Oriented Portfolio vs. Weighted Benchmark (Growth of ₹100)"
            />
        ) : (
            solutionOrientedChartData !== null && <div className="text-center text-muted-foreground mt-6">Click "Generate Solution Oriented Graph" to see the portfolio comparison.</div>
        )}

        <Separator className="my-8" />

        {/* OTHER ANALYSIS */}
        <h3 className="text-xl font-bold font-headline text-foreground mb-4 flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Other Fund Weight Analysis
        </h3>

        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fund Name</TableHead>
                        <TableHead>Fund Type</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead className="text-right">Weightage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {otherFundWeights.length > 0 ? (
                        otherFundWeights.map(fund => (
                            <TableRow key={fund.id}>
                                <TableCell className="font-medium">{fund.schemeName}</TableCell>
                                <TableCell className="text-muted-foreground">{fund.fundType || 'N/A'}</TableCell>
                                <TableCell className="text-muted-foreground">{fund.goalName}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{fund.weight.toFixed(2)}%</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No other fund allocations yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>

        <div className="mt-6 text-center">
            <Button onClick={handleGenerateOtherGraph} disabled={isOtherChartLoading}>
                {isOtherChartLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LineChart className="mr-2 h-4 w-4" />}
                Generate Other Graph
            </Button>
        </div>
        
        {isOtherChartLoading ? (
            <div className="flex items-center justify-center h-96 mt-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Fetching and analyzing historical data...</p>
            </div>
        ) : otherChartData && otherChartData.length > 0 ? (
            <PortfolioNiftyChart 
                data={otherChartData} 
                title="Other Portfolio vs. Weighted Benchmark (Growth of ₹100)"
            />
        ) : (
            otherChartData !== null && <div className="text-center text-muted-foreground mt-6">Click "Generate Other Graph" to see the portfolio comparison.</div>
        )}


        <p className="text-xs text-muted-foreground mt-8">
            Disclaimer: These are example funds for educational purposes only and do not constitute investment advice. Please consult with your financial advisor before making any
        </p>
    </FormSection>
  );
}
