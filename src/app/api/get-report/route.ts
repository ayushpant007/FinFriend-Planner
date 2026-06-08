import { NextRequest, NextResponse } from 'next/server';
import { getDetailedReport, getSipOptimizerReport } from '@/lib/replit-db';

export const dynamic = 'force-dynamic';

// Helper to clean undefined values from response
function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (Array.isArray(obj)) return obj.map(cleanUndefined).filter(v => v !== undefined);
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleanedVal = cleanUndefined(v);
      if (cleanedVal !== undefined) cleaned[k] = cleanedVal;
    }
    return cleaned;
  }
  return obj;
}

function convertSipToDetailed(sipData: any): any {
  if (!sipData) return null;
  
  const personalDetails = sipData.personalDetails || {
    name: "N/A", dob: "", dependents: 0, retirementAge: 60, mobile: "", email: "", arn: ""
  };
  
  const cashflow = sipData.cashflow || { totalMonthlyIncome: 0, totalMonthlyExpenses: 0, investibleSurplus: 0 };
  let netWorth = sipData.netWorth || 0;
  
  const lifeInsurance = sipData.insuranceAnalysis?.lifeInsurance || { currentCover: 0, currentPremium: 0 };
  const healthInsurance = sipData.insuranceAnalysis?.healthInsurance || { currentCover: 0, currentPremium: 0 };
  
  const totalInsuranceCover = Number(lifeInsurance.currentCover || 0) + Number(healthInsurance.currentCover || 0);
  const totalInsurancePremium = Number(lifeInsurance.currentPremium || 0) + Number(healthInsurance.currentPremium || 0);
  
  const goals: any[] = [];
  
  if (sipData.goalsWithCalculations && sipData.goalsWithCalculations.length > 0) {
    sipData.goalsWithCalculations.forEach((g: any) => {
      goals.push({
        id: g.id,
        name: g.name,
        corpus: g.corpus || 0,
        years: g.years || 0,
        rate: g.rate || 12,
        currentSave: g.currentSave || 0,
        currentSip: g.currentSip || 0,
        sip: g.newSipRequired || g.sip || 0
      });
    });
  } else if (sipData.goals && sipData.goals.length > 0) {
    sipData.goals.forEach((g: any) => {
      goals.push({
        id: g.id,
        name: g.name,
        corpus: g.targetCorpus || 0,
        years: g.timeline?.current || 0,
        rate: 12,
        currentSave: 0,
        currentSip: g.investmentStatus?.currentInvestment || 0,
        sip: g.investmentStatus?.allocatedInvestment || g.investmentStatus?.requiredInvestment || 0
      });
    });
  }
  
  // Group fundAllocations by goalId to synthesize goals if they are empty
  if (goals.length === 0 && sipData.fundAllocations && sipData.fundAllocations.length > 0) {
    const goalGroups: Record<string, { sip: number; lumpsum: number }> = {};
    
    sipData.fundAllocations.forEach((alloc: any) => {
      const gId = alloc.goalId || 'retirement';
      if (!goalGroups[gId]) {
        goalGroups[gId] = { sip: 0, lumpsum: 0 };
      }
      goalGroups[gId].sip += Number(alloc.sipRequired || 0);
      goalGroups[gId].lumpsum += Number(alloc.lumpsumAmount || 0);
    });
    
    for (const [gId, values] of Object.entries(goalGroups)) {
      let name = gId;
      if (gId === 'retirement') name = 'Retirement Goal';
      else if (gId === 'wealth_accommodation') name = 'Wealth Accommodation';
      else if (gId === 'education_goal') name = 'Education Goal';
      else if (gId === 'home_goal') name = 'Home Goal';
      else if (gId === 'child_planning') name = 'Child Planning';
      else {
        name = gId.charAt(0).toUpperCase() + gId.slice(1);
      }
      
      let years = 15; // default fallback
      if (gId === 'retirement') {
        const curAge = Number(sipData.retirementInputs?.currentAge || sipData.assetAllocationProfile?.age || 27);
        const retAge = Number(sipData.retirementInputs?.desiredRetirementAge || sipData.personalDetails?.retirementAge || 60);
        if (retAge > curAge) {
          years = retAge - curAge;
        }
      }
      
      goals.push({
        id: gId,
        name: name,
        corpus: values.lumpsum || 0,
        years: years,
        rate: 12,
        currentSave: values.lumpsum || 0,
        currentSip: values.sip || 0,
        sip: values.sip || 0
      });
    }
  }
  
  let monthlyCashflow = cashflow.investibleSurplus || 0;
  
  // Synthesize cashflow surplus from allocations if it is 0
  if (monthlyCashflow === 0 && sipData.fundAllocations && sipData.fundAllocations.length > 0) {
    monthlyCashflow = sipData.fundAllocations.reduce((sum: number, a: any) => sum + Number(a.sipRequired || 0), 0);
  }
  
  // Synthesize net worth from allocations if it is 0
  if (netWorth === 0 && sipData.fundAllocations && sipData.fundAllocations.length > 0) {
    netWorth = sipData.fundAllocations.reduce((sum: number, a: any) => sum + Number(a.lumpsumAmount || 0), 0);
  }
  
  const assets = sipData.assets || [];
  const totalAssets = sipData.detailedTables?.assetAllocation?.total?.corpus || netWorth || assets.reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
  
  const totalAnnualIncome = (cashflow.totalMonthlyIncome || (monthlyCashflow * 2) || 0) * 12;
  const totalAnnualExpenses = (cashflow.totalMonthlyExpenses || (monthlyCashflow) || 0) * 12;
  
  const expenses: any[] = [];
  if (cashflow.totalMonthlyExpenses > 0) {
    expenses.push({
      id: 'exp-auto',
      type: 'Monthly Expenses',
      amount: cashflow.totalMonthlyExpenses * 12
    });
  } else if (monthlyCashflow > 0) {
    expenses.push({
      id: 'exp-auto',
      type: 'Monthly Expenses',
      amount: monthlyCashflow * 12
    });
  }
  
  const curAge = Number(sipData.retirementInputs?.currentAge || sipData.assetAllocationProfile?.age || (personalDetails.dob ? (new Date().getFullYear() - new Date(personalDetails.dob).getFullYear()) : 27));
  const retAge = Number(sipData.retirementInputs?.desiredRetirementAge || personalDetails.retirementAge || 60);
  const yearsToRetire = retAge > curAge ? retAge - curAge : 15;
  
  const aiSummary = `Based on your planner inputs, ${personalDetails.name} (Current Age: ${curAge} Years) has a net worth of ₹${netWorth.toLocaleString('en-IN')}. Your monthly investible surplus is ₹${monthlyCashflow.toLocaleString('en-IN')}, representing your capacity to fund your goals. You have ${goals.length} active financial goal(s) registered, with your Retirement Goal set to be achieved in ${yearsToRetire} years (at age ${retAge}). Detailed mutual fund recommendations have been optimized for your risk profile.`;

  return {
    personalDetails,
    netWorth,
    monthlyCashflow,
    totalInsuranceCover,
    totalInsurancePremium,
    goals,
    totalAssets,
    totalLiabilities: Math.max(0, totalAssets - netWorth),
    assets,
    liabilities: [],
    totalAnnualIncome,
    totalAnnualExpenses,
    expenses,
    aiSummary,
    willStatus: sipData.willStatus,
    isAllocationOnly: true
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportId = searchParams.get('id');
    const reportType = searchParams.get('type') || 'detailed';

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    let reportData = null;

    if (reportType === 'sip') {
      reportData = await getSipOptimizerReport(reportId);
      if (!reportData) {
        // Fallback to detailed report if sip report is missing
        reportData = await getDetailedReport(reportId);
      }
    } else {
      reportData = await getDetailedReport(reportId);
      if (!reportData) {
        // Fallback: Convert SIP optimizer report to detailed report on the fly
        const sipData = await getSipOptimizerReport(reportId);
        if (sipData) {
          reportData = convertSipToDetailed(sipData);
        }
      }
    }

    if (!reportData) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: cleanUndefined(reportData) });
  } catch (error: any) {
    console.error('Error in get-report API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve report' },
      { status: 500 }
    );
  }
}
