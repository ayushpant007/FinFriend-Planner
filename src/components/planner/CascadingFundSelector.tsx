"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadMutualFundsFromCSV, MutualFundScheme, fetchNAV, NAVData } from '@/lib/load-funds';
import type { FundAllocation, Goal } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CascadingFundSelectorProps {
  fundAllocations: FundAllocation[];
  availableGoals: Goal[];
  onAddFundAllocation: (allocation: Partial<FundAllocation>) => void;
  onRemoveFundAllocation: (id: string) => void;
  onUpdateFundAllocation: (id: string, field: string, value: any) => void;
}

export function CascadingFundSelector({
  fundAllocations,
  availableGoals,
  onAddFundAllocation,
  onRemoveFundAllocation,
  onUpdateFundAllocation,
}: CascadingFundSelectorProps) {
  const [allFunds, setAllFunds] = useState<MutualFundScheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNAV, setIsFetchingNAV] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);
  const [navData, setNavData] = useState<NAVData | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedMutualFund, setSelectedMutualFund] = useState('');
  const [selectedScheme, setSelectedScheme] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [sipAmount, setSipAmount] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const funds = await loadMutualFundsFromCSV();
        setAllFunds(funds);
      } catch (error) {
        console.error('Error loading funds:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

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

  const selectedSchemeData = useMemo(() => {
    if (!selectedScheme) return null;
    return schemes.find(s => s.schemeName === selectedScheme) || null;
  }, [selectedScheme, schemes]);

  useEffect(() => {
    const fetchSchemeNAV = async () => {
      if (!selectedSchemeData || !selectedSchemeData.schemeCode) {
        setNavData(null);
        setNavError(null);
        return;
      }

      setIsFetchingNAV(true);
      setNavError(null);

      try {
        const nav = await fetchNAV(
          selectedSchemeData.schemeCode,
          selectedSchemeData.schemeName,
          selectedSchemeData.plan,
        );
        if (nav) {
          setNavData(nav);
        } else {
          setNavError('NAV data currently unavailable. Please try again later.');
        }
      } catch (error) {
        setNavError('NAV data currently unavailable. Please try again later.');
      } finally {
        setIsFetchingNAV(false);
      }
    };

    fetchSchemeNAV();
  }, [selectedSchemeData]);

  const handleAddFund = async () => {
    if (!selectedCategory || !selectedType || !selectedMutualFund || !selectedScheme || !selectedGoal) {
      alert('Please complete all selections');
      return;
    }

    const schemeData = schemes.find(s => s.schemeName === selectedScheme);
    
    const newAllocation: Partial<FundAllocation> = {
      fundName: selectedMutualFund,
      schemeName: selectedScheme,
      category: selectedCategory,
      fundCategory: selectedCategory as any,
      schemeCode: schemeData?.schemeCode || '',
      sipRequired: sipAmount ? parseInt(sipAmount) : 0,
      goalId: selectedGoal,
    };

    onAddFundAllocation(newAllocation);

    setSelectedCategory('');
    setSelectedType('');
    setSelectedMutualFund('');
    setSelectedScheme('');
    setSelectedGoal('');
    setSipAmount('');
    setNavData(null);
    setNavError(null);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedType('');
    setSelectedMutualFund('');
    setSelectedScheme('');
    setNavData(null);
    setNavError(null);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setSelectedMutualFund('');
    setSelectedScheme('');
    setNavData(null);
    setNavError(null);
  };

  const handleMutualFundChange = (fund: string) => {
    setSelectedMutualFund(fund);
    setSelectedScheme('');
    setNavData(null);
    setNavError(null);
  };

  const handleSchemeChange = (scheme: string) => {
    setSelectedScheme(scheme);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading fund data...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Fund Allocations by Goal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <SearchableSelect
              options={categories}
              value={selectedCategory}
              onChange={handleCategoryChange}
              placeholder="Select category"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <SearchableSelect
              options={types}
              value={selectedType}
              onChange={handleTypeChange}
              placeholder={selectedCategory ? "Select type" : "Select category first"}
              disabled={!selectedCategory}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mutualFund">Mutual Fund</Label>
            <SearchableSelect
              options={mutualFunds}
              value={selectedMutualFund}
              onChange={handleMutualFundChange}
              placeholder={selectedType ? "Select mutual fund" : "Select type first"}
              disabled={!selectedType}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheme">Scheme Name</Label>
            <SearchableSelect
              options={schemes.map(s => s.schemeName)}
              value={selectedScheme}
              onChange={handleSchemeChange}
              placeholder={selectedMutualFund ? "Select scheme" : "Select mutual fund first"}
              disabled={!selectedMutualFund}
            />
          </div>
        </div>

        {isFetchingNAV && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching NAV...
          </div>
        )}

        {navError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{navError}</AlertDescription>
          </Alert>
        )}

        {navData && !isFetchingNAV && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="goal">Link to Goal</Label>
            <Select value={selectedGoal} onValueChange={setSelectedGoal}>
              <SelectTrigger id="goal">
                <SelectValue placeholder="Select goal..." />
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

          <div className="space-y-2">
            <Label htmlFor="sip">SIP required for fund</Label>
            <Input
              id="sip"
              type="number"
              placeholder="e.g., 5000"
              value={sipAmount}
              onChange={(e) => setSipAmount(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button 
              onClick={handleAddFund}
              className="w-full"
              disabled={!selectedCategory || !selectedType || !selectedMutualFund || !selectedScheme || !selectedGoal}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Fund Allocation
            </Button>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            If no suitable fund schemes are found, consider selecting "Mutual Funds" as an "Others" option. Then, proceed to search for the respective scheme within this category.
          </AlertDescription>
        </Alert>

        {fundAllocations.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold text-lg">Selected Allocations</h3>
            <div className="space-y-2">
              {fundAllocations.map(alloc => (
                <div key={alloc.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{alloc.fundName} - {alloc.schemeName}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {alloc.fundCategory} | Goal: {availableGoals.find(g => g.id === alloc.goalId)?.otherType || availableGoals.find(g => g.id === alloc.goalId)?.name}
                      {alloc.sipRequired && alloc.sipRequired > 0 && ` | SIP: ₹${alloc.sipRequired}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => onRemoveFundAllocation(alloc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
