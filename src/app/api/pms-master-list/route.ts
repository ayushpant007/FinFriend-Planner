import { NextResponse } from "next/server";
import { getPmsMasterFilename, readPmsWorldEntries } from "@/lib/pms-world";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = readPmsWorldEntries();
    return NextResponse.json({
      source: getPmsMasterFilename(),
      count: entries.length,
      entries: entries.map(({ name, url, category }) => ({ name, url, category })),
    });
  } catch (error) {
    console.error("[PMS master list] Could not read uploaded CSV", error);
    return NextResponse.json(
      { error: "The uploaded PMS master list could not be read." },
      { status: 500 },
    );
  }
}