
"use client";

import type { RetirementInputs, RetirementCalculations } from '@/lib/types';
import { FormSection } from './FormSection';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  inputs: RetirementInputs;
  setInputs: React.Dispatch<React.SetStateAction<RetirementInputs>>;
  calculations: RetirementCalculations;
}

export function RetirementPlannerForm({ inputs, setInputs, calculations }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
  };

  const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '₹0.00';
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const formatPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  return (
    <FormSection
      title="Retirement Calculator"
      description="Plan for your golden years with this detailed calculator."
      icon={<Calculator className="h-6 w-6" />}
      className="xl:col-span-2"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {/* Input Section */}
        <div className="space-y-4">
            <h3 className="font-semibold text-lg text-primary">Input Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <Label htmlFor="currentAge">Current Age</Label>
                    <Input id="currentAge" name="currentAge" type="number" value={inputs.currentAge} readOnly className="bg-muted/50" placeholder="From Details" />
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="desiredRetirementAge">Desired Retirement Age</Label>
                    <Input id="desiredRetirementAge" name="desiredRetirementAge" type="number" value={inputs.desiredRetirementAge} readOnly className="bg-muted/50" placeholder="From Details" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="lifeExpectancy">Life Expectancy</Label>
                    <Input id="lifeExpectancy" name="lifeExpectancy" type="number" value={inputs.lifeExpectancy} onChange={handleChange} placeholder="e.g., 85" />
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="currentMonthlyExpense">Current Monthly Expense</Label>
                    <Input id="currentMonthlyExpense" name="currentMonthlyExpense" type="number" value={inputs.currentMonthlyExpense} onChange={handleChange} placeholder="e.g., 50000" />
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="currentSavings">Current Savings for Retirement</Label>
                    <Input id="currentSavings" name="currentSavings" type="number" value={inputs.currentSavings} onChange={handleChange} placeholder="e.g., 500000" />
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="currentSip">Current Monthly SIP</Label>
                    <Input id="currentSip" name="currentSip" type="number" value={inputs.currentSip} onChange={handleChange} placeholder="e.g., 10000" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="preRetirementRoi">Pre-Retirement ROI (%)</Label>
                    <Input id="preRetirementRoi" name="preRetirementRoi" type="number" value={inputs.preRetirementRoi} onChange={handleChange} placeholder="e.g., 12" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="postRetirementRoi">Post-Retirement ROI (%)</Label>
                    <Input id="postRetirementRoi" name="postRetirementRoi" type="number" value={inputs.postRetirementRoi} onChange={handleChange} placeholder="e.g., 8" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="incrementalRate">Incremental Investment Rate (% yearly)</Label>
                    <Input id="incrementalRate" name="incrementalRate" type="number" value={inputs.incrementalRate} onChange={handleChange} placeholder="e.g., 10" />
                </div>
            </div>
        </div>

        {/* Calculation Section */}
        <div className="space-y-4">
            <h3 className="font-semibold text-lg text-primary">Calculations</h3>
            <Card className="bg-accent/5">
                <CardContent className="p-0">
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Expected Inflation Rate</TableCell>
                                <TableCell className="text-right font-semibold">{formatPercentage(calculations.expectedInflationRate)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Real Rate of Return</TableCell>
                                <TableCell className="text-right font-semibold">{formatPercentage(calculations.realRateOfReturn)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-medium">Years to Retirement</TableCell>
                                <TableCell className="text-right font-semibold">{calculations.yearsToRetirement}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Years in Retirement</TableCell>
                                <TableCell className="text-right font-semibold">{calculations.yearsInRetirement}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Inflated Monthly Expense at Retirement</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(calculations.inflatedMonthlyExpense)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Annual Expense at Retirement</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(calculations.annualExpenseAtRetirement)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-primary/10">
                                <TableCell className="font-bold text-primary">Required Retirement Corpus</TableCell>
                                <TableCell className="text-right font-bold text-primary">{formatCurrency(calculations.requiredRetirementCorpus)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Monthly Investment Needed</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(calculations.monthlyInvestmentNeeded)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-medium">Incremental Monthly Investment</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(calculations.incrementalMonthlyInvestment)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </FormSection>
  );
}
