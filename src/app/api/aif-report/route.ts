import { NextRequest, NextResponse } from "next/server";
import { findAifRegistryEntry } from "@/lib/aif-registry";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const product = request.nextUrl.searchParams.get("product");
  const entry = findAifRegistryEntry(product);

  if (!entry) {
    return NextResponse.json(
      { error: "The selected AIF is not present in the uploaded registry." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    product_type: "AIF",
    source: "Registered Alternative Investment Funds as on Aug 16, 2026",
    entry,
  });
}