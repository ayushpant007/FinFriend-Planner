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
    'HDFC Low Duration Reg': '102452',
    'SBI Savings Reg': '102503',
    'ICICI Pru Short Term': '101758',
    'ICICI Pru Savings': '101619',
    'Nippon India Ultra Short Duration Reg': '143493',
    'Sundaram Ultra Short Duration Reg': '149535',
  },
};

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
          const schemeName = row['Fund Name'] || row['fund_name'] || row[''] || '';
          const rawType = row['Category'] || row['category'] || row['bm'] || '';
          const type = rawType.replace(/^(Debt|Hybrid|Solution|Commodities):\s*/i, '').trim();
          const rawSchemeName = row['Fund Name'] || row['fund_name'] || row[''] || '';
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
          
          let fundName = schemeName.split(' ')[0] || 'Unknown';
          
          // Try to match specific AMC names to get correct 'Mutual Fund' categorisation
          for (const amc of AMC_NAMES) {
            if (schemeName.toLowerCase().startsWith(amc.toLowerCase())) {
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

  return NextResponse.json(allFunds, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
