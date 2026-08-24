"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { ScrollProgressBar, ScrollToTopButton } from '@/components/ui/ScrollProgress';
import { useRouter } from 'next/navigation';
import type { PersonalDetails, Asset, Liability, Income, Expense, Goal, GoalWithCalculations, SipOptimizerReportData, GoalWithSip, SipOptimizerGoal, InsuranceAnalysisData, WealthCreationGoal, ReportData, RetirementInputs, RetirementCalculations, AssetAllocationProfile, AllPlannerData, FundAllocation, LifeInsuranceQuote, HealthInsuranceQuote, RetirementGoalReport, ReportSections } from '@/lib/types';
import { calculateAge, calculateGoalDetails, calculateTimelines, calculateSip, calculateWealthCreation, calculateFutureValue, calculateRetirementDetails, calculateNper } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Eraser } from 'lucide-react';
import { generateCsv, getCsvString } from '@/lib/csv';
import { PersonalDetailsForm } from './PersonalDetailsForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDebouncedCallback } from 'use-debounce';
import { AssetsLiabilitiesForm } from './AssetsLiabilitiesForm';
import { IncomeExpensesForm } from './IncomeExpensesForm';
import { InsuranceForm } from './InsuranceForm';
import { GoalsForm } from './GoalsForm';
import { EstatePlanningForm } from './EstatePlanningForm';
import { RetirementPlannerForm } from './RetirementPlannerForm';
import { AssetAllocationForm } from './AssetAllocationForm';
import { RecommendedFunds } from './RecommendedFunds';
import { GoalsBreakdown } from './GoalsBreakdown';
import { AppHeader } from '../layout/AppHeader';
import { InsuranceQuotesForm } from './InsuranceQuotesForm';


const initialPersonalDetails: PersonalDetails = { name: '', dob: '', dependents: '', retirementAge: '', mobile: '', email: '', arn: '' };
const initialAssets: Asset[] = [];
const initialLiabilities: Liability[] = [];
const initialIncomes: Income[] = [];
const initialExpenses: Expense[] = [];
const initialGoals: Goal[] = [{ id: 'initial-1', name: '', corpus: '', years: '', rate: 12, currentSave: '', currentSip: '' }];
const initialRetirementInputs: RetirementInputs = {
    currentAge: '',
    desiredRetirementAge: '',
    lifeExpectancy: '',
    currentMonthlyExpense: '',
    preRetirementRoi: '',
    postRetirementRoi: '',
    incrementalRate: '',
    currentSavings: '',
    currentSip: '',
};
const initialAssetAllocation: AssetAllocationProfile = { age: '', riskAppetite: '' };
const initialFundAllocations: FundAllocation[] = [];
const initialLifeQuotes: LifeInsuranceQuote[] = [];
const initialHealthQuotes: HealthInsuranceQuote[] = [];


const STORAGE_KEY = 'financial_planner_form_data';

interface PlannerProps {
  viewMode?: 'full' | 'allocation';
}

export function Planner({ viewMode = 'full' }: PlannerProps = {}) {
  const isAllocationView = viewMode === 'allocation';
  const { toast } = useToast();
  const router = useRouter();

  
  const [personalDetails, setPersonalDetails] = useState<PersonalDetails>(initialPersonalDetails);
  const [isPersonalDetailsModalOpen, setIsPersonalDetailsModalOpen] = useState(false);

  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [liabilities, setLiabilities] = useState<Liability[]>(initialLiabilities);
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [insuranceAnalysisData, setInsuranceAnalysisData] = useState<Pick<InsuranceAnalysisData, 'lifeInsurance' | 'healthInsurance'>>({ lifeInsurance: { recommendedCover: 0, currentCover: '', currentPremium: '', coverageGap: 0, quotes: [] }, healthInsurance: { recommendedCover: '', currentCover: '', currentPremium: '', coverageGap: 0, quotes: [] } });
  const [lifeQuotes, setLifeQuotes] = useState<LifeInsuranceQuote[]>(initialLifeQuotes);
  const [healthQuotes, setHealthQuotes] = useState<HealthInsuranceQuote[]>(initialHealthQuotes);
  const [willStatus, setWillStatus] = useState<'yes' | 'no' | null>(null);
  const [retirementInputs, setRetirementInputs] = useState<RetirementInputs>(initialRetirementInputs);
  const [assetAllocationProfile, setAssetAllocationProfile] = useState<AssetAllocationProfile>(initialAssetAllocation);
  const [fundAllocations, setFundAllocations] = useState<FundAllocation[]>(initialFundAllocations);
  const [chartDataCache, setChartDataCache] = useState<{
    equity?: import('@/lib/types').ChartDataPoint[];
    debt?: import('@/lib/types').ChartDataPoint[];
    hybrid?: import('@/lib/types').ChartDataPoint[];
    solutionOriented?: import('@/lib/types').ChartDataPoint[];
    other?: import('@/lib/types').ChartDataPoint[];
  }>({});

  const [fundBenchmarkCache, setFundBenchmarkCache] = useState<{
    [schemeCode: string]: {
      yearlyComparison: { year: string; fundReturn: number; benchmarkReturn: number }[];
      benchmarkName: string;
      riskMetrics: any;
      csvMetrics?: import('@/lib/funds-csv').FundMetricsView;
    };
  }>({});

  // TRACK SAVED PERSONS TO AVOID REDUNDANT DRIVE BACKUPS
  const savedPersonsRef = useRef<Set<string>>(new Set());
  
  const [optimizedGoals, setOptimizedGoals] = useState<SipOptimizerGoal[]>([]);
  const [showSectionSelector, setShowSectionSelector] = useState(false);
  const [reportSections, setReportSections] = useState<ReportSections>({
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
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const saveToGoogleSheets = async () => {
    // Prevent syncing until all personal details are provided
    if (!personalDetails.name || 
        !personalDetails.dob || 
        !personalDetails.mobile || 
        !personalDetails.email) {
      return;
    }

    const selectedSchemes = fundAllocations
      .map(a => a.schemeName)
      .filter(Boolean)
      .join(', ');

    try {
      await fetch('/api/save-to-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personalDetails.name || '',
          dob: personalDetails.dob || '',
          mobile: personalDetails.mobile || '',
          email: personalDetails.email || '',
          riskAppetite: assetAllocationProfile.riskAppetite || '',
          selectedSchemes,
        }),
      });
    } catch (e) {
      console.error("Failed to sync to sheets", e);
    }
  };

  const saveToGoogleDrive = async () => {
    // Prevent syncing until all personal details are provided
    if (!personalDetails.name || !personalDetails.email) {
      return;
    }
    
    // Only sync if they actually have some quotes to save
    if (lifeQuotes.length === 0 && healthQuotes.length === 0) {
      return;
    }

    try {
      await fetch('/api/save-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personalDetails.name,
          email: personalDetails.email,
          lifeQuotes: lifeQuotes,
          healthQuotes: healthQuotes
        }),
      });
    } catch (e) {
      console.error("Failed to sync to drive", e);
    }
  };

  const syncAll = async () => {
    await saveToGoogleSheets();
    await saveToGoogleDrive();
  };

  const debouncedSync = useDebouncedCallback(syncAll, 1500);

  const handleChartDataUpdate = useMemo(() => setChartDataCache, []);
  
  const handleBenchmarkData = (schemeCode: string, data: any) => {
    setFundBenchmarkCache(prev => ({ ...prev, [schemeCode]: data }));
  };
  useEffect(() => {
    if (personalDetails.email) {
      debouncedSync();
    }
  }, [assetAllocationProfile.riskAppetite, fundAllocations, lifeQuotes, healthQuotes, debouncedSync, personalDetails.email]);

  // Auto-open modal when entering Allocation view if details are missing (after 5 seconds)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isAllocationView && !personalDetails.email) {
      timeoutId = setTimeout(() => {
        setIsPersonalDetailsModalOpen(true);
      }, 5000);
    }
    return () => clearTimeout(timeoutId);
  }, [isAllocationView, personalDetails.email]);


  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.personalDetails) setPersonalDetails(parsed.personalDetails);
        if (parsed.assets) setAssets(parsed.assets);
        if (parsed.liabilities) setLiabilities(parsed.liabilities);
        if (parsed.incomes) setIncomes(parsed.incomes);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.goals) setGoals(parsed.goals);
        if (parsed.insuranceAnalysisData) setInsuranceAnalysisData(parsed.insuranceAnalysisData);
        if (parsed.lifeQuotes) setLifeQuotes(parsed.lifeQuotes);
        if (parsed.healthQuotes) setHealthQuotes(parsed.healthQuotes);
        if (parsed.willStatus !== undefined) setWillStatus(parsed.willStatus);
        if (parsed.retirementInputs) setRetirementInputs(parsed.retirementInputs);
        if (parsed.assetAllocationProfile) setAssetAllocationProfile(parsed.assetAllocationProfile);
        if (parsed.fundAllocations) setFundAllocations(parsed.fundAllocations);
      }
      // Restore chart caches separately
      try {
        const cachedCharts = sessionStorage.getItem('chart_data_cache');
        if (cachedCharts) setChartDataCache(JSON.parse(cachedCharts));
      } catch {}
      try {
        const cachedBenchmark = sessionStorage.getItem('fund_benchmark_cache');
        if (cachedBenchmark) setFundBenchmarkCache(JSON.parse(cachedBenchmark));
      } catch {}
    } catch (error) {
      console.error('Error loading saved form data:', error);
    }
    setIsHydrated(true);
  }, []);

  // Persist chart caches to sessionStorage whenever they change
  useEffect(() => {
    try {
      if (Object.keys(chartDataCache).length > 0) {
        sessionStorage.setItem('chart_data_cache', JSON.stringify(chartDataCache));
      }
    } catch {}
  }, [chartDataCache]);

  useEffect(() => {
    try {
      if (Object.keys(fundBenchmarkCache).length > 0) {
        sessionStorage.setItem('fund_benchmark_cache', JSON.stringify(fundBenchmarkCache));
      }
    } catch {}
  }, [fundBenchmarkCache]);

  useEffect(() => {
    if (!isHydrated) return;

    const handle = setTimeout(() => {
      try {
        const dataToSave = {
          personalDetails,
          assets,
          liabilities,
          incomes,
          expenses,
          goals,
          insuranceAnalysisData,
          lifeQuotes,
          healthQuotes,
          willStatus,
          retirementInputs,
          assetAllocationProfile,
          fundAllocations,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Error saving form data:', error);
      }
    }, 600);

    return () => clearTimeout(handle);
  }, [
    isHydrated,
    personalDetails,
    assets,
    liabilities,
    incomes,
    expenses,
    goals,
    insuranceAnalysisData,
    lifeQuotes,
    healthQuotes,
    willStatus,
    retirementInputs,
    assetAllocationProfile,
    fundAllocations,
  ]);

  const getNumericValue = (val: number | '') => typeof val === 'number' ? val : 0;

  const age = useMemo(() => calculateAge(personalDetails.dob), [personalDetails.dob]);

  useEffect(() => {
    if (age !== null) {
      setAssetAllocationProfile(prev => ({ ...prev, age: age }));
      setRetirementInputs(prev => ({ ...prev, currentAge: age }));
    }
  }, [age]);

  useEffect(() => {
    if (personalDetails.retirementAge) {
      setRetirementInputs(prev => ({...prev, desiredRetirementAge: personalDetails.retirementAge}));
    }
  }, [personalDetails.retirementAge]);

  const totalAssets = useMemo(() => assets.reduce((sum, a) => sum + getNumericValue(a.amount), 0), [assets]);
  const totalLiabilities = useMemo(() => liabilities.reduce((sum, l) => sum + getNumericValue(l.amount), 0), [liabilities]);
  const netWorth = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);
  
  const totalMonthlyIncome = useMemo(() => incomes.reduce((sum, i) => sum + getNumericValue(i.amount), 0), [incomes]);
  const totalMonthlyExpenses = useMemo(() => expenses.reduce((sum, e) => sum + getNumericValue(e.amount), 0), [expenses]);
  const monthlyCashflow = useMemo(() => totalMonthlyIncome - totalMonthlyExpenses, [totalMonthlyIncome, totalMonthlyExpenses]);
  const yearlyCashflow = useMemo(() => monthlyCashflow * 12, [monthlyCashflow]);
  
  const investibleSurplus = useMemo(() => monthlyCashflow > 0 ? monthlyCashflow : 0, [monthlyCashflow]);

  const goalsWithCalculations = useMemo<GoalWithCalculations[]>(() => goals.map(g => calculateGoalDetails(g)), [goals]);
  const retirementCalculations = useMemo<RetirementCalculations>(() => calculateRetirementDetails(retirementInputs), [retirementInputs]);

  const insuranceAnalysis: InsuranceAnalysisData = useMemo(() => ({
    ...insuranceAnalysisData,
    lifeInsurance: { ...insuranceAnalysisData.lifeInsurance, quotes: lifeQuotes },
    healthInsurance: { ...insuranceAnalysisData.healthInsurance, quotes: healthQuotes }
  }), [insuranceAnalysisData, lifeQuotes, healthQuotes]);
  
  const allPlannerData: AllPlannerData = useMemo(() => ({
    personalDetails,
    assets,
    liabilities,
    incomes,
    expenses,
    goals,
    insuranceAnalysis,
    willStatus,
    retirementInputs,
    assetAllocationProfile,
    fundAllocations,
  }), [
    personalDetails, assets, liabilities, incomes, expenses, goals, insuranceAnalysis,
    willStatus, retirementInputs, assetAllocationProfile, fundAllocations
  ]);

  useEffect(() => {
    if (goalsWithCalculations.length === 0) return;

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const response = await fetch('/api/calculate-optimized-goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalsWithCalculations,
            investibleSurplus,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to calculate optimized goals');
        }

        const data = await response.json();
        setOptimizedGoals(data.optimizedGoals);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Error calculating optimized goals:', error);
      }
    }, 500);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [goalsWithCalculations, investibleSurplus]);

  const handleClearForm = () => {
    if(window.confirm("Are you sure you want to clear all data?")) {
        setPersonalDetails(initialPersonalDetails);
        setAssets(initialAssets);
        setLiabilities(initialLiabilities);
        setIncomes(initialIncomes);
        setExpenses(initialExpenses);
        setGoals(initialGoals);
        setWillStatus(null);
        setRetirementInputs(initialRetirementInputs);
        setAssetAllocationProfile(initialAssetAllocation);
        setFundAllocations(initialFundAllocations);
        setLifeQuotes(initialLifeQuotes);
        setHealthQuotes(initialHealthQuotes);
        sessionStorage.removeItem(STORAGE_KEY);
        toast({
            title: "Form Cleared",
            description: "All data has been reset.",
        });
    }
  };

  const validateData = () => {
    if (!personalDetails.name || !personalDetails.email) {
      toast({
        title: "Personal Details Required",
        description: "Please provide your name and email to generate a report and secure your backup.",
        variant: "destructive",
      });
      return false;
    }

    const hasFinancialData = 
      assets.length > 0 || 
      liabilities.length > 0 || 
      incomes.length > 0 || 
      expenses.length > 0 || 
      goals.some(g => g.name && g.corpus) || 
      fundAllocations.length > 0;

    if (!hasFinancialData) {
      toast({
        title: "Information Needed",
        description: "Please provide some details (Assets, Income, or Goals) to generate a meaningful report.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const saveCsvToDrive = async () => {
    // 1. Validate first
    if (!validateData()) return;

    const personKey = `${personalDetails.name.trim()}-${personalDetails.email.trim()}`.toLowerCase();

    // 2. Avoid duplicates - only save once per person per session
    if (savedPersonsRef.current.has(personKey)) {
      console.log("Already backed up for this user in this session.");
      return;
    }

    const dataForCsv = { ...allPlannerData, netWorth, yearlyCashflow };
    const { csv, fileName } = getCsvString(dataForCsv);

    try {
      const response = await fetch('/api/save-csv-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: csv, fileName }),
      });

      if (!response.ok) {
        console.warn('Google Drive integration skipped or failed:', response.status);
        return;
      }

      // Mark as saved
      savedPersonsRef.current.add(personKey);
      console.log('Google Drive backup saved successfully.');
      toast({ 
        title: "Backup Secured", 
        description: "Your data has been successfully saved to Google Drive." 
      });
    } catch (error) {
      console.warn("Error saving CSV to Drive:", error);
    }
  };

  const handleDownloadCsv = async () => {
    const dataForCsv = { ...allPlannerData, netWorth, yearlyCashflow };
    generateCsv(dataForCsv);
    await saveCsvToDrive();
  };

  const handleSaveToSupabase = async () => {
    if (!personalDetails.email) {
      toast({
        title: "Email Required",
        description: "Please provide an email in Personal Details to save your progress.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/save-investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalDetails,
          plannerData: allPlannerData,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save investor.');

      toast({
        title: "Progress Saved",
        description: `Investor profile saved with ID ${result.investorId}.`,
      });
    } catch (error: any) {
      console.error('Error saving to Supabase:', error);
      toast({
        title: "Save Failed",
        description: error.message || "An error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section: keyof ReportSections) => {
    setReportSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Dedicated handler for /allocation page — builds a minimal report with ONLY allocation data
  const handleGenerateAllocationReport = async () => {
    if (!personalDetails.name || !personalDetails.email) {
      toast({
        title: "Missing Information",
        description: "Please enter your name and email to generate a report.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      // Determine which categories actually have fund allocations
      const categoryMatches = (fundCategory: string | undefined, target: string) => {
        if (!fundCategory) return false;
        const cat = fundCategory.toLowerCase();
        const tgt = target.toLowerCase();
        return cat === tgt || cat.startsWith(tgt) || tgt.startsWith(cat);
      };

      const hasEquityFunds = fundAllocations.some(a => categoryMatches(a.fundCategory, 'Equity') && a.schemeCode);
      const hasDebtFunds = fundAllocations.some(a => categoryMatches(a.fundCategory, 'Debt') && a.schemeCode);
      const hasHybridFunds = fundAllocations.some(a => categoryMatches(a.fundCategory, 'Hybrid') && a.schemeCode);

      const allocationOnlySections: ReportSections = {
        netWorth: false, cashflow: false, investmentStatus: false,
        goalProjections: false, goalsBreakdown: false,
        assetAllocation: true, mutualFundPortfolio: true,
        insurance: false, estatePlanning: false, retirementPlanning: false,
        modelPortfolioAnalysis: true,
        equityWeightAnalysis: hasEquityFunds,
        debtWeightAnalysis: hasDebtFunds,
        hybridWeightAnalysis: hasHybridFunds,
        solutionOrientedWeightAnalysis: fundAllocations.some(a => categoryMatches(a.fundCategory, 'Solution') && a.schemeCode),
        othersWeightAnalysis: fundAllocations.some(a => (categoryMatches(a.fundCategory, 'Other') || categoryMatches(a.fundCategory, 'Commodities')) && a.schemeCode),
        liquidAssetAllocation: false,
      };

      const allocationReportData: SipOptimizerReportData & { goalsWithCalculations: GoalWithCalculations[] } = {
        sections: allocationOnlySections,
        personalDetails: {
          name: personalDetails.name || "N/A",
          dob: personalDetails.dob || "N/A",
          dependents: getNumericValue(personalDetails.dependents),
          retirementAge: getNumericValue(personalDetails.retirementAge),
          mobile: personalDetails.mobile || "N/A",
          email: personalDetails.email || "N/A",
          arn: personalDetails.arn || "N/A",
        },
        netWorth: 0,
        cashflow: { totalMonthlyIncome: 0, totalMonthlyExpenses: 0, investibleSurplus: 0 },
        goals: [],
        retirementGoal: null,
        wealthCreationGoal: null,
        totalInvestmentStatus: { currentInvestment: 0, requiredInvestment: 0, potentialInvestment: 0 },
        detailedTables: {
          incomeExpenses: { totalMonthlyIncome: 0, fixedExpenses: 0, emiExpenses: 0, otherExpenses: 0 },
          assetAllocation: {
            equity: { corpus: 0, monthly: 0 }, fixedIncome: { corpus: 0, monthly: 0 },
            ppf: { corpus: 0, monthly: 0 }, epf: { corpus: 0, monthly: 0 },
            nps: { corpus: 0, monthly: 0 }, gold: { corpus: 0, monthly: 0 },
            insurance: { corpus: 0, monthly: 0 }, realEstate: { corpus: 0, monthly: 0 },
            others: { corpus: 0, monthly: 0 }, total: { corpus: 0, monthly: 0 },
          },
        },
        advisorDetails: {
          arnName: 'Gunjan Kataria',
          arnNo: personalDetails.arn || 'ARN-157982',
          mobile: '9460825477',
          email: 'contact@financialfriend.in',
        },
        insuranceAnalysis: insuranceAnalysis,
        assets: [],
        willStatus: null,
        retirementInputs: retirementInputs,
        retirementCalculations: retirementCalculations,
        assetAllocationProfile: assetAllocationProfile,
        fundAllocations: fundAllocations,
        goalsWithCalculations: [],
        chartDataCache: chartDataCache,
        fundBenchmarkCache: fundBenchmarkCache,
      };

      const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      try {
        await fetch('/api/store-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           reportId,
           userId: personalDetails.email,
           plannerData: allPlannerData,
           sipReport: allocationReportData,
         }),
        });
      } catch (storeError) {
        console.error('Error storing allocation report:', storeError);
      }
      router.push(`/sip-optimizer-report?id=${reportId}`);
    } catch (error) {
      console.error("Error generating allocation report:", error);
      toast({ title: "Error", description: "Failed to generate report.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReportClick = async () => {
    // Validate data first
    if (!validateData()) return;

    // 1. Back up to Google Drive (with duplicate check inside)
    await saveCsvToDrive();

    // 2. On /allocation page — generate allocation-only report directly
    if (isAllocationView) {
      await handleGenerateAllocationReport();
      return;
    }

    // 3. On full planner — show section selector for full report
    setShowSectionSelector(true);
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleGenerateReport = async () => {
    console.log('[Generate Report] Starting with personalDetails:', JSON.stringify(personalDetails));
    
    if (!personalDetails.name || !personalDetails.email) {
      toast({
        title: "Missing Information",
        description: "Please enter at least your name and email before generating a report.",
        variant: "destructive",
      });
      return;
    }
    if (!isAllocationView) {
      const nonRetirementGoals = goals.filter(g => g.name.toLowerCase() !== 'retirement');
      if (nonRetirementGoals.length === 0 || nonRetirementGoals.every(g => !g.name)) {
        toast({
          title: "No Goals",
          description: "Please add at least one financial goal (other than retirement).",
          variant: "destructive"
        });
        return;
      }
    }
    if (!isAllocationView && !insuranceAnalysis) {
      toast({
        title: "Insurance Data Missing",
        description: "Could not retrieve insurance analysis data. Please fill out the insurance section.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Prepare data with user-specified "Other" values
      const processedAssets: Asset[] = assets.map(a => ({ ...a, type: a.type === 'Other' && a.otherType ? a.otherType : a.type }));
      const processedLiabilities: Liability[] = liabilities.map(l => ({ ...l, type: l.type === 'Other' && l.otherType ? l.otherType : l.type }));
      const processedExpenses: Expense[] = expenses.map(e => ({ ...e, type: e.type === 'Other' && e.otherType ? e.otherType : e.type, amount: getNumericValue(e.amount) * 12 }));
      
      const processedGoals: Goal[] = goals.map(g => ({ ...g, name: g.name === 'Other' && g.otherType ? g.otherType : g.name }));
      const processedGoalsWithCalculations: GoalWithCalculations[] = goalsWithCalculations.map((g, i) => ({ 
        ...g, 
        name: processedGoals[i].name 
      }));


      // Common data preparation
      let investibleSurplus = monthlyCashflow > 0 ? monthlyCashflow : 0;
      
      const findAssetAmount = (type: string) => {
        const asset = processedAssets.find(a => a.type === type);
        return asset ? getNumericValue(asset.amount) : 0;
      };
      const assetAllocation = {
          equity: { corpus: findAssetAmount('Indian Equity shares'), monthly: processedGoals.reduce((sum, g) => sum + getNumericValue(g.currentSip), 0) },
          fixedIncome: { corpus: findAssetAmount('Fixed Income instruments'), monthly: 0},
          ppf: { corpus: findAssetAmount('PPF'), monthly: 0},
          epf: { corpus: findAssetAmount('EPF'), monthly: 0},
          nps: { corpus: findAssetAmount('NPS'), monthly: 0},
          gold: { corpus: findAssetAmount('Gold/Gold Bond/ETF/Fund'), monthly: 0},
          insurance: { corpus: findAssetAmount('Insurance'), monthly: 0},
          realEstate: { corpus: findAssetAmount('Real Estate'), monthly: 0},
          others: { corpus: findAssetAmount('Other'), monthly: 0 }, // Note: This might need adjustment if multiple 'Other' assets exist
          total: { corpus: 0, monthly: 0 }
      };

      assetAllocation.total.corpus = Object.values(assetAllocation).reduce((sum, val) => sum + (val.corpus || 0), 0) - assetAllocation.total.corpus;
      assetAllocation.total.monthly = Object.values(assetAllocation).reduce((sum, val) => sum + (val.monthly || 0), 0) - assetAllocation.total.monthly;

      // New Retirement Goal Logic
      let retirementGoalReport: RetirementGoalReport | null = null;
      const retirementRequiredSip = retirementCalculations.monthlyInvestmentNeeded;

      if (retirementRequiredSip > 0) {
          const currentRetirementSip = getNumericValue(retirementInputs.currentSip);
          let allocatedRetirementSip = 0;

          if (investibleSurplus >= retirementRequiredSip) {
              allocatedRetirementSip = retirementRequiredSip;
              investibleSurplus -= retirementRequiredSip;
          } else {
              allocatedRetirementSip = investibleSurplus;
              investibleSurplus = 0;
          }

          const potentialRetirementCorpus = calculateFutureValue(
              allocatedRetirementSip,
              getNumericValue(retirementInputs.preRetirementRoi),
              retirementCalculations.yearsToRetirement,
              getNumericValue(retirementInputs.currentSavings)
          );

          const targetCorpusForTimeline = retirementCalculations.requiredRetirementCorpus;
          const preRetirementRoiForTimeline = getNumericValue(retirementInputs.preRetirementRoi);
          
          const totalCurrentRetirementAssets = getNumericValue(retirementInputs.currentSavings) + calculateFutureValue(getNumericValue(retirementInputs.currentSip), getNumericValue(retirementInputs.preRetirementRoi), retirementCalculations.yearsToRetirement, 0);

          let potentialTimeline;
          if (allocatedRetirementSip >= retirementRequiredSip) {
              potentialTimeline = retirementCalculations.yearsToRetirement;
          } else {
              potentialTimeline = calculateNper(
                  targetCorpusForTimeline,
                  preRetirementRoiForTimeline,
                  allocatedRetirementSip,
                  getNumericValue(retirementInputs.currentSavings) + calculateFutureValue(0, preRetirementRoiForTimeline, retirementCalculations.yearsToRetirement, getNumericValue(retirementInputs.currentSip)) // This seems off
              );
          }
          
          const currentTimeline = calculateNper(
              targetCorpusForTimeline,
              preRetirementRoiForTimeline,
              currentRetirementSip,
              getNumericValue(retirementInputs.currentSavings)
          );


          retirementGoalReport = {
              futureValue: retirementCalculations.requiredRetirementCorpus,
              timeline: {
                current: currentTimeline,
                required: retirementCalculations.yearsToRetirement,
                potential: potentialTimeline,
              },
              investmentStatus: {
                  currentInvestment: currentRetirementSip,
                  requiredInvestment: retirementRequiredSip,
                  allocatedInvestment: allocatedRetirementSip,
              },
              potentialCorpus: potentialRetirementCorpus,
          };
      }


      // SIP Optimizer Logic for other goals
      const otherGoalsCalculations = processedGoalsWithCalculations.filter(g => g.name.toLowerCase() !== 'retirement');
      const totalRequiredSipForOtherGoals = otherGoalsCalculations.reduce((sum, goal) => sum + goal.newSipRequired, 0);
      let surplusForWealthCreation = 0;
      let optimizerGoals: SipOptimizerGoal[] = [];

      if (investibleSurplus >= totalRequiredSipForOtherGoals) {
        // CASE 1 & 3: All goals are covered, potentially with surplus
        surplusForWealthCreation = investibleSurplus - totalRequiredSipForOtherGoals;
        optimizerGoals = otherGoalsCalculations.map(goal => {
            const potentialCorpus = calculateFutureValue(goal.newSipRequired, getNumericValue(goal.rate), getNumericValue(goal.years), getNumericValue(goal.currentSave));
            const potentialCorpusWithCurrentSip = calculateFutureValue(getNumericValue(goal.currentSip), getNumericValue(goal.rate), getNumericValue(goal.years), getNumericValue(goal.currentSave));

            return {
                id: goal.id,
                name: goal.name,
                targetCorpus: getNumericValue(goal.corpus),
                futureValue: potentialCorpus,
                timeline: {
                    current: getNumericValue(goal.years),
                    required: getNumericValue(goal.years),
                    potential: getNumericValue(goal.years),
                },
                investmentStatus: {
                    currentInvestment: getNumericValue(goal.currentSip),
                    requiredInvestment: goal.newSipRequired,
                    allocatedInvestment: goal.newSipRequired, // Fund exactly what's required
                },
                potentialCorpus: potentialCorpusWithCurrentSip,
            };
        });
      } else {
        // CASE 2: SIPs exceed cashflow, allocate proportionally based on required SIP ratio
        optimizerGoals = otherGoalsCalculations.map(goal => {
            let allocatedInvestment = 0;
            if (otherGoalsCalculations.length === 1) {
                allocatedInvestment = investibleSurplus;
            } else if (totalRequiredSipForOtherGoals > 0) {
                const weight = goal.newSipRequired / totalRequiredSipForOtherGoals;
                allocatedInvestment = investibleSurplus * weight;
            }
            
            const potentialCorpus = calculateFutureValue(allocatedInvestment, getNumericValue(goal.rate), getNumericValue(goal.years), getNumericValue(goal.currentSave));
            const potentialCorpusWithCurrentSip = calculateFutureValue(getNumericValue(goal.currentSip), getNumericValue(goal.rate), getNumericValue(goal.years), getNumericValue(goal.currentSave));
            
            return {
                id: goal.id,
                name: goal.name,
                targetCorpus: getNumericValue(goal.corpus),
                futureValue: potentialCorpus,
                timeline: {
                    current: getNumericValue(goal.years),
                    required: getNumericValue(goal.years),
                    potential: getNumericValue(goal.years),
                },
                investmentStatus: {
                    currentInvestment: getNumericValue(goal.currentSip),
                    requiredInvestment: goal.newSipRequired,
                    allocatedInvestment: allocatedInvestment,
                },
                potentialCorpus: potentialCorpusWithCurrentSip,
            };
        });
      }
      
      let wealthCreationGoal: WealthCreationGoal | null = null;
      if (surplusForWealthCreation > 0) {
          const defaultRate = processedGoals.length > 0 ? (processedGoals.reduce((acc, g) => acc + getNumericValue(g.rate), 0) / processedGoals.length) : 12;
          wealthCreationGoal = calculateWealthCreation(surplusForWealthCreation, defaultRate);
      }
      
      const totalCurrentInvestment = optimizerGoals.reduce((sum, g) => sum + g.investmentStatus.currentInvestment, 0) + getNumericValue(retirementInputs.currentSip);
      const totalRequiredInvestment = totalRequiredSipForOtherGoals + (retirementGoalReport?.investmentStatus.requiredInvestment || 0);
      const totalPotentialInvestment = (monthlyCashflow > 0 ? monthlyCashflow : 0);

       const totalInvestmentStatus = {
          currentInvestment: totalCurrentInvestment,
          requiredInvestment: totalRequiredInvestment,
          potentialInvestment: totalPotentialInvestment,
      };

      const categoryMatches = (fundCategory: string | undefined, target: string) => {
        if (!fundCategory) return false;
        const cat = fundCategory.toLowerCase();
        const tgt = target.toLowerCase();
        return cat === tgt || cat.startsWith(tgt) || tgt.startsWith(cat);
      };

      const hasEquityFunds = fundAllocations.some(a => categoryMatches(a.fundCategory, 'Equity') && a.schemeCode);
      const hasDebtFunds = fundAllocations.some(a => categoryMatches(a.fundCategory, 'Debt') && a.schemeCode);
      const hasHybridFunds = fundAllocations.some(a => categoryMatches(a.fundCategory, 'Hybrid') && a.schemeCode);
      const hasSolutionFunds = fundAllocations.some(a => categoryMatches(a.fundCategory, 'Solution') && a.schemeCode);
      const hasOtherFunds = fundAllocations.some(a => (categoryMatches(a.fundCategory, 'Other') || categoryMatches(a.fundCategory, 'Commodities')) && a.schemeCode);

      const reportSectionsToUse: ReportSections = {
        ...reportSections,
        equityWeightAnalysis: reportSections.equityWeightAnalysis && hasEquityFunds,
        debtWeightAnalysis: reportSections.debtWeightAnalysis && hasDebtFunds,
        hybridWeightAnalysis: reportSections.hybridWeightAnalysis && hasHybridFunds,
        solutionOrientedWeightAnalysis: (reportSections.solutionOrientedWeightAnalysis ?? true) && hasSolutionFunds,
        othersWeightAnalysis: (reportSections.othersWeightAnalysis ?? true) && hasOtherFunds,
      };

       // SIP Optimizer Report Data
      console.log('[Generate Report] Creating SIP report with personalDetails:', {
        name: personalDetails.name,
        dob: personalDetails.dob,
        mobile: personalDetails.mobile,
        email: personalDetails.email
      });
      
      const generatedSipReportData: SipOptimizerReportData & { goalsWithCalculations: GoalWithCalculations[] } = {
          sections: reportSectionsToUse,
          personalDetails: {
              name: personalDetails.name || "N/A",
              dob: personalDetails.dob || "N/A",
              dependents: getNumericValue(personalDetails.dependents),
              retirementAge: getNumericValue(personalDetails.retirementAge),
              mobile: personalDetails.mobile || "N/A",
              email: personalDetails.email || "N/A",
              arn: personalDetails.arn || "N/A",
          },
          netWorth: netWorth,
          cashflow: {
              totalMonthlyIncome: totalMonthlyIncome,
              totalMonthlyExpenses: totalMonthlyExpenses,
              investibleSurplus: (monthlyCashflow > 0 ? monthlyCashflow : 0),
          },
          goals: optimizerGoals,
          retirementGoal: retirementGoalReport,
          wealthCreationGoal: wealthCreationGoal,
          totalInvestmentStatus,
          detailedTables: {
              incomeExpenses: {
                  totalMonthlyIncome: totalMonthlyIncome,
                  fixedExpenses: processedExpenses.filter(e => e.type === 'Rent').reduce((sum, e) => sum + getNumericValue(e.amount), 0) / 12,
                  emiExpenses: 0, // Placeholder
                  otherExpenses: processedExpenses.filter(e => e.type !== 'Rent').reduce((sum, e) => sum + getNumericValue(e.amount), 0) / 12,
              },
              assetAllocation: assetAllocation
          },
          advisorDetails: {
            arnName: 'Gunjan Kataria',
            arnNo: personalDetails.arn || 'ARN-157982',
            mobile: '9460825477',
            email: 'contact@financialfriend.in',
          },
          insuranceAnalysis: insuranceAnalysis,
          assets: processedAssets,
          willStatus: willStatus,
          retirementInputs: retirementInputs,
          retirementCalculations: retirementCalculations,
          assetAllocationProfile: assetAllocationProfile,
          fundAllocations: fundAllocations,
          goalsWithCalculations: processedGoalsWithCalculations,
          chartDataCache: chartDataCache,
          fundBenchmarkCache: fundBenchmarkCache,
      };
      
      // Detailed Wellness Report Data
      const goalsWithSip: GoalWithSip[] = processedGoals.map(g => ({
        ...g,
        sip: calculateSip(g)
      }));

      // In allocation view, skip AI summary (no goals/insurance data available on this page)
      let summary = '';
      if (!isAllocationView) {
        const summaryInput = {
          name: personalDetails.name || "User",
          netWorth,
          monthlyCashflow,
          insuranceCover: getNumericValue(insuranceAnalysis.lifeInsurance.currentCover as number | '') + getNumericValue(insuranceAnalysis.healthInsurance.currentCover as number | ''),
          insurancePremium: getNumericValue(insuranceAnalysis.lifeInsurance.currentPremium as number | '') + getNumericValue(insuranceAnalysis.healthInsurance.currentPremium as number | ''),
          goals: goalsWithSip.map(g => ({
            goalName: g.name,
            corpus: getNumericValue(g.corpus),
            years: getNumericValue(g.years),
            rate: getNumericValue(g.rate),
            sip: g.sip
          })),
        };

        const summaryResponse = await fetch('/api/summarize-financial-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(summaryInput),
        });

        if (!summaryResponse.ok) {
          console.error('Failed to get financial summary. Status:', summaryResponse.status);
          throw new Error(`Failed to generate financial summary: ${summaryResponse.statusText}`);
        }

        const result = await summaryResponse.json();
        summary = result.summary;
      }

      const generatedDetailedReportData: ReportData = {
        personalDetails: personalDetails,
        netWorth: netWorth,
        monthlyCashflow: monthlyCashflow,
        totalInsuranceCover: 0,
        totalInsurancePremium: 0,
        goals: goalsWithSip,
        totalAssets: totalAssets,
        totalLiabilities: totalLiabilities,
        assets: processedAssets,
        liabilities: processedLiabilities,
        totalAnnualIncome: totalMonthlyIncome * 12,
        totalAnnualExpenses: totalMonthlyExpenses * 12,
        expenses: processedExpenses,
        aiSummary: summary,
        willStatus: willStatus,
      };

      // Generate a stable report record ID for the Supabase report history.
      const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Store data in Replit Database via API for persistence
      try {
        const storeResponse = await fetch('/api/store-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            userId: personalDetails.email,
            plannerData: allPlannerData,
            detailedReport: generatedDetailedReportData,
            sipReport: generatedSipReportData,
          }),
        });

        if (!storeResponse.ok) {
          console.error('Failed to store report data');
        }
      } catch (storeError) {
        console.error('Error storing report:', storeError);
      }

      // Navigate to report with report ID in URL
      router.push(`/sip-optimizer-report?id=${reportId}`);

    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <ScrollProgressBar />
      <ScrollToTopButton />
      <AppHeader />
      <div className="container mx-auto p-4 md:p-8">
        {isAllocationView ? (
          <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground">Allocation</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Review your recommended asset allocation and plan your fund-level allocations.</p>
          </div>
        ) : (
          <div className="text-center mb-12">
            <div>
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary/70 mb-3 px-4 py-1 rounded-full border border-primary/20 bg-primary/5">
                Your Financial Command Center
              </span>
              <h2 className="text-3xl md:text-5xl font-bold font-headline mt-2 mb-3">Plan Your Financial Future</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-base md:text-lg">Fill in the details below to get a comprehensive overview of your financial health and a personalized plan to achieve your goals.</p>
            </div>
          </div>
        )}

        {isAllocationView ? (
          <div id="allocation" className="space-y-8">
            <Dialog open={isPersonalDetailsModalOpen} onOpenChange={setIsPersonalDetailsModalOpen}>
              <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden !top-[55%]">
                <div className="p-8 max-h-[85vh] overflow-y-auto">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-bold text-foreground">Personal Details</DialogTitle>
                  </DialogHeader>
                  <PersonalDetailsForm details={personalDetails} setDetails={setPersonalDetails} isModal={true} />
                  <DialogFooter className="gap-2 sm:justify-end mt-8">
                     <Button variant="outline" size="lg" onClick={() => setIsPersonalDetailsModalOpen(false)}>Cancel</Button>
                      <Button size="lg" onClick={() => { syncAll(); setIsPersonalDetailsModalOpen(false); }}>OK</Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

            <AssetAllocationForm
                age={age}
                profile={assetAllocationProfile}
                setProfile={setAssetAllocationProfile}
                editableAge
              />
            <RecommendedFunds
                allocations={fundAllocations}
                setAllocations={setFundAllocations}
                investibleSurplus={investibleSurplus}
                optimizedGoals={optimizedGoals}
                goals={goals}
                retirementCalculations={retirementCalculations}
                onChartDataUpdate={setChartDataCache}
                initialChartData={chartDataCache}
                onBenchmarkData={(schemeCode, data) => {
                  setFundBenchmarkCache(prev => ({ ...prev, [schemeCode]: data }));
                }}
                hideTypeAndMutualFund
                viewMode={viewMode}
               />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            <div>
              <PersonalDetailsForm details={personalDetails} setDetails={setPersonalDetails} />
            </div>
            <div>
              <AssetsLiabilitiesForm 
                assets={assets} 
                setAssets={setAssets} 
                liabilities={liabilities} 
                setLiabilities={setLiabilities}
                netWorth={netWorth}
              />
            </div>
            <div>
              <IncomeExpensesForm
                incomes={incomes}
                setIncomes={setIncomes}
                expenses={expenses}
                setExpenses={setExpenses}
                monthlyCashflow={monthlyCashflow}
                yearlyCashflow={yearlyCashflow}
              />
            </div>
            <div>
              <InsuranceForm
                age={age}
                incomes={incomes}
                onInsuranceDataChange={setInsuranceAnalysisData}
              />
            </div>
            <div className="xl:col-span-2">
              <GoalsForm
                goals={goals}
                setGoals={setGoals}
                goalsWithCalculations={goalsWithCalculations}
              />
            </div>
            <div className="xl:col-span-2">
              <RetirementPlannerForm
                inputs={retirementInputs}
                setInputs={setRetirementInputs}
                calculations={retirementCalculations}
              />
            </div>
            <div>
              <EstatePlanningForm
                willStatus={willStatus}
                setWillStatus={setWillStatus}
              />
            </div>
            <div className="xl:col-span-2">
              <div id="allocation" className="scroll-mt-32 space-y-8">
                <AssetAllocationForm
                    age={age}
                    profile={assetAllocationProfile}
                    setProfile={setAssetAllocationProfile}
                  />
                <RecommendedFunds
                    allocations={fundAllocations}
                    setAllocations={setFundAllocations}
                    investibleSurplus={investibleSurplus}
                    optimizedGoals={optimizedGoals}
                    goals={goals}
                    retirementCalculations={retirementCalculations}
                    onChartDataUpdate={handleChartDataUpdate}
                    initialChartData={chartDataCache}
                    onBenchmarkData={handleBenchmarkData}
                    hideTypeAndMutualFund
                   />
              </div>
            </div>
            <div className="xl:col-span-2">
              <InsuranceQuotesForm
                 lifeQuotes={lifeQuotes}
                 setLifeQuotes={setLifeQuotes}
                 healthQuotes={healthQuotes}
                 setHealthQuotes={setHealthQuotes}
              />
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <Button onClick={handleGenerateReportClick} disabled={isGenerating} size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Reports...
                </>
              ) : "Generate Financial Reports"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSaveToSupabase}
              disabled={isSaving}
              size="lg"
              className="flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Save Progress
            </Button>
            <Button onClick={handleDownloadCsv} variant="outline" size="lg">
              <Download className="mr-2 h-5 w-5" /> Download as CSV
            </Button>
            <Button onClick={handleClearForm} variant="destructive" size="lg">
              <Eraser className="mr-2 h-5 w-5" /> Clear Form
            </Button>
          </div>

          {showSectionSelector && (
            <div
              className="mt-8 p-6 border border-border rounded-xl max-w-4xl mx-auto text-left bg-card"
            >
              <h3 className="text-xl font-bold text-foreground mb-4">Select Report Sections</h3>
              <p className="text-sm text-muted-foreground mb-6">Choose which sections to include in your financial report.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {[
                  { id: 'netWorth', label: 'Your Net Worth', allocationOnly: false },
                  { id: 'cashflow', label: 'Your Monthly Cashflow Summary', allocationOnly: false },
                  { id: 'investmentStatus', label: 'Investment Status', allocationOnly: false },
                  { id: 'goalProjections', label: 'Financial Goal Details', allocationOnly: false },
                  { id: 'goalsBreakdown', label: 'Goals Breakdown', allocationOnly: false },
                  { id: 'assetAllocation', label: 'Recommended Asset Allocation', allocationOnly: true },
                  { id: 'mutualFundPortfolio', label: 'Proposed Mutual Fund Portfolio', allocationOnly: true },
                  { id: 'insurance', label: 'Insurance Coverage & Expert Summary', allocationOnly: false },
                  { id: 'estatePlanning', label: 'Estate Planning (Will status)', allocationOnly: false },
                  { id: 'retirementPlanning', label: 'Retirement Planning Analysis', allocationOnly: false },
                  { id: 'liquidAssetAllocation', label: 'Liquid Asset Allocation', allocationOnly: true },
                  { id: 'modelPortfolioAnalysis', label: 'Model Portfolio Analysis', allocationOnly: true },
                  { id: 'equityWeightAnalysis', label: 'Equity Fund Weight Analysis', allocationOnly: true },
                  { id: 'debtWeightAnalysis', label: 'Debt Fund Weight Analysis', allocationOnly: true },
                  { id: 'hybridWeightAnalysis', label: 'Hybrid Fund Weight Analysis', allocationOnly: true },
                ].filter(section => isAllocationView ? section.allocationOnly : true).map((section) => (
                  <div key={section.id} className="flex items-center space-x-3 p-3 glass rounded-xl border border-transparent hover:border-primary/30 transition-all duration-200">
                    <Checkbox 
                      id={`section-${section.id}`} 
                      checked={reportSections[section.id as keyof ReportSections]}
                      onCheckedChange={() => toggleSection(section.id as keyof ReportSections)}
                    />
                    <Label 
                      htmlFor={`section-${section.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {section.label}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg shadow-lg h-auto text-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Finalizing PDF...
                    </>
                  ) : "Generate Final PDF Report"}
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t mt-12">
        &copy; {new Date().getFullYear()} FinFriend Planner. All rights reserved.
      </footer>
    </div>
  );
}
