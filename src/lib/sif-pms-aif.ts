export type InvestmentCategory = "PMS" | "AIF" | "SIF";

export type InvestmentProduct = {
  label: string;
  fileName: string | null;
};

const sifProducts: InvestmentProduct[] = [
  { label: "Altiva Hybrid Long-Short", fileName: "altiva-hybrid-long-short-research-pack.pdf" },
  { label: "Titanium Hybrid Long-Short", fileName: "titanium-hybrid-long-short-research-pack.pdf" },
  { label: "Sapphire Equity Long-Short", fileName: "sapphire-equity-long-short-research-pack.pdf" },
  { label: "RedHex Hybrid Long-Short", fileName: "redhex-hybrid-long-short-research-pack.pdf" },
  { label: "qsif Sector Rotation Long-Short", fileName: "qsif-sector-rotation-long-short-research-pack.pdf" },
  { label: "qsif Hybrid Long-Short", fileName: "qsif-hybrid-long-short-research-pack.pdf" },
  { label: "qsif Equity Long-Short", fileName: "qsif-equity-long-short-research-pack.pdf" },
  { label: "qsif Equity Ex-Top 100 Long-Short", fileName: "qsif-equity-ex-top100-long-short-research-pack.pdf" },
  { label: "qsif Active Asset Allocator", fileName: "qsif-active-asset-allocator-research-pack.pdf" },
  { label: "Magnum Hybrid Long-Short", fileName: "magnum-hybrid-long-short-research-pack.pdf" },
  { label: "iSIF Hybrid Long-Short", fileName: "isif-hybrid-long-short-research-pack.pdf" },
  { label: "iSIF Equity Long-Short", fileName: "isif-equity-long-short-research-pack.pdf" },
  { label: "iSIF Equity Ex-Top 100 Long-Short", fileName: "isif-equity-ex-top100-long-short-research-pack.pdf" },
  { label: "iSIF Active Asset Allocator Long-Short", fileName: "isif-active-asset-allocator-long-short-research-pack.pdf" },
  { label: "Infinity Hybrid Long-Short", fileName: "infinity-hybrid-long-short-research-pack.pdf" },
  { label: "DynaSIF Equity Long-Short", fileName: "dynasif-equity-long-short-research-pack.pdf" },
  { label: "DynaSIF Equity Ex-Top 100 Long-Short", fileName: "dynasif-equity-ex-top100-long-short-research-pack.pdf" },
  { label: "DynaSIF Active Asset Allocator", fileName: "dynasif-active-asset-allocator-research-pack.pdf" },
  { label: "Diviniti Equity Long-Short", fileName: "diviniti-equity-long-short-research-pack.pdf" },
  { label: "Arudha Hybrid Long-Short", fileName: "arudha-hybrid-long-short-research-pack.pdf" },
  { label: "Arthaya Equity Long-Short", fileName: "arthaya-equity-long-short-research-pack.pdf" },
  { label: "Apex Hybrid Long-Short", fileName: "apex-hybrid-long-short-research-pack.pdf" },
  // The brief lists Altiva Hybrid twice. The second entry is represented by
  // the remaining real PDF so every source file is selectable exactly once.
  { label: "WSIF Equity Ex-Top 100 Long-Short", fileName: "wsif-equity-ex-top100-long-short-research-pack.pdf" },
  { label: "Altiva Equity Ex-Top 100 Long-Short", fileName: "altiva-equity-ex-top100-long-short-research-pack.pdf" },
  { label: "Platinum Hybrid Long-Short", fileName: "platinum-hybrid-long-short-research-pack.pdf" },
  { label: "Prism Hybrid Long-Short", fileName: "prism-hybrid-long-short-research-pack.pdf" },
  { label: "Titanium Equity Long-Short", fileName: "titanium-equity-long-short-research-pack.pdf" },
  { label: "WSIF Equity Long-Short", fileName: "wsif-equity-long-short-research-pack.pdf" },
  { label: "Arudha Equity Long-Short", fileName: "arudha-equity-long-short-research-pack.pdf" },
  { label: "Summit Equity Long-Short", fileName: "summit-equity-long-short-research-pack.pdf" },
];

export const investmentOptions: Record<InvestmentCategory, InvestmentProduct[]> = {
  SIF: sifProducts,
  // PMS selections are loaded from the uploaded PMS AIF World master CSV by
  // the selection page. This prevents the legacy local PMS templates from
  // being used as report sources.
  PMS: [],
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
  const exact = investmentOptions[category].find((option) => option.label === product);
  if (exact) return exact;
  const normalizedProduct = normalizeProductName(product);
  return (
    investmentOptions[category].find(
      (option) => normalizeProductName(option.label) === normalizedProduct,
    ) ?? null
  );
}

export function isInvestmentCategory(value: unknown): value is InvestmentCategory {
  return value === "PMS" || value === "AIF" || value === "SIF";
}

export function getProductLabel(category: InvestmentCategory, product: string) {
  return getInvestmentProduct(category, product)?.label ?? product;
}

function normalizeProductName(value: string) {
  return value
    .toLowerCase()
    .replace(/p100/g, "top100")
    .replace(/[^a-z0-9]/g, "");
}