export type ExitLoadScheduleEntry = {
  key: "15-days" | "3-months" | "1-year";
  label: string;
  value: string;
  status: "specified" | "partial" | "not-specified";
};

export const EXIT_LOAD_CHECKPOINTS = [
  { key: "15-days", label: "Within 15 days", months: 0.5 },
  { key: "3-months", label: "Within 3 months", months: 3 },
  { key: "1-year", label: "Within 1 year", months: 12 },
] as const;

type ExitLoadTerm = {
  value: string;
  sourceClause: string;
  isNoLoad: boolean;
  mode: "within" | "after" | "range" | "thereafter" | "global";
  startMonths?: number;
  endMonths?: number;
};

const DURATION_REGEX = /(\d+(?:\.\d+)?)\s*-?\s*(days?|months?|years?)\b/i;
const NO_LOAD_PATTERN =
  /\b(?:no\s+exit\s+load|no\s+load|nil|zero(?:\s+exit\s+load)?|not\s+applicable)\b/i;
const RATE_PATTERN = /\d+(?:\.\d+)?\s*%/i;

function decodeHtmlEntity(entity: string) {
  const namedEntities: Record<string, string> = {
    "&nbsp;": " ",
    "&#160;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&#34;": "\"",
    "&#39;": "'",
    "&apos;": "'",
  };
  const named = namedEntities[entity.toLowerCase()];
  if (named !== undefined) return named;

  const numeric = entity.match(/^&#(?:x([0-9a-f]+)|(\d+));$/i);
  if (!numeric) return entity;
  const codePoint = numeric[1]
    ? Number.parseInt(numeric[1], 16)
    : Number.parseInt(numeric[2], 10);
  return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
}

export function normalizeExitLoadText(source: string) {
  return source
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "• ")
    .replace(/<\/\s*(?:p|li|div|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos);|&#(?:x[0-9a-f]+|\d+);/gi, decodeHtmlEntity)
    .replace(/\r/g, "\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeTimeWords(text: string) {
  return text
    .replace(/\b(?:one|a)\s+(day|month|year)\b/gi, "1 $1")
    .replace(/\btwo\s+(days?|months?|years?)\b/gi, "2 $1")
    .replace(/\bthree\s+(days?|months?|years?)\b/gi, "3 $1")
    .replace(/\bsix\s+(days?|months?|years?)\b/gi, "6 $1")
    .replace(/\btwelve\s+(days?|months?|years?)\b/gi, "12 $1");
}

function hasUnitSpecificNoLoadException(text: string) {
  return (
    /\b(?:qualifying|eligible|specified|particular|specific)\s+units?\b|\bunits?\s+(?:qualifying|eligible|specified|particular|specific)\b/i.test(text) ||
    /\b(?:redemption|redeem(?:ed|ing)?|units?)\b[^.;]{0,100}\d+(?:\.\d+)?\s*%/i.test(text)
  );
}

function hasUnassignableNoLoadClause(clause: string) {
  const normalized = normalizeTimeWords(clause.toLowerCase());
  if (!NO_LOAD_PATTERN.test(normalized)) return false;
  return (
    /(?:exit\s+load(?:\s+of)?|load\s+(?:of|@))\s*\d+(?:\.\d+)?\s*%/i.test(normalized) ||
    hasUnitSpecificNoLoadException(normalized)
  );
}

function findExitLoadRate(text: string) {
  const tiedToExitLoad = text.match(
    /(?:exit\s+load(?:\s+of)?|load\s+(?:of|@))[^%]{0,100}?(\d+(?:\.\d+)?\s*%)/i,
  );
  return tiedToExitLoad?.[1] ?? text.match(RATE_PATTERN)?.[0] ?? null;
}

function durationInMonths(value: string, unit: string) {
  const amount = Number(value);
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit.startsWith("day")) return amount / 30;
  if (normalizedUnit.startsWith("year")) return amount * 12;
  return amount;
}

function findDurationAfter(text: string, index: number) {
  const match = text.slice(index).match(DURATION_REGEX);
  if (!match) return null;
  return durationInMonths(match[1], match[2]);
}

function parseTerm(clause: string): ExitLoadTerm | null {
  const normalized = normalizeTimeWords(clause.toLowerCase());
  const noLoadMatch = normalized.match(NO_LOAD_PATTERN);
  const isNoLoad = Boolean(noLoadMatch);
  if (hasUnassignableNoLoadClause(normalized)) return null;

  const rate = findExitLoadRate(normalized);
  if (!isNoLoad && !rate) return null;

  const value = isNoLoad ? "No Exit Load" : rate!.replace(/\s+/g, "");
  const betweenMatch = normalized.match(
    /\b(?:between|from)\s+(\d+(?:\.\d+)?)\s*-?\s*(days?|months?|years?)\s+(?:and|to)\s+(\d+(?:\.\d+)?)\s*-?\s*(days?|months?|years?)\b/i,
  );
  if (betweenMatch) {
    return {
      value,
      sourceClause: clause,
      isNoLoad,
      mode: "range",
      startMonths: durationInMonths(betweenMatch[1], betweenMatch[2]),
      endMonths: durationInMonths(betweenMatch[3], betweenMatch[4]),
    };
  }

  const afterPattern = /\b(?:after|beyond)\b/i;
  const withinPattern = /\b(?:within|on or before|up to|upto|not later than|for the first|during the first|before|until|till)\b/i;
  const afterIndex = normalized.search(afterPattern);
  const withinIndex = normalized.search(withinPattern);
  const afterDuration = afterIndex >= 0
    ? findDurationAfter(normalized, afterIndex + normalized.slice(afterIndex).match(afterPattern)![0].length)
    : null;
  const withinDuration = withinIndex >= 0
    ? findDurationAfter(normalized, withinIndex + normalized.slice(withinIndex).match(withinPattern)![0].length)
    : null;

  if (
    afterDuration !== null &&
    withinDuration !== null &&
    afterDuration < withinDuration
  ) {
    return {
      value,
      sourceClause: clause,
      isNoLoad,
      mode: "range",
      startMonths: afterDuration,
      endMonths: withinDuration,
    };
  }

  if (afterDuration !== null) {
    return { value, sourceClause: clause, isNoLoad, mode: "after", startMonths: afterDuration };
  }
  if (withinDuration !== null) {
    return { value, sourceClause: clause, isNoLoad, mode: "within", endMonths: withinDuration };
  }
  if (/\bthereafter\b/i.test(normalized)) {
    return { value, sourceClause: clause, isNoLoad, mode: "thereafter" };
  }
  if (/\bafter\s+(?:that|this|such\s+period)\b/i.test(normalized)) {
    return { value, sourceClause: clause, isNoLoad, mode: "thereafter" };
  }

  return { value, sourceClause: clause, isNoLoad, mode: "global" };
}

function splitSourceTerms(source: string) {
  const normalized = normalizeTimeWords(normalizeExitLoadText(source))
    .replace(/[•●▪]/g, ";")
    .replace(/\n\s*[lI]\s+(?=(?:no\s+exit\s+load\b|no\s+load\b|nil\b|\d+(?:\.\d+)?\s*%))/gi, "\n; ")
    .replace(/\n+/g, "; ")
    .replace(
      /\s+and\s+(?=(?:no\s+exit\s+load\b|no\s+load\b|nil\b|\d+(?:\.\d+)?\s*%[^,;\n]{0,120}\b(?:within|after|beyond|between|from|thereafter|upto|up to|before|until|till)\b))/gi,
      "; ",
    )
    .replace(
      /[,]\s*(?=(?:no\s+exit\s+load\b|no\s+load\b|nil\b|zero(?:\s+exit\s+load)?\b|not\s+applicable\b|\d+(?:\.\d+)?\s*%[^,;\n]{0,120}\b(?:within|after|beyond|between|from|thereafter|upto|up to|before|until|till)\b))/gi,
      "; ",
    )
    .replace(
      /(?<!\d)\.(?=\s*(?:no\s+exit\s+load\b|no\s+load\b|nil\b|zero(?:\s+exit\s+load)?\b|not\s+applicable\b|\d+(?:\.\d+)?\s*%))/gi,
      ";",
    )
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function applyTierStarts(terms: ExitLoadTerm[]) {
  const increasingWithinTiers = terms
    .filter((term) => !term.isNoLoad && term.mode === "within" && term.endMonths !== undefined)
    .sort((left, right) => (left.endMonths ?? 0) - (right.endMonths ?? 0));

  let previousEnd = 0;
  for (const term of increasingWithinTiers) {
    if (previousEnd > 0 && (term.endMonths ?? 0) > previousEnd && term.startMonths === undefined) {
      term.startMonths = previousEnd;
    }
    previousEnd = Math.max(previousEnd, term.endMonths ?? 0);
  }
}

type TimeSegment = { start: number; end: number } | null;

function termSegment(term: ExitLoadTerm, thereafterBoundary: number | null): TimeSegment {
  switch (term.mode) {
    case "within":
      return term.endMonths === undefined
        ? null
        : { start: term.startMonths ?? 0, end: term.endMonths };
    case "after":
      return term.startMonths === undefined
        ? null
        : { start: term.startMonths, end: Number.POSITIVE_INFINITY };
    case "range":
      return term.startMonths === undefined || term.endMonths === undefined
        ? null
        : { start: term.startMonths, end: term.endMonths };
    case "thereafter":
      return thereafterBoundary === null
        ? null
        : { start: thereafterBoundary, end: Number.POSITIVE_INFINITY };
    case "global":
      return term.isNoLoad ? { start: 0, end: Number.POSITIVE_INFINITY } : null;
  }
}

function termIntersectsWindow(term: ExitLoadTerm, checkpointMonths: number, thereafterBoundary: number | null) {
  if (term.mode === "global") return true;
  const segment = termSegment(term, thereafterBoundary);
  return segment !== null && segment.start < checkpointMonths && segment.end > 0;
}

function windowIsFullyCovered(terms: ExitLoadTerm[], checkpointMonths: number, thereafterBoundary: number | null) {
  const segments = terms
    .map((term) => termSegment(term, thereafterBoundary))
    .filter((segment): segment is Exclude<TimeSegment, null> => segment !== null)
    .filter((segment) => segment.start < checkpointMonths && segment.end > 0)
    .sort((left, right) => left.start - right.start);

  let coveredThrough = 0;
  for (const segment of segments) {
    if (segment.start > coveredThrough + 1e-9) return false;
    coveredThrough = Math.max(coveredThrough, segment.end);
    if (coveredThrough >= checkpointMonths) return true;
  }
  return false;
}

function describeTerm(term: ExitLoadTerm) {
  const normalizedClause = normalizeTimeWords(term.sourceClause);
  const range = normalizedClause.match(
    /\b(?:between|from)\s+\d+(?:\.\d+)?\s*-?\s*(?:days?|months?|years?)\s+(?:and|to)\s+\d+(?:\.\d+)?\s*-?\s*(?:days?|months?|years?)\b/i,
  );
  const timingPhrases = [
    ...normalizedClause.matchAll(
      /\b(?:on or before|within|up to|upto|not later than|for the first|during the first|before|until|till|after|beyond)\s+\d+(?:\.\d+)?\s*-?\s*(?:days?|months?|years?)\b/gi,
    ),
  ].map((match) => match[0].replace(/\s+/g, " ").trim());
  const timing = range?.[0] || timingPhrases.join(" and ") || (/\bthereafter\b/i.test(normalizedClause) ? "thereafter" : "");

  if (term.isNoLoad) return timing ? `No Exit Load ${timing}` : "No Exit Load";
  return timing
    ? `${term.value} ${timing}`
    : `${term.value} (time period not specified)`;
}

export function parseExitLoadSchedule(source: string | null | undefined): ExitLoadScheduleEntry[] {
  const clauses = typeof source === "string" ? splitSourceTerms(source) : [];
  const hasAmbiguousClause = clauses.some(hasUnassignableNoLoadClause);
  const terms = clauses.map(parseTerm).filter((term): term is ExitLoadTerm => term !== null);
  applyTierStarts(terms);
  const positiveBoundaries = terms
    .filter((term) => !term.isNoLoad)
    .flatMap((term) => [
      ...(term.endMonths === undefined ? [] : [term.endMonths]),
      ...(term.startMonths === undefined ? [] : [term.startMonths]),
    ]);
  const thereafterBoundary = positiveBoundaries.length > 0
    ? Math.max(...positiveBoundaries)
    : null;

  return EXIT_LOAD_CHECKPOINTS.map((checkpoint) => {
    const matchingTerms = terms.filter((term) =>
      termIntersectsWindow(term, checkpoint.months, thereafterBoundary),
    );
    if (matchingTerms.length === 0) {
      if (hasAmbiguousClause) {
        return {
          key: checkpoint.key,
          label: checkpoint.label,
          value: "Source condition that cannot be assigned to a period; see the original terms.",
          status: "partial",
        };
      }
      return { key: checkpoint.key, label: checkpoint.label, value: "Not specified by source", status: "not-specified" };
    }

    const termsCoverWindow = windowIsFullyCovered(terms, checkpoint.months, thereafterBoundary);
    const value = matchingTerms.map(describeTerm).join("; ");
    const hasCompleteData = termsCoverWindow && !hasAmbiguousClause;
    return {
      key: checkpoint.key,
      label: checkpoint.label,
      value: hasAmbiguousClause
        ? `${value}; a source condition that cannot be assigned to this period is also present; see the original terms.`
        : termsCoverWindow
          ? value
          : `${value}; Other timing in this period is not specified by source.`,
      status: hasCompleteData ? "specified" : "partial",
    };
  });
}
