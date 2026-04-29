export const HYBRID_BENCHMARK_MAPPING: { [key: string]: string } = {
  'Aggressive Hybrid': 'benchmark (hybrid) - NIFTY 50 Hybrid Composite Debt 65_35 Index.csv',
  'Aggressive Hybrid Fund': 'benchmark (hybrid) - NIFTY 50 Hybrid Composite Debt 65_35 Index.csv',
  'Arbitrage': 'benchmark (hybrid) - NIFTY 50 Arbitrage Index.csv',
  'Arbitrage Fund': 'benchmark (hybrid) - NIFTY 50 Arbitrage Index.csv',
  'Balanced Hybrid': 'benchmark (hybrid) - NIFTY 50 Hybrid Composite Debt 50_50 Index.csv',
  'Balanced Hybrid Fund': 'benchmark (hybrid) - NIFTY 50 Hybrid Composite Debt 50_50 Index.csv',
  'Conservative Hybrid': 'benchmark (hybrid) - CRISIL Hybrid 85+15 - Conservative Index.csv',
  'Conservative Hybrid Fund': 'benchmark (hybrid) - CRISIL Hybrid 85+15 - Conservative Index.csv',
  'Dynamic Asset Allocation': 'benchmark (hybrid) - NIFTY 50 Hybrid Composite Debt 50_50 Index.csv',
  'Dynamic Asset Allocation or Balanced Advantage': 'benchmark (hybrid) - NIFTY 50 Hybrid Composite Debt 50_50 Index.csv',
  'Balanced Advantage': 'benchmark (hybrid) - NIFTY 50 Hybrid Composite Debt 50_50 Index.csv',
  'Equity Savings': 'benchmark (hybrid) - NIFTY Equity Savings Index.csv',
  'Equity Savings Fund': 'benchmark (hybrid) - NIFTY Equity Savings Index.csv',
  'Multi Asset Allocation': 'benchmark (hybrid) - 65% NIFTY 50 (Equity) + 25% NIFTY Composite Debt (Debt) + 10% Domestic Gold Price.csv',
  'Multi Asset': 'benchmark (hybrid) - 65% NIFTY 50 (Equity) + 25% NIFTY Composite Debt (Debt) + 10% Domestic Gold Price.csv',
  'default': 'benchmark (hybrid) - NIFTY 50 Hybrid Composite Debt 50_50 Index.csv',
};

export function getHybridBenchmarkFileForFund(schemeName: string): string {
  const lowerName = schemeName.toLowerCase();
  
  if (lowerName.includes('aggressive hybrid') || lowerName.includes('aggressive')) {
    return HYBRID_BENCHMARK_MAPPING['Aggressive Hybrid'];
  }
  if (lowerName.includes('arbitrage')) {
    return HYBRID_BENCHMARK_MAPPING['Arbitrage'];
  }
  if (lowerName.includes('balanced hybrid')) {
    return HYBRID_BENCHMARK_MAPPING['Balanced Hybrid'];
  }
  if (lowerName.includes('conservative hybrid') || lowerName.includes('conservative')) {
    return HYBRID_BENCHMARK_MAPPING['Conservative Hybrid'];
  }
  if (lowerName.includes('dynamic asset') || lowerName.includes('balanced advantage') || lowerName.includes('dynamic')) {
    return HYBRID_BENCHMARK_MAPPING['Dynamic Asset Allocation'];
  }
  if (lowerName.includes('equity savings') || lowerName.includes('equity saving')) {
    return HYBRID_BENCHMARK_MAPPING['Equity Savings'];
  }
  if (lowerName.includes('multi asset') || lowerName.includes('multi-asset')) {
    return HYBRID_BENCHMARK_MAPPING['Multi Asset Allocation'];
  }
  
  return HYBRID_BENCHMARK_MAPPING['default'];
}

export function getHybridBenchmarkName(benchmarkFile: string): string {
  const nameMap: { [key: string]: string } = {
    'benchmark (hybrid) - NIFTY 50 Hybrid Composite Debt 65_35 Index.csv': 'NIFTY 50 Hybrid Composite Debt 65:35 Index',
    'benchmark (hybrid) - NIFTY 50 Arbitrage Index.csv': 'NIFTY 50 Arbitrage Index',
    'benchmark (hybrid) - NIFTY 50 Hybrid Composite Debt 50_50 Index.csv': 'NIFTY 50 Hybrid Composite Debt 50:50 Index',
    'benchmark (hybrid) - CRISIL Hybrid 85+15 - Conservative Index.csv': 'CRISIL Hybrid 85+15 Conservative Index',
    'benchmark (hybrid) - NIFTY Equity Savings Index.csv': 'NIFTY Equity Savings Index',
    'benchmark (hybrid) - 65% NIFTY 50 (Equity) + 25% NIFTY Composite Debt (Debt) + 10% Domestic Gold Price.csv': 'Multi Asset Composite Index',
  };
  
  return nameMap[benchmarkFile] || 'Hybrid Benchmark';
}
