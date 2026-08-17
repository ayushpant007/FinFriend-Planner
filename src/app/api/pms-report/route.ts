import { NextRequest, NextResponse } from "next/server";
import { findPmsWorldEntry, parsePmsSourcePage } from "@/lib/pms-world";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const response = await fetch(entry.url, {
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "FinancialFriend PMS Research Reader/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `The selected PMS source returned HTTP ${response.status}.`, sourceUrl: entry.url },
        { status: 502 },
      );
    }

    const html = await response.text();
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