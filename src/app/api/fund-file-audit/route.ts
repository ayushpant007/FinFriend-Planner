import { NextRequest, NextResponse } from "next/server";
import {
  getFundFileAuditSnapshot,
  normalizeFundAuditSearch,
  type FundAuditStatus,
} from "@/lib/fund-file-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_FILTERS = new Set<FundAuditStatus>([
  "matched",
  "unmatched",
  "ambiguous",
  "conflict",
]);

export async function GET(request: NextRequest) {
  try {
    const snapshot = getFundFileAuditSnapshot();
    const params = request.nextUrl.searchParams;
    const fileName = params.get("file");

    if (!fileName) {
      return NextResponse.json(
        {
          generatedAt: snapshot.generatedAt,
          backendApi: "/api/funds-curated",
          backendFundCount: snapshot.backendFundCount,
          summary: snapshot.summary,
          files: snapshot.files.map((file) => file.summary),
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const file = snapshot.files.find((candidate) => candidate.summary.fileName === fileName);
    if (!file) {
      return NextResponse.json({ error: "Unknown fund source file." }, { status: 404 });
    }

    const search = normalizeFundAuditSearch(params.get("search") ?? "");
    const statusParam = params.get("status") ?? "all";
    const status = STATUS_FILTERS.has(statusParam as FundAuditStatus)
      ? (statusParam as FundAuditStatus)
      : null;
    const requestedPage = Number.parseInt(params.get("page") ?? "1", 10);
    const requestedPageSize = Number.parseInt(params.get("pageSize") ?? "50", 10);
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const pageSize = Number.isFinite(requestedPageSize)
      ? Math.min(100, Math.max(10, requestedPageSize))
      : 50;

    const filteredFunds = file.funds.filter((fund) => {
      if (status && fund.status !== status) return false;
      if (!search) return true;
      const values = [
        fund.sourceFundName,
        fund.sourceSchemeCode,
        fund.sourcePlan,
        fund.sourceIsin,
        fund.sourceCategory,
        fund.sourceSubcategory,
        fund.status,
        fund.matchedFund?.schemeName ?? "",
        fund.matchedFund?.schemeCode ?? "",
        ...fund.possibleMatches.flatMap((candidate) => [
          candidate.schemeName,
          candidate.schemeCode,
          candidate.plan,
        ]),
      ];
      return values.some((value) => normalizeFundAuditSearch(value).includes(search));
    });
    const start = (page - 1) * pageSize;

    return NextResponse.json(
      {
        generatedAt: snapshot.generatedAt,
        backendApi: "/api/funds-curated",
        file: file.summary,
        page,
        pageSize,
        totalFunds: filteredFunds.length,
        totalPages: Math.ceil(filteredFunds.length / pageSize),
        funds: filteredFunds.slice(start, start + pageSize),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[fund-file-audit] Failed to build fund audit:", error);
    return NextResponse.json(
      { error: "Could not read and match the mutual fund source files." },
      { status: 500 },
    );
  }
}
