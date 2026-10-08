import { NextResponse } from "next/server";
import { getCuratedMutualFunds } from "@/lib/curated-mutual-funds";

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getCuratedMutualFunds(), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
