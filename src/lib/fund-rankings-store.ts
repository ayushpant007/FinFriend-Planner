import { FundMetrics } from './fund-scoring-engine';
import { getData, setData, keyExists } from './replit-db';

const FUND_RANKINGS_KEY = 'fund_rankings_data';
const LAST_UPDATE_KEY = 'fund_rankings_last_update';

export interface FundRankingsData {
  metrics: FundMetrics[];
  lastUpdated: string;
  totalFunds: number;
}

export async function saveFundRankings(metrics: FundMetrics[]): Promise<boolean> {
  try {
    const data: FundRankingsData = {
      metrics,
      lastUpdated: new Date().toISOString(),
      totalFunds: metrics.length
    };
    
    const result = await setData(FUND_RANKINGS_KEY, data);
    if (result.ok) {
      await setData(LAST_UPDATE_KEY, new Date().toISOString());
    }
    return result.ok;
  } catch (error) {
    console.error('[Fund Rankings] Failed to save:', error);
    return false;
  }
}

export async function getFundRankings(): Promise<FundRankingsData | null> {
  try {
    const data = await getData<FundRankingsData>(FUND_RANKINGS_KEY);
    return data;
  } catch (error) {
    console.error('[Fund Rankings] Failed to get:', error);
    return null;
  }
}

export async function getLastUpdateTime(): Promise<string | null> {
  try {
    const lastUpdate = await getData<string>(LAST_UPDATE_KEY);
    return lastUpdate;
  } catch (error) {
    return null;
  }
}

export async function hasRankingsData(): Promise<boolean> {
  return keyExists(FUND_RANKINGS_KEY);
}

export async function shouldUpdateRankings(): Promise<boolean> {
  try {
    const lastUpdate = await getLastUpdateTime();
    if (!lastUpdate) return true;
    
    const lastUpdateDate = new Date(lastUpdate);
    const now = new Date();
    
    const hoursDiff = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 24;
  } catch {
    return true;
  }
}

export function getTopFundsByType(
  rankings: FundRankingsData | null,
  category: string,
  type?: string,
  limit: number = 10
): FundMetrics[] {
  if (!rankings || !rankings.metrics || !Array.isArray(rankings.metrics)) {
    return [];
  }
  
  let filtered = rankings.metrics.filter(m => 
    m.category.toLowerCase().includes(category.toLowerCase())
  );
  
  if (type) {
    filtered = filtered.filter(m => 
      m.type.toLowerCase().includes(type.toLowerCase())
    );
  }
  
  return filtered
    .sort((a, b) => b.finFriendScore - a.finFriendScore)
    .slice(0, limit);
}

export function getFundBySchemeCode(
  rankings: FundRankingsData | null,
  schemeCode: string
): FundMetrics | undefined {
  if (!rankings || !rankings.metrics || !Array.isArray(rankings.metrics)) {
    return undefined;
  }
  return rankings.metrics.find(m => m.schemeCode === schemeCode);
}

export function getAvailableCategories(rankings: FundRankingsData | null): string[] {
  if (!rankings || !rankings.metrics || !Array.isArray(rankings.metrics)) {
    return [];
  }
  const categories = new Set(rankings.metrics.map(m => m.category));
  return Array.from(categories).sort();
}

export function getAvailableTypes(rankings: FundRankingsData | null, category?: string): string[] {
  if (!rankings || !rankings.metrics || !Array.isArray(rankings.metrics)) {
    return [];
  }
  let filtered = rankings.metrics;
  if (category) {
    filtered = filtered.filter(m => 
      m.category.toLowerCase() === category.toLowerCase()
    );
  }
  const types = new Set(filtered.map(m => m.type));
  return Array.from(types).sort();
}
