
"use client";

import type { Goal, GoalWithCalculations } from '@/lib/types';
import { FormSection } from './FormSection';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Label } from '../ui/label';

interface Props {
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  goalsWithCalculations: GoalWithCalculations[];
}

const goalTypes = ["Child Education", "Marriage", "House", "Emergency Fund", "Wealth Accumulation", "Vacation Fund", "Vehicle Purchase", "Gadget/Technology Fund", "Other"];



export function GoalsForm({ goals, setGoals, goalsWithCalculations }: Props) {
  
  const handleUpdate = (id: string, field: keyof Goal, value: string | number) => {
    setGoals(goals.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const handleAdd = () => {
    const newGoal: Goal = { 
      id: `goal-${Date.now()}-${Math.floor(Math.random() * 1000)}`, 
      name: '', 
      corpus: '', 
      years: '', 
      rate: 12, 
      currentSave: '', 
      currentSip: '' 
    };
    setGoals(prevGoals => [...prevGoals, newGoal]);
  };
  
  const handleRemove = (id: string) => {
    setGoals(goals.filter(item => item.id !== id));
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <FormSection
      title="Financial Goals"
      description="Plan your investments for future milestones."
      icon={<Target className="h-6 w-6" />}
      className="xl:col-span-2"
    >
      <div className="space-y-4">
        {goals.map((goal, index) => {
          const calcs = goalsWithCalculations[index];
          return (
            <div key={goal.id} className="p-4 border rounded-lg space-y-4 relative">
              <div className="absolute top-2 right-2">
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(goal.id)} className="text-destructive h-7 w-7">
                    <Trash2 className="h-4 w-4" />
                  </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Goal Name</label>
                  <Select
                    value={goal.name}
                    onValueChange={(value) => handleUpdate(goal.id, 'name', value)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
                    <SelectContent>
                      {goalTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 {goal.name === 'Other' && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`goal-other-${goal.id}`}>Please specify</Label>
                    <Input
                      id={`goal-other-${goal.id}`}
                      placeholder="e.g., World Tour"
                      value={goal.otherType || ''}
                      onChange={(e) => handleUpdate(goal.id, 'otherType', e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Target Corpus (Today's Value)</label>
                  <Input
                    type="number"
                    placeholder="Amount (₹)"
                    value={goal.corpus}
                    onChange={(e) => handleUpdate(goal.id, 'corpus', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                 <div className="space-y-1.5">
                  <label className="text-sm font-medium">Years to Goal</label>
                  <Input
                    type="number"
                    placeholder="Time Horizon"
                    value={goal.years}
                    onChange={(e) => handleUpdate(goal.id, 'years', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Current Savings for Goal</label>
                  <Input
                    type="number"
                    placeholder="e.g. 100000"
                    value={goal.currentSave}
                    onChange={(e) => handleUpdate(goal.id, 'currentSave', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Current Monthly SIP</label>
                  <Input
                    type="number"
                    placeholder="e.g. 5000"
                    value={goal.currentSip}
                    onChange={(e) => handleUpdate(goal.id, 'currentSip', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Expected Return Rate (%)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 12"
                    value={goal.rate}
                    onChange={(e) => handleUpdate(goal.id, 'rate', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>
              
              {calcs && (
                <div className="bg-accent/10 p-3 rounded-md">
                   <h4 className="font-semibold text-accent-foreground/90 mb-2">Goal Projection</h4>
                   <Table>
                      <TableBody className="text-sm">
                        <TableRow>
                          <TableCell className="font-medium">Future Value of Goal (Inflated)</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(calcs.futureValueOfGoal)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Future Value of Current Savings</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(calcs.futureValueOfCurrentSave)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Future Value of Current SIP</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(calcs.futureValueOfSip)}</TableCell>
                        </TableRow>
                         <TableRow>
                          <TableCell className="font-medium">Total Projected Value</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(calcs.totalFutureValue)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-accent/20">
                          <TableCell className="font-bold text-accent-foreground">Shortfall / Surplus</TableCell>
                          <TableCell className={`text-right font-bold ${calcs.shortfall < 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(calcs.shortfall)}</TableCell>
                        </TableRow>
                      </TableBody>
                   </Table>
                   <div className="bg-accent/20 text-accent-foreground mt-3 p-3 rounded-md flex justify-between items-center">
                      <span className="font-semibold text-base">New Monthly SIP Required</span>
                      <Badge variant="secondary" className="text-lg font-bold bg-accent text-accent-foreground">
                          {formatCurrency(calcs.newSipRequired)}
                      </Badge>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Button variant="outline" size="sm" className="mt-4" onClick={handleAdd}>
        <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
      </Button>
    </FormSection>
  );
}
