import type { InvestmentProduct } from "@/lib/sif-pms-aif";

type JsonRecord = Record<string, unknown>;

const SECTION_HEADINGS = [
  "INVESTMENT OBJECTIVE",
  "STRATEGY PARAMETERS",
  "FUND MANAGEMENT",
  "ADDITIONAL NOTES",
  "NAV HISTORY",
  "PERFORMANCE RETURNS",
  "RISK PROFILE",
  "PORTFOLIO ALLOCATION",
  "PORTFOLIO HOLDINGS",
  "IMPORTANT DISCLOSURES",
];

function cleanLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(
      (line) =>
        line &&
        line !== "|" &&
        line !== "Research" &&
        line !== "| Research" &&
        line !== "sifscan.com" &&
        !/^SIFscan Research/.test(line) &&
        !/^\d+\s*\/\s*\d+$/.test(line),
    );
}

function isPlaceholder(value: string | null | undefined) {
  return !value || value === "—" || value === "-";
}

function firstNonPlaceholder(value: string | null | undefined) {
  return isPlaceholder(value) ? null : value;
}

function findIndex(lines: string[], pattern: RegExp | string, start = 0) {
  return lines.findIndex((line, index) => {
    if (index < start) return false;
    if (typeof pattern !== "string") return pattern.test(line);
    return line === pattern || compactHeading(line) === compactHeading(pattern);
  });
}

function compactHeading(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function nextLine(lines: string[], index: number, skipPattern?: RegExp) {
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const value = lines[cursor];
    if (skipPattern?.test(value)) continue;
    return value;
  }
  return null;
}

function valueAfter(lines: string[], heading: string | RegExp, start = 0) {
  const index = findIndex(lines, heading, start);
  return index === -1 ? null : nextLine(lines, index);
}

function numberFrom(value: string | null) {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function isPercentage(value: string) {
  return /^[-+]?\d+(?:\.\d+)?%$/.test(value);
}

function isAsOf(value: string) {
  return /^as of /i.test(value);
}

function asOfAfter(lines: string[], index: number) {
  const candidate = lines[index + 2];
  return candidate?.match(/^as of (.+)$/i)?.[1] ?? null;
}

function parseTopMetrics(lines: string[]) {
  const start = findIndex(lines, "LATEST NAV");
  if (start === -1) {
    return {
      nav: { raw: null, value: null, asOf: null },
      aum: { raw: null, value: null, asOf: null },
      expenseRatio: { raw: null, value: null, asOf: null },
      minimumInvestment: { raw: null, value: null, asOf: null },
    };
  }

  const endCandidates = ["1M RETURN", "1 Month", "PERFORMANCE RETURNS"]
    .map((heading) => findIndex(lines, heading, start + 1))
    .filter((index) => index !== -1);
  const end = endCandidates.length ? Math.min(...endCandidates) : lines.length;
  const section = lines.slice(start, end);
  const headerIndexes = ["LATEST NAV", "AUM", "EXPENSE RATIO", "MIN. INVESTMENT"]
    .map((heading) => findIndex(section, heading))
    .filter((index) => index !== -1);
  const values = section
    .slice(headerIndexes.length ? Math.max(...headerIndexes) + 1 : 1)
    .filter((line) => line !== "RETURN");

  const navRaw = firstNonPlaceholder(values[0]);
  const navAsOfIndex = values.findIndex(isAsOf);
  const navAsOf = navAsOfIndex === -1 ? null : values[navAsOfIndex].replace(/^as of /i, "");
  const aumStart = navAsOfIndex === -1 ? 1 : navAsOfIndex + 1;
  const aumEnd = values.findIndex((value, index) => index >= aumStart && (isAsOf(value) || isPercentage(value)));
  const aumLines = values.slice(aumStart, aumEnd === -1 ? values.length : aumEnd);
  const aumRaw = firstNonPlaceholder(aumLines.join(" ").trim());
  const expenseIndex = values.findIndex((value, index) => index >= aumStart && isPercentage(value));
  const expenseRaw = firstNonPlaceholder(expenseIndex === -1 ? null : values[expenseIndex]);
  const minimumRaw = firstNonPlaceholder(
    values
      .slice(expenseIndex === -1 ? 0 : expenseIndex + 1)
      .find((value) => !isAsOf(value) && !/^Regular:/i.test(value)),
  );

  return {
    nav: { raw: navRaw, value: numberFrom(navRaw ?? null), asOf: navAsOf },
    aum: { raw: aumRaw, value: numberFrom(aumRaw ?? null), asOf: null },
    expenseRatio: { raw: expenseRaw, value: numberFrom(expenseRaw ?? null), asOf: null },
    minimumInvestment: { raw: minimumRaw, value: numberFrom(minimumRaw ?? null), asOf: null },
  };
}

function collectSection(lines: string[], heading: string) {
  const start = findIndex(lines, heading);
  if (start === -1) return null;
  const endCandidates = SECTION_HEADINGS
    .filter((candidate) => candidate !== heading)
    .map((candidate) => findIndex(lines, candidate, start + 1))
    .filter((index) => index !== -1);
  const end = endCandidates.length ? Math.min(...endCandidates) : lines.length;
  const body = lines.slice(start + 1, end).filter((line) => !/^SIFscan Research/.test(line));
  return body.length ? body.join(" ") : null;
}

function parseStrategyParameters(lines: string[]) {
  const start = findIndex(lines, "STRATEGY PARAMETERS");
  if (start === -1) return {};
  const endCandidates = ["FUND MANAGEMENT", "ADDITIONAL NOTES", "NAV HISTORY"]
    .map((heading) => findIndex(lines, heading, start + 1))
    .filter((index) => index !== -1);
  const end = endCandidates.length ? Math.min(...endCandidates) : lines.length;
  const section = lines.slice(start + 1, end);
  const labels = [
    "Lock-in Period",
    "Redemption Frequency",
    "Derivatives",
    "Short Selling",
    "Gross Exposure",
    "Net Exposure",
    "Risk Band",
    "Complexity",
    "Benchmark",
    "Style & Risk Tags",
  ];
  const result: JsonRecord = {};
  for (const label of labels) {
    const index = section.indexOf(label);
    if (index === -1) continue;
    const value = firstNonPlaceholder(section[index + 1]);
    if (value) result[label.toLowerCase().replace(/[^a-z]+/g, "_")] = value;
  }
  return result;
}

function parsePerformance(lines: string[]) {
  const labels = [
    ["1_month", /^(1M RETURN|1 Month)$/i],
    ["3_month", /^(3M RETURN|3 Months)$/i],
    ["6_month", /^(6M RETURN|6 Months)$/i],
    ["1_year", /^(1Y RETURN|1 Year)$/i],
    ["since_inception", /^(SINCE INCEPTION|Since Inception)$/i],
  ] as const;
  const returns: JsonRecord = {};
  const indexes = labels.map(([, heading]) => findIndex(lines, heading)).filter((index) => index !== -1);
  if (!indexes.length) return returns;
  const endCandidates = SECTION_HEADINGS
    .map((heading) => findIndex(lines, heading, Math.min(...indexes) + 1))
    .filter((index) => index !== -1);
  const end = endCandidates.length ? Math.min(...endCandidates) : lines.length;
  const values = lines
    .slice(Math.min(...indexes), end)
    .filter(
      (line) =>
        !labels.some(([, heading]) => heading.test(line)) &&
        line !== "RETURN",
    );
  labels.forEach(([key], index) => {
    const value = firstNonPlaceholder(values[index]);
    if (value) returns[key] = numberFrom(value);
  });
  return returns;
}

function parseRiskProfile(lines: string[]) {
  const start = findIndex(lines, "SEBI RISK BAND");
  if (start === -1) return { riskBand: null, complexity: null };
  const end = findIndex(lines, "IMPORTANT DISCLOSURES", start + 1);
  const values = lines
    .slice(start, end === -1 ? lines.length : end)
    .filter((line) => line !== "SEBI RISK BAND" && line !== "COMPLEXITY");
  return {
    riskBand: firstNonPlaceholder(values[0]),
    complexity: firstNonPlaceholder(values[1]),
  };
}

function parseHoldings(lines: string[]) {
  const start = findIndex(lines, /^PORTFOLIO HOLDINGS/);
  if (start === -1) return { total: null, holdings: [] };
  const total = lines[start].match(/\bOF\s+(\d+)\)/i)?.[1] ?? null;
  const header = findIndex(lines, "#", start + 1);
  if (header === -1) return { total, holdings: [] };
  const end = findIndex(lines, /^Showing top|^IMPORTANT DISCLOSURES$/, header + 1);
  const section = lines.slice(header + 1, end === -1 ? lines.length : end);
  const holdings: JsonRecord[] = [];
  for (let index = 0; index < section.length; index += 1) {
    if (!/^\d+$/.test(section[index])) continue;
    const name = section[index + 1];
    if (!name || /^\d+$/.test(name)) continue;
    const weightIndex = section.findIndex(
      (value, candidateIndex) =>
        candidateIndex > index + 1 && (/^[-+]?[\d.]+%$/.test(value) || value === "—"),
    );
    const weight = weightIndex === -1 ? null : numberFrom(section[weightIndex]);
    holdings.push({ name, weight_percent: weight });
    if (holdings.length >= 25) break;
  }
  return { total, holdings };
}

export function parseSifPdf(text: string, product: InvestmentProduct, fileName: string): JsonRecord {
  const lines = cleanLines(text);
  const titleIndex = findIndex(lines, "F U N D R E S E A R C H P A C K");
  const title = lines[titleIndex + 1] ?? product.label;
  const fundHouse = lines[titleIndex + 2] ?? "Data Not Available";
  const category = lines[titleIndex + 3] ?? "Specialised Investment Fund";
  const { nav, aum, expenseRatio, minimumInvestment } = parseTopMetrics(lines);
  const returns = parsePerformance(lines);
  const objective = collectSection(lines, "INVESTMENT OBJECTIVE");
  const strategyParameters = parseStrategyParameters(lines);
  const riskProfile = parseRiskProfile(lines);
  const riskBand = firstNonPlaceholder(
    riskProfile.riskBand ?? (strategyParameters.risk_band as string | undefined),
  );
  const complexity = firstNonPlaceholder(
    riskProfile.complexity ?? (valueAfter(lines, "COMPLEXITY") as string | null),
  );
  const benchmark = firstNonPlaceholder(
    valueAfter(lines, "BENCHMARK") ?? strategyParameters.benchmark as string | undefined,
  );
  const holdings = parseHoldings(lines);
  const disclosure = collectSection(lines, "IMPORTANT DISCLOSURES");
  const latestDate = nav.asOf ?? aum.asOf ?? null;

  return {
    schema_version: "pdf-research-pack",
    product_type: "SIF",
    product_category: category,
    source_file: fileName,
    fund: {
      name: title,
      short_name: product.label,
      amc: fundHouse,
      category,
      status: "Active",
      benchmark,
      risk_level: riskBand,
    },
    investment_objective: {
      objective: objective ?? null,
      investment_horizon: "Long Term",
      primary_asset_class: category,
    },
    investment_strategy: {
      description: Object.keys(strategyParameters).length
        ? "Strategy parameters disclosed in the selected SIF research pack."
        : null,
    },
    scheme_details: {
      minimum_initial_investment: minimumInvestment.raw,
      expense_ratio: expenseRatio.raw,
      structure: "Open Ended",
    },
    current_data: {
      as_of: latestDate,
      nav: { value: nav.value, currency: "INR", raw: nav.raw },
      aum: { value: aum.value, unit: aum.raw?.replace(/[₹\d.,\s]/g, "") || null, raw: aum.raw },
      expense_ratio: { value: expenseRatio.value, unit: "percent", raw: expenseRatio.raw },
      risk_rating: riskBand,
    },
    performance: {
      as_of: latestDate,
      returns,
      performance_context: { message: "Values are extracted from the selected PDF research pack." },
    },
    benchmark: { primary_benchmark: { name: benchmark } },
    risk_metrics: {
      risk_band: riskBand,
      complexity,
    },
    portfolio: {
      total_holdings: holdings.total ? Number(holdings.total) : null,
      top_holdings: holdings.holdings,
      portfolio_note: holdings.total
        ? `Top holdings extracted from the selected PDF. Total disclosed holdings: ${holdings.total}.`
        : null,
    },
    fund_managers: [],
    investment_highlights: [
      { title: "Latest NAV", description: nav.raw ?? null },
      { title: "Expense ratio", description: expenseRatio.raw ?? null },
      { title: "Minimum investment", description: minimumInvestment.raw ?? null },
    ],
    risk_flags: riskBand
      ? [{ type: "SEBI risk band", severity: "info", message: riskBand }]
      : [],
    application_display: {
      hero: {
        title,
        subtitle: `${category} · ${fundHouse}`,
      },
    },
    data_metadata: {
      primary_source: fileName,
      last_verified: latestDate,
      disclosure,
      strategy_parameters: strategyParameters,
      use_null_for_missing_data: true,
    },
  };
}