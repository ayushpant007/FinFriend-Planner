"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight, FileText, Loader2, Menu, Pencil, Search, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Investor = {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  converted: boolean;
  latestReportId?: string | null;
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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

  const filteredInvestors = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? investors.filter((client) =>
      `${client.name} ${client.email} ${client.mobile || ""}`.toLowerCase().includes(term),
    ) : investors;
  }, [investors, search]);

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

  const editClient = async (client: Investor) => {
    if (!client.latestReportId) {
      toast({ title: "No report available", description: "Generate a report for this client before editing it." });
      return;
    }
    try {
      const response = await fetch(`/api/investors/${client.id}/report`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      sessionStorage.setItem("financial_planner_form_data", JSON.stringify(data.plannerData));
      window.location.href = "/planner";
    } catch (error: any) {
      toast({ title: "Report could not be loaded", description: error.message, variant: "destructive" });
    }
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
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{investors.length}</span>
          <Button variant="ghost" size="icon" aria-label="Close clients sidebar" onClick={() => onOpenChange(false)} className="ml-1 h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients..." className="h-9 pl-9 bg-background" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : filteredInvestors.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">No saved clients yet.</p>
        ) : filteredInvestors.map((client) => {
          const isOpen = expanded === client.id;
          return (
            <div key={client.id} className="mb-2 overflow-hidden rounded-lg border bg-background/60">
              <button className="flex w-full items-center gap-2 p-3 text-left hover:bg-sidebar-accent" onClick={() => setExpanded(isOpen ? null : client.id)}>
                {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{client.name}</span>
                {client.converted && <Check className="h-4 w-4 shrink-0 text-emerald-600" title="Converted" />}
              </button>
              {isOpen && <div className="space-y-2 border-t px-3 pb-3 pt-2">
                <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" disabled={!client.latestReportId} onClick={() => client.latestReportId && router.push(`/sip-optimizer-report?id=${client.latestReportId}`)}>
                    <FileText className="mr-1 h-3.5 w-3.5" /> View
                  </Button>
                  <Button variant="outline" size="sm" disabled={!client.latestReportId} onClick={() => editClient(client)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                  <span>Converted?</span>
                  <div className="flex gap-1">
                    <button disabled={updating === client.id} onClick={() => setConverted(client, true)} className={`rounded px-2 py-1 ${client.converted ? "bg-emerald-600 text-white" : "hover:bg-background"}`}>Yes</button>
                    <button disabled={updating === client.id} onClick={() => setConverted(client, false)} className={`rounded px-2 py-1 ${!client.converted ? "bg-slate-600 text-white" : "hover:bg-background"}`}>No</button>
                  </div>
                </div>
              </div>}
            </div>
          );
        })}
      </div>
      </aside>
    </>
  );
}