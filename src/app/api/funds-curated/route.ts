import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

interface MutualFundScheme {
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
  "Sundaram", "Tata", "Taurus", "The Wealth Company", "TRUST MF", "Unifi", "Union", "UTI", "WhiteOak Capital"
];

// Some source rows have blank Scheme Code cells. Keep only verified rows
// selectable using their corresponding codes from the fund registry.
const SCHEME_CODE_FALLBACKS_BY_FILE: Record<string, Record<string, string>> = {
  'Commodities_Funds.csv': {
    'Kotak Gold ETF': '106193',
    'Kotak Gold Dir': '119781',
    'Kotak Gold Reg': '114758',
    'SBI Gold Reg': '115676',
  },
  'Debt_Funds.csv': {
    'Axis Short Duration Reg': '112354',
    'Kotak Low Duration Dir': '133810',
    'Kotak Low Duration Reg': '133805',
    'SBI Savings Dir': '119821',
    'SBI Savings Reg': '102503',
    'HDFC Ultra Short Term Dir': '145034',
    'HDFC Ultra Short Term Reg': '145040',
    'ICICI Pru Short Term Dir': '120754',
    'ICICI Pru Short Term': '101758',
  },
};

// The debt CSV uses abbreviated labels. Publish clear names that match what
// investors search for in Fund Allocation, while retaining the exact source
// labels for the code fallback lookup.
const SCHEME_NAME_OVERRIDES_BY_FILE: Record<string, Record<string, string>> = {
  'Debt_Funds.csv': {
    'SBI Savings Dir': 'SBI Saving Fund - Direct Plan - Growth',
    'SBI Savings Reg': 'SBI Saving Fund - Regular Plan - Growth',
    'ICICI Pru Short Term Dir': 'ICICI Short Term Fund - Direct Plan - Growth',
    'ICICI Pru Short Term': 'ICICI Short Term Fund - Regular Plan - Growth',
  },
};

// HDFC Ultra Short to Short Term Fund is a separate scheme from HDFC Ultra
// Short Term Fund. Its rows are absent from the debt metrics CSV.
const ADDITIONAL_CURATED_SCHEMES: MutualFundScheme[] = [
  {
    category: 'Debt Scheme',
    type: 'Ultra Short to Short Term',
    fundName: 'HDFC',
    schemeName: 'HDFC Ultra Short To Short Term Fund - Direct Plan - Growth Option',
    schemeCode: '118942',
    plan: 'Direct',
    primaryBenchmark: '',
  },
  {
    category: 'Debt Scheme',
    type: 'Ultra Short to Short Term',
    fundName: 'HDFC',
    schemeName: 'HDFC Ultra Short To Short Term Fund - Regular Plan - Growth Option',
    schemeCode: '102452',
    plan: 'Regular',
    primaryBenchmark: '',
  },
];

export async function GET() {
  const fundsDir = path.join(process.cwd(), 'Mutual Fund');
  const files = [
    { name: 'Equity_Funds.csv', category: 'Equity Scheme' },
    { name: 'Debt_Funds.csv', category: 'Debt Scheme' },
    { name: 'Hybrid_Funds.csv', category: 'Hybrid Scheme' },
    { name: 'Solution_Oriented.csv', category: 'Solution Oriented Scheme' },
    { name: 'Commodities_Funds.csv', category: 'Commodities' }
  ];

  let allFunds: MutualFundScheme[] = [];

  for (const file of files) {
    const filePath = path.join(fundsDir, file.name);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.data && parsed.data.length > 0) {
        parsed.data.forEach((row: any) => {
          const rawSchemeName = row['Fund Name'] || row['fund_name'] || row[''] || '';
          const schemeName =
            SCHEME_NAME_OVERRIDES_BY_FILE[file.name]?.[rawSchemeName.trim()] ||
            rawSchemeName;
          const rawType = row['Category'] || row['category'] || row['bm'] || '';
          const type = rawType.replace(/^(Debt|Hybrid|Solution|Commodities):\s*/i, '').trim();
          const plan = row['Plan'] || row['plan'] || '';
          const canUseFallback = /^(direct|regular)$/i.test(plan.trim());
          const schemeCode =
            row['Scheme Code'] ||
            row['scheme_code'] ||
            row['AMFI Scheme Code'] ||
            (canUseFallback
              ? SCHEME_CODE_FALLBACKS_BY_FILE[file.name]?.[rawSchemeName.trim()]
              : '') ||
            '';
          
          let fundName = rawSchemeName.split(' ')[0] || 'Unknown';
          
          // Try to match specific AMC names to get correct 'Mutual Fund' categorisation
          for (const amc of AMC_NAMES) {
            if (rawSchemeName.toLowerCase().startsWith(amc.toLowerCase())) {
              fundName = amc;
              break;
            }
          }

          if (schemeName && schemeCode) {
            allFunds.push({
              category: file.category,
              type: type,
              fundName: fundName,
              schemeName: schemeName,
              schemeCode: schemeCode,
              plan,
              primaryBenchmark: row['Benchmark_Name'] || row['bm'] || ''
            });
          }
        });
      }
    }
  }

  allFunds.push(...ADDITIONAL_CURATED_SCHEMES);

  return NextResponse.json(allFunds, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
