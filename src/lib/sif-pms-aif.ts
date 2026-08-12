export type InvestmentCategory = "PMS" | "AIF" | "SIF";

export type InvestmentProduct = {
  label: string;
  fileName: string | null;
};

export const investmentOptions: Record<InvestmentCategory, InvestmentProduct[]> = {
  SIF: [
    {
      label: "DynaSIF Equity Ex-Top 100 Long-Short Fund",
      fileName: "DynaSIF Equity Ex-Top 100 Long-Short Fund.txt",
    },
    {
      label: "QSIF Equity Long-Short Fund",
      fileName: "qsif Equity Long-Short Fund.txt",
    },
    {
      label: "iSIF Equity Ex-Top 100 Long-Short Fund",
      fileName: "iSIF Equity Ex-Top 100 Long-Short Fund.txt",
    },
    {
      label: "Arudha Equity Long-Short Fund",
      fileName: "Arudha Equity Long-Short Fund.txt",
    },
    {
      label: "Summit Equity Long-Short Fund",
      fileName: "Summit Equity Long-Short Fund.txt",
    },
  ],
  PMS: [
    {
      label: "ICICI Prudential Emerging Leaders PMS",
      fileName: "ICICI Prudential PMS Emerging Leaders Strategy.txt",
    },
    {
      label: "Abakkus Emerging Opportunities PMS",
      fileName: "Abakkus Emerging Opportunities Approach.txt",
    },
    {
      label: "Helios India Rising Portfolio",
      fileName: "Helios India Rising PMS.txt",
    },
    {
      label: "Motilal Oswal Founders Strategy PMS",
      fileName: "Motilal Oswal Founders Portfolio.txt",
    },
    {
      label: "ABSL Select Sector Portfolio PMS",
      fileName: "Aditya Birla Sun Life AMC Select Sector Portfolio.txt",
    },
  ],
  AIF: [
    {
      label: "ICICI Prudential Emerging Leaders Fund — Series III",
      fileName: "ICICI Prudential Emerging Leaders Fund – Series III.txt",
    },
    {
      label: "Helios India Emerging Star Fund",
      fileName: "Helios India Emerging Star Fund.txt",
    },
    {
      label: "ABSL Select Sector Fund — AIF Category III — Mid & Small Cap Growth Opportunity",
      fileName: null,
    },
  ],
};

export function getInvestmentProduct(
  category: string | null | undefined,
  product: string | null | undefined,
) {
  if (!category || !product || !isInvestmentCategory(category)) return null;
  return investmentOptions[category].find((option) => option.label === product) ?? null;
}

export function isInvestmentCategory(value: unknown): value is InvestmentCategory {
  return value === "PMS" || value === "AIF" || value === "SIF";
}

export function getProductLabel(category: InvestmentCategory, product: string) {
  return getInvestmentProduct(category, product)?.label ?? product;
}