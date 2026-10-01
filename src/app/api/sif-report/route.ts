import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
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
  const extractedTextPath = path.join(
    process.cwd(),
    "public",
    "SIF",
    "extracted",
    `${path.parse(product.fileName).name}.txt`,
  );

  try {
    let extractedText: string;
    try {
      extractedText = await readFile(extractedTextPath, "utf8");
    } catch (error) {
      const isMissingText = (error as NodeJS.ErrnoException).code === "ENOENT";
      if (!isMissingText) throw error;
      if (process.env.NODE_ENV === "production") {
        throw Object.assign(
          new Error(`The bundled SIF text companion is missing: ${extractedTextPath}`),
          { code: "ENOENT" },
        );
      }
      // Keep local development usable for a newly added pack before its
      // checked-in text companion has been generated.
      const { stdout } = await execFileAsync("pdftotext", [pdfPath, "-"], {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
      extractedText = stdout;
    }
    if (!extractedText.trim()) {
      throw new Error(`The selected SIF research pack has no readable text: ${extractedTextPath}`);
    }
    return NextResponse.json(parseSifPdf(extractedText, product, product.fileName));
  } catch (error) {
    console.error("[SIF report] Could not read selected research pack", {
      product: product.label,
      fileName: product.fileName,
      error,
    });
    const isMissingAsset = (error as NodeJS.ErrnoException).code === "ENOENT";
    return NextResponse.json(
      {
        error: isMissingAsset
          ? "The selected SIF research pack is unavailable in this deployment. Please retry or choose another product."
          : "The selected SIF research pack could not be read.",
      },
      { status: isMissingAsset ? 503 : 500 },
    );
  }
}