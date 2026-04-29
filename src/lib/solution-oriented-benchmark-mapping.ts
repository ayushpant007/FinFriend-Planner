export const SOLUTION_ORIENTED_BENCHMARK_MAPPING: { [key: string]: { file: string; name: string } } = {
  'NIFTY 500 TRI': {
    file: 'Benchmark (solution oriented) - NIFTY 500 TRI.csv',
    name: 'NIFTY 500 TRI'
  },
  'Nifty 500 TRI': {
    file: 'Benchmark (solution oriented) - NIFTY 500 TRI.csv',
    name: 'NIFTY 500 TRI'
  },
  'NIFTY 50 Hybrid Composite Debt 65:35 Index': {
    file: 'Benchmark (solution oriented) - NIFTY 50 Hybrid Composite Debt 65_35 Index.csv',
    name: 'NIFTY 50 Hybrid Composite Debt 65:35 Index'
  },
  'NIFTY 50 Hybrid Composite Debt 15:85 Conservative Index': {
    file: 'Benchmark (solution oriented) - NIFTY 50 Hybrid Composite Debt 15_85 Conservative Index.csv',
    name: 'NIFTY 50 Hybrid Composite Debt 15:85 Conservative Index'
  },
  'NIFTY 50 Hybrid Composite Debt 15:85 Index': {
    file: 'Benchmark (solution oriented) - NIFTY 50 Hybrid Composite Debt 15_85 Index.csv',
    name: 'NIFTY 50 Hybrid Composite Debt 15:85 Index'
  },
  'CRISIL Hybrid 35+65 Aggressive Index': {
    file: 'Benchmark (solution oriented) - CRISIL Hybrid 35+65 Aggressive Index.csv',
    name: 'CRISIL Hybrid 35+65 Aggressive Index'
  },
  'CRISIL Hybrid 25+75 Aggressive Index': {
    file: 'Benchmark (solution oriented) - CRISIL Hybrid 25+75 Aggressive Index.csv',
    name: 'CRISIL Hybrid 25+75 Aggressive Index'
  },
  'CRISIL Hybrid 50+50 Moderate Index': {
    file: 'Benchmark (solution oriented) - CRISIL Hybrid 50+50 Moderate Index.csv',
    name: 'CRISIL Hybrid 50+50 Moderate Index'
  },
  'CRISIL Hybrid 65+35 Conservative Index': {
    file: 'Benchmark (solution oriented) - CRISIL Hybrid 65+35 Conservative Index.csv',
    name: 'CRISIL Hybrid 65+35 Conservative Index'
  },
  'CRISIL Hybrid 75+25 Conservative Index': {
    file: 'Benchmark (solution oriented) - CRISIL Hybrid 75+25 Conservative Index.csv',
    name: 'CRISIL Hybrid 75+25 Conservative Index'
  },
  'CRISIL Hybrid 85+15 Conservative Index': {
    file: 'Benchmark (solution oriented) - CRISIL Hybrid 85+15 Conservative Index.csv',
    name: 'CRISIL Hybrid 85+15 Conservative Index'
  },
  'CRISIL Short Term Bond Fund Index': {
    file: 'Benchmark (solution oriented) - CRISIL Short Term Bond Fund Index.csv',
    name: 'CRISIL Short Term Bond Fund Index'
  },
  'CRISIL Short Term Debt Hybrid 60+40 Fund Index': {
    file: 'Benchmark (solution oriented) - CRISIL Short Term Debt Hybrid 60+40 Fund Index.csv',
    name: 'CRISIL Short Term Debt Hybrid 60+40 Fund Index'
  },
  'CRISIL Short Term Debt Hybrid 60+40 Index': {
    file: 'Benchmark (solution oriented) - CRISIL Short Term Debt Hybrid 60+40 Index.csv',
    name: 'CRISIL Short Term Debt Hybrid 60+40 Index'
  },
  'CRISIL Short Term Debt Hybrid 75+25 Index': {
    file: 'Benchmark (solution oriented) - CRISIL Short Term Debt Hybrid 75+25 Index.csv',
    name: 'CRISIL Short Term Debt Hybrid 75+25 Index'
  },
  'BSE 500 Total Return Index': {
    file: 'Benchmark (solution oriented) - BSE 500 Total Return Index.csv',
    name: 'BSE 500 Total Return Index'
  },
  'S&P BSE 500 TRI': {
    file: 'Benchmark (solution oriented) - S&P BSE 500 TRI.csv',
    name: 'S&P BSE 500 TRI'
  },
  'NIFTY Composite Debt Index': {
    file: 'Benchmark (solution oriented) - NIFTY Composite Debt Index.csv',
    name: 'NIFTY Composite Debt Index'
  },
  'default': {
    file: 'Benchmark (solution oriented) - CRISIL Hybrid 35+65 Aggressive Index.csv',
    name: 'CRISIL Hybrid 35+65 Aggressive Index'
  }
};

const FUND_TO_BENCHMARK: { [fundNamePattern: string]: string } = {
  'Aditya Birla Sun Life Bal Bhavishya Yojna': 'NIFTY 500 TRI',
  'Axis Children\'s Fund': 'NIFTY 50 Hybrid Composite Debt 65:35 Index',
  'Baroda BNP Paribas Children\'s Fund': 'NIFTY 500 TRI',
  'HDFC Children\'s Fund': 'NIFTY 50 Hybrid Composite Debt 65:35 Index',
  'ICICI Prudential Children\'s Fund': 'NIFTY 50 Hybrid Composite Debt 65:35 Index',
  'LIC MF Children\'s Fund': 'CRISIL Hybrid 35+65 Aggressive Index',
  'SBI Magnum Children\'s Benefit Fund - Investment Plan': 'CRISIL Hybrid 35+65 Aggressive Index',
  'SBI Magnum Children\'s Benefit Fund - Savings Plan': 'NIFTY 50 Hybrid Composite Debt 15:85 Conservative Index',
  'Tata Children\'s Fund': 'CRISIL Hybrid 25+75 Aggressive Index',
  'Union Children\'s Fund': 'BSE 500 Total Return Index',
  'UTI Children\'s Equity Fund': 'NIFTY 500 TRI',
  'UTI Children\'s Hybrid Fund': 'CRISIL Short Term Debt Hybrid 60+40 Fund Index',
  'Aditya Birla Sun Life Retirement Fund - The 30s Plan': 'NIFTY 500 TRI',
  'Aditya Birla Sun Life Retirement Fund - The 40s Plan': 'CRISIL Hybrid 35+65 Aggressive Index',
  'Aditya Birla Sun Life Retirement Fund - The 50s Plan': 'CRISIL Short Term Debt Hybrid 75+25 Index',
  'Aditya Birla Sun Life Retirement Fund - The 50s Plus': 'CRISIL Short Term Bond Fund Index',
  'Axis Retirement Fund - Aggressive Plan': 'CRISIL Hybrid 25+75 Aggressive Index',
  'Axis Retirement Fund - Conservative Plan': 'CRISIL Hybrid 75+25 Conservative Index',
  'Axis Retirement Fund - Dynamic Plan': 'CRISIL Hybrid 35+65 Aggressive Index',
  'Bandhan Retirement Fund': 'CRISIL Hybrid 50+50 Moderate Index',
  'Baroda BNP Paribas Retirement Fund': 'CRISIL Hybrid 35+65 Aggressive Index',
  'Franklin India Retirement Fund': 'CRISIL Short Term Debt Hybrid 60+40 Index',
  'HDFC Retirement Savings Fund - Equity Plan': 'NIFTY 500 TRI',
  'HDFC Retirement Savings Fund - Hybrid-Debt Plan': 'NIFTY 50 Hybrid Composite Debt 15:85 Index',
  'HDFC Retirement Savings Fund - Hybrid-Equity Plan': 'NIFTY 50 Hybrid Composite Debt 65:35 Index',
  'ICICI Prudential Retirement Fund - Hybrid Aggressive': 'CRISIL Hybrid 35+65 Aggressive Index',
  'ICICI Prudential Retirement Fund - Hybrid Conservative': 'NIFTY 50 Hybrid Composite Debt 15:85 Index',
  'ICICI Prudential Retirement Fund - Pure Debt': 'NIFTY Composite Debt Index',
  'ICICI Prudential Retirement Fund - Pure Equity': 'NIFTY 500 TRI',
  'Nippon India Retirement Fund - Income Generation Scheme': 'CRISIL Hybrid 85+15 Conservative Index',
  'Nippon India Retirement Fund - Wealth Creation Scheme': 'S&P BSE 500 TRI',
  'PGIM India Retirement Fund': 'S&P BSE 500 TRI',
  'SBI Retirement Benefit Fund - Aggressive Hybrid Plan': 'CRISIL Hybrid 35+65 Aggressive Index',
  'SBI Retirement Benefit Fund - Aggressive Plan': 'S&P BSE 500 TRI',
  'SBI Retirement Benefit Fund - Conservative Hybrid Plan': 'CRISIL Hybrid 65+35 Conservative Index',
  'SBI Retirement Benefit Fund - Conservative Plan': 'CRISIL Hybrid 85+15 Conservative Index',
  'Tata Retirement Savings Fund - Conservative Plan': 'CRISIL Short Term Debt Hybrid 75+25 Index',
  'Tata Retirement Savings Fund - Moderate Plan': 'CRISIL Hybrid 35+65 Aggressive Index',
  'Tata Retirement Savings Fund - Progressive Plan': 'NIFTY 500 TRI',
  'Union Retirement Fund': 'S&P BSE 500 TRI',
  'UTI Retirement Fund': 'CRISIL Short Term Debt Hybrid 60+40 Fund Index',
};

export function getSolutionOrientedBenchmarkForFund(schemeName: string): { file: string; name: string } {
  const lowerName = schemeName.toLowerCase();
  
  for (const [pattern, benchmarkKey] of Object.entries(FUND_TO_BENCHMARK)) {
    if (lowerName.includes(pattern.toLowerCase())) {
      const benchmark = SOLUTION_ORIENTED_BENCHMARK_MAPPING[benchmarkKey];
      if (benchmark) {
        return benchmark;
      }
    }
  }
  
  if (lowerName.includes('children') && lowerName.includes('equity')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['NIFTY 500 TRI'];
  }
  if (lowerName.includes('children') && lowerName.includes('hybrid')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['CRISIL Short Term Debt Hybrid 60+40 Fund Index'];
  }
  if (lowerName.includes('children')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['NIFTY 50 Hybrid Composite Debt 65:35 Index'];
  }
  
  if (lowerName.includes('retirement') && (lowerName.includes('pure equity') || lowerName.includes('equity plan'))) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['NIFTY 500 TRI'];
  }
  if (lowerName.includes('retirement') && lowerName.includes('pure debt')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['NIFTY Composite Debt Index'];
  }
  if (lowerName.includes('retirement') && lowerName.includes('aggressive')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['CRISIL Hybrid 35+65 Aggressive Index'];
  }
  if (lowerName.includes('retirement') && lowerName.includes('conservative')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['CRISIL Hybrid 75+25 Conservative Index'];
  }
  if (lowerName.includes('retirement') && lowerName.includes('moderate')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['CRISIL Hybrid 50+50 Moderate Index'];
  }
  if (lowerName.includes('retirement') && lowerName.includes('progressive')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['NIFTY 500 TRI'];
  }
  if (lowerName.includes('retirement')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['CRISIL Hybrid 35+65 Aggressive Index'];
  }
  
  if (lowerName.includes('30s')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['NIFTY 500 TRI'];
  }
  if (lowerName.includes('40s')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['CRISIL Hybrid 35+65 Aggressive Index'];
  }
  if (lowerName.includes('50s plus') || lowerName.includes('50s+')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['CRISIL Short Term Bond Fund Index'];
  }
  if (lowerName.includes('50s')) {
    return SOLUTION_ORIENTED_BENCHMARK_MAPPING['CRISIL Short Term Debt Hybrid 75+25 Index'];
  }
  
  return SOLUTION_ORIENTED_BENCHMARK_MAPPING['default'];
}

export function getSolutionOrientedBenchmarkName(benchmarkFile: string): string {
  for (const [, value] of Object.entries(SOLUTION_ORIENTED_BENCHMARK_MAPPING)) {
    if (value.file === benchmarkFile) {
      return value.name;
    }
  }
  return 'Solution Oriented Benchmark';
}
