'use server';

/**
 * @fileOverview Calculates weighted CAGR returns for a model portfolio vs weighted benchmark returns.
 * - getModelPortfolioData - Fetches fund CAGRs and calculates weighted averages for 3/5/10 year periods.
 * - Each fund's benchmark is determined by its fundCategory
 * - Calculates Total Weighted Benchmark by applying fund weights to their respective benchmark returns
 * - ModelPortfolioInput - The input type for the flow.
 * - ModelPortfolioOutput - The return type with 3 data points (3-year, 5-year, 10-year).
 */

import { z } from 'zod';
import { getFundReturns } from './fund-returns-flow';
import type { ModelPortfolioInput, ModelPortfolioOutput, ChartDataPoint } from '@/lib/types';

// Benchmark returns for 3, 5, and 10 year periods by category
// These are approximate historical returns for the benchmarks
const BENCHMARK_RETURNS_BY_CATEGORY: { 
  [key: string]: { '3Year': number; '5Year': number; '10Year': number } 
} = {
  'Equity': {
    '3Year': 19.5,    // NIFTY 50
    '5Year': 14.8,
    '10Year': 12.2
  },
  'Debt': {
    '3Year': 6.2,     // NIFTY 10Y G-Sec
    '5Year': 5.8,
    '10Year': 7.1
  },
  'Hybrid': {
    '3Year': 11.2,    // NIFTY 50 Hybrid Composite Debt 50-50
    '5Year': 9.8,
    '10Year': 9.5
  },
  'Solution-Oriented': {
    '3Year': 12.5,
    '5Year': 10.2,
    '10Year': 9.8
  },
  'Others': {
    '3Year': 10.0,
    '5Year': 8.5,
    '10Year': 7.8
  }
};

export async function getModelPortfolioData(input: ModelPortfolioInput): Promise<ModelPortfolioOutput> {
  const { funds } = input;
  
  if (!funds || funds.length === 0) {
    return { chartData: [] };
  }

  try {
    // Fetch CAGR data for all funds
    const fundReturnsPromises = funds.map(fund => 
      getFundReturns({ schemeCode: fund.schemeCode })
    );
    const allFundReturns = await Promise.all(fundReturnsPromises);

    // Parse returns and calculate weighted average for each period
    const calculateWeightedReturn = (period: 'threeYearReturn' | 'fiveYearReturn' | 'tenYearReturn'): number | null => {
      let totalWeightedReturn = 0;
      let totalWeight = 0;
      let hasValidData = false;

      for (let i = 0; i < funds.length; i++) {
        const fund = funds[i];
        const fundReturn = allFundReturns[i];
        const returnValue = fundReturn[period];

        if (returnValue && returnValue !== 'null') {
          const numericReturn = parseFloat(returnValue.replace('%', ''));
          if (!isNaN(numericReturn)) {
            totalWeightedReturn += (numericReturn * fund.weight) / 100;
            totalWeight += fund.weight;
            hasValidData = true;
          }
        }
      }

      return hasValidData && totalWeight > 0 ? totalWeightedReturn / (totalWeight / 100) : null;
    };

    // Calculate weighted benchmark return based on each fund's category benchmark
    const calculateWeightedBenchmark = (period: '3Year' | '5Year' | '10Year'): number => {
      let totalWeightedBenchmark = 0;
      let totalWeight = 0;

      for (const fund of funds) {
        const categoryBenchmark = BENCHMARK_RETURNS_BY_CATEGORY[fund.fundCategory] || BENCHMARK_RETURNS_BY_CATEGORY['Equity'];
        const benchmarkReturn = categoryBenchmark[period];
        
        // Calculate weighted contribution: (Fund Weight % × Fund's Category Benchmark)
        totalWeightedBenchmark += (benchmarkReturn * fund.weight) / 100;
        totalWeight += fund.weight;
      }

      // Average by total weight
      return totalWeight > 0 ? totalWeightedBenchmark / (totalWeight / 100) : 0;
    };

    // Calculate weighted returns and benchmarks for each period
    const threeYearModelReturn = calculateWeightedReturn('threeYearReturn');
    const fiveYearModelReturn = calculateWeightedReturn('fiveYearReturn');
    const tenYearModelReturn = calculateWeightedReturn('tenYearReturn');

    const threeYearBenchmark = calculateWeightedBenchmark('3Year');
    const fiveYearBenchmark = calculateWeightedBenchmark('5Year');
    const tenYearBenchmark = calculateWeightedBenchmark('10Year');

    // Build chart data with 3 data points
    const chartData: ChartDataPoint[] = [];

    if (threeYearModelReturn !== null) {
      chartData.push({
        date: '3-Year',
        modelPortfolio: parseFloat(threeYearModelReturn.toFixed(2)),
        benchmark: parseFloat(threeYearBenchmark.toFixed(2))
      });
    }

    if (fiveYearModelReturn !== null) {
      chartData.push({
        date: '5-Year',
        modelPortfolio: parseFloat(fiveYearModelReturn.toFixed(2)),
        benchmark: parseFloat(fiveYearBenchmark.toFixed(2))
      });
    }

    if (tenYearModelReturn !== null) {
      chartData.push({
        date: '10-Year',
        modelPortfolio: parseFloat(tenYearModelReturn.toFixed(2)),
        benchmark: parseFloat(tenYearBenchmark.toFixed(2))
      });
    }

    return { chartData };

  } catch (error) {
    console.error("Error calculating weighted portfolio CAGR:", error);
    return { chartData: [] };
  }
}
