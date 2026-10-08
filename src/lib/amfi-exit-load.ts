import {
  getCuratedMutualFunds,
  type MutualFundScheme,
} from "@/lib/curated-mutual-funds";
import { getAllFundCsvRecords } from "@/lib/funds-csv";
import {
  parseExitLoadSchedule,
  type ExitLoadScheduleEntry,
} from "@/lib/exit-load-schedule";

const AMFI_SCHEME_DETAILS_URL = "https://www.amfiindia.com/otherdata/scheme-details";
const AMFI_SCHEME_LIST_URL = "https://www.amfiindia.com/api/populate-scheme";
const AMFI_SCHEME_DATA_URL = "https://www.amfiindia.com/api/scheme-data";
const AMFI_SCHEME_URL = "https://www.amfiindia.com/api/scheme-details";
const MFAPI_SCHEME_URL = "https://api.mfapi.in/mf";
const SOURCE_URL = AMFI_SCHEME_DETAILS_URL;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface FundExitLoadRequest {
  allocationId: string;
  schemeCode: string;
  schemeName: string;
  fundName: string;
  planType?: string;
}

export interface FundExitLoadResult {
  allocationId: string;
  schemeCode: string;
  schemeName: string;
  fundName: string;
  status: "available" | "unavailable" | "unverified";
  exitLoad: string | null;
  exitLoadSchedule: ExitLoadScheduleEntry[] | null;
  message: string;
  sourceUrl: string | null;
}

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

interface AmfiFundHouse {
  mf_id: string;
  mf_name: string;
  amc_name?: string;
}

interface AmfiScheme {
  scheme_id: string;
  scheme_name: string;
}

const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedSourceLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeFundHouse(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\babsl\b/g, "aditya birla sun life")
    .replace(/\bicici\s+pru\b/g, "icici prudential")
    .replace(/\bfranklin india\b/g, "franklin templeton")
    .replace(/\bkotak\b/g, "kotak mahindra")
    .replace(/\bjm\b/g, "jm financial")
    .replace(/\blic\s+mf\b/g, "lic")
    .replace(/\btrust\s+mf\b/g, "trust")
    .replace(/\b(?:mutual\s+fund|asset\s+management|company|limited|ltd|mf)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeSchemeBase(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\babsl\b/gi, "Aditya Birla Sun Life")
    .replace(/\bicici\s+pru\b/gi, "ICICI Prudential")
    // These are verified legacy labels already accepted by the NAV identity check.
    .replace(/\bsbi\s+savings?\b/gi, "SBI Money Market")
    .replace(/\bhdfc\s+low\s+duration\b/gi, "HDFC Ultra Short to Short Term")
    .replace(/\bkotak\s+low\s+duration\b/gi, "Kotak Ultra Short to Short Term")
    .replace(/\s*\([^)]*\bformerly\b[^)]*\)/gi, "")
    .replace(
      /\s*[-–]\s*(?:direct|regular|dir|reg)\s*(?:plan)?(?:\s*[-–]\s*(?:growth|idcw|dividend|payout|reinvestment|bonus)(?:\s+option)?)*\s*$/i,
      "",
    )
    .replace(
      /\s+(?:direct|regular|dir|reg)(?:\s+plan)?(?:\s*[-–]?\s*(?:growth|idcw|dividend|payout|reinvestment|bonus)(?:\s+option)?)*\s*$/i,
      "",
    )
    .replace(/\s*[-–]\s*(?:growth|idcw|dividend|payout|reinvestment|bonus)(?:\s+option)?\s*$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bfund$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function planFrom(value: string) {
  if (/\b(?:direct|dir)\b/i.test(value)) return "direct";
  if (/\b(?:regular|reg|ret)\b/i.test(value)) return "regular";
  return null;
}

function optionFrom(value: string) {
  if (/\b(?:idcw|dividend|payout|reinvestment)\b/i.test(value)) return "idcw";
  if (/\bgrowth\b/i.test(value)) return "growth";
  if (/\bbonus\b/i.test(value)) return "bonus";
  return null;
}

function extractJsonArrayProperty(payload: string, propertyName: string): unknown[] | null {
  const marker = `"${propertyName}":`;
  const propertyIndex = payload.indexOf(marker);
  if (propertyIndex === -1) return null;

  const start = payload.indexOf("[", propertyIndex + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < payload.length; index += 1) {
    const character = payload[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        const parsed: unknown = JSON.parse(payload.slice(start, index + 1));
        return Array.isArray(parsed) ? parsed : null;
      }
    }
  }

  return null;
}

function parseAmfiFundHouses(html: string): AmfiFundHouse[] {
  const pushPattern = /self\.__next_f\.push\(\[1,\s*("(?:\\.|[^"\\])*")\s*\]\)/g;
  for (const match of html.matchAll(pushPattern)) {
    let payload: string;
    try {
      payload = JSON.parse(match[1]) as string;
    } catch {
      continue;
    }

    const parsed = extractJsonArrayProperty(payload, "mutualFunds");
    if (!parsed) continue;

    const funds = parsed.filter(
      (item): item is Record<string, unknown> =>
        isRecord(item) && typeof item.mf_id === "string" && typeof item.mf_name === "string",
    );
    if (funds.length === 0) continue;

    return funds.map((item) => ({
      mf_id: item.mf_id as string,
      mf_name: item.mf_name as string,
      ...(typeof item.amc_name === "string" ? { amc_name: item.amc_name } : {}),
    }));
  }

  throw new Error("Could not read the AMC list from AMFI Scheme Details.");
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "text/html,text/plain,*/*" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}.`);
  return response.text();
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}.`);
  return response.json();
}

function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const existing = responseCache.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return Promise.resolve(existing.value as T);
  }

  const pending = pendingRequests.get(key);
  if (pending) return pending as Promise<T>;

  const request = loader()
    .then((value) => {
      responseCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, request);
  return request;
}

function getDataRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value) && Array.isArray(value.data)) return value.data.filter(isRecord);
  return [];
}

async function getAmfiFundHouses() {
  return cached("amfi:fund-houses", DAY_MS, async () =>
    parseAmfiFundHouses(await fetchText(AMFI_SCHEME_DETAILS_URL)),
  );
}

async function getAmfiSchemes(mfId: string): Promise<AmfiScheme[]> {
  return cached(`amfi:schemes:${mfId}`, DAY_MS, async () => {
    const query = new URLSearchParams({ MF_ID: mfId });
    const rows = getDataRows(await fetchJson(`${AMFI_SCHEME_LIST_URL}?${query.toString()}`));
    const schemes = rows
      .filter(
        (row) =>
          (typeof row.scheme_id === "string" || typeof row.scheme_id === "number") &&
          typeof row.scheme_name === "string",
      )
      .map((row) => ({
        scheme_id: String(row.scheme_id),
        scheme_name: row.scheme_name as string,
      }));
    if (schemes.length === 0) throw new Error("AMFI returned no schemes for this fund house.");
    return schemes;
  });
}

async function getAmfiVariants(mfId: string, schemeId: string) {
  const key = `amfi:variants:${mfId}:${schemeId}`;
  return cached(key, 6 * HOUR_MS, async () => {
    const query = new URLSearchParams({
      strMFId: mfId,
      strSDId: schemeId,
      strOption: "NAV",
    });
    const rows = getDataRows(await fetchJson(`${AMFI_SCHEME_DATA_URL}?${query.toString()}`));
    if (rows.length === 0) throw new Error("AMFI returned no plan details for this scheme.");
    return rows;
  });
}

async function getAmfiSchemeDetails(mfId: string, schemeId: string) {
  const key = `amfi:detail:${mfId}:${schemeId}`;
  return cached(key, 6 * HOUR_MS, async () => {
    const query = new URLSearchParams({ MF_ID: mfId, scheme_id: schemeId });
    const rows = getDataRows(await fetchJson(`${AMFI_SCHEME_URL}?${query.toString()}`));
    if (rows.length === 0) throw new Error("AMFI returned no scheme details.");
    return rows[0];
  });
}

async function getMfapiMetadata(schemeCode: string) {
  return cached(`mfapi:metadata:${schemeCode}`, HOUR_MS, async () => {
    const payload = await fetchJson(`${MFAPI_SCHEME_URL}/${encodeURIComponent(schemeCode)}/latest`);
    const meta = isRecord(payload) ? payload.meta : null;
    if (!isRecord(meta) || !meta.scheme_name || !meta.fund_house || !meta.scheme_code) {
      throw new Error("The selected scheme code has no verifiable MFAPI metadata.");
    }
    return meta;
  });
}

function isSamePlanVariant(
  meta: Record<string, unknown>,
  selectedPlan: string,
  localIsin: string | null,
  variant: Record<string, unknown>,
) {
  const providerName = String(meta.scheme_name ?? "");
  const providerPlan = planFrom(providerName);
  const variantPlan = planFrom(String(variant.Plan ?? ""));
  if (!providerPlan || providerPlan !== selectedPlan || variantPlan !== providerPlan) return false;

  const providerOption = optionFrom(providerName);
  const variantOption = optionFrom(String(variant.Option ?? ""));
  if (providerOption && variantOption !== providerOption) return false;

  const variantIsins = [
    variant.ISIN_Div_Payout_ISIN_Growth,
    variant.ISIN_Div_Reinvestment,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .map((value) => value.trim().toUpperCase());

  if (localIsin) return variantIsins.includes(localIsin.toUpperCase());

  const providerIsins = [meta.isin_growth, meta.isin_div_reinvestment]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .map((value) => value.trim().toUpperCase());
  if (providerIsins.length > 0 && variantIsins.length > 0) {
    return providerIsins.some((isin) => variantIsins.includes(isin));
  }

  return true;
}

function extractExitLoad(schemeLoad: string) {
  const match = schemeLoad.match(/\bexit\s+load\b\s*[:\-–]?\s*/i);
  if (!match || match.index === undefined) return null;

  let details = schemeLoad.slice(match.index + match[0].length);
  details = details
    .replace(/\r/g, "")
    .replace(/\n\s*[lI]\s+(?=No\s+Exit\s+Load)/gi, "\n• ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return details || null;
}

function result(
  input: FundExitLoadRequest,
  status: FundExitLoadResult["status"],
  message: string,
  exitLoad: string | null = null,
  sourceUrl: string | null = null,
): FundExitLoadResult {
  return {
    allocationId: input.allocationId,
    schemeCode: input.schemeCode,
    schemeName: input.schemeName,
    fundName: input.fundName,
    status,
    exitLoad,
    exitLoadSchedule: exitLoad ? parseExitLoadSchedule(exitLoad) : null,
    message,
    sourceUrl,
  };
}

async function resolveOne(
  input: FundExitLoadRequest,
  curatedFunds: MutualFundScheme[],
): Promise<FundExitLoadResult> {
  const schemeCode = input.schemeCode.trim();
  const sourceRowMatches = curatedFunds.filter(
    (fund) =>
      fund.schemeCode === schemeCode &&
      normalizedSourceLabel(fund.schemeName) === normalizedSourceLabel(input.schemeName) &&
      (!input.fundName || normalizeFundHouse(fund.fundName) === normalizeFundHouse(input.fundName)),
  );
  const sourceIdentities = new Set(
    sourceRowMatches.map((fund) =>
      [
        normalizeFundHouse(fund.fundName),
        normalizedSourceLabel(fund.schemeName),
        planFrom(fund.plan) ?? planFrom(fund.schemeName) ?? "",
      ].join("|"),
    ),
  );

  if (!/^\d+$/.test(schemeCode) || sourceIdentities.size !== 1) {
    return result(
      input,
      "unverified",
      "The selected fund row could not be uniquely verified in the current Planner source data.",
    );
  }

  const selected = sourceRowMatches[0];
  const selectedPlan = planFrom(selected.plan) ?? planFrom(selected.schemeName);
  if (!selectedPlan || (input.planType && planFrom(input.planType) !== selectedPlan)) {
    return result(
      input,
      "unverified",
      "The selected plan could not be verified, so no Exit Load value is shown.",
    );
  }

  const localRows = getAllFundCsvRecords().filter(
    (fund) =>
      fund.schemeCode === schemeCode &&
      normalizedSourceLabel(fund.schemeName) === normalizedSourceLabel(selected.schemeName) &&
      (planFrom(fund.plan) ?? planFrom(fund.schemeName)) === selectedPlan,
  );
  const localIsins = [...new Set(localRows.map((fund) => fund.isin.trim()).filter(Boolean))];
  if (localRows.length === 0 || localIsins.length > 1) {
    return result(
      input,
      "unverified",
      "The selected fund code and plan do not have one matching local scheme record.",
    );
  }
  const localIsin = localIsins[0] ?? null;

  try {
    const meta = await getMfapiMetadata(schemeCode);
    const providerName = String(meta.scheme_name ?? "");
    const providerHouse = String(meta.fund_house ?? "");
    if (
      String(meta.scheme_code) !== schemeCode ||
      normalizeFundHouse(providerHouse) !== normalizeFundHouse(selected.fundName) ||
      normalizeSchemeBase(providerName) !== normalizeSchemeBase(selected.schemeName) ||
      planFrom(providerName) !== selectedPlan
    ) {
      return result(
        input,
        "unverified",
        "The selected scheme code did not match the fund and plan returned by the scheme provider.",
      );
    }

    const providerIsins = [meta.isin_growth, meta.isin_div_reinvestment]
      .filter((value): value is string => typeof value === "string" && value.trim() !== "")
      .map((value) => value.trim().toUpperCase());
    if (localIsin && !providerIsins.includes(localIsin.toUpperCase())) {
      return result(
        input,
        "unverified",
        "The selected scheme code and local ISIN do not match the scheme provider.",
      );
    }

    const amfiFundHouses = await getAmfiFundHouses();
    const selectedHouseKey = normalizeFundHouse(selected.fundName);
    if (!selectedHouseKey || normalizeFundHouse(providerHouse) !== selectedHouseKey) {
      return result(input, "unverified", "The scheme provider returned a different fund house.");
    }

    const houseMatches = amfiFundHouses.filter(
      (house) =>
        normalizeFundHouse(house.mf_name) === selectedHouseKey ||
        (house.amc_name && normalizeFundHouse(house.amc_name) === selectedHouseKey),
    );
    if (houseMatches.length !== 1) {
      return result(
        input,
        "unverified",
        "The fund house could not be uniquely matched to AMFI records.",
      );
    }

    const amfiHouse = houseMatches[0];
    const providerBase = normalizeSchemeBase(providerName);
    const schemeMatches = (await getAmfiSchemes(amfiHouse.mf_id)).filter(
      (scheme) => normalizeSchemeBase(scheme.scheme_name) === providerBase,
    );
    if (schemeMatches.length !== 1) {
      return result(
        input,
        "unverified",
        "The selected scheme could not be uniquely matched to an AMFI scheme record.",
      );
    }

    const amfiScheme = schemeMatches[0];
    const variants = await getAmfiVariants(amfiHouse.mf_id, amfiScheme.scheme_id);
    const matchingVariants = variants.filter(
      (variant) =>
        normalizeSchemeBase(String(variant.Scheme_Name ?? "")) === providerBase &&
        isSamePlanVariant(meta, selectedPlan, localIsin, variant),
    );
    if (matchingVariants.length !== 1) {
      return result(
        input,
        "unverified",
        "AMFI did not return one matching plan and option for this scheme code.",
      );
    }

    const detail = await getAmfiSchemeDetails(amfiHouse.mf_id, amfiScheme.scheme_id);
    if (
      normalizeFundHouse(String(detail.MF_Name ?? "")) !== selectedHouseKey ||
      normalizeSchemeBase(String(detail.Scheme_Name ?? "")) !== providerBase
    ) {
      return result(input, "unverified", "The AMFI scheme details did not match the selected fund.");
    }

    const schemeLoad = typeof detail.Scheme_load === "string" ? detail.Scheme_load : "";
    const exitLoad = extractExitLoad(schemeLoad);
    if (!exitLoad) {
      return result(
        input,
        "unavailable",
        "AMFI has no Exit Load entry for this scheme. Missing data is not treated as nil.",
        null,
        SOURCE_URL,
      );
    }

    return result(input, "available", "", exitLoad, SOURCE_URL);
  } catch (error) {
    console.warn("[Fund Exit Load] Could not verify AMFI data", {
      schemeCode,
      error: error instanceof Error ? error.message : String(error),
    });
    return result(
      input,
      "unavailable",
      "Exit Load data could not be checked against the source right now.",
    );
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function lookupFundExitLoads(inputs: FundExitLoadRequest[]) {
  const curatedFunds = getCuratedMutualFunds();
  return mapWithConcurrency(inputs, 6, (input) => resolveOne(input, curatedFunds));
}
