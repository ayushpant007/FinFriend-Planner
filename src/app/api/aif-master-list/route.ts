import { NextResponse } from "next/server";
import { readAifRegistry } from "@/lib/aif-registry";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    source: "Registered Alternative Investment Funds as on Aug 16, 2026",
    entries: readAifRegistry(),
  });
}