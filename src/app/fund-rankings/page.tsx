"use client";

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Shield, RefreshCw, Award, Loader2, Target, AlertTriangle, BarChart3, Info, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { analyzeFactsheet } from '@/ai/flows/analyze-factsheet-flow';
import type { FactsheetData } from '@/ai/flows/analyze-factsheet-flow';

interface MutualFundScheme {
  category: string;
  type: string;
  fundName: string;
  schemeName: string;
  schemeCode: string;
}

interface FundMetrics {
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
  standardDeviation?: number;
  rollingReturns?: number;
}

interface FactsheetDataWithMetrics extends FactsheetData {
  schemeCode?: string;
  schemeName?: string;
}

interface InvestorProfile {
  ratio: string;
  idealPreference: string;
  weight: string;
}

const INVESTOR_PROFILES: Record<string, InvestorProfile[]> = {
  'Aggressive Investor': [
    { ratio: 'Alpha', idealPreference: 'Highest & Consistent', weight: '30%' },
    { ratio: 'Sharpe Ratio', idealPreference: 'High', weight: '20%' },
    { ratio: 'Sortino Ratio', idealPreference: 'High', weight: '15%' },
    { ratio: 'Rolling Returns', idealPreference: 'Top Quartile', weight: '15%' },
    { ratio: 'Beta', idealPreference: '1-1.2', weight: '10%' },
    { ratio: 'Standard Deviation', idealPreference: 'Can be High', weight: '10%' },
  ],
  'Moderate Investor': [
    { ratio: 'Sharpe Ratio', idealPreference: 'Highest', weight: '30%' },
    { ratio: 'Sortino Ratio', idealPreference: 'High', weight: '20%' },
    { ratio: 'Standard Deviation', idealPreference: 'Lower than category avg', weight: '15%' },
    { ratio: 'Beta', idealPreference: '0.9-1.0', weight: '15%' },
    { ratio: 'Alpha', idealPreference: 'Positive & Stable', weight: '10%' },
    { ratio: 'Rolling Returns', idealPreference: 'Consistent', weight: '10%' },
  ],
  'Conservative Investor': [
    { ratio: 'Sortino Ratio', idealPreference: 'Highest', weight: '30%' },
    { ratio: 'Standard Deviation', idealPreference: 'Lowest', weight: '25%' },
    { ratio: 'Beta', idealPreference: 'Below 0.85', weight: '20%' },
    { ratio: 'Sharpe Ratio', idealPreference: 'Reasonably High', weight: '15%' },
    { ratio: 'Max Drawdown', idealPreference: 'Lowest', weight: '10%' },
  ],
};

// Calculate profile-based score
function calculateProfileBasedScore(metrics: FundMetrics, profile: string): number {
  let totalScore = 0;
  let totalWeight = 0;
  let validMetricsCount = 0;

  const scoreMetrics = {
    alpha: metrics.alpha || 0,
    sharpeRatio: metrics.sharpeRatio || 0,
    sortinoRatio: metrics.sortinoRatio || 0,
    beta: metrics.beta || 0,
    standardDeviation: metrics.standardDeviation || 0,
    rollingReturns: metrics.rollingReturns || 0,
    maxDrawdown: Math.abs(metrics.maxDrawdown || 0),
  };

  const weights: Record<string, number> = {};
  const profileData = INVESTOR_PROFILES[profile] || [];

  profileData.forEach((p) => {
    weights[p.ratio] = parseInt(p.weight);
  });

  // Alpha (normalize to 0-100, typical range -5 to 5, penalize zero values)
  if (weights['Alpha'] && scoreMetrics.alpha !== undefined) {
    const alphaScore = scoreMetrics.alpha > 0 ? Math.min(100, (scoreMetrics.alpha + 1) * 12.5) : Math.max(0, scoreMetrics.alpha * 5);
    totalScore += (alphaScore * weights['Alpha']) / 100;
    totalWeight += weights['Alpha'];
    if (scoreMetrics.alpha !== 0) validMetricsCount++;
  }

  // Sharpe Ratio (normalize to 0-100, typical range 0-3, penalize zero/low values)
  if (weights['Sharpe Ratio'] && scoreMetrics.sharpeRatio !== undefined) {
    const sharpeScore = scoreMetrics.sharpeRatio >= 1.5 ? 100 : (scoreMetrics.sharpeRatio / 1.5) * 80;
    totalScore += (sharpeScore * weights['Sharpe Ratio']) / 100;
    totalWeight += weights['Sharpe Ratio'];
    if (scoreMetrics.sharpeRatio !== 0) validMetricsCount++;
  }

  // Sortino Ratio (normalize to 0-100, typical range 0-3, penalize zero/low values)
  if (weights['Sortino Ratio'] && scoreMetrics.sortinoRatio !== undefined) {
    const sortinoScore = scoreMetrics.sortinoRatio >= 1.5 ? 100 : (scoreMetrics.sortinoRatio / 1.5) * 80;
    totalScore += (sortinoScore * weights['Sortino Ratio']) / 100;
    totalWeight += weights['Sortino Ratio'];
    if (scoreMetrics.sortinoRatio !== 0) validMetricsCount++;
  }

  // Beta (normalize based on ideal range for the profile)
  if (weights['Beta'] && scoreMetrics.beta !== undefined) {
    let betaScore = 0;
    if (profile === 'Aggressive Investor') {
      // Target 1-1.2: close to 1.1 is best
      betaScore = Math.min(100, Math.max(0, 100 - Math.abs(scoreMetrics.beta - 1.1) * 40));
    } else if (profile === 'Moderate Investor') {
      // Target 0.9-1.0: close to 0.95 is best
      betaScore = Math.min(100, Math.max(0, 100 - Math.abs(scoreMetrics.beta - 0.95) * 40));
    } else if (profile === 'Conservative Investor') {
      // Target below 0.85
      betaScore = Math.min(100, Math.max(0, (0.85 - scoreMetrics.beta) * 80));
    }
    totalScore += (betaScore * weights['Beta']) / 100;
    totalWeight += weights['Beta'];
    validMetricsCount++;
  }

  // Standard Deviation (lower is better for Moderate and Conservative)
  if (weights['Standard Deviation'] && scoreMetrics.standardDeviation !== undefined) {
    let stdDevScore = 0;
    if (profile === 'Aggressive Investor') {
      // Can be higher, but still penalize extreme values
      stdDevScore = Math.max(40, 100 - (scoreMetrics.standardDeviation * 2));
    } else {
      // For Moderate and Conservative, lower is better (normalize assuming 0-20 range)
      stdDevScore = Math.min(100, Math.max(0, 100 - (scoreMetrics.standardDeviation * 4)));
    }
    totalScore += (stdDevScore * weights['Standard Deviation']) / 100;
    totalWeight += weights['Standard Deviation'];
    if (scoreMetrics.standardDeviation !== 0) validMetricsCount++;
  }

  // Rolling Returns / CAGR (normalize to 0-100, typical range -30% to 30%)
  if (weights['Rolling Returns'] && scoreMetrics.rollingReturns !== undefined) {
    const returnsScore = scoreMetrics.rollingReturns >= 15 ? 100 : Math.max(0, (scoreMetrics.rollingReturns + 20) * 2.5);
    totalScore += (returnsScore * weights['Rolling Returns']) / 100;
    totalWeight += weights['Rolling Returns'];
    if (scoreMetrics.rollingReturns !== 0) validMetricsCount++;
  }

  // Max Drawdown (lower is better, only for Conservative)
  if (weights['Max Drawdown'] && scoreMetrics.maxDrawdown !== undefined) {
    const drawdownScore = Math.min(100, Math.max(0, 100 - scoreMetrics.maxDrawdown * 3));
    totalScore += (drawdownScore * weights['Max Drawdown']) / 100;
    totalWeight += weights['Max Drawdown'];
    validMetricsCount++;
  }

  // Penalty for funds with too many zero/missing metrics
  let baseScore = totalWeight > 0 ? (totalScore / totalWeight) : 0;
  const expectedMetricsCount = profileData.length;
  if (validMetricsCount < expectedMetricsCount * 0.6) {
    // If less than 60% of metrics are non-zero, apply significant penalty
    baseScore = baseScore * 0.4;
  }

  return Math.max(0, baseScore);
}

export default function FundRankingsPage() {
  const [allFunds, setAllFunds] = useState<MutualFundScheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedMutualFund, setSelectedMutualFund] = useState('');
  const [selectedScheme, setSelectedScheme] = useState('');
  
  const [fundMetrics, setFundMetrics] = useState<FundMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [rankInCategory, setRankInCategory] = useState<number | null>(null);
  const [totalInCategory, setTotalInCategory] = useState<number | null>(null);
  
  const [factsheetManifest, setFactsheetManifest] = useState<Record<string, Record<string, string>>>({});
  const [factsheetData, setFactsheetData] = useState<FactsheetDataWithMetrics | null>(null);
  const [isLoadingFactsheet, setIsLoadingFactsheet] = useState(false);
  const [factsheetError, setFactsheetError] = useState<string | null>(null);
  
  const [selectedInvestorProfile, setSelectedInvestorProfile] = useState<string>('');
  
  // Two-step analysis workflow
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [metricsValidation, setMetricsValidation] = useState<Record<string, {value: number | string, isValid: boolean}>>({});
  const [validationLoading, setValidationLoading] = useState(false);

  useEffect(() => {
    loadFundsData();
    loadFactsheetManifest();
  }, []);

  const loadFactsheetManifest = async () => {
    try {
      const response = await fetch('/factsheets.json');
      const data = await response.json();
      setFactsheetManifest(data);
    } catch (error) {
      console.error('Error loading factsheets manifest:', error);
    }
  };

  const loadFundsData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/fund-schemes-master.csv');
      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      const funds: MutualFundScheme[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = parseCSVLine(line);
        if (parts.length < 5) continue;
        
        funds.push({
          category: parts[0].trim(),
          type: parts[1].trim(),
          fundName: parts[2].trim(),
          schemeName: parts[3].trim(),
          schemeCode: parts[4].trim()
        });
      }
      
      setAllFunds(funds);
    } catch (error) {
      console.error('Error loading funds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const categories = useMemo(() => {
    const cats = new Set(allFunds.map(f => f.category));
    return Array.from(cats).sort();
  }, [allFunds]);

  const types = useMemo(() => {
    if (!selectedCategory) return [];
    const filtered = allFunds.filter(f => f.category === selectedCategory);
    const typeSet = new Set(filtered.map(f => f.type));
    return Array.from(typeSet).sort();
  }, [selectedCategory, allFunds]);

  const mutualFunds = useMemo(() => {
    if (!selectedCategory || !selectedType) return [];
    const filtered = allFunds.filter(
      f => f.category === selectedCategory && f.type === selectedType
    );
    const fundSet = new Set(filtered.map(f => f.fundName));
    return Array.from(fundSet).sort();
  }, [selectedCategory, selectedType, allFunds]);

  const schemes = useMemo(() => {
    if (!selectedCategory || !selectedType || !selectedMutualFund) return [];
    const filtered = allFunds.filter(
      f => f.category === selectedCategory && 
           f.type === selectedType && 
           f.fundName === selectedMutualFund
    );
    return filtered.sort((a, b) => a.schemeName.localeCompare(b.schemeName));
  }, [selectedCategory, selectedType, selectedMutualFund, allFunds]);

  // Validate metrics are non-zero
  const validateMetrics = (metrics: FundMetrics): Record<string, {value: number | string, isValid: boolean}> => {
    return {
      'Sharpe Ratio': { value: metrics.sharpeRatio, isValid: metrics.sharpeRatio !== 0 },
      'Beta': { value: metrics.beta, isValid: metrics.beta !== 0 },
      'Standard Deviation': { value: metrics.standardDeviation || 0, isValid: (metrics.standardDeviation || 0) !== 0 },
      'Alpha': { value: metrics.alpha, isValid: metrics.alpha !== 0 },
      'Sortino Ratio': { value: metrics.sortinoRatio, isValid: metrics.sortinoRatio !== 0 },
      'Expense Ratio': { value: metrics.maxDrawdown, isValid: metrics.maxDrawdown !== 0 },
    };
  };

  const handleAnalyzeClick = async () => {
    if (!selectedScheme) return;
    
    setValidationLoading(true);
    setIsAnalyzed(false);
    
    try {
      const selectedFund = schemes.find(s => s.schemeName === selectedScheme);
      if (!selectedFund) throw new Error('Fund not found');
      
      // Fetch metrics
      const params = new URLSearchParams({
        category: selectedCategory,
        type: selectedType,
        limit: '100'
      });
      
      const response = await fetch(`/api/fund-rankings?${params}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const allRankedFunds: FundMetrics[] = data.data;
        const fundData = allRankedFunds.find(
          f => f.schemeCode === selectedFund.schemeCode || f.schemeName === selectedScheme
        );
        
        if (fundData) {
          // Validate metrics
          const validation = validateMetrics(fundData);
          setMetricsValidation(validation);
          
          // Get count of valid metrics for informational display
          const validMetricsCount = Object.values(validation).filter(v => v.isValid).length;
          
          // Always proceed with ranking using available metrics
          setFundMetrics(fundData);
          setIsAnalyzed(true);
          
          const rank = allRankedFunds.findIndex(
            f => f.schemeCode === selectedFund.schemeCode || f.schemeName === selectedScheme
          ) + 1;
          setRankInCategory(rank > 0 ? rank : null);
          setTotalInCategory(allRankedFunds.length);
          
          // Load factsheet analysis
          await loadFactsheetForFund(selectedFund.fundName, selectedScheme, selectedFund.schemeCode);
          
          // Show informational message if some metrics are missing
          if (validMetricsCount < 6) {
            setMetricsError(`ℹ️ Available metrics: ${validMetricsCount}/6. Ranking calculated using available data only.`);
          } else {
            setMetricsError(null);
          }
        } else {
          setMetricsError('Fund metrics not found. Please calculate rankings first.');
          setIsAnalyzed(false);
        }
      } else {
        setMetricsError(data.error || 'Failed to fetch fund metrics');
        setIsAnalyzed(false);
      }
    } catch (err: any) {
      setMetricsError(err.message || 'Error analyzing fund');
      setIsAnalyzed(false);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedType('');
    setSelectedMutualFund('');
    setSelectedScheme('');
    setFundMetrics(null);
    setMetricsError(null);
    setRankInCategory(null);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setSelectedMutualFund('');
    setSelectedScheme('');
    setFundMetrics(null);
    setMetricsError(null);
    setRankInCategory(null);
  };

  const handleMutualFundChange = (fund: string) => {
    setSelectedMutualFund(fund);
    setSelectedScheme('');
    setFundMetrics(null);
    setMetricsError(null);
    setRankInCategory(null);
  };

  const handleSchemeChange = (schemeName: string) => {
    setSelectedScheme(schemeName);
    setFundMetrics(null);
    setMetricsError(null);
    setIsAnalyzed(false);
    setMetricsValidation({});
    setRankInCategory(null);
    setTotalInCategory(null);
    setFactsheetData(null);
    setFactsheetError(null);
  };

  const loadFactsheetForFund = async (fundName: string, schemeName: string, schemeCode?: string) => {
    if (!fundName || !schemeName || Object.keys(factsheetManifest).length === 0) {
      setFactsheetData(null);
      setFactsheetError(null);
      return;
    }

    // Search for fund house in manifest (case-insensitive)
    const fundNameLower = fundName.toLowerCase();
    const matchingFundHouse = Object.keys(factsheetManifest).find(key => 
      key.toLowerCase() === fundNameLower || 
      fundNameLower.startsWith(key.toLowerCase()) ||
      key.toLowerCase().startsWith(fundNameLower.split(' ')[0])
    );

    if (!matchingFundHouse) {
      console.log(`[Factsheet] No fund house found in manifest for: ${fundName}`);
      setFactsheetData(null);
      setFactsheetError(`Factsheet not available for ${fundName}. Available funds: ${Object.keys(factsheetManifest).slice(0, 10).join(', ')}, and more...`);
      return;
    }

    const fundHouseSchemes = factsheetManifest[matchingFundHouse];
    if (!fundHouseSchemes || Object.keys(fundHouseSchemes).length === 0) {
      console.log(`[Factsheet] No schemes found for fund house: ${matchingFundHouse}`);
      setFactsheetData(null);
      setFactsheetError(`No factsheet data found for ${matchingFundHouse}`);
      return;
    }

    // Get the first available PDF (most fund houses have one generic entry)
    const factsheetPath = Object.values(fundHouseSchemes)[0] as string;
    
    if (!factsheetPath) {
      console.log(`[Factsheet] No factsheet PDF found for ${matchingFundHouse}`);
      setFactsheetData(null);
      setFactsheetError(`Factsheet PDF not found for ${matchingFundHouse}`);
      return;
    }

    setIsLoadingFactsheet(true);
    setFactsheetError(null);

    try {
      console.log(`[Factsheet] Analyzing factsheet for ${fundName}: ${factsheetPath}`);
      const data = await analyzeFactsheet(factsheetPath);
      setFactsheetData({
        ...data,
        schemeCode: schemeCode,
        schemeName: schemeName
      });
      console.log(`[Factsheet] Successfully analyzed factsheet for ${fundName}`);
    } catch (error: any) {
      console.error(`[Factsheet] Failed to analyze factsheet for ${fundName}:`, error);
      setFactsheetError(error.message || 'Failed to analyze factsheet');
      setFactsheetData(null);
    } finally {
      setIsLoadingFactsheet(false);
    }
  };

  const retriggerFactsheetAnalysis = async () => {
    if (fundMetrics) {
      await loadFactsheetForFund(fundMetrics.fundName, fundMetrics.schemeName);
    }
  };

  const calculateScores = async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const response = await fetch('/api/fund-rankings/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          force: true,
          category: selectedCategory,
          type: selectedType
        })
      });
      const data = await response.json();
      
      if (data.success) {
        if (selectedScheme) {
          await handleSchemeChange(selectedScheme);
        }
      } else {
        setMetricsError(data.error || 'Failed to calculate rankings');
      }
    } catch (err: any) {
      setMetricsError(err.message || 'Failed to calculate rankings');
    } finally {
      setMetricsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background">
        <div className="container py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Fund Rankings Engine</h1>
          <p className="text-muted-foreground mt-2">Select a mutual fund scheme to view its FinFriend Score and detailed metrics</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="max-w-4xl space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading funds data...</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg p-6 bg-card space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Risk Profile & Ratios</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select your investor profile to see the key metrics and their ideal preferences for fund selection.
                  </p>
                  <div className="space-y-2">
                    <Label>What type of investor are you?</Label>
                    <SearchableSelect
                      options={Object.keys(INVESTOR_PROFILES)}
                      value={selectedInvestorProfile}
                      onChange={setSelectedInvestorProfile}
                      placeholder="Select investor profile"
                    />
                  </div>
                </div>

                {selectedInvestorProfile && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                        {selectedInvestorProfile} - Key Metrics
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-blue-200 dark:border-blue-700">
                              <th className="text-left py-2 px-3 font-semibold text-blue-900 dark:text-blue-100">Ratio</th>
                              <th className="text-left py-2 px-3 font-semibold text-blue-900 dark:text-blue-100">Ideal Preference</th>
                              <th className="text-left py-2 px-3 font-semibold text-blue-900 dark:text-blue-100">Weight</th>
                            </tr>
                          </thead>
                          <tbody>
                            {INVESTOR_PROFILES[selectedInvestorProfile].map((profile, index) => (
                              <tr key={index} className="border-b border-blue-100 dark:border-blue-800 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
                                <td className="py-3 px-3 text-blue-900 dark:text-blue-200 font-medium">{profile.ratio}</td>
                                <td className="py-3 px-3 text-blue-800 dark:text-blue-300">{profile.idealPreference}</td>
                                <td className="py-3 px-3">
                                  <Badge variant="secondary" className="bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 font-semibold">
                                    {profile.weight}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 border rounded-lg p-6 bg-card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <SearchableSelect
                      options={categories}
                      value={selectedCategory}
                      onChange={handleCategoryChange}
                      placeholder="Select category"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <SearchableSelect
                      options={types}
                      value={selectedType}
                      onChange={handleTypeChange}
                      placeholder={selectedCategory ? "Select type" : "Select category first"}
                      disabled={!selectedCategory}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mutual Fund</Label>
                  <SearchableSelect
                    options={mutualFunds}
                    value={selectedMutualFund}
                    onChange={handleMutualFundChange}
                    placeholder={selectedType ? "Select mutual fund" : "Select type first"}
                    disabled={!selectedType}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Scheme Name</Label>
                  <SearchableSelect
                    options={schemes.map(s => s.schemeName)}
                    value={selectedScheme}
                    onChange={handleSchemeChange}
                    placeholder={selectedMutualFund ? "Select scheme" : "Select mutual fund first"}
                    disabled={!selectedMutualFund}
                  />
                </div>

                {selectedScheme && (
                  <Button 
                    onClick={handleAnalyzeClick}
                    disabled={validationLoading || !selectedScheme}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {validationLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing Metrics...
                      </>
                    ) : (
                      'Analyze Fund Metrics'
                    )}
                  </Button>
                )}
              </div>

              {fundMetrics && Object.keys(metricsValidation).length > 0 && (
                <div className="border rounded-lg p-6 bg-card border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl">📊</div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
                        Metric Analysis
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(metricsValidation).map(([key, val]) => (
                          <div key={key} className={cn(
                            "p-3 rounded border",
                            val.isValid 
                              ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700" 
                              : "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700"
                          )}>
                            <p className="text-xs font-medium text-muted-foreground">{key}</p>
                            <p className="text-sm font-semibold mt-1">
                              {typeof val.value === 'number' ? val.value.toFixed(2) : val.value}
                            </p>
                            <p className="text-xs mt-1">
                              {val.isValid ? '✓ Available' : '✗ Not Available'}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm mt-4 text-blue-800 dark:text-blue-200">
                        💡 Ranking is calculated using all available metrics. Missing metrics don't affect the scoring as the algorithm adapts to available data.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isAnalyzed && fundMetrics && (
                <FundMetricsDisplay 
                  metrics={fundMetrics} 
                  rank={rankInCategory}
                  total={totalInCategory}
                  factsheetData={factsheetData}
                  isLoadingFactsheet={isLoadingFactsheet}
                  factsheetError={factsheetError}
                  onRetriggerFactsheet={retriggerFactsheetAnalysis}
                  investorProfile={selectedInvestorProfile}
                />
              )}


              {!selectedScheme && !metricsLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card">
                  <div className="text-4xl mb-4">🏆</div>
                  <h3 className="font-medium text-lg mb-2">Select a Fund to View Rankings</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Use the dropdowns above to select a mutual fund scheme and view its score and detailed metrics.
                  </p>
                </div>
              )}

              {selectedInvestorProfile && (
                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">{selectedInvestorProfile} - Scoring Methodology</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {INVESTOR_PROFILES[selectedInvestorProfile].map(p => `${p.weight} ${p.ratio}`).join(' + ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface FundMetricsDisplayProps {
  metrics: FundMetrics;
  rank: number | null;
  total: number | null;
  factsheetData: FactsheetDataWithMetrics | null;
  isLoadingFactsheet: boolean;
  factsheetError: string | null;
  onRetriggerFactsheet: () => Promise<void>;
  investorProfile?: string;
}

function FundMetricsDisplay({ 
  metrics, 
  rank, 
  total, 
  factsheetData, 
  isLoadingFactsheet, 
  factsheetError,
  onRetriggerFactsheet,
  investorProfile
}: FundMetricsDisplayProps) {
  // Use profile-based score if profile is selected, otherwise use FinFriend Score
  const displayScore = investorProfile 
    ? calculateProfileBasedScore(metrics, investorProfile)
    : metrics.finFriendScore;
    
  const scoreColor = getScoreColor(displayScore);
  const scoreBgColor = getScoreBgColor(displayScore);
  const scoreLabel = getScoreLabel(displayScore);

  // Show only metrics relevant to the selected profile
  const getMetricsForProfile = () => {
    const allMetrics = [
      { label: 'Alpha', value: metrics.alpha, icon: TrendingUp, color: 'text-green-600' },
      { label: 'Sharpe Ratio', value: metrics.sharpeRatio, icon: Target, color: 'text-blue-600' },
      { label: 'Sortino Ratio', value: metrics.sortinoRatio, icon: Shield, color: 'text-purple-600' },
      { label: 'Beta', value: metrics.beta, icon: Target, color: 'text-indigo-600' },
      { label: 'Standard Deviation', value: metrics.standardDeviation || 0, icon: BarChart3, color: 'text-amber-600' },
      { label: 'Rolling Returns', value: metrics.rollingReturns || 0, icon: TrendingUp, color: 'text-teal-600' },
      { label: 'Max Drawdown', value: Math.abs(metrics.maxDrawdown), icon: TrendingDown, color: 'text-orange-600' }
    ];

    if (!investorProfile) {
      return allMetrics.slice(0, 4);
    }

    const profileRatios = INVESTOR_PROFILES[investorProfile].map(p => p.ratio);
    return allMetrics.filter(m => profileRatios.includes(m.label));
  };

  const metrics_list = getMetricsForProfile();

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Fund Name</p>
            <h2 className="text-2xl font-bold">{metrics.fundName}</h2>
            <p className="text-sm text-muted-foreground mt-1">{metrics.schemeName}</p>
            <p className="text-xs text-muted-foreground mt-1">Code: {metrics.schemeCode}</p>
          </div>
          
          <div className="text-right">
            {rank && total && (
              <p className="text-sm text-muted-foreground mb-2">Rank in Category</p>
            )}
            {rank && total && (
              <p className="text-3xl font-bold text-primary">{rank} of {total}</p>
            )}
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-2",
              scoreBgColor
            )}>
              <span className={cn("text-4xl font-bold", scoreColor)}>
                {displayScore.toFixed(1)}
              </span>
            </div>
            <p className="text-sm font-medium">{scoreLabel}</p>
            {metrics.isTopTenPercent && (
              <Badge className="mt-2">✨ FinFriend Choice</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-card">
        <h3 className="font-semibold mb-4">Detailed Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics_list.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <p className="text-2xl font-bold">{value.toFixed(2)}</p>
              <div className="mt-3 bg-background rounded h-2">
                <div 
                  className={cn("h-full rounded transition-all", color.replace('text-', 'bg-'))}
                  style={{ width: `${Math.min(100, (Math.abs(value) / 5) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {isLoadingFactsheet && (
        <div className="flex items-center justify-center py-8 border rounded-lg bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <p className="text-sm text-muted-foreground">Analyzing factsheet for holdings & sectors...</p>
        </div>
      )}

      {factsheetError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">{factsheetError}</p>
              <Button 
                size="sm" 
                className="mt-2" 
                onClick={onRetriggerFactsheet}
                disabled={isLoadingFactsheet}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingFactsheet && "animate-spin")} />
                Retry Analysis
              </Button>
            </div>
          </div>
        </div>
      )}

      {factsheetData && !isLoadingFactsheet && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-blue-800 dark:text-blue-300">Top Holdings</h4>
              </div>
              <div className="space-y-2">
                {factsheetData.portfolioHoldings.slice(0, 5).map((holding, index) => (
                  <div key={index} className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted-foreground">{holding.stock}</span>
                    <span className="font-medium">{holding.weight.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <h4 className="font-semibold text-purple-800 dark:text-purple-300">Sector Allocation</h4>
              </div>
              <div className="space-y-2">
                {factsheetData.industryAllocation.slice(0, 5).map((sector, index) => (
                  <div key={index} className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted-foreground">{sector.sector}</span>
                    <span className="font-medium">{sector.weight.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(factsheetData.sharpeRatio || factsheetData.beta || factsheetData.standardDeviation || factsheetData.expenseRatio || factsheetData.aum || factsheetData.portfolioTurnover) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-3">Financial Metrics from Factsheet</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {factsheetData.sharpeRatio && (
                  <div>
                    <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{factsheetData.sharpeRatio}</p>
                  </div>
                )}
                {factsheetData.beta && (
                  <div>
                    <p className="text-xs text-muted-foreground">Beta</p>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{factsheetData.beta}</p>
                  </div>
                )}
                {factsheetData.standardDeviation && factsheetData.standardDeviation.length < 50 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Std Dev</p>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{factsheetData.standardDeviation}</p>
                  </div>
                )}
                {factsheetData.expenseRatio && (
                  <div>
                    <p className="text-xs text-muted-foreground">Expense Ratio</p>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{factsheetData.expenseRatio}</p>
                  </div>
                )}
                {factsheetData.aum && (
                  <div>
                    <p className="text-xs text-muted-foreground">AUM</p>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{factsheetData.aum}</p>
                  </div>
                )}
                {factsheetData.portfolioTurnover && (
                  <div>
                    <p className="text-xs text-muted-foreground">Portfolio Turnover</p>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{factsheetData.portfolioTurnover}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {factsheetData.netAssets && (
            <p className="text-xs text-center text-muted-foreground">Net Assets: {factsheetData.netAssets}</p>
          )}
        </div>
      )}

      {metrics.lastUpdated && (
        <p className="text-xs text-muted-foreground text-center">
          Last Updated: {new Date(metrics.lastUpdated).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 45) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBgColor(score: number): string {
  if (score >= 75) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/30';
  if (score >= 45) return 'bg-amber-100 dark:bg-amber-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 45) return 'Average';
  return 'Below Average';
}
