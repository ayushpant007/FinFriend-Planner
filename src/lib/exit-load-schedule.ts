export type ExitLoadScheduleEntry = {
  key: "15-days" | "3-months" | "1-year";
  label: string;
  value: string;
  status: "specified" | "not-specified";
};

export const EXIT_LOAD_CHECKPOINTS = [
  { key: "15-days", label: "Within 15 days", months: 0.5 },
  { key: "3-months", label: "Within 3 months", months: 3 },
  { key: "1-year", label: "Within 1 year", months: 12 },
] as const;

type ExitLoadTerm = {
  value: string;
  isNoLoad: boolean;
  mode: "within" | "after" | "range" | "thereafter" | "global";
  startMonths?: number;
  endMonths?: number;
};

const DURATION_REGEX = /(\d+(?:\.\d+)?)\s*-?\s*(days?|months?|years?)\b/i;

function normalizeTimeWords(text: string) {
  return text
    .replace(/\b(?:one|a)\s+(day|month|year)\b/gi, "1 $1")
    .replace(/\btwo\s+(days?|months?|years?)\b/gi, "2 $1")
    .replace(/\bthree\s+(days?|months?|years?)\b/gi, "3 $1")
    .replace(/\bsix\s+(days?|months?|years?)\b/gi, "6 $1")
    .replace(/\btwelve\s+(days?|months?|years?)\b/gi, "12 $1");
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
  const isNoLoad = /\b(?:no\s+exit\s+load|no\s+load|nil|zero(?:\s+exit\s+load)?|not\s+applicable)\b/i.test(normalized);
  const rateMatch = normalized.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!isNoLoad && !rateMatch) return null;

  const value = isNoLoad ? "No Exit Load" : rateMatch![0].replace(/\s+/g, "");
  const betweenMatch = normalized.match(
    /\b(?:between|from)\s+(\d+(?:\.\d+)?)\s*-?\s*(days?|months?|years?)\s+(?:and|to)\s+(\d+(?:\.\d+)?)\s*-?\s*(days?|months?|years?)\b/i,
  );
  if (betweenMatch) {
    return {
      value,
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
      isNoLoad,
      mode: "range",
      startMonths: afterDuration,
      endMonths: withinDuration,
    };
  }

  if (afterDuration !== null) {
    return { value, isNoLoad, mode: "after", startMonths: afterDuration };
  }
  if (withinDuration !== null) {
    return { value, isNoLoad, mode: "within", endMonths: withinDuration };
  }
  if (/\bthereafter\b/i.test(normalized)) {
    return { value, isNoLoad, mode: "thereafter" };
  }

  return { value, isNoLoad, mode: "global" };
}

function splitSourceTerms(source: string) {
  return normalizeTimeWords(
    source
      .replace(/\r/g, " ")
      .replace(/[•●]/g, ";")
      .replace(/\s+and\s+(?=(?:no\s+exit\s+load\b|no\s+load\b|nil\b|\d+(?:\.\d+)?\s*%))/gi, "; ")
      .replace(/\.(?=\s*(?:no\s+exit\s+load\b|no\s+load\b|nil\b))/gi, ";")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function termMatches(term: ExitLoadTerm, months: number, thereafterBoundary: number | null) {
  switch (term.mode) {
    case "within":
      return term.endMonths !== undefined && months <= term.endMonths;
    case "after":
      return term.startMonths !== undefined && months > term.startMonths;
    case "range":
      return term.startMonths !== undefined &&
        term.endMonths !== undefined &&
        months > term.startMonths &&
        months <= term.endMonths;
    case "thereafter":
      return thereafterBoundary !== null && months > thereafterBoundary;
    case "global":
      return true;
  }
}

function termSpecificity(term: ExitLoadTerm, thereafterBoundary: number | null) {
  if (term.mode === "within") return term.endMonths ?? Number.POSITIVE_INFINITY;
  if (term.mode === "after") return Number.MAX_SAFE_INTEGER - (term.startMonths ?? 0);
  if (term.mode === "range") return (term.endMonths ?? 0) - (term.startMonths ?? 0);
  if (term.mode === "thereafter" && thereafterBoundary !== null) {
    return Number.MAX_SAFE_INTEGER - thereafterBoundary;
  }
  return Number.POSITIVE_INFINITY;
}

export function parseExitLoadSchedule(source: string | null | undefined): ExitLoadScheduleEntry[] {
  const clauses = typeof source === "string" ? splitSourceTerms(source) : [];
  const terms = clauses.map(parseTerm).filter((term): term is ExitLoadTerm => term !== null);
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
    const matchingTerms = terms
      .filter((term) => termMatches(term, checkpoint.months, thereafterBoundary))
      .sort((left, right) =>
        termSpecificity(left, thereafterBoundary) - termSpecificity(right, thereafterBoundary),
      );
    const selected = matchingTerms[0];
    if (selected) {
      const value = selected.isNoLoad
        ? selected.value
        : selected.mode === "global"
          ? `${selected.value} (time period not specified)`
          : selected.value;
      return { key: checkpoint.key, label: checkpoint.label, value, status: "specified" };
    }

    return {
      key: checkpoint.key,
      label: checkpoint.label,
      value: "Not specified by source",
      status: "not-specified",
    };
  });
}
