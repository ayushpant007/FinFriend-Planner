

"use client";

import type { SipOptimizerGoal } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  optimizedGoals: SipOptimizerGoal[];
}

const formatCurrency = (value: number | '', prefix = '₹') => {
    const num = typeof value === 'number' ? value : 0;
    if (isNaN(num)) return `${prefix}0`;
    return `${prefix}${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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

const roundToNearest100 = (num: number) => {
    return Math.round(num / 100) * 100;
}

export function GoalsBreakdown({ optimizedGoals }: Props) {
  if (!optimizedGoals || optimizedGoals.length === 0) {
    return null;
  }

  return (
    <div className="xl:col-span-2 space-y-8">
        <div className="text-center">
            <h3 className="text-2xl font-bold font-headline text-foreground">Goals Breakdown</h3>
        </div>
      {optimizedGoals.map((goal) => {
          // Correctly calculate the target corpus for the "must invest" scenario based on inflation.
          const inflationRate = goal.name.toLowerCase().includes('education') ? 0.10 : 0.06;
          const expectedCorpusMustInvest = goal.targetCorpus * Math.pow(1 + inflationRate, goal.timeline.required);

          return (
            <div key={goal.id} className="space-y-4">
              <h4 className="font-bold text-xl text-center md:text-left text-primary">{goal.name}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: What I am investing */}
                <Card className="border-red-200 bg-red-50/50">
                  <CardHeader className="p-4">
                    <CardTitle className="text-center text-sm font-semibold text-red-700">What I am investing / Month</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 text-center space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Current SIP</p>
                      <p className="font-bold text-lg">{formatCurrency(goal.investmentStatus.currentInvestment)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-bold text-lg">{formatYears(goal.timeline.current)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Goal Amt.</p>
                      <p className="font-bold text-lg">{formatCurrency(goal.potentialCorpus)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: What I must invest */}
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardHeader className="p-4">
                    <CardTitle className="text-center text-sm font-semibold text-orange-700">What I must invest / Month</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 text-center space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Required SIP</p>
                      <p className="font-bold text-lg">{formatCurrency(roundToNearest100(goal.investmentStatus.requiredInvestment))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-bold text-lg">{formatYears(goal.timeline.required)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Corpus</p>
                      <p className="font-bold text-lg">{formatCurrency(expectedCorpusMustInvest)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 3: What I can invest */}
                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader className="p-4">
                    <CardTitle className="text-center text-sm font-semibold text-green-700">What I can invest / Month</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 text-center space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Allocated SIP</p>
                      <p className="font-bold text-lg">{formatCurrency(roundToNearest100(goal.investmentStatus.allocatedInvestment))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-bold text-lg">{formatYears(goal.timeline.potential)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Corpus</p>
                      <p className="font-bold text-lg">{formatCurrency(goal.futureValue)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
      })}
    </div>
  );
}
