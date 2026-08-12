import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

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
          const schemeCode = row['Scheme Code'] || row['scheme_code'] || row['AMFI Scheme Code'] || '';
          
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
              plan: row['Plan'] || row['plan'] || '',
              primaryBenchmark: row['Benchmark_Name'] || row['bm'] || ''
            });
          }
        });
      }
    }
  }

  return NextResponse.json(allFunds);
}
