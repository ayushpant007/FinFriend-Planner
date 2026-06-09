
"use client";

import type { Income, Expense } from '@/lib/types';
import { FormSection } from './FormSection';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, HandCoins, PiggyBank } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';

interface Props {
  incomes: Income[];
  setIncomes: React.Dispatch<React.SetStateAction<Income[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  monthlyCashflow: number;
  yearlyCashflow: number;
}

const incomeSources = ["Salary", "Business", "Rental Income", "Investments", "Other"];
const expenseTypes = ["Rent", "Groceries", "Education", "Insurance Premium", "Utilities", "Clubbing", "Party", "Salary to Househelp", "EMI", "Total Household Expenditure", "Other"];

let nextId = 0;

export function IncomeExpensesForm({ incomes, setIncomes, expenses, setExpenses, monthlyCashflow, yearlyCashflow }: Props) {
  
  const handleUpdate = <T extends Income | Expense>(
    items: T[], 
    setItems: React.Dispatch<React.SetStateAction<T[]>>, 
    id: string, 
    field: keyof T, 
    value: string | number
  ) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAdd = <T extends Income | Expense>(
    setItems: React.Dispatch<React.SetStateAction<T[]>>,
    newItem: Omit<T, 'id' | 'otherType'>
  ) => {
     setItems(prevItems => [...prevItems, { ...newItem, id: `new-${nextId++}` } as T]);
  };
  
  const handleRemove = <T extends Income | Expense>(
    items: T[],
    setItems: React.Dispatch<React.SetStateAction<T[]>>,
    id: string
  ) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <FormSection
      title="Income & Expenses"
      description="Understand your monthly and annual cash flow."
      icon={<HandCoins className="h-6 w-6" />}
    >
      <div className="space-y-6">
        {/* Income Section */}
        <div>
          <h3 className="font-semibold text-lg mb-2 text-green-600">Monthly Income</h3>
          <div className="space-y-3">
            {incomes.map((income) => (
              <div key={income.id} className="p-3 border rounded-md space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Select
                    value={income.source}
                    onValueChange={(value) => handleUpdate(incomes, setIncomes, income.id, 'source', value)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select income source" /></SelectTrigger>
                    <SelectContent>
                      {incomeSources.map(source => <SelectItem key={source} value={source}>{source}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Amount (₹)"
                    value={income.amount}
                    onChange={(e) => handleUpdate(incomes, setIncomes, income.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(incomes, setIncomes, income.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                 {income.source === 'Other' && (
                  <div className="space-y-2">
                    <Label htmlFor={`income-other-${income.id}`}>Please specify</Label>
                    <Input
                      id={`income-other-${income.id}`}
                      placeholder="e.g., Freelance"
                      value={income.otherType || ''}
                      onChange={(e) => handleUpdate(incomes, setIncomes, income.id, 'otherType', e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => handleAdd(setIncomes, { source: '', amount: '' })}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Income
          </Button>
        </div>

        {/* Expenses Section */}
        <div>
          <h3 className="font-semibold text-lg mb-2 text-red-600">Monthly Expenses</h3>
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="p-3 border rounded-md space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Select
                    value={expense.type}
                    onValueChange={(value) => handleUpdate(expenses, setExpenses, expense.id, 'type', value)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select expense type" /></SelectTrigger>
                    <SelectContent>
                      {expenseTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Amount (₹)"
                    value={expense.amount}
                    onChange={(e) => handleUpdate(expenses, setExpenses, expense.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(expenses, setExpenses, expense.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {expense.type === 'Other' && (
                  <div className="space-y-2">
                    <Label htmlFor={`expense-other-${expense.id}`}>Please specify</Label>
                    <Input
                      id={`expense-other-${expense.id}`}
                      placeholder="e.g., Travel"
                      value={expense.otherType || ''}
                      onChange={(e) => handleUpdate(expenses, setExpenses, expense.id, 'otherType', e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => handleAdd(setExpenses, { type: '', amount: '' })}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>

        {/* Cashflow Display */}
        <div className="bg-primary/10 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <PiggyBank className="h-7 w-7 text-primary" />
                    <span className="font-semibold text-primary">Monthly Cashflow</span>
                </div>
                <span className={`font-bold text-xl font-headline ${monthlyCashflow >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    ₹{monthlyCashflow.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <PiggyBank className="h-7 w-7 text-primary/70" />
                    <span className="font-semibold text-primary/80">Yearly Cashflow</span>
                </div>
                <span className={`font-bold text-xl font-headline ${yearlyCashflow >= 0 ? 'text-primary/80' : 'text-destructive'}`}>
                    ₹{yearlyCashflow.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
            </div>
        </div>
      </div>
    </FormSection>
  );
}
