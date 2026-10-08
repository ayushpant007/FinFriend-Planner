"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight, Clock3, Eye, Loader2, Menu, Pencil, Search, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  INVESTOR_DETAILS_SESSION_KEY,
  normalizeInvestorDetails,
} from "@/lib/sif-pms-aif-investor";

const RESEARCH_CATEGORIES = ["sif", "pms", "aif"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isResearchCategory(value: unknown): value is "SIF" | "PMS" | "AIF" {
  return value === "SIF" || value === "PMS" || value === "AIF";
}

function isResearchProposalType(reportType?: string | null) {
  const categories = (reportType ?? "").toLowerCase().split("+");
  return categories.length > 0 && categories.every((category) =>
    RESEARCH_CATEGORIES.includes(category as (typeof RESEARCH_CATEGORIES)[number]),
  );
}

function getReportTypeLabel(reportType?: string | null) {
  const normalized = (reportType || "financial").toLowerCase();
  if (normalized === "financial") return "FinFriend Planner";
  if (normalized === "sip") return "SIP";
  if (isResearchProposalType(normalized)) {
    return normalized.split("+").map((category) => category.toUpperCase()).join(" / ");
  }
  return normalized.replace(/[_+]/g, " ").toUpperCase();
}

type Investor = {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  converted: boolean;
  latestReportId?: string | null;
  reports: {
    reportId: string;
    generatedAt?: string | null;
    reportType?: string | null;
  }[];
};

type InvestorGroup = {
  key: string;
  name: string;
  clients: Investor[];
  reports: {
    client: Investor;
    report: Investor["reports"][number];
  }[];
  pendingCount: number;
};

export function ClientsSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"not-converted" | "converted">("not-converted");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [openingReport, setOpeningReport] = useState<string | null>(null);

  const loadInvestors = async () => {
    try {
      const response = await fetch("/api/investors", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setInvestors(data.investors || []);
    } catch (error: any) {
      toast({ title: "Clients could not be loaded", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvestors(); }, []);

  const clientGroups = useMemo<InvestorGroup[]>(() => {
    const groups = new Map<string, Investor[]>();
    for (const client of investors) {
      const normalizedName = client.name
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
      const key = normalizedName || `id:${client.id}`;
      const clients = groups.get(key) ?? [];
      clients.push(client);
      groups.set(key, clients);
    }

    return Array.from(groups, ([key, clients]) => ({
      key,
      name: clients[0].name.trim() || clients[0].name,
      clients,
      reports: clients
        .flatMap((client) => client.reports.map((report) => ({ client, report })))
        .sort((a, b) =>
          new Date(b.report.generatedAt || 0).getTime() -
          new Date(a.report.generatedAt || 0).getTime(),
        ),
      pendingCount: clients.filter((client) => !client.converted).length,
    }));
  }, [investors]);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clientGroups.filter((group) => {
      const matchesStatus = statusFilter === "converted"
        ? group.pendingCount === 0
        : group.pendingCount > 0;
      const matchesSearch = !term || group.clients.some((client) =>
        `${group.name} ${client.email} ${client.mobile || ""}`.toLowerCase().includes(term),
      );
      return matchesStatus && matchesSearch;
    });
  }, [clientGroups, search, statusFilter]);

  const notConvertedCount = useMemo(
    () => clientGroups.filter((group) => group.pendingCount > 0).length,
    [clientGroups],
  );
  const convertedCount = useMemo(
    () => clientGroups.filter((group) => group.pendingCount === 0).length,
    [clientGroups],
  );

  const setConverted = async (client: Investor, converted: boolean) => {
    setUpdating(client.id);
    try {
      const response = await fetch("/api/investors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id, converted }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setInvestors((current) => current.map((item) => item.id === client.id ? { ...item, converted } : item));
    } catch (error: any) {
      toast({ title: "Status could not be updated", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const editClient = async (client: Investor, reportId: string) => {
    if (!reportId) {
      toast({ title: "No report available", description: "Generate a report for this client before editing it." });
      return;
    }
    try {
      const response = await fetch(`/api/investors/${client.id}/report?reportId=${encodeURIComponent(reportId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      sessionStorage.setItem("financial_planner_form_data", JSON.stringify(data.plannerData));
      window.location.href = "/planner";
    } catch (error: any) {
      toast({ title: "Report could not be loaded", description: error.message, variant: "destructive" });
    }
  };

  const openReport = async (client: Investor, report: Investor["reports"][number]) => {
    if (!isResearchProposalType(report.reportType)) {
      router.push(`/sip-optimizer-report?id=${report.reportId}`);
      return;
    }

    setOpeningReport(report.reportId);
    try {
      const response = await fetch(
        `/api/investors/${encodeURIComponent(client.id)}/report?reportId=${encodeURIComponent(report.reportId)}`,
        { cache: "no-store" },
      );
      const payload: unknown = await response.json();
      if (!response.ok || !isRecord(payload) || !isRecord(payload.plannerData)) {
        const message = isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : "The saved proposal could not be loaded.";
        throw new Error(message);
      }

      const savedProposal = payload.plannerData.savedProposal;
      if (!isRecord(savedProposal) || !Array.isArray(savedProposal.selections)) {
        throw new Error("This saved proposal does not contain its product selections.");
      }

      const selections = savedProposal.selections.flatMap((item) => {
        if (
          !isRecord(item) ||
          !isResearchCategory(item.category) ||
          typeof item.product !== "string" ||
          !item.product.trim()
        ) {
          return [];
        }
        return [{ category: item.category, product: item.product.trim() }];
      });
      if (selections.length === 0) {
        throw new Error("This saved proposal has no valid product selections.");
      }

      const investorDetails = normalizeInvestorDetails(savedProposal.investorDetails);
      if (!investorDetails.email) {
        throw new Error("Investor details are missing from this saved proposal.");
      }
      window.sessionStorage.setItem(INVESTOR_DETAILS_SESSION_KEY, JSON.stringify(investorDetails));

      const query = new URLSearchParams();
      selections.forEach((selection) => {
        query.append("category", selection.category);
        query.append("product", selection.product);
      });
      onOpenChange(false);
      router.push(`/sif-pms-aif/report?${query.toString()}`);
    } catch (error) {
      toast({
        title: "Proposal could not be opened",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setOpeningReport(null);
    }
  };

  const formatReportDate = (value?: string | null) => {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <>
      {!open && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Open clients sidebar"
          title="Open clients"
          onClick={() => onOpenChange(true)}
          className="fixed left-4 top-4 z-[120] h-10 w-10 bg-background shadow-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      {open && (
        <button
          aria-label="Close clients sidebar"
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[1px]"
        />
      )}
      <aside className={`fixed left-0 top-0 z-[110] flex h-screen w-80 max-w-[calc(100vw-2rem)] flex-col border-r bg-sidebar text-sidebar-foreground shadow-lg transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="border-b p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold">
          <Users className="h-5 w-5 text-primary" /> Saved Clients
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{clientGroups.length}</span>
          <Button variant="ghost" size="icon" aria-label="Close clients sidebar" onClick={() => onOpenChange(false)} className="ml-1 h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients..." className="h-9 pl-9 bg-background" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-muted/60 p-1" role="group" aria-label="Filter clients by conversion status">
          <button
            type="button"
            aria-pressed={statusFilter === "not-converted"}
            onClick={() => setStatusFilter("not-converted")}
            className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${statusFilter === "not-converted" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            To convert <span className="ml-1 text-[11px]">({notConvertedCount})</span>
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === "converted"}
            onClick={() => setStatusFilter("converted")}
            className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${statusFilter === "converted" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Converted <span className="ml-1 text-[11px]">({convertedCount})</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : filteredGroups.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            {search.trim()
              ? "No clients match this search."
              : clientGroups.length === 0
                ? "No saved clients yet."
                : statusFilter === "converted"
                  ? "No converted clients yet."
                  : "No clients waiting to convert."}
          </p>
        ) : filteredGroups.map((group) => {
          const isOpen = expanded === group.key;
          return (
            <div key={group.key} className="mb-2 overflow-hidden rounded-lg border bg-background/60">
              <button className="flex w-full items-center gap-2 p-3 text-left hover:bg-sidebar-accent" onClick={() => setExpanded(isOpen ? null : group.key)}>
                {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{group.name}</span>
                {group.clients.length > 1 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {group.clients.length} entries
                  </span>
                )}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {group.reports.length} {group.reports.length === 1 ? "report" : "reports"}
                </span>
                {group.pendingCount === 0
                  ? <Check aria-label="All entries converted" className="h-4 w-4 shrink-0 text-emerald-600" />
                  : group.pendingCount < group.clients.length
                    ? <span className="shrink-0 text-[10px] text-amber-600">Mixed</span>
                    : null}
              </button>
              {isOpen && <div className="space-y-2 border-t px-3 pb-3 pt-2">
                {group.clients.map((client) => (
                  <div key={client.id} className="space-y-2 rounded-md border bg-background/70 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                        {client.mobile && <p className="mt-0.5 text-[11px] text-muted-foreground">{client.mobile}</p>}
                      </div>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${client.converted ? "bg-emerald-600/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {client.converted ? "Converted" : "To convert"}
                      </span>
                    </div>
                    {client.reports.length === 0 ? (
                      <p className="rounded-md bg-muted/50 px-2 py-2 text-xs text-muted-foreground">
                        No reports created yet.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {client.reports.map((report) => (
                          <div key={report.reportId} className="rounded-md border bg-background px-2 py-2">
                            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{formatReportDate(report.generatedAt)}</span>
                              </span>
                              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                {getReportTypeLabel(report.reportType)}
                              </span>
                            </div>
                            <div className={`grid gap-1.5 ${report.reportType === "financial" || report.reportType === "sip" || !report.reportType ? "grid-cols-2" : "grid-cols-1"}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={openingReport === report.reportId}
                                onClick={() => void openReport(client, report)}
                              >
                                {openingReport === report.reportId
                                  ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                  : <Eye className="mr-1 h-3.5 w-3.5" />}
                                View
                              </Button>
                              {(report.reportType === "financial" || report.reportType === "sip" || !report.reportType) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => editClient(client, report.reportId)}
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                      <span>Converted?</span>
                      <div className="flex gap-1">
                        <button disabled={updating === client.id} onClick={() => setConverted(client, true)} className={`rounded px-2 py-1 ${client.converted ? "bg-emerald-600 text-white" : "hover:bg-background"}`}>Yes</button>
                        <button disabled={updating === client.id} onClick={() => setConverted(client, false)} className={`rounded px-2 py-1 ${!client.converted ? "bg-slate-600 text-white" : "hover:bg-background"}`}>No</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>}
            </div>
          );
        })}
      </div>
      </aside>
    </>
  );
}