/**
 * Mock fund data for testing and development
 * Extracted from 360 ONE Mutual Fund factsheet
 */

export interface MockFactsheetData {
  fundName: string;
  fundCategory: string;
  schemes: Array<{
    schemeCode: number;
    schemeName: string;
    netAssets: string;
  }>;
  industryAllocation: Array<{
    schemeCode: number;
    sector: string;
    weight: number;
  }>;
  portfolioHoldings: Array<{
    schemeCode: number;
    stock: string;
    weight: number;
  }>;
}

const mockFundsData: Record<string, MockFactsheetData> = {
  '360 ONE Mutual Fund': {
    fundName: '360 ONE Mutual Fund',
    fundCategory: 'Equity',
    schemes: [
      { schemeCode: 1, schemeName: '360 ONE Flexicap Fund - Regular - Growth', netAssets: '₹2,008.90 Cr' },
      { schemeCode: 2, schemeName: '360 ONE Flexicap Fund - Direct - Growth', netAssets: '₹2,008.90 Cr' },
      { schemeCode: 3, schemeName: '360 ONE QUANT FUND - Regular - Growth', netAssets: '₹3,500.00 Cr' },
      { schemeCode: 4, schemeName: '360 ONE QUANT FUND - Direct - Growth', netAssets: '₹3,500.00 Cr' },
      { schemeCode: 5, schemeName: '360 ONE ELSS Tax Saver Nifty 50 Index - Regular - Growth', netAssets: '₹87.59 Cr' },
      { schemeCode: 6, schemeName: '360 ONE ELSS Tax Saver Nifty 50 Index - Direct - Growth', netAssets: '₹87.59 Cr' },
      { schemeCode: 7, schemeName: '360 ONE Balanced Hybrid Fund - Regular - Growth', netAssets: '₹1,700.00 Cr' },
      { schemeCode: 8, schemeName: '360 ONE Balanced Hybrid Fund - Direct - Growth', netAssets: '₹1,700.00 Cr' },
      { schemeCode: 9, schemeName: '360 ONE Multi Asset Allocation Fund - Regular - Growth', netAssets: '₹164.28 Cr' },
      { schemeCode: 10, schemeName: '360 ONE Multi Asset Allocation Fund - Direct - Growth', netAssets: '₹164.28 Cr' },
    ],
    industryAllocation: [
      // Scheme 1: 360 ONE Flexicap Fund - Regular - Growth
      { schemeCode: 1, sector: 'IT', weight: 28.5 },
      { schemeCode: 1, sector: 'Finance', weight: 22.3 },
      { schemeCode: 1, sector: 'Pharma', weight: 15.2 },
      { schemeCode: 1, sector: 'Consumer', weight: 12.8 },
      { schemeCode: 1, sector: 'Auto', weight: 10.5 },
      // Scheme 2: 360 ONE Flexicap Fund - Direct - Growth
      { schemeCode: 2, sector: 'IT', weight: 28.5 },
      { schemeCode: 2, sector: 'Finance', weight: 22.3 },
      { schemeCode: 2, sector: 'Pharma', weight: 15.2 },
      { schemeCode: 2, sector: 'Consumer', weight: 12.8 },
      { schemeCode: 2, sector: 'Auto', weight: 10.5 },
      // Scheme 3: 360 ONE QUANT FUND - Regular - Growth
      { schemeCode: 3, sector: 'Financial Services', weight: 28.92 },
      { schemeCode: 3, sector: 'Automobile and Auto Components', weight: 11.25 },
      { schemeCode: 3, sector: 'Information Technology', weight: 11.24 },
      { schemeCode: 3, sector: 'Healthcare', weight: 9.47 },
      { schemeCode: 3, sector: 'Chemicals', weight: 8.41 },
      // Scheme 4: 360 ONE QUANT FUND - Direct - Growth
      { schemeCode: 4, sector: 'Financial Services', weight: 28.92 },
      { schemeCode: 4, sector: 'Automobile and Auto Components', weight: 11.25 },
      { schemeCode: 4, sector: 'Information Technology', weight: 11.24 },
      { schemeCode: 4, sector: 'Healthcare', weight: 9.47 },
      { schemeCode: 4, sector: 'Chemicals', weight: 8.41 },
      // Scheme 5: 360 ONE ELSS Tax Saver Nifty 50 Index - Regular - Growth
      { schemeCode: 5, sector: 'Financial Services', weight: 45.0 },
      { schemeCode: 5, sector: 'IT', weight: 20.5 },
      { schemeCode: 5, sector: 'Oil & Gas', weight: 12.0 },
      { schemeCode: 5, sector: 'Pharma', weight: 10.0 },
      { schemeCode: 5, sector: 'Auto', weight: 8.5 },
      // Scheme 6: 360 ONE ELSS Tax Saver Nifty 50 Index - Direct - Growth
      { schemeCode: 6, sector: 'Financial Services', weight: 45.0 },
      { schemeCode: 6, sector: 'IT', weight: 20.5 },
      { schemeCode: 6, sector: 'Oil & Gas', weight: 12.0 },
      { schemeCode: 6, sector: 'Pharma', weight: 10.0 },
      { schemeCode: 6, sector: 'Auto', weight: 8.5 },
      // Scheme 7: 360 ONE Balanced Hybrid Fund - Regular - Growth
      { schemeCode: 7, sector: 'Financial Services', weight: 11.98 },
      { schemeCode: 7, sector: 'Capital Goods', weight: 6.73 },
      { schemeCode: 7, sector: 'Consumer Services', weight: 3.26 },
      { schemeCode: 7, sector: 'Healthcare', weight: 2.44 },
      { schemeCode: 7, sector: 'Consumer Durables', weight: 2.40 },
      // Scheme 8: 360 ONE Balanced Hybrid Fund - Direct - Growth
      { schemeCode: 8, sector: 'Financial Services', weight: 11.98 },
      { schemeCode: 8, sector: 'Capital Goods', weight: 6.73 },
      { schemeCode: 8, sector: 'Consumer Services', weight: 3.26 },
      { schemeCode: 8, sector: 'Healthcare', weight: 2.44 },
      { schemeCode: 8, sector: 'Consumer Durables', weight: 2.40 },
      // Scheme 9: 360 ONE Multi Asset Allocation Fund - Regular - Growth
      { schemeCode: 9, sector: 'Financial Services', weight: 6.61 },
      { schemeCode: 9, sector: 'Capital Goods', weight: 2.93 },
      { schemeCode: 9, sector: 'Automobile and Auto Components', weight: 2.01 },
      { schemeCode: 9, sector: 'Telecommunication', weight: 1.89 },
      { schemeCode: 9, sector: 'Consumer Services', weight: 1.89 },
      // Scheme 10: 360 ONE Multi Asset Allocation Fund - Direct - Growth
      { schemeCode: 10, sector: 'Financial Services', weight: 6.61 },
      { schemeCode: 10, sector: 'Capital Goods', weight: 2.93 },
      { schemeCode: 10, sector: 'Automobile and Auto Components', weight: 2.01 },
      { schemeCode: 10, sector: 'Telecommunication', weight: 1.89 },
      { schemeCode: 10, sector: 'Consumer Services', weight: 1.89 },
    ],
    portfolioHoldings: [
      // Scheme 1: 360 ONE Flexicap Fund - Regular - Growth
      { schemeCode: 1, stock: 'TCS', weight: 8.5 },
      { schemeCode: 1, stock: 'Infosys', weight: 7.2 },
      { schemeCode: 1, stock: 'HDFC Bank', weight: 6.8 },
      { schemeCode: 1, stock: 'Reliance', weight: 5.9 },
      { schemeCode: 1, stock: 'ICICI Bank', weight: 5.4 },
      { schemeCode: 1, stock: 'Wipro', weight: 4.8 },
      { schemeCode: 1, stock: 'ITC', weight: 4.2 },
      { schemeCode: 1, stock: 'Maruti', weight: 3.9 },
      { schemeCode: 1, stock: 'Bajaj Auto', weight: 3.5 },
      { schemeCode: 1, stock: 'LT', weight: 3.1 },
      // Scheme 2: 360 ONE Flexicap Fund - Direct - Growth
      { schemeCode: 2, stock: 'TCS', weight: 8.5 },
      { schemeCode: 2, stock: 'Infosys', weight: 7.2 },
      { schemeCode: 2, stock: 'HDFC Bank', weight: 6.8 },
      { schemeCode: 2, stock: 'Reliance', weight: 5.9 },
      { schemeCode: 2, stock: 'ICICI Bank', weight: 5.4 },
      { schemeCode: 2, stock: 'Wipro', weight: 4.8 },
      { schemeCode: 2, stock: 'ITC', weight: 4.2 },
      { schemeCode: 2, stock: 'Maruti', weight: 3.9 },
      { schemeCode: 2, stock: 'Bajaj Auto', weight: 3.5 },
      { schemeCode: 2, stock: 'LT', weight: 3.1 },
      // Scheme 3: 360 ONE QUANT FUND - Regular - Growth
      { schemeCode: 3, stock: 'UNO Minda', weight: 4.17 },
      { schemeCode: 3, stock: 'Muthoot Finance', weight: 4.07 },
      { schemeCode: 3, stock: 'Bharat Electronics', weight: 3.69 },
      { schemeCode: 3, stock: 'HDFC Asset Management', weight: 3.63 },
      { schemeCode: 3, stock: 'Eicher Motors', weight: 3.61 },
      { schemeCode: 3, stock: 'Schaeffler India', weight: 3.48 },
      { schemeCode: 3, stock: 'Bajaj Finance', weight: 3.32 },
      { schemeCode: 3, stock: 'Vedanta', weight: 3.19 },
      { schemeCode: 3, stock: 'Coforge', weight: 3.12 },
      { schemeCode: 3, stock: 'Cholamandalam Investment', weight: 3.10 },
      // Scheme 4: 360 ONE QUANT FUND - Direct - Growth
      { schemeCode: 4, stock: 'UNO Minda', weight: 4.17 },
      { schemeCode: 4, stock: 'Muthoot Finance', weight: 4.07 },
      { schemeCode: 4, stock: 'Bharat Electronics', weight: 3.69 },
      { schemeCode: 4, stock: 'HDFC Asset Management', weight: 3.63 },
      { schemeCode: 4, stock: 'Eicher Motors', weight: 3.61 },
      { schemeCode: 4, stock: 'Schaeffler India', weight: 3.48 },
      { schemeCode: 4, stock: 'Bajaj Finance', weight: 3.32 },
      { schemeCode: 4, stock: 'Vedanta', weight: 3.19 },
      { schemeCode: 4, stock: 'Coforge', weight: 3.12 },
      { schemeCode: 4, stock: 'Cholamandalam Investment', weight: 3.10 },
      // Scheme 5: 360 ONE ELSS Tax Saver Nifty 50 Index - Regular - Growth
      { schemeCode: 5, stock: 'HDFC Bank', weight: 9.2 },
      { schemeCode: 5, stock: 'ICICI Bank', weight: 8.1 },
      { schemeCode: 5, stock: 'Reliance', weight: 7.5 },
      { schemeCode: 5, stock: 'TCS', weight: 7.0 },
      { schemeCode: 5, stock: 'Infosys', weight: 6.2 },
      { schemeCode: 5, stock: 'Wipro', weight: 4.8 },
      { schemeCode: 5, stock: 'ITC', weight: 4.2 },
      { schemeCode: 5, stock: 'Maruti', weight: 3.9 },
      { schemeCode: 5, stock: 'Bajaj Auto', weight: 3.5 },
      { schemeCode: 5, stock: 'LT', weight: 3.1 },
      // Scheme 6: 360 ONE ELSS Tax Saver Nifty 50 Index - Direct - Growth
      { schemeCode: 6, stock: 'HDFC Bank', weight: 9.2 },
      { schemeCode: 6, stock: 'ICICI Bank', weight: 8.1 },
      { schemeCode: 6, stock: 'Reliance', weight: 7.5 },
      { schemeCode: 6, stock: 'TCS', weight: 7.0 },
      { schemeCode: 6, stock: 'Infosys', weight: 6.2 },
      { schemeCode: 6, stock: 'Wipro', weight: 4.8 },
      { schemeCode: 6, stock: 'ITC', weight: 4.2 },
      { schemeCode: 6, stock: 'Maruti', weight: 3.9 },
      { schemeCode: 6, stock: 'Bajaj Auto', weight: 3.5 },
      { schemeCode: 6, stock: 'LT', weight: 3.1 },
      // Scheme 7: 360 ONE Balanced Hybrid Fund - Regular - Growth
      { schemeCode: 7, stock: 'HDFC Bank', weight: 2.50 },
      { schemeCode: 7, stock: 'ICICI Bank', weight: 1.88 },
      { schemeCode: 7, stock: 'Eternal', weight: 1.77 },
      { schemeCode: 7, stock: 'Bajaj Finance', weight: 1.77 },
      { schemeCode: 7, stock: 'Larsen & Toubro', weight: 1.62 },
      { schemeCode: 7, stock: 'Cholamandalam Investment', weight: 1.41 },
      { schemeCode: 7, stock: 'GE Vernova T&D India', weight: 1.38 },
      { schemeCode: 7, stock: 'Motherson Sumi Wiring', weight: 1.31 },
      { schemeCode: 7, stock: 'Bharti Airtel', weight: 1.22 },
      { schemeCode: 7, stock: 'Dixon Technologies', weight: 1.21 },
      // Scheme 8: 360 ONE Balanced Hybrid Fund - Direct - Growth
      { schemeCode: 8, stock: 'HDFC Bank', weight: 2.50 },
      { schemeCode: 8, stock: 'ICICI Bank', weight: 1.88 },
      { schemeCode: 8, stock: 'Eternal', weight: 1.77 },
      { schemeCode: 8, stock: 'Bajaj Finance', weight: 1.77 },
      { schemeCode: 8, stock: 'Larsen & Toubro', weight: 1.62 },
      { schemeCode: 8, stock: 'Cholamandalam Investment', weight: 1.41 },
      { schemeCode: 8, stock: 'GE Vernova T&D India', weight: 1.38 },
      { schemeCode: 8, stock: 'Motherson Sumi Wiring', weight: 1.31 },
      { schemeCode: 8, stock: 'Bharti Airtel', weight: 1.22 },
      { schemeCode: 8, stock: 'Dixon Technologies', weight: 1.21 },
      // Scheme 9: 360 ONE Multi Asset Allocation Fund - Regular - Growth
      { schemeCode: 9, stock: 'ICICI Bank', weight: 1.70 },
      { schemeCode: 9, stock: 'HDFC Bank', weight: 1.58 },
      { schemeCode: 9, stock: 'Larsen & Toubro', weight: 1.29 },
      { schemeCode: 9, stock: 'Bajaj Finance', weight: 1.28 },
      { schemeCode: 9, stock: 'Eternal', weight: 1.18 },
      { schemeCode: 9, stock: 'Bharti Airtel', weight: 1.18 },
      { schemeCode: 9, stock: 'Cholamandalam Investment', weight: 0.99 },
      { schemeCode: 9, stock: 'InterGlobe Aviation', weight: 0.99 },
      { schemeCode: 9, stock: 'GE Vernova T&D India', weight: 0.81 },
      { schemeCode: 9, stock: 'Motherson Sumi Wiring', weight: 0.74 },
      // Scheme 10: 360 ONE Multi Asset Allocation Fund - Direct - Growth
      { schemeCode: 10, stock: 'ICICI Bank', weight: 1.70 },
      { schemeCode: 10, stock: 'HDFC Bank', weight: 1.58 },
      { schemeCode: 10, stock: 'Larsen & Toubro', weight: 1.29 },
      { schemeCode: 10, stock: 'Bajaj Finance', weight: 1.28 },
      { schemeCode: 10, stock: 'Eternal', weight: 1.18 },
      { schemeCode: 10, stock: 'Bharti Airtel', weight: 1.18 },
      { schemeCode: 10, stock: 'Cholamandalam Investment', weight: 0.99 },
      { schemeCode: 10, stock: 'InterGlobe Aviation', weight: 0.99 },
      { schemeCode: 10, stock: 'GE Vernova T&D India', weight: 0.81 },
      { schemeCode: 10, stock: 'Motherson Sumi Wiring', weight: 0.74 },
    ],
  },
};

export function getMockFactsheetData(fundName: string): MockFactsheetData | null {
  return mockFundsData[fundName] || null;
}

export function getFactsheetDataBySchemeCode(fundName: string, schemeCode: number) {
  const data = mockFundsData[fundName];
  if (!data) return null;

  return {
    scheme: data.schemes.find(s => s.schemeCode === schemeCode),
    industryAllocation: data.industryAllocation.filter(a => a.schemeCode === schemeCode),
    portfolioHoldings: data.portfolioHoldings.filter(h => h.schemeCode === schemeCode),
  };
}
