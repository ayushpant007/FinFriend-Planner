import { NextRequest, NextResponse } from 'next/server';
import type { GoalWithCalculations, SipOptimizerGoal } from '@/lib/types';
import { calculateFutureValue } from '@/lib/calculations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      goalsWithCalculations,
      investibleSurplus,
    } = body as {
      goalsWithCalculations: GoalWithCalculations[];
      investibleSurplus: number;
    };

    const getNumericValue = (val: number | '') => typeof val === 'number' ? val : 0;

    let availableSurplus = investibleSurplus;
    const otherGoals = goalsWithCalculations.filter(
      g => g.name.toLowerCase() !== 'retirement' && g.name !== ''
    );

    const totalRequiredSipForOtherGoals = otherGoals.reduce(
      (sum, goal) => sum + goal.newSipRequired,
      0
    );

    const newOptimizedGoals: SipOptimizerGoal[] = otherGoals.map(goal => {
      let allocatedInvestment = 0;

      if (availableSurplus >= totalRequiredSipForOtherGoals) {
        allocatedInvestment = goal.newSipRequired;
      } else {
        if (totalRequiredSipForOtherGoals > 0) {
          const weight = goal.newSipRequired / totalRequiredSipForOtherGoals;
          allocatedInvestment = availableSurplus * weight;
        }
      }

      const potentialCorpusWithCurrentSip = calculateFutureValue(
        getNumericValue(goal.currentSip),
        getNumericValue(goal.rate),
        getNumericValue(goal.years),
        getNumericValue(goal.currentSave)
      );

      const potentialCorpusWithAllocatedSip = calculateFutureValue(
        allocatedInvestment,
        getNumericValue(goal.rate),
        getNumericValue(goal.years),
        getNumericValue(goal.currentSave)
      );

      return {
        id: goal.id,
        name: goal.otherType ? goal.otherType : goal.name,
        targetCorpus: getNumericValue(goal.corpus),
        futureValue: potentialCorpusWithAllocatedSip,
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

    return NextResponse.json({ optimizedGoals: newOptimizedGoals });
  } catch (error: any) {
    console.error('Error in calculate-optimized-goals API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate optimized goals' },
      { status: 500 }
    );
  }
}
