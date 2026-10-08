"use client";

import { useState } from "react";
import { ArrowRight, Download, LoaderCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPaginatedReportPdf } from "@/lib/paginated-report-pdf";

type ReportActionsProps = {
  documentId: string;
  detailTargetId: string;
  fileName: string;
  tone?: "dark" | "light";
};

function getSafePdfName(fileName: string) {
  const safeName = fileName
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${safeName || "investment_report"}.pdf`;
}

export function ReportActions({
  documentId,
  detailTargetId,
  fileName,
  tone = "light",
}: ReportActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const isDark = tone === "dark";
  const outlineClassName = isDark
    ? "border-white/20 bg-white/5 text-white hover:border-[#d8b76f] hover:bg-white/10 hover:text-white"
    : "text-slate-700 dark:text-slate-200";

  async function handleDownload() {
    const reportElement = document.getElementById(documentId);
    if (!reportElement) {
      setHasError(true);
      setMessage("The report content is not available for download.");
      return;
    }

    const unfinishedReport = Array.from(
      reportElement.querySelectorAll<HTMLElement>("[aria-label]"),
    ).some((element) => {
      const label = element.getAttribute("aria-label")?.toLowerCase() ?? "";
      return label.startsWith("loading ") || label.includes("report could not be loaded");
    });
    if (unfinishedReport) {
      setHasError(true);
      setMessage("Wait for all selected reports to load before downloading.");
      return;
    }

    setIsGenerating(true);
    setHasError(false);
    setMessage("Preparing PDF…");

    try {
      window.scrollTo(0, 0);
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });

      const pdf = await createPaginatedReportPdf(reportElement);
      pdf.save(getSafePdfName(fileName));
      setMessage("PDF downloaded.");
    } catch (error) {
      console.error("[Investment report] PDF download failed", error);
      setHasError(true);
      setMessage("Could not generate the PDF. Please try again or use Print Report.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleViewDetailedReport() {
    document.getElementById(detailTargetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => window.print()}
          className="gap-2 whitespace-nowrap"
        >
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          disabled={isGenerating}
          aria-busy={isGenerating}
          className={`gap-2 whitespace-nowrap ${outlineClassName}`}
        >
          {isGenerating ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isGenerating ? "Preparing PDF…" : "Download PDF"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleViewDetailedReport}
          className={`gap-2 whitespace-nowrap ${outlineClassName}`}
          aria-controls={detailTargetId}
        >
          View Detailed Report
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {message && (
        <p
          role={hasError ? "alert" : "status"}
          className={`text-xs ${hasError ? "text-red-600 dark:text-red-300" : "text-slate-500 dark:text-slate-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
