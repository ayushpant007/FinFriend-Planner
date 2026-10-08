import type { InvestmentProduct } from "@/lib/sif-pms-aif";
import { parseExitLoadSchedule } from "@/lib/exit-load-schedule";

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inlineValue(line: string, label: string) {
  const match = line.match(
    new RegExp(`^\\s*${escapeRegExp(label)}(?:\\s+|$)(.*)$`, "i"),
  );
  return match?.[1]?.trim() ?? null;
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
  const index =
    typeof heading === "string"
      ? lines.findIndex(
          (line, cursor) =>
            cursor >= start &&
            compactHeading(line).startsWith(compactHeading(heading)),
        )
      : findIndex(lines, heading, start);
  if (index === -1) return null;
  if (typeof heading === "string") {
    const value = inlineValue(lines[index], heading);
    if (value) return value;
  }
  return nextLine(lines, index);
}

function numberFrom(value: string | null) {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function isAsOf(value: string) {
  return /^as of /i.test(value);
}

function parseTopMetrics(lines: string[]) {
  const start = lines.findIndex((line) =>
    compactHeading(line).includes("LATESTNAV"),
  );
  if (start === -1) {
    return {
      nav: { raw: null, value: null, asOf: null },
      aum: { raw: null, value: null, asOf: null },
      expenseRatio: { raw: null, value: null, asOf: null },
      minimumInvestment: { raw: null, value: null, asOf: null },
    };
  }

  const end = lines.findIndex(
    (line, index) =>
      index > start &&
      (compactHeading(line).includes("1MRETURN") ||
        compactHeading(line).includes("PERFORMANCERETURNS")),
  );
  const section = lines.slice(start + 1, end === -1 ? lines.length : end);
  const navIndex = section.findIndex((line) => /₹\s*[\d,]+(?:\.\d+)?/.test(line));
  const navMatch = navIndex === -1
    ? null
    : section[navIndex].match(/₹\s*[\d,]+(?:\.\d+)?/);
  const navRaw = firstNonPlaceholder(navMatch?.[0] ?? null);
  const navAsOf = navIndex === -1
    ? null
    : section.slice(navIndex + 1).find(isAsOf)?.replace(/^as of /i, "") ?? null;

  const aumIndex = section.findIndex((line) =>
    /₹\s*[\d,]+(?:\.\d+)?\s*(?:Cr|Crores?)\b/i.test(line),
  );
  const aumRaw = firstNonPlaceholder(aumIndex === -1 ? null : section[aumIndex]);
  const aumAsOf = aumIndex === -1
    ? null
    : section.slice(aumIndex + 1).find(isAsOf)?.replace(/^as of /i, "") ?? null;

  const expenseIndex = section.findIndex(
    (line) => !/^Regular:/i.test(line) && /[-+]?\d+(?:\.\d+)?\s*%/.test(line),
  );
  const expenseMatch =
    expenseIndex === -1
      ? null
      : section[expenseIndex].match(/[-+]?\d+(?:\.\d+)?\s*%/);
  const expenseRaw = firstNonPlaceholder(expenseMatch?.[0] ?? null);
  const minimumRaw = firstNonPlaceholder(
    section.find((line) => /₹\s*[\d,]+(?:\.\d+)?\s*(?:L|Lakhs?)\b/i.test(line)) ??
      null,
  );

  return {
    nav: { raw: navRaw, value: numberFrom(navRaw ?? null), asOf: navAsOf },
    aum: { raw: aumRaw, value: numberFrom(aumRaw ?? null), asOf: aumAsOf },
    expenseRatio: { raw: expenseRaw, value: numberFrom(expenseRaw ?? null), asOf: null },
    minimumInvestment: { raw: minimumRaw, value: numberFrom(minimumRaw ?? null), asOf: null },
  };
}

function parseExitLoad(lines: string[]) {
  const feeLine = lines.find(
    (line) => /^fees?\s*:/i.test(line) && /\bexit\s+load\b/i.test(line),
  );
  if (!feeLine) return null;

  const feeText = feeLine.replace(/^fees?\s*:\s*/i, "").trim();
  if (/^no\s+exit\s+load\b/i.test(feeText)) return "No exit load";

  const details = feeText.replace(/^exit\s+load\s*:?\s*/i, "").trim();
  return firstNonPlaceholder(details);
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
    const normalizedLabel = compactHeading(label);
    const index = section.findIndex((line) =>
      compactHeading(line).startsWith(normalizedLabel),
    );
    if (index === -1) continue;
    const value = firstNonPlaceholder(
      inlineValue(section[index], label) ?? nextLine(section, index),
    );
    if (value) result[label.toLowerCase().replace(/[^a-z]+/g, "_")] = value;
  }
  return result;
}

function parsePerformance(lines: string[]) {
  const labels = [
    ["1_month", /^(?:1M RETURN|1\s*Month)\s*(.*)$/i],
    ["3_month", /^(?:3M RETURN|3\s*Months?)\s*(.*)$/i],
    ["6_month", /^(?:6M RETURN|6\s*Months?)\s*(.*)$/i],
    ["1_year", /^(?:1Y RETURN|1\s*Year)\s*(.*)$/i],
    ["since_inception", /^Since\s+Inception\s*(.*)$/i],
  ] as const;
  const returns: JsonRecord = {};
  const start = findIndex(lines, "PERFORMANCE RETURNS");
  if (start === -1) return returns;
  const endCandidates = ["RISK PROFILE", "PORTFOLIO ALLOCATION", "IMPORTANT DISCLOSURES"]
    .map((heading) => findIndex(lines, heading, start + 1))
    .filter((index) => index !== -1);
  const end = endCandidates.length ? Math.min(...endCandidates) : lines.length;
  const section = lines.slice(start + 1, end);

  labels.forEach(([key, pattern]) => {
    const index = section.findIndex((line) => pattern.test(line));
    if (index === -1) return;
    const match = section[index].match(pattern);
    const value = firstNonPlaceholder(match?.[1]?.trim() || nextLine(section, index));
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

function parseNavHistory(lines: string[]) {
  const start = findIndex(lines, "NAV HISTORY");
  if (start === -1) return null;
  const end = findIndex(lines, "PERFORMANCE RETURNS", start + 1);
  const section = lines.slice(start + 1, end === -1 ? lines.length : end);
  const sectionText = section.join(" ");
  const dates = [...sectionText.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(
    ([date]) => date,
  );
  const lowRaw = sectionText.match(/\bLow:\s*(₹?\s*[\d,]+(?:\.\d+)?)/i)?.[1] ?? null;
  const highRaw = sectionText.match(/\bHigh:\s*(₹?\s*[\d,]+(?:\.\d+)?)/i)?.[1] ?? null;
  return {
    start_date: dates[0] ?? null,
    end_date: dates[1] ?? null,
    low: numberFrom(lowRaw),
    low_raw: lowRaw,
    high: numberFrom(highRaw),
    high_raw: highRaw,
  };
}

function parseHoldings(lines: string[]) {
  const start = findIndex(lines, /^PORTFOLIO HOLDINGS/);
  if (start === -1) return { total: null, holdings: [] };
  const total = lines[start].match(/\bOF\s+(\d+)\)/i)?.[1] ?? null;
  const header = findIndex(lines, /^#\s+SECURITY\b/i, start + 1);
  if (header === -1) return { total, holdings: [] };
  const end = findIndex(lines, /^Showing top|^IMPORTANT DISCLOSURES$/, header + 1);
  const section = lines.slice(header + 1, end === -1 ? lines.length : end);
  const holdings: JsonRecord[] = [];
  for (const line of section) {
    const row = line.match(
      /^(\d+)\s+(.+?)\s+(IN[A-Z0-9]{9}\d|—)(?:\s+(.+?))?\s+([-+]?(?:\d+(?:\.\d*)?|\.\d+)%|—)\s*$/i,
    );
    if (!row) continue;
    const name = row[2].trim();
    if (!name) continue;
    holdings.push({
      name,
      weight_percent: row[5] === "—" ? null : numberFrom(row[5]),
    });
    if (holdings.length >= 25) break;
  }
  return { total, holdings };
}

function splitManagerColumns(line: string) {
  return line
    .trim()
    .split(/\s{3,}|\s*\|\s*/)
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function isManagerRole(value: string) {
  return /\b(?:fund\s+manager|portfolio\s+manager|investment\s+manager|manager|vice\s+president|president|chief|ceo|director|officer|cio|cfo|head|portion|analyst|management|equity|fixed\s+income|debt|commodit(?:y|ies))\b/i.test(
    value,
  );
}

function isPersonName(value: string) {
  const candidate = value.trim();
  if (
    candidate.length > 80 ||
    /[\d₹%]/.test(candidate) ||
    /\b(?:fund|long[\s-]?short|research|sifscan)\b/i.test(candidate) ||
    isManagerRole(candidate)
  ) {
    return false;
  }
  return /^[\p{L}][\p{L}.'’\-]*(?:\s+[\p{L}][\p{L}.'’\-]*){1,5}$/u.test(candidate);
}

function parseManagerMentions(text: string): JsonRecord[] {
  const managers: JsonRecord[] = [];
  const seenNames = new Set<string>();
  const addName = (value: string) => {
    const candidate = value
      .replace(/\s+(?:under|who|team|brings|with)\b.*$/i, "")
      .replace(/[’']s$/, "")
      .trim();
    if (!isPersonName(candidate)) return;
    const key = candidate.toLocaleLowerCase();
    if (seenNames.has(key)) return;
    seenNames.add(key);
    managers.push({ name: candidate, role: "Fund Manager" });
  };

  for (const match of text.matchAll(/\bmanaged\s+by\s+([^.;\n]+)/gi)) {
    for (const candidate of match[1].split(/\s*,\s*|\s+and\s+/i)) {
      addName(candidate);
    }
  }
  for (const match of text.matchAll(
    /\bfund\s+manager\s+([\p{Lu}][\p{L}.'’\-]+(?:\s+[\p{Lu}][\p{L}.'’\-]+){1,4})/gu,
  )) {
    addName(match[1]);
  }
  return managers;
}

function parseFundManagers(text: string): JsonRecord[] {
  const sourceLines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\f/g, "").trimEnd());
  const mentionedManagers = parseManagerMentions(text);
  const start = sourceLines.findIndex(
    (line) => compactHeading(line.trim()) === "FUNDMANAGEMENT",
  );
  if (start === -1) return mentionedManagers;

  const end = sourceLines.findIndex((line, index) => {
    if (index <= start) return false;
    const key = compactHeading(line.trim());
    return (
      /^SIFscan Research\b/i.test(line.trim()) ||
      SECTION_HEADINGS.some(
        (heading) =>
          heading !== "FUND MANAGEMENT" && key === compactHeading(heading),
      )
    );
  });
  const section = sourceLines.slice(start + 1, end === -1 ? undefined : end);
  const managers: JsonRecord[] = [];
  const seenNames = new Set<string>();
  let pendingNames: string[] = [];

  const addManager = (name: string, role: string) => {
    const cleanedName = name.trim();
    const key = cleanedName.toLocaleLowerCase();
    if (!cleanedName || seenNames.has(key)) return;
    seenNames.add(key);
    managers.push({ name: cleanedName, role: role.trim() || "Fund Manager" });
  };

  const flushPendingNames = (roles: string[] = []) => {
    pendingNames.forEach((name, index) => {
      const role = roles.length
        ? roles[Math.min(index, roles.length - 1)]
        : "Fund Manager";
      addManager(name, role);
    });
    pendingNames = [];
  };

  for (const sourceLine of section) {
    const line = sourceLine.trim();
    if (!line || /^SIFscan Research\b/i.test(line)) continue;

    const inlineManager = line.match(
      /^(?:fund\s+manager|portfolio\s+manager)\s*[:—-]\s*(.+)$/i,
    );
    if (inlineManager && isPersonName(inlineManager[1])) {
      addManager(inlineManager[1], "Fund Manager");
      continue;
    }

    const cells = splitManagerColumns(line);
    if (cells.some(isManagerRole)) {
      flushPendingNames(cells.filter(isManagerRole));
      continue;
    }

    const names = cells.filter(isPersonName);
    if (names.length) {
      if (pendingNames.length) flushPendingNames();
      pendingNames = names;
    } else if (pendingNames.length) {
      flushPendingNames();
    }
  }

  flushPendingNames();
  return managers.length ? managers : mentionedManagers;
}

export function parseSifPdf(text: string, product: InvestmentProduct, fileName: string): JsonRecord {
  const lines = cleanLines(text);
  const titleIndex = findIndex(lines, "F U N D R E S E A R C H P A C K");
  const title = lines[titleIndex + 1] ?? product.label;
  const fundHouse = lines[titleIndex + 2] ?? "Data Not Available";
  const category = lines[titleIndex + 3] ?? "Specialised Investment Fund";
  const { nav, aum, expenseRatio, minimumInvestment } = parseTopMetrics(lines);
  const exitLoad = parseExitLoad(lines);
  const returns = parsePerformance(lines);
  const navHistory = parseNavHistory(lines);
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
      exit_load: exitLoad,
      exit_load_schedule: exitLoad ? parseExitLoadSchedule(exitLoad) : null,
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
    nav_history: navHistory,
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
    fund_managers: parseFundManagers(text),
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