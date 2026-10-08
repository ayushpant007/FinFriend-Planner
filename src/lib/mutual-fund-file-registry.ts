export const MUTUAL_FUND_FILE_SPECS = [
  {
    id: "equity",
    categoryLabel: "Equity",
    apiCategory: "Equity Scheme",
    fundFile: "Equity_Funds.csv",
    fundFileLabel: "Equity fund list",
    holdingsFile: "Equity_Funds_Holdings.csv",
    holdingsFileLabel: "Equity holdings",
  },
  {
    id: "debt",
    categoryLabel: "Debt",
    apiCategory: "Debt Scheme",
    fundFile: "Debt_Funds.csv",
    fundFileLabel: "Debt fund list",
    holdingsFile: "Debt_Funds_Holdings.csv",
    holdingsFileLabel: "Debt holdings",
  },
  {
    id: "hybrid",
    categoryLabel: "Hybrid",
    apiCategory: "Hybrid Scheme",
    fundFile: "Hybrid_Funds.csv",
    fundFileLabel: "Hybrid fund list",
    holdingsFile: "Hybrid_Funds_Holdings.csv",
    holdingsFileLabel: "Hybrid holdings",
  },
  {
    id: "solutions",
    categoryLabel: "Solution-oriented",
    apiCategory: "Solution Oriented Scheme",
    fundFile: "Solution_Oriented.csv",
    fundFileLabel: "Solution-oriented fund list",
    holdingsFile: "Solution_Oriented_Holdings.csv",
    holdingsFileLabel: "Solution-oriented holdings",
  },
  {
    id: "commodities",
    categoryLabel: "Commodities",
    apiCategory: "Commodities",
    fundFile: "Commodities_Funds.csv",
    fundFileLabel: "Commodities fund list",
    holdingsFile: "Commodities_Funds_Holdings.csv",
    holdingsFileLabel: "Commodities holdings",
  },
] as const;

export type MutualFundFileSpec = (typeof MUTUAL_FUND_FILE_SPECS)[number];
