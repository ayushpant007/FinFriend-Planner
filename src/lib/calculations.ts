

import type { Goal, GoalWithCalculations, WealthCreationGoal, RetirementInputs, RetirementCalculations, RiskAppetite } from './types';

// Financial formula implementations
function fv(rate: number, nper: number, pmt: number, pv: number, type: 0 | 1 = 0) {
    if (rate === 0) {
        return -(pv + pmt * nper);
    }
    const pow = Math.pow(1 + rate, nper);
    return -((pv * pow) + (pmt * (1 + rate * type) * (pow - 1) / rate));
}

function pv(rate: number, nper: number, pmt: number, fvVal: number, type: 0 | 1 = 0) {
    if (rate === 0) {
        return -(fvVal + pmt * nper);
    }
    const pow = Math.pow(1 + rate, nper);
    let pv_value = fvVal;
    if (pmt !== 0) {
        pv_value += pmt * (1 + rate * type) * ((pow - 1) / rate);
    }
    return -pv_value / pow;
}

function pmt(rate: number, nper: number, pv: number, fvVal: number, type: 0 | 1 = 0) {
    if (rate === 0) {
        return -(fvVal + pv) / nper;
    }
    const pow = Math.pow(1 + rate, nper);
    return -((fvVal + pv * pow) / ((1 + rate * type) * (pow - 1) / rate));
}


export function calculateSip(goal: Goal): number {
    const getNum = (val: number | '') => (typeof val === 'number' && !isNaN(val) ? val : 0);
    const corpus = getNum(goal.corpus);
    const years = getNum(goal.years);
    const rate = getNum(goal.rate);

    if (corpus <= 0 || years <= 0 || rate <= 0) {
        return 0;
    }

    const inflationRate = goal.name === 'Child Education' ? 0.10 : 0.06;
    const futureValue = corpus * Math.pow(1 + inflationRate, years);

    const monthlyRate = rate / 100 / 12;
    const months = years * 12;

    if (monthlyRate === 0) {
        return months > 0 ? futureValue / months : 0;
    }

    const sip = futureValue / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));

    return sip;
}

export function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  return age;
}


export function calculateGoalDetails(goal: Goal): GoalWithCalculations {
  const getNum = (val: number | '') => (typeof val === 'number' && !isNaN(val) ? val : 0);

  const corpus = getNum(goal.corpus);
  const years = getNum(goal.years);
  const rate = getNum(goal.rate);
  const currentSave = getNum(goal.currentSave);
  const currentSip = getNum(goal.currentSip);

  const inflationRate = goal.name === 'Child Education' ? 0.10 : 0.06;
  const monthlyRate = rate / 100 / 12;
  const months = years * 12;

  // 1. Future Value of Goal (FV of Corpus)
  const futureValueOfGoal = corpus * Math.pow(1 + inflationRate, years);

  // 2. FV of current save for goal
  const futureValueOfCurrentSave = currentSave * Math.pow(1 + rate / 100, years);
  
  // 3. FV of monthly SIP (annuity due formula)
  let futureValueOfSip = 0;
  if (monthlyRate > 0) {
    futureValueOfSip = currentSip * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  } else {
    futureValueOfSip = currentSip * months;
  }

  // 4. Total projected value
  const totalFutureValue = futureValueOfCurrentSave + futureValueOfSip;

  // 5. Shortfall/Surplus calculation
  const shortfall = futureValueOfGoal - futureValueOfCurrentSave;

  // 6. SIP required for the shortfall
  let newSipRequired = 0;
  if (shortfall > 0) {
    if (monthlyRate > 0 && months > 0) {
       newSipRequired = shortfall / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
    } else if (months > 0) {
      newSipRequired = shortfall / months;
    }
  }
  
  return {
    ...goal,
    futureValueOfGoal: futureValueOfGoal,
    futureValueOfCurrentSave: futureValueOfCurrentSave,
    futureValueOfSip: futureValueOfSip,
    totalFutureValue: totalFutureValue,
    shortfall: futureValueOfGoal - totalFutureValue, // Corrected shortfall
    newSipRequired: newSipRequired,
  };
}

export function calculateNper(fv: number, annualRate: number, pmt: number, pv: number): number {
    const monthlyRate = annualRate / 100 / 12;

    if (annualRate <= 0 || monthlyRate <= 0) {
        if (pmt <= 0) {
            return pv >= fv ? 0 : Infinity;
        }
        return (fv - pv) / (pmt * 12);
    }
    
    // When PMT is 0, we solve for N in FV = PV * (1+r)^N
    if (pmt === 0) {
        if (pv >= fv) return 0;
        if (pv <= 0) return Infinity; // Cannot grow from 0 or negative without payments
        const nperMonths = Math.log(fv / pv) / Math.log(1 + monthlyRate);
        return nperMonths / 12;
    }
    
    // When PMT is non-zero, use the full formula
    // NPER = LOG((PMT*(1+i*type) - FV*i) / (PMT*(1+i*type) + PV*i)) / LOG(1+i)
    const type = 1; // Assuming payments at the beginning of the period
    const pmtPart = pmt * (1 + monthlyRate * type);
    
    const numerator = Math.log((pmtPart - fv * monthlyRate) / (pmtPart + pv * monthlyRate));
    const denominator = Math.log(1 + monthlyRate);
    
    // Handle cases where log is not possible
    if (denominator === 0) return Infinity;
    const argumentOfLog = (pmtPart - fv * monthlyRate) / (pmtPart + pv * monthlyRate);
    if (argumentOfLog <= 0) return Infinity; // Cannot reach target

    const nperMonths = numerator / denominator;
    
    return nperMonths / 12;
}


export function calculateTimelines(goal: GoalWithCalculations, potentialSip: number) {
    const getNum = (val: number | '' | undefined) => (typeof val === 'number' && !isNaN(val) ? val : 0);

    const futureValueGoal = goal.futureValueOfGoal;
    const rate = getNum(goal.rate);
    const currentSave = getNum(goal.currentSave);
    const currentSip = getNum(goal.currentSip);

    // Timeline with current SIP
    const timelineWithCurrentSip = calculateNper(futureValueGoal, rate, currentSip, currentSave);

    // Timeline with allocated "potential" SIP
    let timelineWithPotentialSip;
    if (potentialSip > 0 && potentialSip >= goal.newSipRequired) {
        timelineWithPotentialSip = getNum(goal.years);
    } else {
        timelineWithPotentialSip = calculateNper(futureValueGoal, rate, potentialSip, currentSave);
    }

    return {
        timelineWithCurrentSip: timelineWithCurrentSip,
        timelineWithRequiredSip: getNum(goal.years), // Required timeline is always the original goal timeline
        timelineWithPotentialSip: timelineWithPotentialSip,
    };
}


export function calculateWealthCreation(sip: number, rate: number): WealthCreationGoal {
    const years = 20; // Fixed 20-year horizon
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;

    let projectedCorpus = 0;
    if (monthlyRate > 0) {
        projectedCorpus = sip * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    } else {
        projectedCorpus = sip * months;
    }

    return {
        sip,
        years,
        projectedCorpus,
    };
}

export function calculateFutureValue(monthlySip: number, annualRate: number, years: number, initialInvestment: number): number {
    const monthlyRate = annualRate / 100 / 12;
    const months = years * 12;

    const futureValueOfInitial = initialInvestment * Math.pow(1 + annualRate / 100, years);
    
    let futureValueOfSips = 0;
    if (monthlyRate > 0) {
        futureValueOfSips = monthlySip * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    } else {
        futureValueOfSips = monthlySip * months;
    }
    
    return futureValueOfInitial + futureValueOfSips;
}

export function calculateRetirementDetails(inputs: RetirementInputs): RetirementCalculations {
    const getNum = (val: number | '') => (typeof val === 'number' && !isNaN(val) && val > 0 ? val : 0);

    const currentAge = getNum(inputs.currentAge);
    const desiredRetirementAge = getNum(inputs.desiredRetirementAge);
    const lifeExpectancy = getNum(inputs.lifeExpectancy);
    const currentMonthlyExpense = getNum(inputs.currentMonthlyExpense);
    const preRetirementRoi = getNum(inputs.preRetirementRoi) / 100;
    const postRetirementRoi = getNum(inputs.postRetirementRoi) / 100;
    const incrementalRate = getNum(inputs.incrementalRate) / 100;
    const currentSavings = getNum(inputs.currentSavings);
    const currentSip = getNum(inputs.currentSip);
    
    const inflationRate = 0.06;

    if (!currentAge || !desiredRetirementAge || !lifeExpectancy || !currentMonthlyExpense) {
        return {
            expectedInflationRate: inflationRate * 100,
            realRateOfReturn: 0,
            yearsToRetirement: 0,
            yearsInRetirement: 0,
            inflatedMonthlyExpense: 0,
            annualExpenseAtRetirement: 0,
            requiredRetirementCorpus: 0,
            monthlyInvestmentNeeded: 0,
            incrementalMonthlyInvestment: 0,
        };
    }

    const realRateOfReturn = postRetirementRoi > inflationRate ? ((1 + postRetirementRoi) / (1 + inflationRate)) - 1 : 0;
    const yearsToRetirement = desiredRetirementAge - currentAge;
    const yearsInRetirement = lifeExpectancy - desiredRetirementAge;

    const inflatedMonthlyExpense = fv(inflationRate, yearsToRetirement, 0, -currentMonthlyExpense, 0);
    const annualExpenseAtRetirement = inflatedMonthlyExpense * 12;
    
    let requiredRetirementCorpus = 0;
    if (realRateOfReturn > 0) {
        requiredRetirementCorpus = (annualExpenseAtRetirement / realRateOfReturn) * (1 - (1 / Math.pow(1 + realRateOfReturn, yearsInRetirement)))
    }

    const futureValueOfCurrentInvestments = fv(preRetirementRoi, yearsToRetirement, -(currentSip * 12), -currentSavings, 0);
    
    let requiredShortfall = requiredRetirementCorpus - futureValueOfCurrentInvestments;
    if (requiredShortfall < 0) requiredShortfall = 0;
    
    let monthlyInvestmentNeeded = 0;
    if (requiredRetirementCorpus > 0 && yearsToRetirement > 0 && preRetirementRoi > 0) {
        monthlyInvestmentNeeded = pmt(preRetirementRoi / 12, yearsToRetirement * 12, 0, -requiredRetirementCorpus, 0);
    }
    
    let incrementalMonthlyInvestment = 0;
    const preRoi = preRetirementRoi;
    const incRate = incrementalRate;
    if (requiredShortfall > 0 && preRoi !== incRate) {
        const numerator = requiredShortfall * (preRoi - incRate);
        const denominator = Math.pow(1 + preRoi, yearsToRetirement) - Math.pow(1 + incRate, yearsToRetirement);
        if (denominator !== 0) {
           const annualInvestment = (numerator / denominator);
           incrementalMonthlyInvestment = annualInvestment / 12;
        }
    }

    return {
        expectedInflationRate: inflationRate * 100,
        realRateOfReturn: realRateOfReturn * 100,
        yearsToRetirement: yearsToRetirement > 0 ? yearsToRetirement : 0,
        yearsInRetirement: yearsInRetirement > 0 ? yearsInRetirement : 0,
        inflatedMonthlyExpense,
        annualExpenseAtRetirement,
        requiredRetirementCorpus: requiredRetirementCorpus,
        monthlyInvestmentNeeded: monthlyInvestmentNeeded > 0 ? monthlyInvestmentNeeded : 0,
        incrementalMonthlyInvestment: incrementalMonthlyInvestment > 0 ? incrementalMonthlyInvestment : 0,
    };
}


const allocationData: Record<string, Record<string, Record<string, number>>> = {
  '20-35': {
    'High Aggressive': { 'Large Cap': 30, 'Mid Cap': 25, 'Small Cap': 25, 'Multi + Flexi Cap': 10, 'Sectoral': 10, 'Debt': 0, 'Hybrid': 0, 'Expected Return': 16.00 },
    'High': { 'Large Cap': 30, 'Mid Cap': 25, 'Small Cap': 15, 'Multi + Flexi Cap': 10, 'Sectoral': 10, 'Debt': 10, 'Hybrid': 0, 'Expected Return': 15.00 },
    'Moderate': { 'Large Cap': 25, 'Mid Cap': 20, 'Small Cap': 10, 'Multi + Flexi Cap': 0, 'Sectoral': 0, 'Debt': 25, 'Hybrid': 20, 'Expected Return': 12.50 },
    'Conservative': { 'Large Cap': 30, 'Mid Cap': 10, 'Small Cap': 0, 'Multi + Flexi Cap': 10, 'Sectoral': 0, 'Debt': 40, 'Hybrid': 10, 'Expected Return': 11.50 },
  },
  '35-50': {
    'High Aggressive': { 'Large Cap': 35, 'Mid Cap': 30, 'Small Cap': 15, 'Multi + Flexi Cap': 0, 'Sectoral': 10, 'Debt': 10, 'Hybrid': 0, 'Expected Return': 15.00 },
    'High': { 'Large Cap': 30, 'Mid Cap': 25, 'Small Cap': 25, 'Multi + Flexi Cap': 0, 'Sectoral': 0, 'Debt': 0, 'Hybrid': 20, 'Expected Return': 15.70 }, // Note: Mapped from image, Hybrid seems to be 20%
    'Moderate': { 'Large Cap': 25, 'Mid Cap': 15, 'Small Cap': 15, 'Multi + Flexi Cap': 0, 'Sectoral': 0, 'Debt': 30, 'Hybrid': 15, 'Expected Return': 12.50 },
    'Conservative': { 'Large Cap': 20, 'Mid Cap': 20, 'Small Cap': 0, 'Multi + Flexi Cap': 0, 'Sectoral': 0, 'Debt': 50, 'Hybrid': 10, 'Expected Return': 11.00 },
  },
  '50-60': {
    'High Aggressive': { 'Large Cap': 20, 'Mid Cap': 20, 'Small Cap': 20, 'Multi + Flexi Cap': 0, 'Sectoral': 0, 'Debt': 30, 'Hybrid': 10, 'Expected Return': 13.00 },
    'High': { 'Large Cap': 15, 'Mid Cap': 15, 'Small Cap': 10, 'Multi + Flexi Cap': 10, 'Sectoral': 0, 'Debt': 40, 'Hybrid': 10, 'Expected Return': 12.00 },
    'Moderate': { 'Large Cap': 45, 'Mid Cap': 0, 'Small Cap': 0, 'Multi + Flexi Cap': 10, 'Sectoral': 0, 'Debt': 40, 'Hybrid': 10, 'Expected Return': 11.00 },
    'Conservative': { 'Large Cap': 30, 'Mid Cap': 0, 'Small Cap': 0, 'Multi + Flexi Cap': 0, 'Sectoral': 0, 'Debt': 60, 'Hybrid': 10, 'Expected Return': 10.00 },
  },
  '60+': {
    'High Aggressive': { 'Large Cap': 20, 'Mid Cap': 10, 'Small Cap': 0, 'Multi + Flexi Cap': 10, 'Sectoral': 5, 'Debt': 40, 'Hybrid': 20, 'Expected Return': 12.00 },
    'High': { 'Large Cap': 30, 'Mid Cap': 10, 'Small Cap': 0, 'Multi + Flexi Cap': 0, 'Sectoral': 0, 'Debt': 40, 'Hybrid': 20, 'Expected Return': 11.00 },
    'Moderate': { 'Large Cap': 10, 'Mid Cap': 10, 'Small Cap': 0, 'Multi + Flexi Cap': 0, 'Sectoral': 0, 'Debt': 50, 'Hybrid': 30, 'Expected Return': 10.00 },
    'Conservative': { 'Large Cap': 10, 'Mid Cap': 0, 'Small Cap': 0, 'Multi + Flexi Cap': 0, 'Sectoral': 0, 'Debt': 70, 'Hybrid': 20, 'Expected Return': 9.00 },
  },
};

export function getAssetAllocation(age: number | '', risk: RiskAppetite): Record<string, number> | null {
  if (!age || !risk) {
    return null;
  }

  let ageGroup = '';
  if (age >= 20 && age <= 35) ageGroup = '20-35';
  else if (age > 35 && age <= 50) ageGroup = '35-50';
  else if (age > 50 && age <= 60) ageGroup = '50-60';
  else if (age > 60) ageGroup = '60+';

  if (!ageGroup || !allocationData[ageGroup] || !allocationData[ageGroup][risk]) {
    return null;
  }
  
  return allocationData[ageGroup][risk];
}

export const fundData = {};
