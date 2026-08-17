import { NextRequest, NextResponse } from "next/server";
import { findPmsWorldEntry, parsePmsSourcePage } from "@/lib/pms-world";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PMS_FETCH_ATTEMPTS = 2;
const PMS_FETCH_TIMEOUT_MS = 25_000;

type PmsFetchResult =
  | { response: Response; error: null }
  | {
      response: null;
      error: {
        message: string;
        kind: "remote_http_error" | "remote_timeout";
        status: number | null;
        cause?: unknown;
      };
    };

async function fetchPmsSource(url: string): Promise<PmsFetchResult> {
  let lastStatus: number | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < PMS_FETCH_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PMS_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "FinancialFriend PMS Research Reader/1.0",
        },
      });

      if (response.ok) return { response, error: null };
      lastStatus = response.status;

      // A 4xx response is a stable source-page problem; retrying it does not
      // make the report more useful.  5xx responses can be transient.
      if (response.status < 500 || attempt === PMS_FETCH_ATTEMPTS - 1) break;
    } catch (error) {
      lastError = error;
      if (attempt === PMS_FETCH_ATTEMPTS - 1) break;
    } finally {
      clearTimeout(timeout);
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  if (lastStatus !== null) {
    return {
      response: null,
      error: {
        message: `PMS AIF World returned HTTP ${lastStatus} for this source page.`,
        kind: "remote_http_error" as const,
        status: lastStatus,
      },
    };
  }

  return {
    response: null,
    error: {
      message: "PMS AIF World did not respond before the source request timed out.",
      kind: "remote_timeout" as const,
      status: null,
      cause: lastError,
    },
  };
}

export async function GET(request: NextRequest) {
  const productName = request.nextUrl.searchParams.get("product");
  const entry = findPmsWorldEntry(productName);

  if (!entry) {
    return NextResponse.json(
      { error: "The selected PMS is not present in the uploaded master list." },
      { status: 400 },
    );
  }

  try {
    const sourceUrl = new URL(entry.url);
    if (sourceUrl.protocol !== "https:" && sourceUrl.protocol !== "http:") {
      return NextResponse.json(
        { error: "The mapped PMS source URL is not an HTTP(S) URL." },
        { status: 400 },
      );
    }

    const result = await fetchPmsSource(entry.url);
    if (result.error) {
      console.error("[PMS report] PMS source unavailable", {
        productName: entry.name,
        sourceUrl: entry.url,
        error: result.error,
      });
      return NextResponse.json(
        {
          error: result.error.message,
          kind: result.error.kind,
          sourceUrl: entry.url,
        },
        { status: result.error.status ? 502 : 504 },
      );
    }

    const html = await result.response.text();
    return NextResponse.json(parsePmsSourcePage(html, entry));
  } catch (error) {
    console.error("[PMS report] Could not fetch selected PMS source", {
      productName: entry.name,
      sourceUrl: entry.url,
      error,
    });
    return NextResponse.json(
      { error: "The selected PMS AIF World page could not be fetched.", sourceUrl: entry.url },
      { status: 502 },
    );
  }
}