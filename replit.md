# FinFriend Planner - Financial Planning Application

## Overview
FinFriend Planner is a comprehensive financial planning web application built with Next.js 15, designed to help users manage finances, plan for retirement, set financial goals, and receive AI-powered insights. Its core purpose is to enable financial advisors and individuals to create detailed financial plans through guided data collection, automated calculations, AI-generated summaries, and professional report generation. Key capabilities include multi-step financial data collection, automated financial calculations (net worth, cash flow, SIP, retirement corpus), AI-powered financial status summaries, mutual fund selection with performance tracking, and professional PDF report generation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 15.3.3 (App Router, React Server Components) for modern React patterns, SSR, and file-based routing.
- **UI/UX**: shadcn/ui components (Radix UI) with Tailwind CSS for styling. Uses a full **Liquid Glass (Glassmorphism) design system** with animated mesh-gradient background, frosted glass cards/inputs/buttons, backdrop-blur effects, layered transparency, and subtle noise texture. Fully adaptive for light and dark mode. Key CSS classes: `.glass-card`, `.glass-input`, `.glass-button-primary`, `.glass-button-outline`, `.glass-header`, `.glass-modal`, `.glass-dropdown`, `.glass-tabs-list`. Primary color: deep blue (#3F51B5), teal accent (#009688).
- **State Management**: React hooks (useState, useEffect, useMemo) with prop drilling.
- **Routing**: `/` (public landing dashboard), `/planner`, `/allocation`, `/report`, `/sip-optimizer-report`, `/fund-rankings`, `/cas-report`. The landing page (`/`) is the primary entry point; clicking "Open Planner" goes directly to `/planner` (no authentication required).
- **Design Decisions**: Uses sessionStorage for report data transfer, `next-themes` for light/dark mode, and client-side financial formulas.
- **Mutual Fund Selection**: Features a 4-level hierarchical dropdown system (Category, Type, Mutual Fund, Scheme Name) linked to a `fund-schemes-master.csv` with 4261 schemes and AMFI scheme codes. Scheme codes automatically bind for NAV fetching via MFAPI.in.
- **Fund Allocation Display**: Fund Allocation Items display NAV, CAGR Returns (3Y, 5Y, 10Y), and a NAV-derived Risk & Return Metrics card (Sharpe, Sortino, Beta, Jensen's Alpha, Std Dev, 3Y Rolling Return, 3Y CAGR). All risk metrics are computed in `src/lib/risk-metrics.ts` from monthly NAV history (MFAPI.in) and benchmark closing series, using a 6.5% risk-free rate and monthly returns annualized via sqrt(12). No factsheet PDF analysis is performed in the planner — Top Holdings, Sector Allocation, Expense Ratio, AUM, Portfolio Turnover, and Net Assets are intentionally not shown because they cannot be derived from NAV history.
- **Fund Graph Generation**: Implements a Weighted Average CAGR model, comparing portfolio performance against a weighted benchmark (NIFTY 50, NIFTY 10Y G-Sec, NIFTY 50 Hybrid Composite) with line charts and Alpha (α) display.
- **Allocation Page CSV Backend (`/allocation` only)**: The `/allocation` route renders the same `Planner` component with `viewMode="allocation"`. In this mode, all per-fund metrics, returns, benchmarks, and portfolio growth charts are sourced from five local CSV files in the `Funds/` folder at the project root (`equity.csv`, `debt.csv`, `hybrid.csv`, `solutions.csv`, `commodities.csv`) instead of MFAPI.in. The CSVs are parsed and cached server-side by `src/lib/funds-csv.ts`, and exposed through two allocation-only API endpoints: `POST /api/allocation/fund-data` (per-scheme metrics, returns, benchmark name, yearly comparison, mapped Risk Metrics) and `POST /api/allocation/portfolio-growth` (weighted Growth-of-₹100 curve derived from the longest common CAGR horizon across selected funds). The `/planner` route and all other consumers (SIP Optimizer Report, Fund Rankings) continue to use the original MFAPI-backed flows unchanged.

### Backend Architecture
- **Runtime**: Next.js API routes with server actions (`'use server'`).
- **AI Integration**: Firebase Genkit v1.14.1 with Google AI (Gemini 2.0 Flash) for orchestration.
  - **AI Flows**: `financial-status-summary.ts`, `fetch-funds-flow.ts`, `fund-returns-flow.ts`, `model-portfolio-flow.ts` (portfolio comparison). `analyze-factsheet-flow.ts` is retained but only used by the standalone Fund Rankings page; it is no longer invoked from the planner flow.
- **Risk Metrics Computation**: All planner risk metrics are derived from NAV history (no PDF parsing). The `/api/fund-benchmark-comparison` endpoint returns `riskMetrics` alongside the yearly comparison so the planner and SIP Optimizer Report can render Sharpe, Sortino, Beta, Jensen's Alpha, Std Dev, and 3Y Rolling Return without any AI factsheet analysis. This eliminated the per-fund-select latency caused by PDF analysis.

### Authentication & Authorization
- No authentication. All routes are publicly accessible.

### Data Storage
- **Client-Side Storage**: sessionStorage for temporary report data.
- **Data Persistence**: Reports are stored via `/api/store-report` and retrieved via `/api/get-report`.

## External Dependencies

### Third-Party Services
1.  **MFAPI.in**: Public API for Indian mutual fund NAV data and scheme information.
2.  **Google AI (Gemini)**: LLM accessed via Genkit for financial analysis and data extraction.
3.  **Supabase**: Optional persistence for saving planner data by email.

### Key Libraries
-   **UI**: `@radix-ui/*`, `shadcn/ui`, `lucide-react`.
-   **Data Visualization**: `recharts` (charts), `html2canvas`, `jspdf` (PDF generation).
-   **Data Processing**: `papaparse` (CSV), `date-fns`.
-   **Forms**: `react-hook-form` with `zod` resolver.
-   **AI**: `genkit`, `@genkit-ai/googleai`, `@genkit-ai/next`.

### Fund Rankings & FinFriend Score System
- **Purpose**: Automated system that analyzes, scores, and ranks every mutual fund in India daily.
- **FinFriend Score (0-10)**: Weighted algorithm based on:
  - Alpha (30%): Risk-adjusted excess return over benchmark
  - Sharpe Ratio (30%): Risk-adjusted return per unit of volatility
  - Sortino Ratio (20%): Downside risk-adjusted return
  - Max Drawdown (20%): Maximum peak-to-trough decline
- **Key Files**:
  - `src/lib/fund-scoring-engine.ts`: Core scoring calculations
  - `src/lib/fund-rankings-store.ts`: Replit Database storage
  - `src/app/fund-rankings/page.tsx`: Full-page dedicated Fund Rankings UI with 4-level cascading dropdowns
  - `src/components/fund-rankings/FundRankingsButton.tsx`: Trophy icon button that navigates to dedicated page
  - `src/app/api/fund-rankings/`: API endpoints for rankings data
  - `src/app/api/fund-rankings/cron/route.ts`: Daily scheduled job endpoint
- **UI**: Trophy icon button in AppHeader navigates to dedicated `/fund-rankings` page with 4-level cascading dropdowns (Category → Type → Mutual Fund → Scheme Name). Once a scheme is selected, displays:
  - Circular FinFriend Score gauge (0-10)
  - Rank position within category/type
  - Detailed metric cards (Alpha, Sharpe, Sortino, Max Drawdown) with visual indicators
  - Risk vs Return analysis bars
  - "FinFriend Choice" badge for top 10% performers
- **Daily Updates**: Call `/api/fund-rankings/cron` with `Authorization: Bearer {CRON_SECRET}` header to trigger daily recalculation.
- **Data Sources**: Uses `fund-schemes-master.csv` for fund list, MFAPI.in for NAV data, and benchmark CSVs in `public/Fund Benchmark past 10 years/`.

### Environment Variables
-   `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
-   `GOOGLE_GENAI_API_KEY`.
-   `CRON_SECRET` (optional): Secret for authenticating cron job requests. Defaults to `finfriend-daily-cron-2024`.