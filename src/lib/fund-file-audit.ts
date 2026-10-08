import fs from "fs";
import path from "path";
import Papa from "papaparse";
import {
  getCuratedMutualFunds,
  type MutualFundScheme,
} from "@/lib/curated-mutual-funds";
import { MUTUAL_FUND_FILE_SPECS } from "@/lib/mutual-fund-file-registry";

export type FundAuditKind = "fund-list" | "holdings";
export type FundAuditStatus = "matched" | "unmatched" | "ambiguous" | "conflict";

export interface FundAuditFileSummary {
  fileName: string;
  label: string;
  kind: FundAuditKind;
  categoryLabel: string;
  apiCategory: string;
  fileExists: boolean;
  sourceRows: number;
  recognizedRows: number;
  fundCount: number;
  matchedCount: number;
  unmatchedCount: number;
  ambiguousCount: number;
  conflictCount: number;
  excludedRows: number;
  duplicateRows: number;
  parserWarnings: string[];
  error?: string;
}

export interface FundAuditFund {
  id: string;
  sourceFundName: string;
  sourceSchemeCode: string;
  sourcePlan: string;
  sourceIsin: string;
  sourceCategory: string;
  sourceSubcategory: string;
  sourceRowsCount: number;
  status: FundAuditStatus;
  matchMethod: "scheme-code" | "exact-name-and-plan" | "exact-name" | null;
  matchNote: string;
  matchedFund: MutualFundScheme | null;
  possibleMatches: MutualFundScheme[];
  sourceDetails: Record<string, string>;
  holdingsPreview: Record<string, string>[];
}

export interface FundAuditFileData {
  summary: FundAuditFileSummary;
  funds: FundAuditFund[];
}

export interface FundAuditSnapshot {
  generatedAt: string;
  backendFundCount: number;
  summary: {
    fileCount: number;
    sourceRows: number;
    recognizedRows: number;
    fundCount: number;
    fundListCount: number;
    holdingsFundCount: number;
    matchedCount: number;
    unmatchedCount: number;
    ambiguousCount: number;
    conflictCount: number;
    excludedRows: number;
  };
  files: FundAuditFileData[];
}

type RawCsvRow = Record<string, string>;

interface FundGroup {
  id: string;
  sourceFundName: string;
  sourceSchemeCode: string;
  sourcePlan: string;
  sourceIsin: string;
  sourceCategory: string;
  sourceSubcategory: string;
  sourceRowsCount: number;
  sourceDetails: Record<string, string>;
  holdingsPreview: Record<string, string>[];
  sourceConflict: boolean;
}

interface AuditFileSpec {
  fileName: string;
  label: string;
  kind: FundAuditKind;
  categoryLabel: string;
  apiCategory: string;
}

const AUDIT_FILES: AuditFileSpec[] = MUTUAL_FUND_FILE_SPECS.flatMap((spec) => [
  {
    fileName: spec.fundFile,
    label: spec.fundFileLabel,
    kind: "fund-list" as const,
    categoryLabel: spec.categoryLabel,
    apiCategory: spec.apiCategory,
  },
  {
    fileName: spec.holdingsFile,
    label: spec.holdingsFileLabel,
    kind: "holdings" as const,
    categoryLabel: spec.categoryLabel,
    apiCategory: spec.apiCategory,
  },
]);

let cachedSnapshot: { signature: string; snapshot: FundAuditSnapshot } | null = null;

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeSchemeCode(value: string): string {
  return value.trim().replace(/\.0+$/, "");
}

function readField(row: RawCsvRow, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return "";
}

function visibleDetails(row: RawCsvRow): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key, value]) => key.trim() && String(value ?? "").trim())
      .map(([key, value]) => [key.trim(), String(value).trim()]),
  );
}

function getSignature(): string {
  const root = path.join(process.cwd(), "Mutual Fund");
  return AUDIT_FILES.map(({ fileName }) => {
    const fullPath = path.join(root, fileName);
    try {
      const stat = fs.statSync(fullPath);
      return `${fileName}:${stat.size}:${stat.mtimeMs}`;
    } catch {
      return `${fileName}:missing`;
    }
  }).join("|");
}

function indexBackendFunds(funds: MutualFundScheme[]) {
  const byCode = new Map<string, MutualFundScheme[]>();
  const byName = new Map<string, MutualFundScheme[]>();

  function add(index: Map<string, MutualFundScheme[]>, key: string, fund: MutualFundScheme) {
    const entries = index.get(key) ?? [];
    const duplicate = entries.some(
      (entry) =>
        entry.schemeCode === fund.schemeCode &&
        entry.schemeName === fund.schemeName &&
        entry.plan === fund.plan,
    );
    if (!duplicate) entries.push(fund);
    index.set(key, entries);
  }

  for (const fund of funds) {
    const category = normalizeText(fund.category);
    add(
      byCode,
      `${category}|${normalizeSchemeCode(fund.schemeCode)}`,
      fund,
    );
    add(byName, `${category}|${normalizeText(fund.schemeName)}`, fund);
  }

  return { byCode, byName };
}

function findMatch(
  group: FundGroup,
  apiCategory: string,
  indexes: ReturnType<typeof indexBackendFunds>,
): Pick<
  FundAuditFund,
  "status" | "matchMethod" | "matchNote" | "matchedFund" | "possibleMatches"
> {
  const categoryKey = normalizeText(apiCategory);
  const nameKey = `${categoryKey}|${normalizeText(group.sourceFundName)}`;
  const exactNameMatches = indexes.byName.get(nameKey) ?? [];
  const planMatches = group.sourcePlan
    ? exactNameMatches.filter(
        (fund) => normalizeText(fund.plan) === normalizeText(group.sourcePlan),
      )
    : exactNameMatches;

  if (group.sourceConflict) {
    return {
      status: "conflict",
      matchMethod: null,
      matchNote: "This source key contains conflicting name, plan, or category values.",
      matchedFund: null,
      possibleMatches: exactNameMatches,
    };
  }

  if (group.sourceSchemeCode) {
    const codeKey = `${categoryKey}|${normalizeSchemeCode(group.sourceSchemeCode)}`;
    const codeMatches = indexes.byCode.get(codeKey) ?? [];
    const verifiedCodeMatches = codeMatches.filter(
      (fund) =>
        normalizeText(fund.schemeName) === normalizeText(group.sourceFundName) &&
        (!group.sourcePlan || normalizeText(fund.plan) === normalizeText(group.sourcePlan)),
    );

    if (verifiedCodeMatches.length === 1) {
      return {
        status: "matched",
        matchMethod: "scheme-code",
        matchNote: "Scheme code, fund name, and plan agree with the backend API.",
        matchedFund: verifiedCodeMatches[0],
        possibleMatches: [],
      };
    }
    if (verifiedCodeMatches.length > 1) {
      return {
        status: "ambiguous",
        matchMethod: null,
        matchNote: "More than one API record has the same scheme code, name, and plan.",
        matchedFund: null,
        possibleMatches: verifiedCodeMatches,
      };
    }
    if (codeMatches.length > 0) {
      return {
        status: "conflict",
        matchMethod: null,
        matchNote: "The scheme code exists in the API, but its fund name or plan differs.",
        matchedFund: null,
        possibleMatches: codeMatches,
      };
    }
    if (exactNameMatches.length > 0) {
      return {
        status: "conflict",
        matchMethod: null,
        matchNote: "The fund name exists in the API, but the scheme code does not agree.",
        matchedFund: null,
        possibleMatches: planMatches.length > 0 ? planMatches : exactNameMatches,
      };
    }
    return {
      status: "unmatched",
      matchMethod: null,
      matchNote: "No scheme-code or exact-name match was found in this API category.",
      matchedFund: null,
      possibleMatches: [],
    };
  }

  if (planMatches.length === 1) {
    return {
      status: "matched",
      matchMethod: group.sourcePlan ? "exact-name-and-plan" : "exact-name",
      matchNote: group.sourcePlan
        ? "Exact fund name and plan match the backend API."
        : "Exact full fund name match the backend API.",
      matchedFund: planMatches[0],
      possibleMatches: [],
    };
  }
  if (planMatches.length > 1) {
    return {
      status: "ambiguous",
      matchMethod: null,
      matchNote: "Multiple API schemes have this exact fund name and plan.",
      matchedFund: null,
      possibleMatches: planMatches,
    };
  }
  if (exactNameMatches.length > 0) {
    return {
      status: "conflict",
      matchMethod: null,
      matchNote: "The fund name exists in the API, but its plan does not agree.",
      matchedFund: null,
      possibleMatches: exactNameMatches,
    };
  }
  return {
    status: "unmatched",
    matchMethod: null,
    matchNote: "No exact full-name match was found in this API category.",
    matchedFund: null,
    possibleMatches: [],
  };
}

function summarizeFile(
  spec: AuditFileSpec,
  groups: FundGroup[],
  sourceRows: number,
  recognizedRows: number,
  parserWarnings: string[],
  indexes: ReturnType<typeof indexBackendFunds>,
  error?: string,
): FundAuditFileData {
  const funds: FundAuditFund[] = groups
    .map((group) => ({
      id: group.id,
      sourceFundName: group.sourceFundName,
      sourceSchemeCode: group.sourceSchemeCode,
      sourcePlan: group.sourcePlan,
      sourceIsin: group.sourceIsin,
      sourceCategory: group.sourceCategory,
      sourceSubcategory: group.sourceSubcategory,
      sourceRowsCount: group.sourceRowsCount,
      sourceDetails: group.sourceDetails,
      holdingsPreview: group.holdingsPreview,
      ...findMatch(group, spec.apiCategory, indexes),
    }))
    .sort((a, b) => a.sourceFundName.localeCompare(b.sourceFundName));

  const count = (status: FundAuditStatus) => funds.filter((fund) => fund.status === status).length;
  return {
    summary: {
      fileName: spec.fileName,
      label: spec.label,
      kind: spec.kind,
      categoryLabel: spec.categoryLabel,
      apiCategory: spec.apiCategory,
      fileExists: !error,
      sourceRows,
      recognizedRows,
      fundCount: funds.length,
      matchedCount: count("matched"),
      unmatchedCount: count("unmatched"),
      ambiguousCount: count("ambiguous"),
      conflictCount: count("conflict"),
      excludedRows: Math.max(0, sourceRows - recognizedRows),
      duplicateRows: Math.max(0, recognizedRows - funds.length),
      parserWarnings,
      ...(error ? { error } : {}),
    },
    funds,
  };
}

function buildFile(
  spec: AuditFileSpec,
  apiIndexes: ReturnType<typeof indexBackendFunds>,
): FundAuditFileData {
  const filePath = path.join(process.cwd(), "Mutual Fund", spec.fileName);
  if (!fs.existsSync(filePath)) {
    return summarizeFile(
      spec,
      [],
      0,
      0,
      [],
      apiIndexes,
      `Source file is missing: ${spec.fileName}`,
    );
  }

  const parsed = Papa.parse<RawCsvRow>(fs.readFileSync(filePath, "utf-8"), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
  });
  const rows = parsed.data.filter((row) =>
    Object.values(row).some((value) => String(value ?? "").trim()),
  );
  const groups = new Map<string, FundGroup>();
  let recognizedRows = 0;

  for (const row of rows) {
    const name = readField(row, "Fund Name", "fund_name", "Scheme Name", "scheme_name", "");
    const schemeCode = readField(row, "Scheme Code", "scheme_code", "AMFI Scheme Code");
    const plan = readField(row, "Plan", "plan");
    const isin = readField(row, "ISIN", "isin", "ISIN (Growth/Cumulative)");
    const category = readField(row, "Category", "category");
    const subcategory = readField(row, "Subcategory", "subcategory");

    if (spec.kind === "fund-list") {
      const isRepeatedHeader =
        normalizeText(name) === "fund name" ||
        normalizeText(schemeCode) === "scheme code" ||
        normalizeText(plan) === "plan";
      const hasValidPlan = /^(direct|regular)$/i.test(plan);
      if (!name || isRepeatedHeader || (!schemeCode && !hasValidPlan)) continue;
    } else if (!name) {
      continue;
    }

    recognizedRows += 1;
    const groupKey =
      spec.kind === "holdings"
        ? `name:${normalizeText(name)}`
        : schemeCode
          ? `code:${normalizeSchemeCode(schemeCode)}`
          : `name:${normalizeText(name)}|plan:${normalizeText(plan)}|isin:${normalizeText(isin)}`;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.sourceRowsCount += 1;
      if (
        normalizeText(existing.sourceFundName) !== normalizeText(name) ||
        normalizeText(existing.sourcePlan) !== normalizeText(plan) ||
        normalizeText(existing.sourceCategory) !== normalizeText(category) ||
        normalizeText(existing.sourceSubcategory) !== normalizeText(subcategory)
      ) {
        existing.sourceConflict = true;
      }
      if (spec.kind === "holdings" && existing.holdingsPreview.length < 4) {
        existing.holdingsPreview.push(visibleDetails(row));
      }
      continue;
    }

    groups.set(groupKey, {
      id: `${spec.fileName}:${groupKey}`,
      sourceFundName: name,
      sourceSchemeCode: schemeCode,
      sourcePlan: plan,
      sourceIsin: isin,
      sourceCategory: category,
      sourceSubcategory: subcategory,
      sourceRowsCount: 1,
      sourceDetails: visibleDetails(row),
      holdingsPreview: spec.kind === "holdings" ? [visibleDetails(row)] : [],
      sourceConflict: false,
    });
  }

  const parserWarnings = parsed.errors
    .slice(0, 5)
    .map((issue) => `Row ${issue.row ?? "?"}: ${issue.message}`);
  return summarizeFile(
    spec,
    Array.from(groups.values()),
    rows.length,
    recognizedRows,
    parserWarnings,
    apiIndexes,
  );
}

export function getFundFileAuditSnapshot(): FundAuditSnapshot {
  const signature = getSignature();
  if (cachedSnapshot?.signature === signature) return cachedSnapshot.snapshot;

  const apiFunds = getCuratedMutualFunds();
  const indexes = indexBackendFunds(apiFunds);
  const files = AUDIT_FILES.map((spec) => buildFile(spec, indexes));
  const fileSummaries = files.map((file) => file.summary);
  const sum = (key: keyof Pick<
    FundAuditFileSummary,
    | "sourceRows"
    | "recognizedRows"
    | "fundCount"
    | "matchedCount"
    | "unmatchedCount"
    | "ambiguousCount"
    | "conflictCount"
    | "excludedRows"
  >) => fileSummaries.reduce((total, file) => total + file[key], 0);

  const snapshot: FundAuditSnapshot = {
    generatedAt: new Date().toISOString(),
    backendFundCount: apiFunds.length,
    summary: {
      fileCount: files.length,
      sourceRows: sum("sourceRows"),
      recognizedRows: sum("recognizedRows"),
      fundCount: sum("fundCount"),
      fundListCount: fileSummaries
        .filter((file) => file.kind === "fund-list")
        .reduce((total, file) => total + file.fundCount, 0),
      holdingsFundCount: fileSummaries
        .filter((file) => file.kind === "holdings")
        .reduce((total, file) => total + file.fundCount, 0),
      matchedCount: sum("matchedCount"),
      unmatchedCount: sum("unmatchedCount"),
      ambiguousCount: sum("ambiguousCount"),
      conflictCount: sum("conflictCount"),
      excludedRows: sum("excludedRows"),
    },
    files,
  };

  cachedSnapshot = { signature, snapshot };
  return snapshot;
}

export function normalizeFundAuditSearch(value: string): string {
  return normalizeText(value);
}
