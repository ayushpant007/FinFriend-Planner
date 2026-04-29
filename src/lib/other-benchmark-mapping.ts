export const OTHER_BENCHMARK_MAPPING: { [key: string]: string } = {
  'Domestic Price of Gold': 'Benchmark (other ) - Domestic Price of Gold.csv',
  'Domestic Price of Silver': 'Benchmark (other ) - Domestic Price of Silver.csv',
  'MSCI World Index': 'Benchmark (other ) - MSCI World Index.csv',
  'MSCI Golden Dragon': 'MSCI_Golden_Dragon.csv',
  'Nifty 50 Arbitrage Index': 'Benchmark (other ) - Nifty 50 Arbitrage Index.csv',
  'Nifty 500 TRI': 'Benchmark (other ) - Nifty 500 TRI.csv',
  'S&P 500': 'Benchmark (other ) - S&P 500.csv',
  'default': 'Benchmark (other ) - Nifty 500 TRI.csv',
};

export function getOtherBenchmarkFileForFund(schemeName: string): string {
  const lowerName = (schemeName || '').toLowerCase().trim();
  
  console.log(`[getOtherBenchmarkFileForFund] Analyzing: "${lowerName}"`);

  if (lowerName.includes('axis greater china equity fund of fund')) {
    return OTHER_BENCHMARK_MAPPING['MSCI Golden Dragon'];
  }
  
  if (lowerName.includes('axis global equity alpha fund of fund')) {
    return OTHER_BENCHMARK_MAPPING['MSCI World Index'];
  }

  if (lowerName.includes('greater china')) {
    return OTHER_BENCHMARK_MAPPING['MSCI Golden Dragon'];
  }

  if (lowerName.includes('business cycle') || 
      lowerName.includes('commodities') ||
      lowerName.includes('icici prudential business cycle fund') || 
      lowerName.includes('icici prudential commodities fund') ||
      lowerName.includes('axis business cycle fund')) {
    console.log(`[getOtherBenchmarkFileForFund] Matched Business Cycle/Commodities -> Nifty 50 TRI`);
    return OTHER_BENCHMARK_MAPPING['Nifty 50 TRI'];
  }

  if (lowerName.includes('gold') && !lowerName.includes('silver')) {
    return OTHER_BENCHMARK_MAPPING['Domestic Price of Gold'];
  }
  
  if (lowerName.includes('silver') && !lowerName.includes('gold')) {
    return OTHER_BENCHMARK_MAPPING['Domestic Price of Silver'];
  }
  
  if (lowerName.includes('gold') && lowerName.includes('silver')) {
    return OTHER_BENCHMARK_MAPPING['Domestic Price of Gold'];
  }
  
  if (lowerName.includes('arbitrage')) {
    return OTHER_BENCHMARK_MAPPING['Nifty 50 Arbitrage Index'];
  }
  
  if (lowerName.includes('fof domestic') || lowerName.includes('fund of fund')) {
    if (lowerName.includes('gold')) {
      return OTHER_BENCHMARK_MAPPING['Domestic Price of Gold'];
    }
    if (lowerName.includes('silver')) {
      return OTHER_BENCHMARK_MAPPING['Domestic Price of Silver'];
    }
    return OTHER_BENCHMARK_MAPPING['Nifty 50 Arbitrage Index'];
  }
  
  if (lowerName.includes('fof overseas') || 
      lowerName.includes('overseas') || 
      lowerName.includes('global') ||
      lowerName.includes('international') ||
      lowerName.includes('world') ||
      lowerName.includes('emerging market') ||
      lowerName.includes('europe') ||
      lowerName.includes('asia') ||
      lowerName.includes('china') ||
      lowerName.includes('brazil')) {
    if (lowerName.includes('us ') || 
        lowerName.includes('u.s.') || 
        lowerName.includes('nasdaq') || 
        lowerName.includes('s&p 500') ||
        lowerName.includes('treasury')) {
      return OTHER_BENCHMARK_MAPPING['S&P 500'];
    }
    return OTHER_BENCHMARK_MAPPING['MSCI World Index'];
  }
  
  if (lowerName.includes('us ') || 
      lowerName.includes('u.s.') || 
      lowerName.includes('nasdaq') || 
      lowerName.includes('s&p 500') ||
      lowerName.includes('s&p500')) {
    return OTHER_BENCHMARK_MAPPING['S&P 500'];
  }
  
  if (lowerName.includes('msci') || lowerName.includes('world')) {
    return OTHER_BENCHMARK_MAPPING['MSCI World Index'];
  }
  
  if (lowerName.includes('index fund') || 
      lowerName.includes('index funds') ||
      lowerName.includes('nifty') ||
      lowerName.includes('sensex') ||
      lowerName.includes('bse') ||
      lowerName.includes('midcap') ||
      lowerName.includes('smallcap') ||
      lowerName.includes('largecap') ||
      lowerName.includes('momentum') ||
      lowerName.includes('volatility') ||
      lowerName.includes('alpha') ||
      lowerName.includes('quality') ||
      lowerName.includes('value') ||
      lowerName.includes('equal weight') ||
      lowerName.includes('bank') ||
      lowerName.includes('it ') ||
      lowerName.includes('pharma') ||
      lowerName.includes('realty') ||
      lowerName.includes('manufacturing') ||
      lowerName.includes('defence') ||
      lowerName.includes('digital') ||
      lowerName.includes('consumption') ||
      lowerName.includes('housing') ||
      lowerName.includes('commodities') ||
      lowerName.includes('financial')) {
    return OTHER_BENCHMARK_MAPPING['Nifty 500 TRI'];
  }
  
  if (lowerName.includes('etf') || lowerName.includes('exchange traded')) {
    if (lowerName.includes('gold')) {
      return OTHER_BENCHMARK_MAPPING['Domestic Price of Gold'];
    }
    if (lowerName.includes('silver')) {
      return OTHER_BENCHMARK_MAPPING['Domestic Price of Silver'];
    }
    return OTHER_BENCHMARK_MAPPING['Nifty 500 TRI'];
  }
  
  if (lowerName.includes('bharat bond')) {
    return OTHER_BENCHMARK_MAPPING['Nifty 50 Arbitrage Index'];
  }
  
  if (lowerName.includes('aggressive hybrid') ||
      lowerName.includes('conservative hybrid') ||
      lowerName.includes('dynamic asset') ||
      lowerName.includes('multi asset') ||
      lowerName.includes('passive fof') ||
      lowerName.includes('omni fof')) {
    return OTHER_BENCHMARK_MAPPING['Nifty 50 Arbitrage Index'];
  }
  
  return OTHER_BENCHMARK_MAPPING['default'];
}

export function getOtherBenchmarkDisplayName(benchmarkFile: string): string {
  if (benchmarkFile.includes('MSCI_Golden_Dragon')) return 'MSCI Golden Dragon';
  if (benchmarkFile.includes('Gold')) return 'Domestic Gold Price';
  if (benchmarkFile.includes('Silver')) return 'Domestic Silver Price';
  if (benchmarkFile.includes('MSCI')) return 'MSCI World Index';
  if (benchmarkFile.includes('Arbitrage')) return 'Nifty 50 Arbitrage';
  if (benchmarkFile.includes('S&P')) return 'S&P 500';
  if (benchmarkFile.includes('Nifty 500')) return 'Nifty 500 TRI';
  return 'Benchmark';
}
