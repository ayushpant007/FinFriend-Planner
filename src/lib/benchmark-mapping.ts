import { getOtherBenchmarkFileForFund } from './other-benchmark-mapping';

export const EQUITY_BENCHMARK_MAPPING: { [key: string]: string } = {
  'Large Cap': 'Nifty Benchmark - Nifty 100 TRI.csv',
  'Large & Mid Cap': 'Nifty Benchmark - NIFTY LARGEMIDCAP 250.csv',
  'Mid Cap': 'Nifty Benchmark - NIFTY Midcap 150 TRI.csv',
  'Small Cap': 'Nifty Benchmark - NIFTY Smallcap 250 TRI.csv',
  'Multi Cap': 'Nifty Benchmark - NIFTY500 MULTICAP 50_25_25.csv',
  'Flexi Cap': 'Nifty Benchmark - Nifty 500 TRI.csv',
  'Value': 'Nifty Benchmark - NIFTY 500 Value 50 TRI.csv',
  'ELSS': 'Nifty Benchmark - Nifty 500 TRI.csv',
  'Contra': 'Nifty Benchmark - Nifty 500 TRI.csv',
  'Dividend Yield': 'Nifty Benchmark - NIFTY Dividend Opportunities 50 TRI.csv',
  'Focused': 'Nifty Benchmark - Nifty 50 TRI.csv',
  'Sectoral/Thematic - Banking': 'Nifty Benchmark - NIFTY Financial Services TRI.csv',
  'Sectoral/Thematic - Financial Services': 'Nifty Benchmark - NIFTY Financial Services TRI.csv',
  'Sectoral/Thematic - IT': 'Nifty Benchmark - NIFTY IT TRI.csv',
  'Sectoral/Thematic - Technology': 'Nifty Benchmark - NIFTY IT TRI.csv',
  'Sectoral/Thematic - Pharma': 'Nifty Benchmark - NIFTY Pharma TRI.csv',
  'Sectoral/Thematic - Healthcare': 'Nifty Benchmark - S&P BSE Healthcare TRI.csv',
  'Sectoral/Thematic - Infrastructure': 'Nifty Benchmark - NIFTY Infrastructure TRI.csv',
  'Sectoral/Thematic - Consumption': 'Nifty Benchmark - NIFTY India Consumption TRI.csv',
  'Sectoral/Thematic - Manufacturing': 'Nifty Benchmark - NIFTY India Manufacturing TRI.csv',
  'Sectoral/Thematic - MNC': 'Nifty Benchmark - NIFTY MNC TRI.csv',
  'Sectoral/Thematic - PSU': 'Nifty Benchmark - S&P BSE PSU TRI.csv',
  'Sectoral/Thematic - ESG': 'Nifty Benchmark - NIFTY 100 ESG TRI.csv',
  'Sectoral/Thematic - Transportation': 'Nifty Benchmark - NIFTY Transportation & Logistics TRI.csv',
  'International': 'Nifty Benchmark - S&P 500 TRI .csv',
  'Global': 'Nifty Benchmark - S&P 500 TRI .csv',
  'US': 'Nifty Benchmark - S&P 500 TRI .csv',
  'default': 'Nifty Benchmark - Nifty 50 TRI.csv',
};

export function getBenchmarkFileForFund(schemeName: string): string {
  const lowerName = schemeName.toLowerCase();
  
  // Check for specialized "Other" benchmarks first
  if (lowerName.includes('global') || 
      lowerName.includes('china') || 
      lowerName.includes('world') || 
      lowerName.includes('overseas') ||
      lowerName.includes('international') ||
      lowerName.includes('greater china') ||
      lowerName.includes('business cycle') ||
      lowerName.includes('commodities')) {
    const file = getOtherBenchmarkFileForFund(schemeName);
    console.log(`[BenchmarkMapping] Mapping ${schemeName} to specialized benchmark: ${file}`);
    return file;
  }

  // Map retirement/children solutions in equity to Flexi Cap (Nifty 500 TRI)
  if (lowerName.includes('retirement') || lowerName.includes('children')) {
    return EQUITY_BENCHMARK_MAPPING['Flexi Cap'];
  }

  if (lowerName.includes('small cap') || lowerName.includes('smallcap')) {
    return EQUITY_BENCHMARK_MAPPING['Small Cap'];
  }
  if (lowerName.includes('mid cap') || lowerName.includes('midcap')) {
    if (lowerName.includes('large')) {
      return EQUITY_BENCHMARK_MAPPING['Large & Mid Cap'];
    }
    return EQUITY_BENCHMARK_MAPPING['Mid Cap'];
  }
  if (lowerName.includes('large cap') || lowerName.includes('largecap')) {
    if (lowerName.includes('mid')) {
      return EQUITY_BENCHMARK_MAPPING['Large & Mid Cap'];
    }
    return EQUITY_BENCHMARK_MAPPING['Large Cap'];
  }
  if (lowerName.includes('flexi cap') || lowerName.includes('flexicap')) {
    return EQUITY_BENCHMARK_MAPPING['Flexi Cap'];
  }
  if (lowerName.includes('multi cap') || lowerName.includes('multicap')) {
    return EQUITY_BENCHMARK_MAPPING['Multi Cap'];
  }
  if (lowerName.includes('elss') || lowerName.includes('tax saver')) {
    return EQUITY_BENCHMARK_MAPPING['ELSS'];
  }
  if (lowerName.includes('value')) {
    return EQUITY_BENCHMARK_MAPPING['Value'];
  }
  if (lowerName.includes('contra')) {
    return EQUITY_BENCHMARK_MAPPING['Contra'];
  }
  if (lowerName.includes('dividend') || lowerName.includes('yield')) {
    return EQUITY_BENCHMARK_MAPPING['Dividend Yield'];
  }
  if (lowerName.includes('focused')) {
    return EQUITY_BENCHMARK_MAPPING['Focused'];
  }
  if (lowerName.includes('banking') || lowerName.includes('bank') || lowerName.includes('financial')) {
    return EQUITY_BENCHMARK_MAPPING['Sectoral/Thematic - Financial Services'];
  }
  if (lowerName.includes('it ') || lowerName.includes('technology') || lowerName.includes('tech') || lowerName.includes('digital')) {
    return EQUITY_BENCHMARK_MAPPING['Sectoral/Thematic - IT'];
  }
  if (lowerName.includes('pharma') || lowerName.includes('healthcare') || lowerName.includes('health')) {
    return EQUITY_BENCHMARK_MAPPING['Sectoral/Thematic - Pharma'];
  }
  if (lowerName.includes('infra')) {
    return EQUITY_BENCHMARK_MAPPING['Sectoral/Thematic - Infrastructure'];
  }
  if (lowerName.includes('consumption') || lowerName.includes('fmcg')) {
    return EQUITY_BENCHMARK_MAPPING['Sectoral/Thematic - Consumption'];
  }
  if (lowerName.includes('manufacturing')) {
    return EQUITY_BENCHMARK_MAPPING['Sectoral/Thematic - Manufacturing'];
  }
  if (lowerName.includes('mnc')) {
    return EQUITY_BENCHMARK_MAPPING['Sectoral/Thematic - MNC'];
  }
  if (lowerName.includes('psu')) {
    return EQUITY_BENCHMARK_MAPPING['Sectoral/Thematic - PSU'];
  }
  if (lowerName.includes('esg')) {
    return EQUITY_BENCHMARK_MAPPING['Sectoral/Thematic - ESG'];
  }
  if (lowerName.includes('transport') || lowerName.includes('logistics')) {
    return EQUITY_BENCHMARK_MAPPING['Sectoral/Thematic - Transportation'];
  }
  if (lowerName.includes('international') || lowerName.includes('global') || lowerName.includes('us ') || lowerName.includes('nasdaq') || lowerName.includes('s&p 500')) {
    return EQUITY_BENCHMARK_MAPPING['International'];
  }
  
  return EQUITY_BENCHMARK_MAPPING['default'];
}
