/**
 * Load and parse mutual funds data from CSV
 * CSV structure: Category, Type, Mutual Fund, Scheme Name, Scheme Code
 */

export interface MutualFundScheme {
  category: string;
  type: string;
  fundName: string;
  schemeName: string;
  schemeCode: string;
  primaryBenchmark: string;
}

let fundsCache: MutualFundScheme[] | null = null;

export async function loadMutualFundsFromCSV(): Promise<MutualFundScheme[]> {
  if (fundsCache) {
    return fundsCache;
  }

  try {
    const response = await fetch('/api/funds-curated');
    if (!response.ok) {
      throw new Error(`Failed to load funds from API: ${response.statusText}`);
    }
    
    const funds: MutualFundScheme[] = await response.json();
    fundsCache = funds;
    console.log(`[Load Funds] Loaded ${funds.length} curated fund schemes`);
    return funds;
  } catch (error) {
    console.error('Error loading mutual funds:', error);
    return [];
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

export async function getFundNames(): Promise<string[]> {
  const funds = await loadMutualFundsFromCSV();
  const names = new Set(funds.map(f => f.fundName));
  return Array.from(names).sort();
}

export async function getCategories(): Promise<string[]> {
  const funds = await loadMutualFundsFromCSV();
  const categories = new Set(funds.map(f => f.category));
  return Array.from(categories).sort();
}

export async function getTypesByCategory(category: string): Promise<string[]> {
  const funds = await loadMutualFundsFromCSV();
  const filtered = funds.filter(f => f.category === category);
  const types = new Set(filtered.map(f => f.type));
  return Array.from(types).sort();
}

export async function getFundsByCategory(category: string): Promise<string[]> {
  const funds = await loadMutualFundsFromCSV();
  const filtered = funds.filter(f => f.category === category);
  const fundNames = new Set(filtered.map(f => f.fundName));
  return Array.from(fundNames).sort();
}

export async function getFundsByCategoryAndType(category: string, type: string): Promise<string[]> {
  const funds = await loadMutualFundsFromCSV();
  const filtered = funds.filter(f => f.category === category && f.type === type);
  const fundNames = new Set(filtered.map(f => f.fundName));
  return Array.from(fundNames).sort();
}

export async function getSchemesByFund(fundName: string, category?: string, type?: string): Promise<MutualFundScheme[]> {
  const funds = await loadMutualFundsFromCSV();
  return funds.filter(f => {
    let match = f.fundName === fundName;
    if (category) {
      match = match && f.category === category;
    }
    if (type) {
      match = match && f.type === type;
    }
    return match;
  });
}

export async function getSchemeByCode(schemeCode: string): Promise<MutualFundScheme | null> {
  const funds = await loadMutualFundsFromCSV();
  return funds.find(f => f.schemeCode === schemeCode) || null;
}

export interface NAVData {
  schemeCode: string;
  schemeName: string;
  nav: string;
  date: string;
}

export async function fetchNAV(schemeCode: string, schemeName?: string): Promise<NAVData | null> {
  try {
    const params = new URLSearchParams({ schemeCode });
    if (schemeName) params.set('schemeName', schemeName);
    const response = await fetch(`/api/nav?${params.toString()}`);
    if (!response.ok) {
      console.warn(`NAV proxy error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (data && data.data && data.data.length > 0) {
      return {
        schemeCode: data.meta?.scheme_code?.toString() || schemeCode,
        schemeName: data.meta?.scheme_name || '',
        nav: data.data[0].nav,
        date: data.data[0].date,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching NAV:', error);
    return null;
  }
}

export async function searchSchemeCode(schemeName: string): Promise<number | null> {
  try {
    const searchTerm = encodeURIComponent(schemeName);
    const response = await fetch(`https://api.mfapi.in/mf/search?q=${searchTerm}`);
    if (!response.ok) return null;
    
    const results = await response.json();
    if (results && results.length > 0) {
      const exactMatch = results.find((r: { schemeName: string }) => 
        r.schemeName.toLowerCase().includes(schemeName.toLowerCase().split(' ')[0])
      );
      if (exactMatch) {
        return parseInt(exactMatch.schemeCode, 10);
      }
      return parseInt(results[0].schemeCode, 10);
    }
    return null;
  } catch (error) {
    console.error('Error searching scheme code:', error);
    return null;
  }
}
