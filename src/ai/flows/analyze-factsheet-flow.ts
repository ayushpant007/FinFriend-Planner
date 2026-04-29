'use server';

import { z } from 'zod';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { getCurrentApiKey, rotateToNextKey, getKeyCount, getCurrentKeyIndex } from '@/ai/gemini-key-manager';

const FactsheetDataSchema = z.object({
  fundName: z.string().describe('The name of the mutual fund.'),
  netAssets: z.string().describe('The total net assets of the fund (e.g., "₹10,234.56 Cr").'),
  industryAllocation: z
    .array(
      z.object({
        sector: z.string().describe('The name of the industry sector.'),
        weight: z.number().describe('The percentage weight of the sector in the portfolio.'),
      })
    )
    .describe('The breakdown of equity holdings by industry sector.'),
  portfolioHoldings: z
    .array(
      z.object({
        stock: z.string().describe('The name of the stock holding.'),
        weight: z.number().describe('The percentage weight of the stock in the portfolio.'),
      })
    )
    .describe('The top portfolio holdings.'),
  sharpeRatio: z.string().optional().describe('The Sharpe Ratio of the fund (e.g., "1.45").'),
  beta: z.string().optional().describe('The Beta of the fund relative to benchmark (e.g., "0.95").'),
  standardDeviation: z.string().nullable().optional().describe('The Standard Deviation / Volatility of the fund (e.g., "12.5%").'),
  downwardDeviation: z.string().nullable().optional().describe('The Downward Deviation / Semi-Deviation of the fund (e.g., "8.5%").'),
  expenseRatio: z.string().nullable().optional().describe('The Expense Ratio / Annual Charges (e.g., "0.45%").'),
  aum: z.string().nullable().optional().describe('The Assets Under Management value (e.g., "₹5,432.10 Cr").'),
  portfolioTurnover: z.string().nullable().optional().describe('The Portfolio Turnover ratio (e.g., "45%").'),
  cagr3Year: z.string().nullable().optional().describe('The 3-Year CAGR / Return of the fund (e.g., "15.5%").'),
});

export type FactsheetData = z.infer<typeof FactsheetDataSchema>;

function createAiInstance(apiKey: string) {
  return genkit({
    plugins: [googleAI({ apiKey })],
    model: 'googleai/gemini-2.5-flash-lite',
  });
}

const promptTemplate = `You are a financial data extraction expert. Analyze the provided mutual fund factsheet PDF. Extract the following information accurately:
1.  **Fund Name**: The full name of the fund.
2.  **Net Assets**: The total net asset value, formatted as a string (e.g., "₹5,432.10 Cr").
3.  **Industry Allocation of Equity Holdings**: Extract the TOP 5 industry sectors and their corresponding percentage weight (sorted by weight, highest first).
4.  **Portfolio Holdings**: Extract the TOP 10 stock holdings and their corresponding percentage weight (sorted by weight, highest first).
5.  **Financial Metrics** (extract if available, leave as null/undefined if not found):
    - **Sharpe Ratio**: Risk-adjusted return metric (e.g., "1.45")
    - **Beta**: Volatility measure relative to benchmark (e.g., "0.95")
    - **Standard Deviation**: Volatility/dispersion of returns (e.g., "12.5%"). Only provide the numeric value with percentage if available. DO NOT include explanatory text or comparisons if the actual value is not found. If the factsheet states it is not available or provides an approximation for duration instead, return null.
    - **Downward Deviation**: Downside volatility / semi-deviation of returns (e.g., "8.5%"). Only provide the value.
    - **Expense Ratio**: Annual fund management charges (e.g., "0.45%"). Only provide the value.
    - **AUM**: Assets Under Management value
    - **Portfolio Turnover**: Annual portfolio turnover ratio (e.g., "45%")
    - **3-Year CAGR**: The 3-year compounded annual growth rate / return (e.g., "15.5%")

Return the data in the specified JSON format. Focus on the top holdings only to ensure faster processing. For metrics that are not clearly visible or available in the factsheet, return null instead of guessing values.

Factsheet PDF: {{media url=pdfUrl}}`;

async function analyzeWithKey(pdfUrl: string, apiKey: string): Promise<FactsheetData> {
  const ai = createAiInstance(apiKey);
  
  const analyzeFactsheetPrompt = ai.definePrompt({
    name: 'analyzeFactsheetPrompt',
    input: { schema: z.object({ pdfUrl: z.string() }) },
    output: { schema: FactsheetDataSchema },
    prompt: promptTemplate,
  });

  const { output } = await analyzeFactsheetPrompt({ pdfUrl });
  
  if (!output) {
    throw new Error('Failed to analyze the factsheet. The model did not return any data.');
  }
  
  return output;
}

function isRateLimitError(error: any): boolean {
  if (!error) return false;
  if (error.status === 429) return true;
  if (error.message && (
    error.message.includes('Too Many Requests') ||
    error.message.includes('RESOURCE_EXHAUSTED') ||
    error.message.includes('rate limit') ||
    error.message.includes('quota exceeded')
  )) return true;
  return false;
}

async function analyzeWithRotation(fullUrl: string): Promise<FactsheetData> {
  const totalKeys = getKeyCount();

  if (totalKeys === 0) {
    throw new Error('No Gemini API keys configured. Please add a GOOGLE_GENAI_API_KEY environment variable.');
  }

  let lastError: any;
  
  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const currentKey = getCurrentApiKey();
    const keyIndex = getCurrentKeyIndex();
    
    try {
      console.log(`[Factsheet] Attempting with API key ${keyIndex}/${totalKeys}`);
      const result = await analyzeWithKey(fullUrl, currentKey);
      console.log(`[Factsheet] Success with API key ${keyIndex}`);
      return result;
    } catch (error: any) {
      lastError = error;
      
      if (isRateLimitError(error)) {
        console.log(`[Factsheet] Rate limit hit on key ${keyIndex}, rotating to next key...`);
        rotateToNextKey();
        
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        continue;
      }
      
      throw error;
    }
  }
  
  if (isRateLimitError(lastError)) {
    throw new Error('All API keys are currently rate limited. Please wait a moment and try again.');
  }
  
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(lastError ? String(lastError) : 'An unknown error occurred while analyzing the factsheet.');
}

export async function analyzeFactsheet(pdfUrl: string): Promise<FactsheetData> {
  console.log('[Factsheet] Received pdfUrl:', pdfUrl);
  
  let fullUrl = pdfUrl;
  if (pdfUrl.startsWith('/')) {
    const replitDomain = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN;
    const baseUrl = replitDomain
      ? `https://${replitDomain}` 
      : 'http://localhost:5000';
    const encodedPath = pdfUrl.split('/').map(part => encodeURIComponent(part)).join('/');
    fullUrl = `${baseUrl}${encodedPath}`;
    console.log('[Factsheet] Constructed fullUrl:', fullUrl);
  } else if (!pdfUrl.startsWith('http')) {
    throw new Error('Invalid PDF URL provided. Must be a public URL or local path starting with /');
  }

  try {
    console.log('[Factsheet] Attempting to analyze PDF from:', fullUrl);
    return await analyzeWithRotation(fullUrl);
  } catch (error: any) {
    console.error("Error in analyzeFactsheet: ", error);
    console.error('[Factsheet] Full URL attempted:', fullUrl);
    
    if (!error) {
      throw new Error('An unexpected error occurred while processing the PDF.');
    }
    
    if (error.message && error.message.includes('over limit')) {
      throw new Error('The PDF file is too large for analysis. Please provide a file under 10MB.');
    }
    
    if (error.message && error.message.includes('All API keys are currently rate limited')) {
      throw error;
    }
    
    if (isRateLimitError(error)) {
      throw new Error('API is currently busy. Please wait a moment and try again.');
    }
    
    const errorMessage = error?.message || 'Unknown error occurred';
    throw new Error(`Failed to process PDF from URL: ${errorMessage}`);
  }
}
