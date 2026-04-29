
"use client";

import { useMemo, useEffect } from 'react';
import { FormSection } from './FormSection';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Info } from 'lucide-react';
import type { AssetAllocationProfile, RiskAppetite } from '@/lib/types';
import { getAssetAllocation } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from 'react';

interface Props {
  age: number | null;
  profile: AssetAllocationProfile;
  setProfile: React.Dispatch<React.SetStateAction<AssetAllocationProfile>>;
  editableAge?: boolean;
}

const riskAppetiteOptions: RiskAppetite[] = ['High Aggressive', 'High', 'Moderate', 'Conservative'];

const QUESTIONS = [
  {
    question: "If your portfolio drops 20%, you will...",
    weight: 14,
    options: [
      { text: "Invest more", marks: 14 },
      { text: "Stay calm and wait", marks: 10 },
      { text: "Feel nervous but wait", marks: 6 },
      { text: "Sell part of the investment", marks: 3 },
      { text: "Sell fully", marks: 0 },
    ]
  },
  {
    question: "How often do you check your investments?",
    weight: 8,
    options: [
      { text: "Rarely, I review once a year", marks: 8 },
      { text: "Quarterly or when needed", marks: 6 },
      { text: "Monthly", marks: 4 },
      { text: "Weekly", marks: 2 },
      { text: "Daily or more", marks: 0 },
    ]
  },
  {
    question: "What is your experience with equity investments?",
    weight: 10,
    options: [
      { text: "10+ years, comfortable with risks", marks: 10 },
      { text: "5–10 years, have seen ups & downs", marks: 8 },
      { text: "2–5 years, somewhat comfortable", marks: 6 },
      { text: "Less than 2 years, still learning", marks: 3 },
      { text: "No experience", marks: 0 },
    ]
  },
  {
    question: "How do you react to market news or volatility?",
    weight: 10,
    options: [
      { text: "I ignore noise and stick to the plan", marks: 10 },
      { text: "I stay informed but don’t react emotionally", marks: 8 },
      { text: "I get concerned and check portfolio often", marks: 6 },
      { text: "I feel anxious and consider rebalancing", marks: 3 },
      { text: "I panic and think about withdrawing", marks: 0 },
    ]
  },
  {
    question: "What’s your goal timeline for this investment?",
    weight: 12,
    options: [
      { text: "15+ years", marks: 12 },
      { text: "10–15 years", marks: 10 },
      { text: "5–10 years", marks: 7 },
      { text: "3–5 years", marks: 4 },
      { text: "Less than 3 years", marks: 0 },
    ]
  },
  {
    question: "How do you perceive risk in investing?",
    weight: 8,
    options: [
      { text: "Risk is an opportunity for better returns", marks: 8 },
      { text: "A necessary part of investing", marks: 6 },
      { text: "Something to be cautiously managed", marks: 4 },
      { text: "I avoid it as much as possible", marks: 2 },
      { text: "I don’t want to take any risk", marks: 0 },
    ]
  },
  {
    question: "What return do you expect from your investment?",
    weight: 8,
    options: [
      { text: "More than 15%", marks: 8 },
      { text: "12–15%", marks: 6 },
      { text: "10–12%", marks: 4 },
      { text: "7–10%", marks: 2 },
      { text: "Below 7%", marks: 0 },
    ]
  },
  {
    question: "In a financial emergency, will you withdraw from long-term investments?",
    weight: 10,
    options: [
      { text: "Never, I keep a separate emergency fund", marks: 10 },
      { text: "Only in very rare cases", marks: 8 },
      { text: "If I have no other option", marks: 5 },
      { text: "I may partially withdraw", marks: 2 },
      { text: "Yes, I would fully redeem", marks: 0 },
    ]
  },
  {
    question: "What % of your total assets would you be comfortable investing in equity?",
    weight: 10,
    options: [
      { text: "More than 70%", marks: 10 },
      { text: "50–70%", marks: 8 },
      { text: "30–50%", marks: 6 },
      { text: "10–30%", marks: 3 },
      { text: "Less than 10%", marks: 0 },
    ]
  },
  {
    question: "How disciplined are you with your investments?",
    weight: 10,
    options: [
      { text: "I invest regularly regardless of market", marks: 10 },
      { text: "I invest with discipline most times", marks: 8 },
      { text: "I sometimes miss investing goals", marks: 5 },
      { text: "I invest only when I have surplus", marks: 3 },
      { text: "I don’t have a regular investing habit", marks: 0 },
    ]
  }
];

export function AssetAllocationForm({ age, profile, setProfile, editableAge = false }: Props) {
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (editableAge) {
      if (age !== null && (profile.age === '' || profile.age === null || profile.age === undefined)) {
        setProfile(prev => ({ ...prev, age }));
      }
      return;
    }
    if (age !== null) {
      setProfile(prev => ({ ...prev, age }));
    }
  }, [age, setProfile, editableAge, profile.age]);

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setProfile(prev => ({ ...prev, age: '' }));
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      setProfile(prev => ({ ...prev, age: parsed }));
    }
  };

  const handleRiskChange = (value: RiskAppetite) => {
    setProfile(prev => ({ ...prev, riskAppetite: value }));
  };

  const calculateRiskProfile = (score: number): { profile: string, appetite: RiskAppetite } => {
    if (score >= 81) return { profile: 'Very High Risk Tolerance (Aggressive Investor)', appetite: 'High Aggressive' };
    if (score >= 61) return { profile: 'High Risk Tolerance (Growth-Oriented Investor)', appetite: 'High' };
    if (score >= 41) return { profile: 'Moderate Risk Tolerance (Balanced Investor)', appetite: 'Moderate' };
    return { profile: 'Low Risk Tolerance (Conservative Investor)', appetite: 'Conservative' };
  };

  const handleAnswer = (marks: number) => {
    setAnswers(prev => ({ ...prev, [currentStep]: marks }));
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const resetAssessment = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResult(false);
    setIsAssessmentOpen(false);
  };

  const applyRiskProfile = () => {
    const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
    const { appetite } = calculateRiskProfile(totalScore);
    handleRiskChange(appetite);
    resetAssessment();
  };

  const allocation = useMemo(() => getAssetAllocation(profile.age, profile.riskAppetite), [profile.age, profile.riskAppetite]);

  const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const { profile: resultProfile, appetite: resultAppetite } = calculateRiskProfile(totalScore);

  return (
    <FormSection
      title="Asset Allocation"
      description="Get a recommended asset allocation based on your age and risk profile."
      icon={<BarChart3 className="h-6 w-6" />}
      className="xl:col-span-2"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-age">Your Age</Label>
            {editableAge ? (
              <Input
                id="user-age"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Enter your age"
                value={profile.age ?? ''}
                onChange={handleAgeChange}
              />
            ) : (
              <Input
                id="user-age"
                type="number"
                placeholder="Calculated from DOB"
                value={age ?? ''}
                readOnly
                className="bg-muted/50"
              />
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="risk-appetite">Risk Appetite</Label>
              <Select value={profile.riskAppetite} onValueChange={handleRiskChange}>
                <SelectTrigger id="risk-appetite">
                  <SelectValue placeholder="Select your risk profile" />
                </SelectTrigger>
                <SelectContent>
                  {riskAppetiteOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isAssessmentOpen} onOpenChange={setIsAssessmentOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Know Your Risk Appetite
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                {!showResult ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Risk Appetite Assessment</DialogTitle>
                      <DialogDescription>
                        Question {currentStep + 1} of {QUESTIONS.length}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                      <h4 className="font-semibold mb-4">{QUESTIONS[currentStep].question}</h4>
                      <RadioGroup 
                        value={answers[currentStep]?.toString()} 
                        onValueChange={(val) => handleAnswer(parseInt(val))}
                        className="space-y-3"
                      >
                        {QUESTIONS[currentStep].options.map((opt, idx) => (
                          <div key={idx} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent cursor-pointer transition-colors" onClick={() => handleAnswer(opt.marks)}>
                            <RadioGroupItem value={opt.marks.toString()} id={`opt-${idx}`} />
                            <Label htmlFor={`opt-${idx}`} className="flex-grow cursor-pointer">{opt.text}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Your Risk Profile Result</DialogTitle>
                      <DialogDescription>
                        Based on your answers, here is your assessed risk profile.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-8 text-center space-y-4">
                      <div className="text-4xl font-bold text-primary">{totalScore} / 100</div>
                      <div className="space-y-2">
                        <p className="text-lg font-semibold">{resultProfile}</p>
                        <p className="text-muted-foreground">Risk Appetite: <span className="font-bold text-foreground">{resultAppetite}</span></p>
                      </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-center">
                      <Button variant="outline" onClick={resetAssessment}>Cancel</Button>
                      <Button onClick={applyRiskProfile}>Apply to Portfolio</Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-4">
            <h3 className="font-semibold text-lg text-primary">Recommended Allocation</h3>
            <Card className="bg-accent/5">
                <CardContent className="p-0">
                    {allocation ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset Category</TableHead>
                                    <TableHead className="text-right">Allocation</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(allocation).map(([key, value]) => {
                                    if (value > 0) { // Only show categories with an allocation
                                        return (
                                            <TableRow key={key}>
                                                <TableCell className="font-medium">{key}</TableCell>
                                                <TableCell className="text-right font-bold">{value}%</TableCell>
                                            </TableRow>
                                        )
                                    }
                                    return null;
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-6 text-center text-muted-foreground">
                            Please provide your age and risk appetite to see recommendations.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </FormSection>
  );
}
