import "server-only";

import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

export type PmsWorldEntry = {
  name: string;
  url: string;
  productType: string;
  category: string;
  fundManager: string;
  urlVerification: string;
};

type PmsCsvRow = {
  "PMS Name"?: string;
  "PMS AIF World URL"?: string;
  "Product Type"?: string;
  Category?: string;
  "Fund Manager"?: string;
  "URL Verification"?: string;
};

const PMS_MASTER_FILE = "PMS_AIF_WORLD_Master_List_-_PMS_Master_List_1786942853690.csv";

function getPmsMasterPath() {
  return path.join(process.cwd(), "attached_assets", PMS_MASTER_FILE);
}

export function readPmsWorldEntries(): PmsWorldEntry[] {
  const csvText = fs.readFileSync(getPmsMasterPath(), "utf8");
  const parsed = Papa.parse<PmsCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  const entries: PmsWorldEntry[] = [];
  const seenNames = new Set<string>();

  for (const row of parsed.data) {
    const name = row["PMS Name"]?.trim();
    const url = row["PMS AIF World URL"]?.trim();
    if (!name || !url || seenNames.has(name)) continue;
    seenNames.add(name);
    entries.push({
      name,
      url,
      productType: row["Product Type"]?.trim() ?? "PMS",
      category: row.Category?.trim() ?? "PMS",
      fundManager: row["Fund Manager"]?.trim() ?? "",
      urlVerification: row["URL Verification"]?.trim() ?? "",
    });
  }

  return entries;
}

export function findPmsWorldEntry(name: string | null | undefined) {
  if (!name) return null;
  return readPmsWorldEntries().find((entry) => entry.name === name) ?? null;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function cleanText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractTagContents(html: string, tag: string) {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  return [...html.matchAll(pattern)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);
}

function uniqueValues(values: string[], limit: number) {
  return [...new Set(values)].filter((value) => value.length > 1).slice(0, limit);
}

function extractMetaDescription(html: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (!/\bname\s*=\s*["']description["']/i.test(tag)) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content) return cleanText(content);
  }
  return "";
}

function extractTables(html: string) {
  const tableMatches = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  return tableMatches
    .map((tableMatch) => {
      const rows = [...tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
        .map((rowMatch) =>
          [...rowMatch[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)]
            .map((cellMatch) => cleanText(cellMatch[1]))
            .filter(Boolean),
        )
        .filter((row) => row.length > 0)
        .slice(0, 14);
      return rows;
    })
    .filter((rows) => rows.length > 1)
    .slice(0, 8);
}

export type PmsSourceReport = {
  productType: "PMS_SOURCE";
  productName: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  tables: string[][][];
  fetchedAt: string;
};

export function parsePmsSourcePage(
  html: string,
  entry: PmsWorldEntry,
): PmsSourceReport {
  const withoutNoise = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "");
  const title = cleanText(withoutNoise.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || entry.name;
  const headings = uniqueValues(
    extractTagContents(withoutNoise, "h1")
      .concat(extractTagContents(withoutNoise, "h2"))
      .concat(extractTagContents(withoutNoise, "h3")),
    24,
  );
  const paragraphs = uniqueValues(
    extractTagContents(withoutNoise, "p").filter((paragraph) => paragraph.length >= 36),
    18,
  );

  return {
    productType: "PMS_SOURCE",
    productName: entry.name,
    sourceUrl: entry.url,
    sourceName: "PMS AIF World",
    category: entry.category || "PMS",
    title,
    description: extractMetaDescription(withoutNoise),
    headings,
    paragraphs,
    tables: extractTables(withoutNoise),
    fetchedAt: new Date().toISOString(),
  };
}