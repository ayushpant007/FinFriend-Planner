'use server';
/**
 * @fileOverview A flow to calculate mutual fund returns (CAGR) for 3, 5, and 10 years.
 * - getFundReturns - Calculates annualized returns for a given scheme code.
 */

import { z } from 'zod';
import { subYears, format, parse } from 'date-fns';
import type { FundReturnsInput, FundReturnsOutput } from '@/lib/types';

const FundReturnsInputSchema = z.object({
  schemeCode: z.number(),
});

const FundReturnsOutputSchema = z.object({
  threeYearReturn: z.string().nullable(),
  fiveYearReturn: z.string().nullable(),
  tenYearReturn: z.string().nullable(),
  currentNav: z.string().nullable(),
});

function calculateCagr(startValue: number, endValue: number, years: number): string | null {
  if (startValue <= 0 || endValue <= 0 || years <= 0) {
    return null;
  }
  const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  return `${cagr.toFixed(2)}%`;
}

function findClosestNav(data: { date: string; nav: string }[], targetDate: Date): { date: string; nav: string } | null {
  if (!data || data.length === 0) return null;

  let closest = null;
  let minDiff = Infinity;

  for (const point of data) {
    const pointDate = parse(point.date, 'dd-MM-yyyy', new Date());
    const diff = Math.abs(pointDate.getTime() - targetDate.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }
  return closest;
}

function hasSufficientHistoricalData(navDate: { date: string; nav: string } | null, targetDate: Date): boolean {
  if (!navDate) return false;
  
  const pointDate = parse(navDate.date, 'dd-MM-yyyy', new Date());
  const diffInDays = Math.abs(pointDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Allow up to 90 days deviation to account for weekends, holidays, fund launch delays
  return diffInDays <= 90;
}

export async function getFundReturns(input: FundReturnsInput): Promise<FundReturnsOutput> {
  const { schemeCode } = input;
  const today = new Date();
  const tenYearsAgo = subYears(today, 10);
  const fiveYearsAgo = subYears(today, 5);
  const threeYearsAgo = subYears(today, 3);
  
  const startDate = format(tenYearsAgo, 'dd-MM-yyyy');
  const endDate = format(today, 'dd-MM-yyyy');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    // MFAPI does not support date filtering natively; fetching the full cached dataset is faster
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      signal: controller.signal,
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[CAGR API Error] Failed to fetch NAV for scheme ${schemeCode}: ${response.statusText}`);
      return { threeYearReturn: null, fiveYearReturn: null, tenYearReturn: null, currentNav: null };
    }
    const result = await response.json();
    const navData: { date: string; nav: string }[] = result.data;

    if (!navData || navData.length < 2) {
      console.warn(`[CAGR Warning] Scheme ${schemeCode} has no historical data on MFAPI. Please verify scheme code.`);
      return { threeYearReturn: null, fiveYearReturn: null, tenYearReturn: null, currentNav: null };
    }
    
    const latestNavData = navData[0];
    const endValue = parseFloat(latestNavData.nav);

    const tenYearData = findClosestNav(navData, tenYearsAgo);
    const fiveYearData = findClosestNav(navData, fiveYearsAgo);
    const threeYearData = findClosestNav(navData, threeYearsAgo);

    // Validate that data exists within acceptable range (within 90 days of target date)
    const hasValidThreeYearData = hasSufficientHistoricalData(threeYearData, threeYearsAgo);
    const hasValidFiveYearData = hasSufficientHistoricalData(fiveYearData, fiveYearsAgo);
    const hasValidTenYearData = hasSufficientHistoricalData(tenYearData, tenYearsAgo);

    // Cascading logic: if shorter period is invalid, longer periods should also be invalid
    // If fund doesn't have 3-year data, it can't have 5 or 10-year data
    const validThreeYear = hasValidThreeYearData;
    // If fund doesn't have 5-year data, it can't have 10-year data
    const validFiveYear = hasValidFiveYearData && validThreeYear;
    // 10-year requires both 5 and 3-year data to be valid
    const validTenYear = hasValidTenYearData && validFiveYear;

    const threeYearStartValue = validThreeYear ? parseFloat(threeYearData!.nav) : null;
    const fiveYearStartValue = validFiveYear ? parseFloat(fiveYearData!.nav) : null;
    const tenYearStartValue = validTenYear ? parseFloat(tenYearData!.nav) : null;

    return {
      tenYearReturn: tenYearStartValue ? calculateCagr(tenYearStartValue, endValue, 10) : null,
      fiveYearReturn: fiveYearStartValue ? calculateCagr(fiveYearStartValue, endValue, 5) : null,
      threeYearReturn: threeYearStartValue ? calculateCagr(threeYearStartValue, endValue, 3) : null,
      currentNav: `₹${endValue.toFixed(2)}`,
    };

  } catch (error) {
    console.error(`Error calculating returns for scheme ${schemeCode}:`, error);
    return { threeYearReturn: null, fiveYearReturn: null, tenYearReturn: null, currentNav: null };
  }
}
