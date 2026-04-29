

export interface PersonalDetails {
  name: string;
  dob: string;
  dependents: number | '';
  retirementAge: number | '';
  mobile: string;
  email: string;
  arn: string;
}

export interface Asset {
  id: string;
  type: string;
  amount: number | '';
  otherType?: string;
}

export interface Liability {
  id: string;
  type: string;
  amount: number | '';
  otherType?: string;
}

export interface Income {
  id: string;
  source: string;
  amount: number | '';
  otherType?: string;
}

export interface Expense {
  id: string;
  type: string;
  amount: number | '';
  otherType?: string;
}

export interface Insurance {
  id: string;
  type: 'Life' | 'Health' | '';
  cover: number | '';
  premium: number | '';
}

export interface Goal {
  id:string;
  name: string;
  corpus: number | '';
  years: number | '';
  rate: number | '';
  currentSave: number | '';
  currentSip: number | '';
  otherType?: string;
}

export interface GoalWithSip extends Goal {
  sip: number;
}

export interface GoalWithCalculations extends Goal {
  futureValueOfGoal: number;
  futureValueOfCurrentSave: number;
  futureValueOfSip: number;
  totalFutureValue: number;
  shortfall: number;
  newSipRequired: number;
}


export interface ReportData {
  personalDetails: PersonalDetails;
  netWorth: number;
  monthlyCashflow: number;
  totalInsuranceCover: number;
  totalInsurancePremium: number;
  goals: GoalWithSip[];
  totalAssets: number;
  totalLiabilities: number;
  assets: Asset[];
  liabilities: Liability[];
  totalAnnualIncome: number;
  totalAnnualExpenses: number;
  expenses: Expense[];
  aiSummary: string;
  willStatus: 'yes' | 'no' | null;
}


// Types for the SIP Optimizer Report

export interface SipOptimizerGoal {
    id: string;
    name: string;
    targetCorpus: number;
    futureValue: number;
    timeline: {
        current: number;
        required: number;
        potential: number;
    };
    investmentStatus: {
        currentInvestment: number;
        requiredInvestment: number;
        allocatedInvestment: number;
    };
    potentialCorpus: number;
}

export interface RetirementGoalReport {
    futureValue: number;
    timeline: {
        current: number;
        required: number;
        potential: number;
    };
    investmentStatus: {
        currentInvestment: number;
        requiredInvestment: number;
        allocatedInvestment: number;
    };
    potentialCorpus: number;
}


export interface WealthCreationGoal {
    sip: number;
    years: number;
    projectedCorpus: number;
}

export interface LifeInsuranceQuote {
    id: string;
    planName: string;
    premiumAmount: number | '';
    premiumPaymentTerm: string;
    policyTerm: string;
    coverAmount: number | '';
}

export interface HealthInsuranceQuote {
    id: string;
    company: string;
    planName: string;
    premium1Y: number | '';
    sumAssured: string;
    preHospitalization: 'Covered' | 'Not Covered' | '';
    postHospitalization: 'Covered' | 'Not Covered' | '';
    waitingPeriodPED: 'Covered' | 'Not Covered' | '';
    roomRent: 'No cap' | 'Optional cap' | 'Private room' | 'Single private room' | 'All Types of Rooms' | '';
    restoreBenefit: '(Full SI)' | '(Once)' | '(Unlimited)' | '(Unlimited for same/different illness)' | '';
    ambulanceRoad: 'Included' | 'Excluded' | '';
    ambulanceAir: 'Optional' | 'Included' | 'Excluded' | '';
    healthCheckup: 'Covered' | 'Not Covered' | '';
    eConsultation: 'Included' | 'Not included' | '';
}


export interface InsuranceAnalysisData {
    lifeInsurance: {
        recommendedCover: number;
        currentCover: number | '';
        currentPremium?: number | '';
        coverageGap: number;
        quotes: LifeInsuranceQuote[];
    };
    healthInsurance: {
        recommendedCover: string;
        currentCover: number | '';
        currentPremium?: number | '';
        coverageGap: number;
        quotes: HealthInsuranceQuote[];
    };
}

export type RiskAppetite = 'High Aggressive' | 'High' | 'Moderate' | 'Conservative' | '';

export interface AssetAllocationProfile {
    age: number | '';
    riskAppetite: RiskAppetite;
}

export type FundCategory = 'Equity' | 'Debt' | 'Hybrid' | 'Solution-Oriented' | 'Others' | '';

export interface FundAllocation {
    id: string;
    goalId: string;
    sipRequired: number | '';
    lumpsumAmount: number | '';
    fundCategory: FundCategory;
    fundType: string;
    fundName: string;
    schemeName: string;
    schemeCode: string;
    category?: string;
    planType?: string;
}

export interface ReportSections {
  netWorth: boolean;
  cashflow: boolean;
  investmentStatus: boolean;
  goalProjections: boolean;
  goalsBreakdown: boolean;
  assetAllocation: boolean;
  mutualFundPortfolio: boolean;
  insurance: boolean;
  estatePlanning: boolean;
  retirementPlanning: boolean;
  modelPortfolioAnalysis: boolean;
  liquidAssetAllocation: boolean;
  equityWeightAnalysis: boolean;
  debtWeightAnalysis: boolean;
  hybridWeightAnalysis: boolean;
  solutionOrientedWeightAnalysis: boolean;
  othersWeightAnalysis: boolean;
}

export interface SipOptimizerReportData {
  sections?: ReportSections;
  personalDetails: {
    name: string;
    dob: string;
    dependents: number | '';
    retirementAge: number | '';
    mobile: string;
    email: string;
    arn: string;
  };
  netWorth: number;
  cashflow: {
    totalMonthlyIncome: number;
    totalMonthlyExpenses: number;
    investibleSurplus: number;
  };
  goals: SipOptimizerGoal[];
  retirementGoal: RetirementGoalReport | null;
  wealthCreationGoal: WealthCreationGoal | null;
  totalInvestmentStatus: {
    currentInvestment: number;
    requiredInvestment: number;
    potentialInvestment: number;
  };
  detailedTables: {
    incomeExpenses: {
        totalMonthlyIncome: number;
        fixedExpenses: number;
        emiExpenses: number;
        otherExpenses: number;
    };
    assetAllocation: {
        equity: { corpus: number; monthly: number };
        fixedIncome: { corpus: number; monthly: number };
        ppf: { corpus: number; monthly: number };
        epf: { corpus: number; monthly: number };
        nps: { corpus: number; monthly: number };
        gold: { corpus: number; monthly: number };
        insurance: { corpus: number; monthly: number };
        realEstate: { corpus: number; monthly: number };
        others: { corpus: number; monthly: number };
        total: { corpus: number; monthly: number };
    };
  };
  advisorDetails: {
    arnName: string;
    arnNo: string;
    mobile: string;
    email: string;
  };
  insuranceAnalysis: InsuranceAnalysisData;
  assets: Asset[];
  willStatus: 'yes' | 'no' | null;
  retirementInputs: RetirementInputs;
  retirementCalculations: RetirementCalculations;
  assetAllocationProfile: AssetAllocationProfile;
  fundAllocations: FundAllocation[];
  goalsWithCalculations: GoalWithCalculations[];
  chartDataCache?: {
    equity?: ChartDataPoint[];
    debt?: ChartDataPoint[];
    hybrid?: ChartDataPoint[];
    solutionOriented?: ChartDataPoint[];
    other?: ChartDataPoint[];
  };
  fundBenchmarkCache?: {
    [schemeCode: string]: {
      yearlyComparison: { year: string; fundReturn: number; benchmarkReturn: number }[];
      benchmarkName: string;
      riskMetrics: any;
    };
  };
}

export interface RetirementInputs {
    currentAge: number | '';
    desiredRetirementAge: number | '';
    lifeExpectancy: number | '';
    currentMonthlyExpense: number | '';
    preRetirementRoi: number | '';    //string -> retirement: Required Retirement Corpus        
    postRetirementRoi: number | '';
    incrementalRate: number | '';
    currentSavings: number | '';
    currentSip: number | '';
}

export interface RetirementCalculations {
    expectedInflationRate: number;
    realRateOfReturn: number;
    yearsToRetirement: number;
    yearsInRetirement: number;
    inflatedMonthlyExpense: number;
    annualExpenseAtRetirement: number;
    requiredRetirementCorpus: number;
    monthlyInvestmentNeeded: number;
    incrementalMonthlyInvestment: number;
}

export interface AllPlannerData {
    personalDetails: PersonalDetails;
    assets: Asset[];
    liabilities: Liability[];
    incomes: Income[];
    expenses: Expense[];
    goals: Goal[];
    insuranceAnalysis: InsuranceAnalysisData | null;
    willStatus: 'yes' | 'no' | null;
    retirementInputs: RetirementInputs;
    assetAllocationProfile: AssetAllocationProfile;
    fundAllocations: FundAllocation[];
}

export interface ModelPortfolioInput {
  funds: {
    schemeCode: number;
    schemeName: string;
    weight: number;
    fundCategory: FundCategory;
  }[];
}

export type ChartDataPoint = {
  date: string;
  benchmark?: number;
  modelPortfolio?: number;
};

export interface ModelPortfolioOutput {
  chartData: ChartDataPoint[];
}

export interface Scheme {
  schemeCode: number;
  schemeName: string;
}

export interface Fund {
  fundName: string;
  schemes: Scheme[];
}


export interface FundReturnsInput {
  schemeCode: number;
}

export interface FundReturnsOutput {
  threeYearReturn: string | null;
  fiveYearReturn: string | null;
  tenYearReturn: string | null;
  currentNav: string | null;
}

export interface IndustryAllocation {
  sector: string;
  weight: number;
}

export interface PortfolioHolding {
  stock: string;
  weight: number;
}

export interface FactsheetData {
  fundName: string;
  netAssets: string;
  industryAllocation: IndustryAllocation[];
  portfolioHoldings: PortfolioHolding[];
  sharpeRatio?: string | null;
  beta?: string | null;
  standardDeviation?: string | null;
  expenseRatio?: string | null;
  aum?: string | null;
  portfolioTurnover?: string | null;
  sectorAllocation?: IndustryAllocation[];
  cagr3Year?: string | null;
  downwardDeviation?: string | null;
}
