# Factsheet Analysis API Documentation

## Overview
This API analyzes mutual fund factsheets from the `/Edited Factsheets/` folder automatically, extracting top sectors and holdings using AI-powered analysis.

---

## Endpoint: `/api/analyze-fund-by-name`

### POST - Analyze Fund Factsheet

**Purpose:** Analyze a mutual fund's factsheet and extract sectors, holdings, and financial metrics.

#### Request Format
```json
{
  "fundName": "string (required)",
  "schemeName": "string (optional)"
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fundName` | string | ✅ Yes | Name of the mutual fund house (e.g., "Aditya Birla Sun Life") |
| `schemeName` | string | ❌ No | Specific scheme name to analyze (e.g., "Equity Fund") |

#### Response Format - Success (200)
```json
{
  "success": true,
  "fundName": "Aditya Birla Sun Life",
  "pdfPath": "/Edited Factsheets/Aditya-birla_removed_compressed.pdf",
  "source": "edited-factsheets",
  "data": {
    "fundName": "Aditya Birla Sun Life Equity Fund",
    "netAssets": "₹5,432.10 Cr",
    "industryAllocation": [
      {
        "sector": "Information Technology",
        "weight": 28.5
      },
      {
        "sector": "Finance",
        "weight": 22.3
      },
      {
        "sector": "Pharma",
        "weight": 15.2
      },
      {
        "sector": "Consumer",
        "weight": 12.8
      },
      {
        "sector": "Auto",
        "weight": 10.5
      }
    ],
    "portfolioHoldings": [
      {
        "stock": "TCS",
        "weight": 8.5
      },
      {
        "stock": "Infosys",
        "weight": 7.2
      },
      {
        "stock": "HDFC Bank",
        "weight": 6.8
      },
      {
        "stock": "Reliance",
        "weight": 5.9
      },
      {
        "stock": "ICICI Bank",
        "weight": 5.4
      },
      {
        "stock": "Wipro",
        "weight": 4.8
      },
      {
        "stock": "ITC",
        "weight": 4.2
      },
      {
        "stock": "Maruti",
        "weight": 3.9
      },
      {
        "stock": "Bajaj Auto",
        "weight": 3.5
      },
      {
        "stock": "LT",
        "weight": 3.1
      }
    ],
    "sharpeRatio": "1.45",
    "beta": "0.95",
    "standardDeviation": "12.5%",
    "expenseRatio": "0.45%",
    "aum": "₹5,432.10 Cr",
    "cagr3Year": "15.5%"
  }
}
```

#### Response Format - Error (4xx/5xx)
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "fundName": "Fund name if known"
}
```

#### Error Responses
| Status | Error | Description |
|--------|-------|-------------|
| 400 | `fundName is required` | Missing required parameter |
| 404 | `No factsheet found for fund: ...` | Fund not found in manifest |
| 429 | `Too many requests` | Rate limit exceeded (5 per minute) |
| 500 | `Failed to analyze fund factsheet` | Server error during analysis |

---

## GET - List Available Funds

**Purpose:** Get list of all available funds or schemes for a specific fund.

#### Request Format
```
GET /api/analyze-fund-by-name
GET /api/analyze-fund-by-name?fundName=Aditya%20Birla%20Sun%20Life
```

#### Response - All Funds (200)
```json
{
  "totalFunds": 45,
  "funds": [
    "360 ONE",
    "Aditya Birla Sun Life",
    "Angel One",
    "Axis",
    "HDFC",
    "ICICI",
    "Kotak",
    "Franklin India",
    ...
  ],
  "usage": "POST /api/analyze-fund-by-name with { fundName: string, schemeName?: string }"
}
```

#### Response - Specific Fund (200)
```json
{
  "fundName": "Aditya Birla Sun Life",
  "schemes": {
    "Aditya Birla Sun Life": "/Edited Factsheets/Aditya-birla_removed_compressed.pdf"
  }
}
```

---

## Usage Examples

### cURL
```bash
# Analyze a fund
curl -X POST http://localhost:5000/api/analyze-fund-by-name \
  -H "Content-Type: application/json" \
  -d '{
    "fundName": "Aditya Birla Sun Life"
  }'

# Get all available funds
curl http://localhost:5000/api/analyze-fund-by-name

# Get specific fund's schemes
curl "http://localhost:5000/api/analyze-fund-by-name?fundName=HDFC"
```

### JavaScript/Fetch
```javascript
// Analyze a fund
const response = await fetch('/api/analyze-fund-by-name', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fundName: 'Aditya Birla Sun Life',
    schemeName: 'Equity Fund' // optional
  })
});

const result = await response.json();
if (result.success) {
  console.log('Top Sectors:', result.data.industryAllocation);
  console.log('Top Holdings:', result.data.portfolioHoldings);
} else {
  console.error('Error:', result.error);
}
```

### TypeScript
```typescript
interface FundAnalysisRequest {
  fundName: string;
  schemeName?: string;
}

interface FundAnalysisResponse {
  success: boolean;
  data?: {
    fundName: string;
    netAssets: string;
    industryAllocation: Array<{ sector: string; weight: number }>;
    portfolioHoldings: Array<{ stock: string; weight: number }>;
    sharpeRatio?: string;
    beta?: string;
    expenseRatio?: string;
  };
  error?: string;
  pdfPath?: string;
}

async function analyzeFund(fundName: string): Promise<FundAnalysisResponse> {
  const response = await fetch('/api/analyze-fund-by-name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fundName })
  });
  return response.json();
}
```

### Python
```python
import requests
import json

# Analyze a fund
payload = {
    "fundName": "Aditya Birla Sun Life",
    "schemeName": "Equity Fund"  # optional
}

response = requests.post(
    'http://localhost:5000/api/analyze-fund-by-name',
    json=payload
)

result = response.json()
if result['success']:
    print("Top Sectors:")
    for sector in result['data']['industryAllocation']:
        print(f"  {sector['sector']}: {sector['weight']}%")
    
    print("\nTop Holdings:")
    for holding in result['data']['portfolioHoldings']:
        print(f"  {holding['stock']}: {holding['weight']}%")
else:
    print(f"Error: {result['error']}")
```

---

## Rate Limiting

- **Limit:** 5 requests per minute per IP
- **Response:** 429 status code when exceeded
- **Reset:** Automatically after 60 seconds

---

## Supported Funds

The API supports 45+ mutual fund companies from the `/Edited Factsheets/` folder:

- 360 ONE
- Aditya Birla Sun Life
- Angel One
- Axis
- Bajaj Finserv
- Bank of India
- Baroda BNP Paribas
- Canara Robeco
- DSP
- Edelweiss
- Franklin Templeton
- Groww
- HDFC
- Helios
- HSBC
- ICICI Prudential
- Invesco
- ITI
- JM Financial
- Kotak
- LIC
- Mahindra Manulife
- Mirae
- Navi
- NIPPON INDIA
- NJ
- Old Bridge
- Parag Parikh
- PGIM
- Quantum
- Quant
- Rabobank
- Reliance
- SBI
- Shriram
- Sundaram
- T Rowe Price
- Tata
- Union
- UnitedMoney
- Vanguard
- Walton
- Whirlpool
- Xtreme
- Yes Bank

---

## Data Extracted

### Sectors (Industry Allocation)
- **Count:** Up to 5 top sectors
- **Data:** Sector name, weight percentage
- **Sorted:** By weight (highest first)
- **Use Case:** Portfolio diversification analysis, risk assessment

### Holdings (Portfolio Holdings)
- **Count:** Up to 10 top stocks
- **Data:** Stock name/ticker, weight percentage
- **Sorted:** By weight (highest first)
- **Use Case:** Individual stock exposure, concentration risk

### Financial Metrics (Optional)
- Sharpe Ratio - Risk-adjusted return
- Beta - Systematic risk
- Standard Deviation - Volatility
- Downward Deviation - Downside risk
- Expense Ratio - Annual charges
- AUM - Assets Under Management
- Portfolio Turnover - Holdings change frequency
- 3-Year CAGR - Historical returns

---

## Integration with Portfolio Consolidation

For portfolio-wide analysis (multiple funds):

1. Call this API for each fund in the portfolio
2. Extract `industryAllocation` and `portfolioHoldings` from each
3. Weight each fund's data by its allocation % in the portfolio
4. Sum weighted values across all funds
5. Display consolidated top 10 sectors and holdings

**Example:**
```javascript
async function analyzePortfolio(funds) {
  const analyses = await Promise.all(
    funds.map(f => analyzeFund(f.name))
  );

  let consolidatedHoldings = {};
  let totalAllocation = funds.reduce((sum, f) => sum + f.allocation, 0);

  analyses.forEach((analysis, index) => {
    const fund = funds[index];
    const fundWeight = fund.allocation / totalAllocation;

    analysis.data.portfolioHoldings.forEach(holding => {
      const weighted = holding.weight * fundWeight;
      consolidatedHoldings[holding.stock] = 
        (consolidatedHoldings[holding.stock] || 0) + weighted;
    });
  });

  return Object.entries(consolidatedHoldings)
    .map(([stock, weight]) => ({ stock, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
}
```

---

## API Source Code

**Location:** `src/app/api/analyze-fund-by-name/route.ts`

**Key Functions:**
- `POST(request)` - Analyze fund by name
- `GET(request)` - List funds or get fund details
- `findPdfPathForFund()` - Lookup PDF from manifest
- `loadFactsheetManifest()` - Load `/public/factsheets.json`
- `cleanUndefined()` - Remove null values from response

**Flow:**
1. Load `/public/factsheets.json` manifest
2. Match fund name to PDF path
3. Call `analyzeFactsheet(pdfPath)` with Gemini AI
4. Extract and return sectors, holdings, metrics
5. Clean undefined values
6. Return JSON response
