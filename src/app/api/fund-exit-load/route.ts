import { NextResponse } from "next/server";
import {
  lookupFundExitLoads,
  type FundExitLoadRequest,
} from "@/lib/amfi-exit-load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LOOKUPS = 100;

function isFundExitLoadRequest(value: unknown): value is FundExitLoadRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.allocationId === "string" &&
    typeof item.schemeCode === "string" &&
    typeof item.schemeName === "string" &&
    typeof item.fundName === "string" &&
    (item.planType === undefined || typeof item.planType === "string")
  );
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const funds = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).funds
    : null;
  if (!Array.isArray(funds) || funds.some((fund) => !isFundExitLoadRequest(fund))) {
    return NextResponse.json(
      { error: "Provide a funds array with each selected scheme, plan, and fund house." },
      { status: 400 },
    );
  }
  if (funds.length > MAX_LOOKUPS) {
    return NextResponse.json(
      { error: `A maximum of ${MAX_LOOKUPS} fund lookups is allowed per report.` },
      { status: 413 },
    );
  }

  const results = await lookupFundExitLoads(funds);
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
