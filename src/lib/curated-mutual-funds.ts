import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { MUTUAL_FUND_FILE_SPECS } from "@/lib/mutual-fund-file-registry";

export interface MutualFundScheme {
  category: string;
  type: string;
  fundName: string;
  schemeName: string;
  schemeCode: string;
  plan: string;
  primaryBenchmark: string;
}

const AMC_NAMES = [
  "360 ONE", "ABSL", "Aditya Birla Sun Life", "Angel One", "Axis", "Bajaj Finserv", "Bandhan", "Bank of India",
  "Baroda BNP Paribas", "Canara Robeco", "Capitalmind", "DSP", "Edelweiss", "Franklin India",
  "Groww", "HDFC", "Helios", "HSBC", "ICICI Pru", "Invesco India", "ITI", "JioBlackRock", "JM",
  "Kotak", "LIC MF", "Mahindra Manulife", "Mirae Asset", "Motilal Oswal", "Navi", "Nippon India",
  "NJ", "Old Bridge", "Parag Parikh", "PGIM India", "Quant", "Quantum", "Samco", "SBI", "Shriram",
  "Sundaram", "Tata", "Taurus", "The Wealth Company", "TRUST MF", "Unifi", "Union", "UTI", "WhiteOak Capital",
];

const SCHEME_CODE_FALLBACKS_BY_FILE: Record<string, Record<string, string>> = {
  "Commodities_Funds.csv": {
    "Kotak Gold ETF": "106193",
    "Kotak Gold Dir": "119781",
    "Kotak Gold Reg": "114758",
    "SBI Gold Reg": "115676",
  },
  "Debt_Funds.csv": {
    "Axis Short Duration Reg": "112354",
    "Kotak Low Duration Dir": "133810",
    "Kotak Low Duration Reg": "133805",
    "HDFC Low Duration Reg": "102452",
    "SBI Savings Reg": "102503",
    "ICICI Pru Short Term": "101758",
    "ICICI Pru Savings": "101619",
    "Nippon India Ultra Short Duration Reg": "143493",
    "Sundaram Ultra Short Duration Reg": "149535",
  },
};

export function getCuratedMutualFunds(): MutualFundScheme[] {
  const fundsDir = path.join(process.cwd(), "Mutual Fund");
  const allFunds: MutualFundScheme[] = [];

  for (const file of MUTUAL_FUND_FILE_SPECS) {
    const filePath = path.join(fundsDir, file.fundFile);
    if (!fs.existsSync(filePath)) continue;

    const parsed = Papa.parse<Record<string, string>>(fs.readFileSync(filePath, "utf-8"), {
      header: true,
      skipEmptyLines: true,
    });

    for (const row of parsed.data) {
      const schemeName = row["Fund Name"] || row["fund_name"] || row[""] || "";
      const rawType = row["Category"] || row["category"] || row["bm"] || "";
      const type = rawType.replace(/^(Debt|Hybrid|Solution|Commodities):\s*/i, "").trim();
      const plan = row["Plan"] || row["plan"] || "";
      const canUseFallback = /^(direct|regular)$/i.test(plan.trim());
      const schemeCode =
        row["Scheme Code"] ||
        row["scheme_code"] ||
        row["AMFI Scheme Code"] ||
        (canUseFallback
          ? SCHEME_CODE_FALLBACKS_BY_FILE[file.fundFile]?.[schemeName.trim()]
          : "") ||
        "";

      if (!schemeName || !schemeCode) continue;

      let fundName = schemeName.split(" ")[0] || "Unknown";
      for (const amc of AMC_NAMES) {
        if (schemeName.toLowerCase().startsWith(amc.toLowerCase())) {
          fundName = amc;
          break;
        }
      }

      allFunds.push({
        category: file.apiCategory,
        type,
        fundName,
        schemeName,
        schemeCode,
        plan,
        primaryBenchmark: row["Benchmark_Name"] || row["bm"] || "",
      });
    }
  }

  return allFunds;
}
