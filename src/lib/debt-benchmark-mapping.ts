export const DEBT_BENCHMARK_MAPPING: { [key: string]: string } = {
  'Banking & PSU Debt': 'Benchmark Debt - NIFTY Banking & PSU Debt Index.csv',
  'Banking & PSU': 'Benchmark Debt - NIFTY Banking & PSU Debt Index.csv',
  'Corporate Bond': 'Benchmark Debt - NIFTY Corporate Bond Index (A-II _ B-III).csv',
  'Credit Risk': 'Benchmark Debt - NIFTY Credit Risk Bond Index (B-II _ C-III).csv',
  'Dynamic Bond': 'Benchmark Debt - NIFTY Composite Debt Index (A-III).csv',
  'Floater': 'Benchmark Debt - NIFTY Ultra Short Duration Debt Index.csv',
  'Gilt': 'Benchmark Debt - NIFTY All Duration G-Sec Index.csv',
  'Gilt Fund with 10 year': 'Benchmark Debt - CRISIL 10 Year Gilt Index.csv',
  'Gilt 10 Year': 'Benchmark Debt - CRISIL 10 Year Gilt Index.csv',
  'Liquid': 'Benchmark Debt - NIFTY Liquid Index.csv',
  'Long Duration': 'Benchmark Debt - NIFTY Long Duration Debt Index A-III.csv',
  'Low Duration': 'Benchmark Debt - NIFTY Low Duration Debt Index.csv',
  'Medium Duration': 'Benchmark Debt - NIFTY Medium Duration Debt Index.csv',
  'Medium to Long Duration': 'Benchmark Debt - NIFTY Medium to Long Duration Debt Index.csv',
  'Money Market': 'Benchmark Debt - NIFTY Money Market Index (A-I _ B-I).csv',
  'Overnight': 'Benchmark Debt - NIFTY 1D Rate Index.csv',
  'Short Duration': 'Benchmark Debt - NIFTY Short Duration Debt Index.csv',
  'Ultra Short Duration': 'Benchmark Debt - NIFTY Ultra Short Duration Debt Index.csv',
  'Ultra Short': 'Benchmark Debt - NIFTY Ultra Short Duration Debt Index.csv',
  'default': 'Benchmark Debt - NIFTY Composite Debt Index (A-III).csv',
};

export function getDebtBenchmarkFileForFund(schemeName: string): string {
  const lowerName = schemeName.toLowerCase();
  
  if (lowerName.includes('banking') || lowerName.includes('psu debt') || lowerName.includes('banking & psu')) {
    return DEBT_BENCHMARK_MAPPING['Banking & PSU Debt'];
  }
  if (lowerName.includes('corporate bond')) {
    return DEBT_BENCHMARK_MAPPING['Corporate Bond'];
  }
  if (lowerName.includes('credit risk')) {
    return DEBT_BENCHMARK_MAPPING['Credit Risk'];
  }
  if (lowerName.includes('dynamic bond') || lowerName.includes('dynamic')) {
    return DEBT_BENCHMARK_MAPPING['Dynamic Bond'];
  }
  if (lowerName.includes('floater') || lowerName.includes('floating')) {
    return DEBT_BENCHMARK_MAPPING['Floater'];
  }
  if (lowerName.includes('gilt') && (lowerName.includes('10 year') || lowerName.includes('10 yr') || lowerName.includes('constant'))) {
    return DEBT_BENCHMARK_MAPPING['Gilt 10 Year'];
  }
  if (lowerName.includes('gilt') || lowerName.includes('g-sec') || lowerName.includes('government securities')) {
    return DEBT_BENCHMARK_MAPPING['Gilt'];
  }
  if (lowerName.includes('liquid')) {
    return DEBT_BENCHMARK_MAPPING['Liquid'];
  }
  if (lowerName.includes('long duration') && !lowerName.includes('medium')) {
    return DEBT_BENCHMARK_MAPPING['Long Duration'];
  }
  if (lowerName.includes('low duration')) {
    return DEBT_BENCHMARK_MAPPING['Low Duration'];
  }
  if (lowerName.includes('medium to long') || lowerName.includes('medium-to-long')) {
    return DEBT_BENCHMARK_MAPPING['Medium to Long Duration'];
  }
  if (lowerName.includes('medium duration') || lowerName.includes('medium term')) {
    return DEBT_BENCHMARK_MAPPING['Medium Duration'];
  }
  if (lowerName.includes('money market')) {
    return DEBT_BENCHMARK_MAPPING['Money Market'];
  }
  if (lowerName.includes('overnight')) {
    return DEBT_BENCHMARK_MAPPING['Overnight'];
  }
  if (lowerName.includes('short duration') || lowerName.includes('short term')) {
    if (lowerName.includes('ultra')) {
      return DEBT_BENCHMARK_MAPPING['Ultra Short Duration'];
    }
    return DEBT_BENCHMARK_MAPPING['Short Duration'];
  }
  if (lowerName.includes('ultra short')) {
    return DEBT_BENCHMARK_MAPPING['Ultra Short Duration'];
  }
  
  return DEBT_BENCHMARK_MAPPING['default'];
}

export function getDebtBenchmarkName(benchmarkFile: string): string {
  const nameMap: { [key: string]: string } = {
    'Benchmark Debt - NIFTY Banking & PSU Debt Index.csv': 'NIFTY Banking & PSU Debt Index',
    'Benchmark Debt - NIFTY Corporate Bond Index (A-II _ B-III).csv': 'NIFTY Corporate Bond Index',
    'Benchmark Debt - NIFTY Credit Risk Bond Index (B-II _ C-III).csv': 'NIFTY Credit Risk Bond Index',
    'Benchmark Debt - NIFTY Composite Debt Index (A-III).csv': 'NIFTY Composite Debt Index',
    'Benchmark Debt - NIFTY Ultra Short Duration Debt Index.csv': 'NIFTY Ultra Short Duration Debt Index',
    'Benchmark Debt - NIFTY All Duration G-Sec Index.csv': 'NIFTY All Duration G-Sec Index',
    'Benchmark Debt - CRISIL 10 Year Gilt Index.csv': 'CRISIL 10 Year Gilt Index',
    'Benchmark Debt - NIFTY Liquid Index.csv': 'NIFTY Liquid Index',
    'Benchmark Debt - NIFTY Long Duration Debt Index A-III.csv': 'NIFTY Long Duration Debt Index',
    'Benchmark Debt - NIFTY Low Duration Debt Index.csv': 'NIFTY Low Duration Debt Index',
    'Benchmark Debt - NIFTY Medium Duration Debt Index.csv': 'NIFTY Medium Duration Debt Index',
    'Benchmark Debt - NIFTY Medium to Long Duration Debt Index.csv': 'NIFTY Medium to Long Duration Debt Index',
    'Benchmark Debt - NIFTY Money Market Index (A-I _ B-I).csv': 'NIFTY Money Market Index',
    'Benchmark Debt - NIFTY 1D Rate Index.csv': 'NIFTY 1D Rate Index',
    'Benchmark Debt - NIFTY Short Duration Debt Index.csv': 'NIFTY Short Duration Debt Index',
  };
  
  return nameMap[benchmarkFile] || 'Weighted Benchmark';
}
