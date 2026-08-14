import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { getInvestmentProduct } from "@/lib/sif-pms-aif";
import { parseSifPdf } from "@/lib/sif-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

export async function GET(request: NextRequest) {
  const productLabel = request.nextUrl.searchParams.get("product");
  const product = getInvestmentProduct("SIF", productLabel);

  if (!product?.fileName) {
    return NextResponse.json(
      { error: "Unknown SIF product." },
      { status: 400 },
    );
  }

  const pdfPath = path.join(process.cwd(), "public", "SIF", product.fileName);

  try {
    const { stdout } = await execFileAsync("pdftotext", [pdfPath, "-"], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return NextResponse.json(parseSifPdf(stdout, product, product.fileName));
  } catch (error) {
    console.error("[SIF report] Could not read selected research pack", {
      product: product.label,
      fileName: product.fileName,
      error,
    });
    return NextResponse.json(
      { error: "The selected SIF research pack could not be read." },
      { status: 500 },
    );
  }
}