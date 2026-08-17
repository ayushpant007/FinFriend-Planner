"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Info,
  Landmark,
  LineChart,
  PieChart,
  ShieldAlert,
  Sparkles,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import financialFriendLogo from "../../../../attached_assets/images-removebg-preview_1786696645447.png";
import {
  getInvestmentProduct,
  isInvestmentCategory,
  type InvestmentCategory,
} from "@/lib/sif-pms-aif";

type JsonRecord = Record<string, unknown>;

const PERIOD_ORDER = [
  "1_day",
  "1_month",
  "3_month",
  "6_month",
  "1_year",
  "2_year",
  "3_year",
  "5_year",
  "since_inception",
];

const PERIOD_LABELS: Record<string, string> = {
  "1_day": "1D",
  "1_month": "1M",
  "3_month": "3M",
  "6_month": "6M",
  "1_year": "1Y",
  "2_year": "2Y",
  "3_year": "3Y",
  "5_year": "5Y",
  since_inception: "Since inception",
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    return isRecord(current) ? current[key] : undefined;
  }, source);
}

function firstValue(source: unknown, paths: string[]): unknown {
  return paths.map((path) => getPath(source, path)).find(hasValue);
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[%₹,]/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: unknown): string {
  if (!hasValue(value)) return "Data Not Available";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatValue(value: unknown, key = ""): string {
  if (!hasValue(value)) return "Data Not Available";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    const isPercent = /percent|ratio|return|fee|exposure|weight|alpha|beta|sharpe|sortino|drawdown|deviation|fama/i.test(
      key,
    );
    return `${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}${isPercent ? "%" : ""}`;
  }
  if (typeof value === "string") {
    if (/date|as_of|inception|closing/i.test(key) && /^\d{4}-\d{2}/.test(value)) {
      return formatDate(value);
    }
    return value;
  }
  return "Data Not Available";
}

function directRows(source: unknown, allowedKeys?: string[]) {
  if (!isRecord(source)) return [];
  const entries = Object.entries(source).filter(([key, value]) => {
    if (!hasValue(value) || typeof value === "object") return false;
    return !allowedKeys || allowedKeys.includes(key);
  });
  return entries.map(([key, value]) => ({
    label: formatKey(key),
    value: formatValue(value, key),
  }));
}

function compactList(source: unknown): string[] {
  return asList(source).filter((item): item is string => typeof item === "string");
}

function sourceNote(data: JsonRecord) {
  const metadata = isRecord(data.data_metadata) ? data.data_metadata : {};
  return firstValue(metadata, ["primary_source", "data_quality_note"]);
}

function getReportTitle(data: JsonRecord) {
  const fund = isRecord(data.fund) ? data.fund : {};
  const hero = isRecord(isRecord(data.application_display) ? data.application_display.hero : null)
    ? (data.application_display as JsonRecord).hero
    : {};
  return String(firstValue(fund, ["name", "short_name"]) ?? firstValue(hero, ["title"]) ?? "Investment product");
}

function getSubtitle(data: JsonRecord) {
  const hero = isRecord(data.application_display) && isRecord(data.application_display.hero)
    ? data.application_display.hero
    : {};
  const objective = isRecord(data.investment_objective) ? data.investment_objective : {};
  return String(
    firstValue(hero, ["subtitle"]) ??
      firstValue(objective, ["objective"]) ??
      "A structured view of the product, strategy, portfolio and risk disclosures.",
  );
}

function getFundHouse(data: JsonRecord) {
  const fund = isRecord(data.fund) ? data.fund : {};
  const house = isRecord(data.fund_house) ? data.fund_house : {};
  const nestedHouse = isRecord(fund.fund_house) ? fund.fund_house : {};
  return firstValue(fund, ["amc", "asset_management_company"]) ??
    firstValue(house, ["name", "asset_manager"]) ??
    firstValue(nestedHouse, ["name"]);
}

function getRiskLabel(data: JsonRecord) {
  const fund = isRecord(data.fund) ? data.fund : {};
  const current = isRecord(data.current_data) ? data.current_data : {};
  const risk = isRecord(data.risk_profile) ? data.risk_profile : {};
  return firstValue(fund, ["risk_level"]) ??
    firstValue(current, ["risk_rating"]) ??
    firstValue(risk, ["risk_level", "label"]);
}

function getBenchmark(data: JsonRecord) {
  const fund = isRecord(data.fund) ? data.fund : {};
  const benchmark = isRecord(data.benchmark) ? data.benchmark : {};
  const performance = isRecord(data.performance) ? data.performance : {};
  const primary = isRecord(benchmark.primary_benchmark) ? benchmark.primary_benchmark : {};
  return firstValue(fund, ["benchmark"]) ??
    firstValue(primary, ["name", "benchmark"]) ??
    firstValue(benchmark, ["name", "primary"]) ??
    firstValue(performance, ["benchmark"]);
}

function getMetrics(data: JsonRecord) {
  const category = String(data.product_type ?? "");
  const current = isRecord(data.current_data) ? data.current_data : {};
  const nav = isRecord(current.nav) ? current.nav : {};
  const scheme = isRecord(data.scheme_details) ? data.scheme_details : {};
  const fundTerm = isRecord(data.fund_term) ? data.fund_term : {};
  const fund = isRecord(data.fund) ? data.fund : {};

  if (category === "SIF") {
    return [
      { label: "Current NAV", value: hasValue(nav.value) ? `₹${formatValue(nav.value)}` : "Data Not Available" },
      { label: "AUM", value: hasValue(getPath(current, "aum.value")) ? `₹${formatValue(getPath(current, "aum.value"))} ${getPath(current, "aum.unit") ?? ""}` : "Data Not Available" },
      { label: "Expense ratio", value: hasValue(getPath(current, "expense_ratio.value")) ? `${formatValue(getPath(current, "expense_ratio.value"))}%` : "Data Not Available" },
      { label: "Risk profile", value: formatValue(getRiskLabel(data)) },
    ];
  }

  const commitment = firstValue(scheme, [
    "minimum_commitment.amount",
    "minimum_commitments.amount",
    "minimum_initial_investment",
    "minimum_commitments.classes",
  ]);
  const term = firstValue(fundTerm, ["initial_term_years", "maximum_possible_term_years"]);
  return [
    { label: "Structure", value: formatValue(firstValue(scheme, ["structure"]) ?? firstValue(fund, ["fund_type.structure"])) },
    { label: "Benchmark", value: formatValue(getBenchmark(data)) },
    { label: "Fund term", value: hasValue(term) ? `${formatValue(term)} years` : "Data Not Available" },
    { label: "Minimum commitment", value: formatValue(commitment) },
  ];
}

function findReturns(data: JsonRecord) {
  const performance = isRecord(data.performance) ? data.performance : {};
  const possible = [
    performance.returns,
    getPath(performance, "series_iii.returns"),
    getPath(performance, "current_fund_performance.returns"),
  ];
  return possible.find(isRecord) ?? null;
}

function findBenchmarkReturns(data: JsonRecord) {
  const performance = isRecord(data.performance) ? data.performance : {};
  const possible = [
    performance.benchmark_returns,
    getPath(performance, "series_iii.benchmark_returns"),
    getPath(performance, "current_fund_performance.benchmark_returns"),
  ];
  return possible.find(isRecord) ?? null;
}

function getAllocationRows(data: JsonRecord) {
  const portfolio = isRecord(data.portfolio) ? data.portfolio : {};
  const allocation = isRecord(portfolio.allocation) ? portfolio.allocation : null;
  if (allocation) {
    return Object.entries(allocation)
      .map(([key, value]) => ({ label: formatKey(key), value: numberValue(value) }))
      .filter((row): row is { label: string; value: number } => row.value !== null);
  }
  const assetAllocation = isRecord(data.asset_allocation) ? data.asset_allocation : {};
  return asList(assetAllocation.allocation_rules)
    .filter(isRecord)
    .map((rule) => ({
      label: String(firstValue(rule, ["asset", "name"]) ?? "Allocation"),
      value: numberValue(firstValue(rule, ["max_percent", "current_percent", "percent"])),
      range: `${formatValue(rule.min_percent, "percent")} – ${formatValue(rule.max_percent, "percent")}`,
    }))
    .filter((row): row is { label: string; value: number; range: string } => row.value !== null);
}

function getHoldings(data: JsonRecord) {
  const portfolio = isRecord(data.portfolio) ? data.portfolio : {};
  return asList(portfolio.top_holdings)
    .filter(isRecord)
    .map((holding) => ({
      name: String(firstValue(holding, ["name", "security", "company"]) ?? "Holding"),
      weight: firstValue(holding, ["weight_percent", "weight", "percentage"]),
    }));
}

function getManagers(data: JsonRecord) {
  const managers = data.fund_managers ?? data.fund_manager_details ?? data.fund_manager;
  if (Array.isArray(managers)) return managers.filter(isRecord);
  return isRecord(managers) ? [managers] : [];
}

function SectionHeading({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string;
  icon: typeof Landmark;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 border-b-2 border-[#c7a25f] pb-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-[#0b7772]" />
          <p className="truncate font-heading text-[15px] font-semibold uppercase tracking-[0.12em] text-[#14263d] dark:text-slate-100">
            {title}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          {number}
        </span>
      </div>
      {description && <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}

function ReportSection({
  children,
  number,
  icon,
  title,
  description,
  className = "",
}: {
  children: React.ReactNode;
  number: string;
  icon: typeof Landmark;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <section className={`rounded-[2px] border border-slate-200/90 bg-white p-6 shadow-[0_10px_30px_rgba(20,38,61,0.03)] sm:p-8 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <SectionHeading number={number} icon={icon} title={title} description={description} />
      {children}
    </section>
  );
}

function SifSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 border-b-2 border-[#c9ad70] pb-2">
      <h2 className="font-serif text-[15px] font-bold uppercase tracking-[0.08em] text-[#101522] dark:text-slate-100">
        {children}
      </h2>
    </div>
  );
}

function SifMetric({
  label,
  value,
  detail,
}: {
  label: React.ReactNode;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0 border-l border-[#e1e3e6] px-4 first:border-l-0 first:pl-0 last:pr-0 dark:border-slate-700">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6d7782] dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-[20px] font-bold leading-none tracking-tight ${value === "—" ? "text-[#8a929a]" : "text-[#101522] dark:text-white"}`}>
        {value}
      </p>
      {detail && <p className="mt-1 text-[10px] leading-4 text-[#7d858d] dark:text-slate-500">{detail}</p>}
    </div>
  );
}

function formatReportReturn(value: unknown) {
  const amount = numberValue(value);
  if (amount === null) return "—";
  return `${amount >= 0 ? "+" : ""}${amount.toFixed(2)}%`;
}

function formatFinancialFriendBranding(value: unknown) {
  return String(value ?? "")
    .replace(/SIFscan/gi, "Financial Friend")
    .replace(/sifscan\.com/gi, "financialfriend.in");
}

function formatIsoDate(value: unknown) {
  if (!hasValue(value)) return "—";
  const stringValue = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(stringValue) ? stringValue : formatDate(value);
}

function getSifStrategyParameters(data: JsonRecord) {
  const metadata = isRecord(data.data_metadata) ? data.data_metadata : {};
  const parameters = isRecord(metadata.strategy_parameters) ? metadata.strategy_parameters : {};
  const fields = [
    ["Lock-in Period", "lock_in_period"],
    ["Redemption Frequency", "redemption_frequency"],
    ["Derivatives", "derivatives"],
    ["Short Selling", "short_selling"],
    ["Gross Exposure", "gross_exposure"],
    ["Net Exposure", "net_exposure"],
    ["Risk Band", "risk_band"],
    ["Complexity", "complexity"],
    ["Benchmark", "benchmark"],
  ] as const;
  return fields.map(([label, key]) => ({
    label,
    value: hasValue(parameters[key]) ? String(parameters[key]) : "—",
  }));
}

function SifNavRange({ data }: { data: JsonRecord }) {
  const history = isRecord(data.nav_history) ? data.nav_history : {};
  const low = numberValue(history.low);
  const high = numberValue(history.high);
  const lowText = hasValue(history.low_raw) ? String(history.low_raw) : low === null ? "—" : `₹${low.toFixed(2)}`;
  const highText = hasValue(history.high_raw) ? String(history.high_raw) : high === null ? "—" : `₹${high.toFixed(2)}`;
  const startDate = formatIsoDate(history.start_date);
  const endDate = formatIsoDate(history.end_date);
  const range = low !== null && high !== null ? Math.max(high - low, 0.01) : 1;
  const progress = low !== null && high !== null ? Math.min(Math.max((high - low) / range, 0), 1) : 0.72;

  return (
    <div className="rounded-[4px] border border-[#e0e2e4] bg-[#fdfcf9] px-4 pb-4 pt-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between text-[10px] text-[#707984] dark:text-slate-400">
        <span>{startDate}</span>
        <span>{endDate}</span>
      </div>
      <svg viewBox="0 0 640 112" className="mt-2 h-28 w-full" role="img" aria-label={`NAV range from ${lowText} to ${highText}`}>
        <defs>
          <linearGradient id="sif-nav-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d7c18d" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#d7c18d" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <path d={`M 12 86 L ${progress > 0 ? 628 : 320} ${progress > 0 ? 18 : 54} L 628 94 L 12 94 Z`} fill="url(#sif-nav-fill)" />
        <path d={`M 12 86 L ${progress > 0 ? 628 : 320} ${progress > 0 ? 18 : 54}`} fill="none" stroke="#c8ac6d" strokeWidth="2.2" />
        <circle cx={progress > 0 ? "628" : "320"} cy={progress > 0 ? "18" : "54"} r="4" fill="#c8ac6d" />
        <line x1="12" x2="628" y1="94" y2="94" stroke="#e7e3d9" strokeWidth="1" />
      </svg>
      <div className="flex items-center justify-between text-[10px] text-[#8a929a] dark:text-slate-500">
        <span>Low: {lowText}</span>
        <span>High: {highText}</span>
      </div>
    </div>
  );
}

function SifResearchReport({
  data,
  title,
  category,
  router,
}: {
  data: JsonRecord;
  title: string;
  category: InvestmentCategory | null;
  router: ReturnType<typeof useRouter>;
}) {
  const current = isRecord(data.current_data) ? data.current_data : {};
  const nav = isRecord(current.nav) ? current.nav : {};
  const aum = isRecord(current.aum) ? current.aum : {};
  const expense = isRecord(current.expense_ratio) ? current.expense_ratio : {};
  const metadata = isRecord(data.data_metadata) ? data.data_metadata : {};
  const fundHouse = getFundHouse(data);
  const categoryLabel = String(data.product_category ?? data.product_type ?? category ?? "Specialised Investment Fund");
  const asOf = firstValue(current, ["as_of"]) ?? firstValue(data.performance, ["as_of"]);
  const returns = findReturns(data);
  const strategyRows = getSifStrategyParameters(data);
  const riskMetrics = isRecord(data.risk_metrics) ? data.risk_metrics : {};
  const riskBand = firstValue(riskMetrics, ["risk_band"]) ?? getRiskLabel(data);
  const complexity = firstValue(riskMetrics, ["complexity"]);
  const disclosure = firstValue(metadata, ["disclosure"]);
  const performanceRows = [
    ["1 Month", "1_month"],
    ["3 Months", "3_month"],
    ["6 Months", "6_month"],
    ["1 Year", "1_year"],
    ["Since Inception", "since_inception"],
  ] as const;

  return (
    <main className="sif-report-page min-h-screen bg-[#f7f7f5] text-[#101522] dark:bg-slate-950 dark:text-slate-100">
      <div className="no-print border-b border-[#d8b76f] bg-[linear-gradient(110deg,#08172f_0%,#102a4a_55%,#0b1e3a_100%)] px-5 py-3 text-white sm:px-8">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <button type="button" onClick={() => router.push("/sif-pms-aif")} className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:text-white">
            ← Back to selection
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] tracking-[0.03em] text-slate-400 sm:inline">Financial Friend · SIF research pack</span>
            <button type="button" onClick={() => window.print()} className="rounded border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:border-[#d8b76f] hover:text-[#e5c886]">
              <Download className="mr-1.5 inline h-3.5 w-3.5" /> Print / PDF
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] bg-white shadow-[0_20px_70px_rgba(16,21,34,0.08)] dark:bg-slate-900 dark:shadow-none">
        <header className="relative border-b border-[#e0e2e4] bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-14 items-center justify-between bg-[linear-gradient(110deg,#08172f_0%,#102a4a_55%,#0b1e3a_100%)] px-8 text-[11px] text-slate-300 sm:px-12">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-[142px] overflow-hidden rounded bg-white/95 shadow-[0_3px_12px_rgba(0,0,0,0.12)]">
                <Image
                  src={financialFriendLogo}
                  alt="Financial Friend"
                  width={132}
                  height={132}
                  priority
                  className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
                />
              </div>
              <span className="h-4 w-px bg-white/30" />
              <span>Research</span>
            </div>
            <span>{formatDate(new Date().toISOString())}</span>
          </div>
          <div className="h-1 bg-[#d8b76f]" />
          <div className="relative overflow-hidden px-8 pb-8 pt-9 sm:px-12 sm:pb-10">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[24px] border-[#c9ad70]/[0.08]" />
            <div className="pointer-events-none absolute -right-4 top-8 h-28 w-28 rounded-full border border-[#c9ad70]/[0.12]" />
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b39a66]">Fund research pack</p>
            <h1 className="relative mt-5 max-w-4xl font-serif text-3xl font-bold leading-tight tracking-[-0.035em] text-[#101522] sm:text-[40px] dark:text-white">{title}</h1>
            <p className="relative mt-2 text-[15px] text-[#53606c] dark:text-slate-400">{String(fundHouse ?? "Data Not Available")}</p>
            <p className="relative mt-3 text-[12px] text-[#7c858e] dark:text-slate-500">{categoryLabel}</p>
          </div>
        </header>

        <section className="border-y border-[#e0e2e4] bg-[#fdfcf9] px-8 py-5 sm:px-12">
          <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-y-0">
            <SifMetric label="Latest NAV" value={hasValue(nav.raw) ? String(nav.raw) : nav.value != null ? `₹${Number(nav.value).toFixed(2)}` : "—"} detail={hasValue(asOf) ? `as of ${formatDate(asOf)}` : undefined} />
            <SifMetric label="AUM" value={hasValue(aum.raw) ? String(aum.raw) : "—"} />
            <SifMetric label="Expense ratio" value={hasValue(expense.raw) ? String(expense.raw) : expense.value != null ? `${Number(expense.value).toFixed(2)}%` : "—"} />
            <SifMetric label="Min. investment" value={hasValue(getPath(data, "scheme_details.minimum_initial_investment")) ? String(getPath(data, "scheme_details.minimum_initial_investment")) : "—"} />
          </div>
        </section>

        <section className="border-b border-[#e0e2e4] bg-white px-8 py-5 sm:px-12 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-5 sm:gap-y-0">
            {performanceRows.map(([label, key]) => (
              <SifMetric key={key} label={label === "Since Inception" ? <>Since inception<br />return</> : `${label} return`} value={formatReportReturn(returns?.[key])} />
            ))}
          </div>
        </section>

        <div className="space-y-12 px-8 pb-16 pt-10 sm:px-12 sm:pt-12">
          <section>
            <SifSectionTitle>Strategy parameters</SifSectionTitle>
            <div className="divide-y divide-[#eceef0] border-b border-[#eceef0] dark:divide-slate-800 dark:border-slate-800">
              {strategyRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] py-2.5 text-[12px] sm:grid-cols-[28%_72%]">
                  <span className="text-[#6e7882] dark:text-slate-400">{row.label}</span>
                  <span className={`font-semibold ${row.value === "—" ? "text-[#7d858d]" : "text-[#101522] dark:text-slate-100"}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SifSectionTitle>NAV history</SifSectionTitle>
            <SifNavRange data={data} />
          </section>

          <section>
            <SifSectionTitle>Performance returns</SifSectionTitle>
            <div className="overflow-hidden rounded-[4px] border border-[#e0e2e4] dark:border-slate-700">
              <div className="grid grid-cols-[1fr_110px] bg-[#f7f7f5] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e7882] dark:bg-slate-800 dark:text-slate-400">
                <span>Period</span>
                <span className="text-right">Return</span>
              </div>
              {performanceRows.map(([label, key]) => (
                <div key={key} className="grid grid-cols-[1fr_110px] border-t border-[#eceef0] px-4 py-2.5 text-[12px] dark:border-slate-800">
                  <span>{label}</span>
                  <span className={`text-right font-semibold ${hasValue(returns?.[key]) ? "text-[#1d6a4c]" : "text-[#7d858d]"}`}>{formatReportReturn(returns?.[key])}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SifSectionTitle>Risk profile</SifSectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["SEBI risk band", riskBand],
                ["Complexity", complexity],
              ].map(([label, value]) => (
                <div key={String(label)} className="border-l-2 border-[#c9ad70] bg-[#fdfcf9] px-4 py-4 dark:bg-slate-800/60">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6e7882] dark:text-slate-400">{String(label)}</p>
                  <p className="mt-3 text-[15px] font-semibold">{hasValue(value) ? String(value) : "—"}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-l-[3px] border-[#0b1e3a] bg-[#fdfcf9] px-5 py-5 dark:bg-slate-800/50">
            <h2 className="font-serif text-[14px] font-bold uppercase tracking-[0.08em]">Important disclosures</h2>
            <div className="mt-4 space-y-3 text-[11px] leading-5 text-[#6e7882] dark:text-slate-400">
              <p>{hasValue(disclosure) ? formatFinancialFriendBranding(disclosure) : "This document is generated for informational and research purposes only. It does not constitute investment advice, a solicitation, or an offer to buy or sell any security."}</p>
              <p>Data is sourced from publicly available SEBI and AMFI disclosures. NAV, AUM, and portfolio data may not reflect the most recent disclosures. Past performance and current data do not guarantee future results.</p>
              <p>Specialised Investment Funds are SEBI-regulated vehicles with specific eligibility and risk requirements. Investors should consult a SEBI-registered investment advisor before making any investment decision.</p>
            </div>
          </section>
        </div>

        <footer className="flex flex-col items-center justify-center gap-2 border-t border-[#e0e2e4] px-8 py-8 text-center text-[11px] text-[#7d858d] dark:border-slate-800 dark:text-slate-500">
          <div className="relative h-10 w-[142px] overflow-hidden rounded bg-white dark:bg-slate-100">
            <Image
              src={financialFriendLogo}
              alt="Financial Friend"
              width={132}
              height={132}
              className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
            />
          </div>
          <p>Generated by Financial Friend Research on {formatDate(new Date().toISOString())}</p>
          <p className="font-medium text-[#b08e4e]">financialfriend.in</p>
        </footer>
      </div>
    </main>
  );
}

function PmsSourceReport({
  data,
  productName,
  router,
}: {
  data: JsonRecord;
  productName: string;
  router: ReturnType<typeof useRouter>;
}) {
  const sourceUrl = String(data.sourceUrl ?? "");
  const title = String(data.title ?? productName);
  const description = String(data.description ?? "");
  const headings = asList(data.headings).filter((item): item is string => typeof item === "string");
  const paragraphs = asList(data.paragraphs).filter((item): item is string => typeof item === "string");
  const tables = asList(data.tables)
    .filter(Array.isArray)
    .map((table) =>
      table
        .filter(Array.isArray)
        .map((row) => row.filter((cell): cell is string => typeof cell === "string")),
    )
    .filter((table) => table.length > 0);
  const fetchedAt = data.fetchedAt ? formatDate(data.fetchedAt) : "Just now";

  return (
    <main className="min-h-screen bg-[#f4f7f8] text-[#14263d] dark:bg-slate-950 dark:text-slate-100">
      <div className="no-print border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button type="button" onClick={() => router.push("/sif-pms-aif")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0b7772]">
            <ArrowLeft className="h-4 w-4" /> Back to PMS selection
          </button>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-[#0b7772] sm:inline">Financial Friend · live source view</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <header className="overflow-hidden rounded-3xl bg-[#10243d] p-7 text-white shadow-[0_20px_60px_rgba(16,36,61,0.18)] sm:p-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-4xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#78d2c9]">PMS source data</p>
              <h1 className="mt-4 font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h1>
              <p className="mt-4 text-base leading-7 text-slate-300">{productName}</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/15 bg-white/[0.07] px-5 py-4 text-sm text-slate-300">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7a66d]">Fetched from</p>
              <p className="mt-2 font-semibold text-white">{String(data.sourceName ?? "PMS AIF World")}</p>
              <p className="mt-1 text-xs text-slate-400">{fetchedAt}</p>
            </div>
          </div>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <Globe2 className="h-4 w-4 shrink-0 text-[#78d2c9]" />
            <span className="truncate">Open exact PMS AIF World page</span>
            <ExternalLink className="h-4 w-4 shrink-0 text-[#d7a66d]" />
          </a>
          <p className="mt-3 break-all text-xs text-slate-400">{sourceUrl}</p>
        </header>

        <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b7772]">Source page content</p>
                <h2 className="mt-1 font-heading text-xl font-semibold">Information fetched from the selected URL</h2>
              </div>
              <span className="hidden rounded-full bg-[#e4f1ef] px-3 py-1.5 text-xs font-semibold text-[#0b7772] sm:inline-flex">No local PMS template</span>
            </div>
            {description && <p className="rounded-xl bg-[#f4f8f8] p-4 text-sm leading-6 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">{description}</p>}
            {paragraphs.length > 0 ? (
              <div className="mt-6 space-y-4">
                {paragraphs.map((paragraph, index) => (
                  <p key={`${paragraph.slice(0, 24)}-${index}`} className="text-sm leading-7 text-slate-600 dark:text-slate-300">{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-500">The source page did not expose readable paragraph content. Use the exact source link above to view it directly.</p>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b7772]">Sections found</p>
            <h2 className="mt-1 font-heading text-xl font-semibold">Source headings</h2>
            {headings.length > 0 ? (
              <div className="mt-5 space-y-2">
                {headings.map((heading, index) => (
                  <div key={`${heading}-${index}`} className="flex gap-3 border-b border-slate-100 pb-3 text-sm last:border-0 dark:border-slate-800">
                    <span className="font-heading text-xs font-bold text-[#d29b5d]">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-slate-600 dark:text-slate-300">{heading}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">No headings were exposed by the source page.</p>
            )}
          </aside>
        </div>

        {tables.length > 0 && (
          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 border-b border-slate-200 pb-4 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b7772]">Structured source data</p>
              <h2 className="mt-1 font-heading text-xl font-semibold">Tables published on the PMS page</h2>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              {tables.map((table, tableIndex) => (
                <div key={`table-${tableIndex}`} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <tbody>
                        {table.map((row, rowIndex) => (
                          <tr key={`row-${rowIndex}`} className={rowIndex === 0 ? "bg-[#f4f8f8] font-semibold dark:bg-slate-800" : "border-t border-slate-100 dark:border-slate-800"}>
                            {row.map((cell, cellIndex) => (
                              <td key={`cell-${cellIndex}`} className="px-4 py-3 text-slate-600 dark:text-slate-300">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 text-center text-xs leading-5 text-slate-500">
          This PMS view displays content fetched from the selected PMS AIF World URL. Verify current details on the source page before making any investment decision.
        </p>
      </div>
    </main>
  );
}

function InfoGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{row.label}</p>
          <p className={`mt-1.5 text-sm font-semibold ${row.value === "Data Not Available" ? "text-slate-400" : "text-[#14263d] dark:text-slate-100"}`}>
            {row.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-[#c8e2df] bg-[#f3faf9] px-3 py-1.5 text-xs font-medium text-[#0b7772] dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-300">
          {item}
        </span>
      ))}
    </div>
  );
}

function PerformanceTable({ data }: { data: JsonRecord }) {
  const returns = findReturns(data);
  const benchmarks = findBenchmarkReturns(data);
  if (!returns && !benchmarks) return null;
  const periods = PERIOD_ORDER.filter((period) => hasValue(returns?.[period]) || hasValue(benchmarks?.[period]));
  if (!periods.length) return null;
  const hasBenchmark = Boolean(benchmarks && periods.some((period) => hasValue(benchmarks[period])));

  return (
    <div className="overflow-hidden rounded-[2px] border border-slate-200 dark:border-slate-800">
      <div className={`grid ${hasBenchmark ? "grid-cols-3" : "grid-cols-2"} bg-[#f8f7f4] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-800 dark:text-slate-400`}>
        <span>Period</span>
        <span>Return</span>
        {hasBenchmark && <span>Benchmark</span>}
      </div>
      {periods.map((period) => (
        <div key={period} className={`grid ${hasBenchmark ? "grid-cols-3" : "grid-cols-2"} border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800`}>
          <span className="font-medium text-slate-600 dark:text-slate-300">{PERIOD_LABELS[period] ?? formatKey(period)}</span>
          <span className="font-semibold text-[#0b7772]">{formatValue(returns?.[period], "return")}</span>
          {hasBenchmark && <span className="text-slate-600 dark:text-slate-300">{formatValue(benchmarks?.[period], "return")}</span>}
        </div>
      ))}
    </div>
  );
}

function AllocationBars({ rows }: { rows: { label: string; value: number; range?: string }[] }) {
  const max = Math.max(...rows.map((row) => row.value), 100);
  return (
    <div className="space-y-5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{row.label}</span>
            <span className="font-semibold text-[#0b7772]">{row.range ?? `${formatValue(row.value, "percent")}`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-[#0b7772] to-[#36aaa0]" style={{ width: `${Math.min((row.value / max) * 100, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SifPmsAifReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const productParam = searchParams.get("product");
  const category = isInvestmentCategory(categoryParam) ? categoryParam : null;
  const product = category ? getInvestmentProduct(category, productParam) : null;
  const isPmsSelection = category === "PMS" && Boolean(productParam);
  const hasSource = category === "PMS" ? isPmsSelection : Boolean(product?.fileName);
  const [data, setData] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(hasSource);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!hasSource || !category) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const reportUrl =
      category === "PMS"
        ? `/api/pms-report?product=${encodeURIComponent(productParam ?? "")}`
        : category === "SIF"
        ? `/api/sif-report?product=${encodeURIComponent(product?.label ?? productParam ?? "")}`
        : `/PMS-AIF-SIF/${category}/${encodeURIComponent(product?.fileName ?? "")}`;
    fetch(reportUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error("Product file unavailable");
        return response.json() as Promise<JsonRecord>;
      })
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch(() => {
        if (active) {
          setError(
            category === "PMS"
              ? "We could not fetch the selected PMS AIF World page."
              : "We could not read the selected product file.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, hasSource, product?.fileName, product?.label, productParam]);

  const metrics = useMemo(() => (data ? getMetrics(data) : []), [data]);
  const allocationRows = useMemo(() => (data ? getAllocationRows(data) : []), [data]);
  const holdings = useMemo(() => (data ? getHoldings(data) : []), [data]);
  const managers = useMemo(() => (data ? getManagers(data) : []), [data]);
  const objective = data && isRecord(data.investment_objective) ? data.investment_objective : null;
  const strategy = data && isRecord(data.investment_strategy) ? data.investment_strategy : null;
  const highlights = data ? asList(data.investment_highlights).filter(isRecord) : [];
  const riskFlags = data ? asList(data.risk_flags).filter(isRecord) : [];
  const riskMetrics = data && isRecord(data.risk_metrics) ? data.risk_metrics : null;
  const portfolio = data && isRecord(data.portfolio) ? data.portfolio : null;
  const scheme = data && isRecord(data.scheme_details) ? data.scheme_details : null;
  const term = data && isRecord(data.fund_term) ? data.fund_term : null;
  const hasSelection = Boolean(categoryParam && productParam);

  if (!hasSelection) {
    return (
      <main className="min-h-screen">
        <AppHeader />
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e4f1ef] text-[#0b7772]">
              <FileText className="h-8 w-8" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0b7772]">Investment intelligence</p>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-[#14263d] dark:text-slate-100">Choose a product to view its report</h1>
            <p className="mt-4 text-slate-500 dark:text-slate-400">Select a PMS, SIF or AIF product first. The report will be generated only from its matching local source file.</p>
            <button type="button" onClick={() => router.push("/sif-pms-aif")} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0b7772] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#095e5a]">
              Back to selection <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!hasSource) {
    return (
      <main className="min-h-screen">
        <AppHeader />
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <Info className="h-8 w-8" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Data currently unavailable</p>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-[#14263d] dark:text-slate-100">Detailed information is not available</h1>
            <p className="mt-4 text-slate-500 dark:text-slate-400">Detailed information for this investment product is currently unavailable. Please check again later.</p>
            <button type="button" onClick={() => router.push("/sif-pms-aif")} className="mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-[#14263d] transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" /> Back to selection
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <AppHeader />
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-12">
          <div className="h-72 animate-pulse rounded-3xl bg-[#14263d]" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
            <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </main>
    );
  }

  if (!data || error) {
    return (
      <main className="min-h-screen">
        <AppHeader />
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-10 text-center shadow-xl dark:border-red-900 dark:bg-slate-900">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-5 font-heading text-2xl font-semibold text-[#14263d] dark:text-slate-100">Report could not be loaded</h1>
            <p className="mt-3 text-slate-500 dark:text-slate-400">{error || "No report data was found for this selection."}</p>
            <button type="button" onClick={() => router.push("/sif-pms-aif")} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0b7772] px-5 py-3 text-sm font-semibold text-white">
              <ArrowLeft className="h-4 w-4" /> Return to selection
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (category === "PMS") {
    return <PmsSourceReport data={data} productName={productParam ?? "Selected PMS"} router={router} />;
  }

  const title = getReportTitle(data);
  if (category === "SIF") {
    return <SifResearchReport data={data} title={title} category={category} router={router} />;
  }
  const subtitle = getSubtitle(data);
  const metadata = isRecord(data.data_metadata) ? data.data_metadata : {};
  const overviewRows = [
    { label: "Product category", value: formatValue(data.product_category ?? data.product_type) },
    { label: "Fund house", value: formatValue(getFundHouse(data)) },
    { label: "Structure", value: formatValue(firstValue(data, ["scheme_details.structure", "fund.fund_type.structure", "fund.fund_type.category"])) },
    { label: "Asset class", value: formatValue(firstValue(data, ["investment_objective.primary_asset_class", "fund.fund_type.asset_class", "fund.fund_type.category"])) },
    { label: "Status", value: formatValue(firstValue(data, ["fund.status", "fund.fund_type.status"])) },
    { label: "Last verified", value: formatDate(metadata.last_verified) },
  ];
  const objectiveBullets = [
    ...compactList(objective?.primary_focus),
    ...compactList(objective?.strategy_style),
    ...compactList(objective?.target_market),
  ].slice(0, 8);
  const strategyBullets = [
    ...compactList(strategy?.core_approach),
    ...compactList(strategy?.primary_focus),
  ].slice(0, 8);
  const strategyText = firstValue(strategy, ["description", "investment_thesis.description"]);
  const benchmarkName = getBenchmark(data);
  const portfolioAllocationNote = firstValue(portfolio, ["portfolio_note", "portfolio_disclosure_note"]);

  return (
    <main className="min-h-screen bg-[#f4f7f8] dark:bg-slate-950">
      <AppHeader />
      <div className="no-print mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 pb-2 pt-8">
        <button type="button" onClick={() => router.push("/sif-pms-aif")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0b7772]">
          <ArrowLeft className="h-4 w-4" /> Back to product selection
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#0b7772] hover:text-[#0b7772] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Download className="h-4 w-4" /> Print / save PDF
        </button>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 pb-16 pt-4">
        <section className="relative overflow-hidden rounded-3xl bg-[#10243d] px-6 py-10 text-white shadow-[0_20px_60px_rgba(16,36,61,0.25)] sm:px-10 sm:py-12">
          <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full border-[32px] border-[#2ba69b]/20" />
          <div className="absolute -bottom-40 right-24 h-80 w-80 rounded-full border border-[#d7a66d]/20" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_330px] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#78d2c9]">
                <span>FinFriend research report</span>
                <span className="h-1 w-1 rounded-full bg-[#d7a66d]" />
                <span>{String(data.product_type ?? category ?? "")}</span>
              </div>
              <h1 className="mt-5 max-w-3xl font-heading text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">{title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">{subtitle}</p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-medium text-slate-200">
                  <Landmark className="h-3.5 w-3.5 text-[#78d2c9]" /> {formatValue(getFundHouse(data))}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-medium text-slate-200">
                  <ShieldAlert className="h-3.5 w-3.5 text-[#d7a66d]" /> Risk: {formatValue(getRiskLabel(data))}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-medium text-slate-200">
                  <CalendarDays className="h-3.5 w-3.5 text-[#78d2c9]" /> Verified {formatDate(metadata.last_verified)}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#78d2c9]">
                <Sparkles className="h-4 w-4" /> At a glance
              </div>
              <div className="grid grid-cols-2 gap-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-white/10 bg-black/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{metric.label}</p>
                    <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <ReportSection number="01" icon={Info} title="Product overview" description="A concise view of the product identity and mandate.">
            <InfoGrid rows={overviewRows} />
          </ReportSection>
          {objective && hasValue(objective.objective) && (
            <ReportSection number="02" icon={Sparkles} title="Investment objective" description="What the product is designed to pursue.">
              <p className="text-[15px] leading-7 text-slate-600 dark:text-slate-300">{formatValue(objective.objective)}</p>
              {objectiveBullets.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Mandate markers</p>
                  <TagList items={objectiveBullets} />
                </div>
              )}
            </ReportSection>
          )}
        </div>

        {strategy && (hasValue(strategyText) || strategyBullets.length > 0) && (
          <ReportSection number="03" icon={LineChart} title="Investment strategy" description="The approach and research lens disclosed for the product.">
            {hasValue(strategyText) && <p className="max-w-4xl text-[15px] leading-7 text-slate-600 dark:text-slate-300">{String(strategyText)}</p>}
            {strategyBullets.length > 0 && (
              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {strategyBullets.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-xl border border-slate-100 bg-[#f8fbfb] p-4 dark:border-slate-800 dark:bg-slate-800/50">
                    <span className="font-heading text-lg font-semibold text-[#d29b5d]">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-sm font-medium leading-5 text-slate-700 dark:text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </ReportSection>
        )}

        {highlights.length > 0 && (
          <ReportSection number="04" icon={CheckCircle2} title="Key highlights" description="Selected product characteristics from the source disclosure.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((highlight, index) => (
                <div key={String(highlight.title ?? index)} className="rounded-xl border border-slate-100 bg-[#fbfcfc] p-5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#e4f1ef] text-xs font-bold text-[#0b7772] dark:bg-teal-950/50 dark:text-teal-300">{String(index + 1).padStart(2, "0")}</div>
                  <h3 className="font-semibold text-[#14263d] dark:text-slate-100">{formatValue(highlight.title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{formatValue(highlight.description)}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {(findReturns(data) || findBenchmarkReturns(data)) && (
          <ReportSection number="05" icon={BarChart3} title="Performance" description={`Reported returns${hasValue(getPath(data.performance, "as_of")) ? ` as of ${formatDate(getPath(data.performance, "as_of"))}` : ""}.`}>
            <PerformanceTable data={data} />
            <p className="mt-4 text-xs leading-5 text-slate-400">Past performance is not indicative of future results. Values are shown as provided in the selected source file.</p>
          </ReportSection>
        )}

        {hasValue(benchmarkName) && (
          <ReportSection number="06" icon={BarChart3} title="Benchmark comparison" description="Reference benchmark disclosed for the selected product.">
            <div className="flex flex-col justify-between gap-5 rounded-xl bg-[#f4f8f8] p-5 sm:flex-row sm:items-center dark:bg-slate-800/70">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Primary benchmark</p>
                <p className="mt-2 text-lg font-semibold text-[#14263d] dark:text-slate-100">{String(benchmarkName)}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Info className="h-4 w-4 text-[#0b7772]" /> Comparison data is displayed only where disclosed.
              </div>
            </div>
          </ReportSection>
        )}

        {(riskMetrics || hasValue(getRiskLabel(data))) && (
          <ReportSection number="07" icon={ShieldAlert} title="Risk metrics" description="Risk indicators and rating information available in the source.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="text-xs uppercase tracking-wider text-amber-700/70 dark:text-amber-300/70">Risk rating</p>
                <p className="mt-2 text-lg font-semibold text-amber-900 dark:text-amber-200">{formatValue(getRiskLabel(data))}</p>
              </div>
              {riskMetrics && Object.entries(riskMetrics).filter(([, value]) => hasValue(value) && typeof value !== "object").slice(0, 7).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-slate-100 bg-[#fbfcfc] p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-xs uppercase tracking-wider text-slate-400">{formatKey(key)}</p>
                  <p className="mt-2 text-lg font-semibold text-[#14263d] dark:text-slate-100">{formatValue(value, key)}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {(allocationRows.length > 0 || portfolio) && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportSection number="08" icon={PieChart} title="Portfolio allocation" description="Allocation data disclosed for the selected product.">
              {allocationRows.length > 0 ? <AllocationBars rows={allocationRows} /> : <p className="text-sm text-slate-400">Data Not Available</p>}
              {hasValue(portfolioAllocationNote) && <p className="mt-5 text-xs leading-5 text-slate-400">{String(portfolioAllocationNote)}</p>}
            </ReportSection>
            {holdings.length > 0 && (
              <ReportSection number="09" icon={WalletCards} title="Top holdings" description={hasValue(portfolio?.as_of) ? `As of ${formatDate(portfolio?.as_of)}` : "Largest disclosed positions."}>
                <div className="space-y-1">
                  {holdings.slice(0, 10).map((holding, index) => (
                    <div key={`${holding.name}-${index}`} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
                      <span className="w-6 text-xs font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{holding.name}</span>
                      <span className="text-sm font-semibold text-[#0b7772]">{formatValue(holding.weight, "weight_percent")}</span>
                    </div>
                  ))}
                </div>
              </ReportSection>
            )}
          </div>
        )}

        {managers.length > 0 && (
          <ReportSection number="10" icon={Users} title="Fund manager" description="People named in the selected product disclosure.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {managers.map((manager, index) => (
                <div key={String(manager.name ?? index)} className="rounded-xl border border-slate-100 p-5 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4f1ef] font-heading font-semibold text-[#0b7772] dark:bg-teal-950/50 dark:text-teal-300">{String(firstValue(manager, ["name"]) ?? "?").charAt(0)}</div>
                    <div>
                      <p className="font-semibold text-[#14263d] dark:text-slate-100">{formatValue(manager.name)}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatValue(manager.role ?? manager.experience_years, "experience_years")}</p>
                    </div>
                  </div>
                  {hasValue(manager.experience_summary) && <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{String(manager.experience_summary)}</p>}
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {scheme && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportSection number="11" icon={WalletCards} title="Fees & charges" description="Fees and minimums as stated in the source.">
              <InfoGrid rows={directRows(scheme).concat(
                Object.entries(scheme)
                  .filter(([key, value]) => isRecord(value) && ["management_fee", "performance_fee", "exit_load", "minimum_commitments", "minimum_commitment"].includes(key))
                  .map(([key, value]) => ({ label: formatKey(key), value: JSON.stringify(value).replace(/[{}"]/g, "").replace(/,/g, " • ") })),
              )} />
            </ReportSection>
            {term && (
              <ReportSection number="12" icon={CalendarDays} title="Investment horizon / fund term" description="Term, extension and liquidity details disclosed for the product.">
                <InfoGrid rows={directRows(term)} />
              </ReportSection>
            )}
          </div>
        )}

        {riskFlags.length > 0 && (
          <ReportSection number="13" icon={ShieldAlert} title="Risk factors" description="Product-specific flags identified in the selected source file.">
            <div className="grid gap-3 sm:grid-cols-2">
              {riskFlags.map((flag, index) => (
                <div key={`${String(flag.type ?? index)}-${index}`} className="flex gap-3 rounded-xl border border-red-100 bg-red-50/60 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200">{formatValue(flag.type ?? flag.title)}</p>
                    <p className="mt-1 text-sm leading-5 text-red-800/70 dark:text-red-200/70">{formatValue(flag.message ?? flag.description)}</p>
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        <section className="rounded-2xl border border-[#c8e2df] bg-[#eef8f7] p-6 sm:p-8 dark:border-teal-900 dark:bg-teal-950/20">
          <div className="flex items-start gap-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#0b7772]" />
            <div>
              <h2 className="font-heading text-xl font-semibold text-[#14263d] dark:text-slate-100">Important disclaimers</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">This report is for informational purposes only and is not investment, tax or legal advice. It is generated from the selected product&apos;s local source disclosure and may not reflect the latest changes. Please review the official product documents and consult a qualified advisor before making an investment decision.</p>
              {hasValue(sourceNote(data)) && <p className="mt-3 border-t border-[#c8e2df] pt-3 text-xs leading-5 text-slate-500 dark:border-teal-900 dark:text-slate-400">Source: {String(sourceNote(data))}</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SifPmsAifReportPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen">
          <AppHeader />
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="h-72 animate-pulse rounded-3xl bg-[#14263d]" />
          </div>
        </main>
      }
    >
      <SifPmsAifReportContent />
    </Suspense>
  );
}