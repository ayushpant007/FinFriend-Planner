"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSearch,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

type MatchStatus = "matched" | "unmatched" | "ambiguous" | "conflict";
type FileKind = "fund-list" | "holdings";

interface FundFileSummary {
  fileName: string;
  label: string;
  kind: FileKind;
  categoryLabel: string;
  apiCategory: string;
  fileExists: boolean;
  sourceRows: number;
  recognizedRows: number;
  fundCount: number;
  matchedCount: number;
  unmatchedCount: number;
  ambiguousCount: number;
  conflictCount: number;
  excludedRows: number;
  duplicateRows: number;
  parserWarnings: string[];
  error?: string;
}

interface BackendFund {
  category: string;
  type: string;
  fundName: string;
  schemeName: string;
  schemeCode: string;
  plan: string;
  primaryBenchmark: string;
}

interface FundAuditRecord {
  id: string;
  sourceFundName: string;
  sourceSchemeCode: string;
  sourcePlan: string;
  sourceIsin: string;
  sourceCategory: string;
  sourceSubcategory: string;
  sourceRowsCount: number;
  status: MatchStatus;
  matchMethod: "scheme-code" | "exact-name-and-plan" | "exact-name" | null;
  matchNote: string;
  matchedFund: BackendFund | null;
  possibleMatches: BackendFund[];
  sourceDetails: Record<string, string>;
  holdingsPreview: Record<string, string>[];
}

interface AuditSummaryResponse {
  generatedAt: string;
  backendApi: string;
  backendFundCount: number;
  summary: {
    fileCount: number;
    sourceRows: number;
    recognizedRows: number;
    fundCount: number;
    fundListCount: number;
    holdingsFundCount: number;
    matchedCount: number;
    unmatchedCount: number;
    ambiguousCount: number;
    conflictCount: number;
    excludedRows: number;
  };
  files: FundFileSummary[];
}

interface AuditDetailResponse {
  generatedAt: string;
  backendApi: string;
  file: FundFileSummary;
  page: number;
  pageSize: number;
  totalFunds: number;
  totalPages: number;
  funds: FundAuditRecord[];
}

const STATUS_LABELS: Record<MatchStatus, string> = {
  matched: "Matched",
  unmatched: "No API match",
  ambiguous: "Ambiguous",
  conflict: "Conflict",
};

const STATUS_STYLES: Record<MatchStatus, string> = {
  matched: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  unmatched: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
  ambiguous: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  conflict: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300",
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  note: string;
  icon: typeof ClipboardList;
}) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
        <span className="glass-section-icon flex h-10 w-10 items-center justify-center rounded-xl text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function DetailPanel({ record }: { record: FundAuditRecord }) {
  const sourceDetails = Object.entries(record.sourceDetails);

  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-medium text-primary hover:underline">
        <span className="group-open:hidden">View details</span>
        <span className="hidden group-open:inline">Hide details</span>
      </summary>
      <div className="mt-3 space-y-4 rounded-xl border border-border bg-background/70 p-4">
        {record.possibleMatches.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              API candidates — review required
            </h4>
            <div className="space-y-2">
              {record.possibleMatches.map((candidate) => (
                <div
                  key={`${candidate.category}-${candidate.schemeCode}-${candidate.schemeName}-${candidate.plan}`}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <p className="font-medium">{candidate.schemeName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Scheme code {candidate.schemeCode || "—"} · {candidate.plan || "Plan not set"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {sourceDetails.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source file details
            </h4>
            <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {sourceDetails.map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-lg border border-border bg-card px-3 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 break-words text-xs">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {record.holdingsPreview.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Example holdings from this file
            </h4>
            <div className="space-y-2">
              {record.holdingsPreview.map((holding, index) => (
                <div
                  key={`${record.id}-holding-${index}`}
                  className="rounded-lg border border-border bg-card px-3 py-2"
                >
                  <p className="font-medium text-sm">
                    {holding["Company Name"] || holding["Instrument"] || "Holding row"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[holding["Sector"], holding["Instrument"], holding["Credit Rating"]]
                      .filter(Boolean)
                      .join(" · ") || "No additional holding labels"}
                    {holding["% of Assets"] ? ` · ${holding["% of Assets"]}% of assets` : ""}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Showing up to four sample rows; the fund count is based on distinct fund names.
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

export default function FundFileAuditPage() {
  const [summaryData, setSummaryData] = useState<AuditSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [detailData, setDetailData] = useState<AuditDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError("");
      try {
        const response = await fetch("/api/fund-file-audit", { cache: "no-store" });
        if (!response.ok) throw new Error(`Audit request failed (${response.status}).`);
        const payload = (await response.json()) as AuditSummaryResponse;
        if (!active) return;
        setSummaryData(payload);
        setSelectedFile((current) =>
          payload.files.some((file) => file.fileName === current)
            ? current
            : payload.files[0]?.fileName ?? "",
        );
      } catch (error) {
        if (!active) return;
        setSummaryError(error instanceof Error ? error.message : "Could not load the fund audit.");
      } finally {
        if (active) setSummaryLoading(false);
      }
    };
    void loadSummary();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (!selectedFile) {
      setDetailData(null);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      file: selectedFile,
      page: String(page),
      pageSize: "50",
      search,
      status: statusFilter,
    });

    const loadDetails = async () => {
      setDetailLoading(true);
      setDetailError("");
      try {
        const response = await fetch(`/api/fund-file-audit?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Could not load this file (${response.status}).`);
        const payload = (await response.json()) as AuditDetailResponse;
        setDetailData(payload);
      } catch (error) {
        if (controller.signal.aborted) return;
        setDetailError(error instanceof Error ? error.message : "Could not load fund details.");
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    };

    void loadDetails();
    return () => controller.abort();
  }, [selectedFile, page, search, statusFilter, reloadToken]);

  const selectedSummary = useMemo(
    () => summaryData?.files.find((file) => file.fileName === selectedFile) ?? null,
    [summaryData, selectedFile],
  );

  const changeFile = (fileName: string) => {
    setSelectedFile(fileName);
    setPage(1);
    setSearch("");
    setStatusFilter("all");
  };

  const refresh = () => setReloadToken((value) => value + 1);
  const totalNeedsReview = summaryData
    ? summaryData.summary.unmatchedCount +
      summaryData.summary.ambiguousCount +
      summaryData.summary.conflictCount
    : 0;
  const visibleStart =
    detailData && detailData.totalFunds > 0
      ? (detailData.page - 1) * detailData.pageSize + 1
      : 0;
  const visibleEnd = detailData
    ? Math.min(detailData.page * detailData.pageSize, detailData.totalFunds)
    : 0;

  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="container mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <ClipboardList className="h-3.5 w-3.5" />
              Fund data quality
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Mutual Fund File Audit
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review fund counts file by file and verify each record against the funds returned by{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/api/funds-curated</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={summaryLoading}
            className="glass-button-outline inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {summaryLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh files
          </button>
        </div>

        {summaryError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">The audit could not be loaded.</p>
              <p className="mt-1">{summaryError}</p>
            </div>
            <button type="button" onClick={refresh} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {summaryLoading && !summaryData ? (
          <div className="glass-card flex min-h-64 items-center justify-center gap-3 rounded-2xl text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Reading source files and checking API matches…
          </div>
        ) : summaryData ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Backend API schemes"
                value={formatCount(summaryData.backendFundCount)}
                note="Records available to match"
                icon={FileSearch}
              />
              <MetricCard
                label="File-level fund entries"
                value={formatCount(summaryData.summary.fundCount)}
                note={`${formatCount(summaryData.summary.fundListCount)} scheme rows + ${formatCount(summaryData.summary.holdingsFundCount)} distinct holdings-file funds`}
                icon={ClipboardList}
              />
              <MetricCard
                label="Matched entries"
                value={formatCount(summaryData.summary.matchedCount)}
                note="Counted separately in each source file"
                icon={CheckCircle2}
              />
              <MetricCard
                label="Needs review"
                value={formatCount(totalNeedsReview)}
                note={`${formatCount(summaryData.summary.unmatchedCount)} unmatched · ${formatCount(summaryData.summary.ambiguousCount)} ambiguous · ${formatCount(summaryData.summary.conflictCount)} conflicts`}
                icon={AlertTriangle}
              />
            </section>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>
                {formatCount(summaryData.summary.fileCount)} source files ·{" "}
                {formatCount(summaryData.summary.sourceRows)} non-empty data rows ·{" "}
                {formatCount(summaryData.summary.excludedRows)} rows excluded from fund counts
              </p>
              <p>Last refreshed {formatTimestamp(summaryData.generatedAt)}</p>
            </div>

            <div className="mt-7 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              Fund-list files count distinct schemes; holdings files count distinct fund names, not
              holdings rows. Rows without a fund name or a fund-list scheme code/Direct-Regular plan
              are excluded. Matches use scheme codes first, then exact full names and plans. No
              fuzzy guess is auto-mapped.
            </div>

            <div className="mt-7 grid items-start gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
              <aside className="glass-card rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">Source files</h2>
                  <span className="text-xs text-muted-foreground">
                    {summaryData.files.length} files
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {summaryData.files.map((file) => {
                    const active = file.fileName === selectedFile;
                    const needsReview =
                      file.unmatchedCount + file.ambiguousCount + file.conflictCount;
                    return (
                      <button
                        key={file.fileName}
                        type="button"
                        onClick={() => changeFile(file.fileName)}
                        aria-pressed={active}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card/60 hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 break-words text-sm font-semibold">
                            {file.fileName}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              file.kind === "holdings"
                                ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {file.kind === "holdings" ? "Holdings" : "Fund list"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatCount(file.fundCount)} funds</span>
                          <span>{formatCount(file.matchedCount)} matched</span>
                          {needsReview > 0 && (
                            <span className="font-medium text-amber-700 dark:text-amber-300">
                              {formatCount(needsReview)} review
                            </span>
                          )}
                          {!file.fileExists && <span className="text-rose-600">Missing file</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="glass-card min-w-0 rounded-2xl p-4 sm:p-6">
                {selectedSummary ? (
                  <>
                    <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="break-words text-lg font-semibold">
                            {selectedSummary.fileName}
                          </h2>
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {selectedSummary.categoryLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedSummary.kind === "fund-list"
                            ? "Fund schemes in this source file"
                            : "Distinct funds represented in the holdings rows"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm sm:text-right">
                        <span className="text-muted-foreground">Funds</span>
                        <strong>{formatCount(selectedSummary.fundCount)}</strong>
                        <span className="text-muted-foreground">Matched</span>
                        <strong className="text-emerald-700 dark:text-emerald-300">
                          {formatCount(selectedSummary.matchedCount)}
                        </strong>
                        <span className="text-muted-foreground">Rows excluded</span>
                        <strong>{formatCount(selectedSummary.excludedRows)}</strong>
                      </div>
                    </div>

                    {selectedSummary.error && (
                      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                        {selectedSummary.error}
                      </div>
                    )}
                    {selectedSummary.parserWarnings.length > 0 && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        <p className="font-semibold">
                          CSV parser reported formatting warnings.
                        </p>
                        <ul className="mt-1 list-inside list-disc">
                          {selectedSummary.parserWarnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                      <label className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="search"
                          value={search}
                          onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                          }}
                          placeholder="Search fund, scheme code, ISIN, or plan"
                          className="glass-input h-10 w-full rounded-xl pl-9 pr-3 text-sm"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="shrink-0 text-muted-foreground">Match status</span>
                        <select
                          value={statusFilter}
                          onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(1);
                          }}
                          className="glass-input h-10 rounded-xl px-3 text-sm"
                        >
                          <option value="all">All statuses</option>
                          <option value="matched">Matched</option>
                          <option value="unmatched">No API match</option>
                          <option value="ambiguous">Ambiguous</option>
                          <option value="conflict">Conflict</option>
                        </select>
                      </label>
                    </div>

                    {detailError && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                        <XCircle className="h-4 w-4 shrink-0" />
                        {detailError}
                      </div>
                    )}

                    <div className="mt-4 min-h-56 overflow-x-auto rounded-xl border border-border">
                      <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                        <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-3 font-semibold">Fund in file</th>
                            <th className="px-3 py-3 font-semibold">Scheme code</th>
                            <th className="px-3 py-3 font-semibold">Plan</th>
                            <th className="px-3 py-3 font-semibold">ISIN</th>
                            <th className="px-3 py-3 font-semibold">Rows</th>
                            <th className="px-3 py-3 font-semibold">Backend API match</th>
                            <th className="px-3 py-3 font-semibold">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {detailLoading && !detailData ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Matching this file to the API…
                                </span>
                              </td>
                            </tr>
                          ) : detailData?.funds.length ? (
                            detailData.funds.map((fund, index) => (
                              <tr key={fund.id} className="align-top hover:bg-muted/30">
                                <td className="max-w-[260px] px-3 py-3">
                                  <p className="break-words font-medium">{fund.sourceFundName}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {fund.sourceSubcategory ||
                                      fund.sourceCategory ||
                                      selectedSummary.categoryLabel}
                                  </p>
                                </td>
                                <td className="px-3 py-3 font-mono text-xs">
                                  {fund.sourceSchemeCode || "—"}
                                </td>
                                <td className="px-3 py-3">{fund.sourcePlan || "—"}</td>
                                <td className="px-3 py-3 font-mono text-xs">
                                  {fund.sourceIsin || "—"}
                                </td>
                                <td className="px-3 py-3 tabular-nums">
                                  {formatCount(fund.sourceRowsCount)}
                                </td>
                                <td className="max-w-[330px] px-3 py-3">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[fund.status]}`}
                                  >
                                    {STATUS_LABELS[fund.status]}
                                  </span>
                                  {fund.matchedFund ? (
                                    <div className="mt-1.5 break-words text-xs">
                                      <p className="font-medium">{fund.matchedFund.schemeName}</p>
                                      <p className="mt-0.5 text-muted-foreground">
                                        API code {fund.matchedFund.schemeCode} ·{" "}
                                        {fund.matchMethod === "scheme-code"
                                          ? "scheme-code match"
                                          : fund.matchMethod === "exact-name-and-plan"
                                            ? "exact name + plan"
                                            : "exact name"}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                                      {fund.matchNote}
                                      {fund.possibleMatches.length > 0 &&
                                        ` ${fund.possibleMatches.length} candidate${fund.possibleMatches.length === 1 ? "" : "s"} listed in details.`}
                                    </p>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <DetailPanel record={fund} />
                                  <span className="sr-only">
                                    Row {(detailData.page - 1) * detailData.pageSize + index + 1}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                {selectedSummary.fileExists
                                  ? "No funds match these filters."
                                  : "This source file is not available on the server."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center">
                      <p className="text-muted-foreground">
                        {detailData
                          ? `Showing ${formatCount(visibleStart)}–${formatCount(visibleEnd)} of ${formatCount(detailData.totalFunds)} funds`
                          : detailLoading
                            ? "Loading fund matches…"
                            : "No fund records loaded."}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPage((value) => Math.max(1, value - 1))}
                          disabled={!detailData || detailData.page <= 1 || detailLoading}
                          className="glass-button-outline inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>
                        <span className="min-w-16 text-center text-xs text-muted-foreground">
                          {detailData ? `${detailData.page} / ${Math.max(detailData.totalPages, 1)}` : "—"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage((value) => value + 1)}
                          disabled={
                            !detailData ||
                            detailData.page >= detailData.totalPages ||
                            detailLoading
                          }
                          className="glass-button-outline inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <FileSearch className="h-8 w-8" />
                    <p className="font-medium">Choose a source file to review its funds.</p>
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          <div className="glass-card flex min-h-64 items-center justify-center rounded-2xl text-muted-foreground">
            Fund audit data is unavailable.
          </div>
        )}
      </div>
    </main>
  );
}
