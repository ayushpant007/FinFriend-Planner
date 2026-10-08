"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, LoaderCircle, Plus, Trash2, WalletCards } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InvestmentCategory,
  investmentOptions,
  isInvestmentCategory,
} from "@/lib/sif-pms-aif";
import type { AifRegistryEntry } from "@/lib/aif-registry";
import {
  INVESTOR_DETAILS_SESSION_KEY,
  type InvestorDetails,
} from "@/lib/sif-pms-aif-investor";

type InvestmentSelection = {
  category: InvestmentCategory | "";
  investment: string;
};

type PmsOption = {
  name: string;
  url: string;
  category: string;
  urlVerification: string;
};

type SifHoldingPreviewItem = {
  name: string;
  weight: unknown;
};

type SifHoldingsPreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      holdings: SifHoldingPreviewItem[];
      totalHoldings: number | null;
    };

function parseSifHoldingsPreview(value: unknown): Omit<
  Extract<SifHoldingsPreviewState, { status: "ready" }>,
  "status"
> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The SIF report response was not readable.");
  }
  const payload = value as Record<string, unknown>;
  const portfolio =
    payload.portfolio && typeof payload.portfolio === "object" && !Array.isArray(payload.portfolio)
      ? (payload.portfolio as Record<string, unknown>)
      : null;
  if (!portfolio) {
    throw new Error("The selected SIF report did not include portfolio data.");
  }

  const holdings = Array.isArray(portfolio.top_holdings)
    ? portfolio.top_holdings.flatMap((item): SifHoldingPreviewItem[] => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const record = item as Record<string, unknown>;
        const name = record.name ?? record.security ?? record.company;
        if (typeof name !== "string" || !name.trim()) return [];
        return [{
          name: name.trim(),
          weight: record.weight_percent ?? record.weight ?? record.percentage ?? null,
        }];
      })
    : [];
  const total = Number(portfolio.total_holdings);

  return {
    holdings,
    totalHoldings: Number.isFinite(total) && total >= 0 ? total : null,
  };
}

function formatHoldingWeight(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const weight = typeof value === "number" ? value : Number(String(value).replace("%", "").trim());
  if (!Number.isFinite(weight)) return String(value);
  return `${weight.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}

function SifHoldingsPreview({
  state,
}: {
  state: SifHoldingsPreviewState | undefined;
}) {
  return (
    <section
      className="rounded-xl border border-[#cfe2df] bg-[#f5fbfa] p-4 dark:border-slate-700 dark:bg-slate-900/70"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <WalletCards className="h-4 w-4 text-[#0b7772]" />
        <h3 className="text-sm font-semibold text-[#14263d] dark:text-slate-100">
          Holdings before report
        </h3>
      </div>
      {!state || state.status === "loading" ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          Loading holdings from the selected SIF research pack…
        </p>
      ) : state.status === "error" ? (
        <p className="mt-3 text-xs text-red-700 dark:text-red-300" role="alert">
          Holdings preview could not be loaded: {state.message}
        </p>
      ) : state.holdings.length === 0 ? (
        <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
          {state.totalHoldings
            ? `The source reports ${state.totalHoldings.toLocaleString("en-IN")} holdings, but individual positions were not available to display.`
            : "Individual holdings are not disclosed in this SIF research pack."}
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Showing the top {Math.min(10, state.holdings.length)} positions
            {state.totalHoldings !== null
              ? ` from ${state.totalHoldings.toLocaleString("en-IN")} disclosed holdings.`
              : " disclosed in the research pack."}
          </p>
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
            {state.holdings.slice(0, 10).map((holding, index) => (
              <div
                key={`${holding.name}-${index}`}
                className="flex items-start gap-3 border-b border-[#e0eeeb] py-2 last:border-0 dark:border-slate-800"
              >
                <span className="w-5 shrink-0 text-xs font-bold text-slate-400">
                  {index + 1}.
                </span>
                <span className="min-w-0 flex-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                  {holding.name}
                </span>
                <span className="shrink-0 text-xs font-semibold text-[#0b7772]">
                  {formatHoldingWeight(holding.weight)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function SifPmsAifPage() {
  const router = useRouter();
  const [pmsOptions, setPmsOptions] = useState<PmsOption[]>([]);
  const [aifOptions, setAifOptions] = useState<AifRegistryEntry[]>([]);
  const [pmsLoading, setPmsLoading] = useState(true);
  const [aifLoading, setAifLoading] = useState(true);
  const [pmsError, setPmsError] = useState("");
  const [aifError, setAifError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSavingProposal, setIsSavingProposal] = useState(false);
  const [selections, setSelections] = useState<InvestmentSelection[]>([
    { category: "", investment: "" },
  ]);
  const [sifHoldingsByProduct, setSifHoldingsByProduct] = useState<
    Record<string, SifHoldingsPreviewState>
  >({});
  const selectedSifProducts = [
    ...new Set(
      selections
        .filter((selection) => selection.category === "SIF" && selection.investment)
        .map((selection) => selection.investment),
    ),
  ];
  const selectedSifProductsKey = JSON.stringify(selectedSifProducts);
  const sifHoldingsLoading = selectedSifProducts.some((product) => {
    const state = sifHoldingsByProduct[product];
    return !state || state.status === "loading";
  });
  const completeSelections = selections.filter(
    (
      selection,
    ): selection is { category: InvestmentCategory; investment: string } =>
      isInvestmentCategory(selection.category) && Boolean(selection.investment.trim()),
  );
  const hasCompleteSelection = completeSelections.length > 0;

  useEffect(() => {
    const products = JSON.parse(selectedSifProductsKey) as string[];
    if (products.length === 0) return;

    const controller = new AbortController();
    setSifHoldingsByProduct((current) => {
      const next = { ...current };
      for (const product of products) next[product] = { status: "loading" };
      return next;
    });

    for (const product of products) {
      fetch(`/api/sif-report?product=${encodeURIComponent(product)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) {
            const message =
              payload && typeof payload.error === "string"
                ? payload.error
                : "The selected SIF report could not be loaded.";
            throw new Error(message);
          }
          return parseSifHoldingsPreview(payload);
        })
        .then((preview) => {
          setSifHoldingsByProduct((current) => ({
            ...current,
            [product]: { status: "ready", ...preview },
          }));
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setSifHoldingsByProduct((current) => ({
            ...current,
            [product]: {
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "The holdings data could not be read.",
            },
          }));
        });
    }

    return () => controller.abort();
  }, [selectedSifProductsKey]);

  async function handleGenerateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (completeSelections.length === 0) {
      setSubmitError("Choose at least one investment category and product before generating a report.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const investorDetails: InvestorDetails = {
      name: String(formData.get("name") ?? "").trim(),
      dob: String(formData.get("dob") ?? ""),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      amount: String(formData.get("amount") ?? "").trim(),
    };

    if (!investorDetails.email) {
      setSubmitError("Enter an email address so this proposal can be saved in Saved Clients.");
      return;
    }

    setIsSavingProposal(true);
    try {
      window.sessionStorage.setItem(
        INVESTOR_DETAILS_SESSION_KEY,
        JSON.stringify(investorDetails),
      );

      const reportId = `investment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const response = await fetch("/api/store-investment-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          investorDetails,
          selections: completeSelections.map((selection) => ({
            category: selection.category,
            product: selection.investment.trim(),
          })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof result.error === "string" ? result.error : "The proposal could not be saved.",
        );
      }

      setSubmitError("");
      const query = new URLSearchParams();
      completeSelections.forEach((selection) => {
        query.append("category", selection.category);
        query.append("product", selection.investment.trim());
      });
      router.push(`/sif-pms-aif/report?${query.toString()}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "The proposal could not be saved. Please try again.",
      );
    } finally {
      setIsSavingProposal(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/pms-master-list")
      .then(async (response) => {
        if (!response.ok) throw new Error("PMS master list unavailable");
        return response.json() as Promise<{ entries?: PmsOption[] }>;
      })
      .then((payload) => {
        if (!active) return;
        setPmsOptions(Array.isArray(payload.entries) ? payload.entries : []);
      })
      .catch(() => {
        if (active) setPmsError("We could not load the PMS master list.");
      })
      .finally(() => {
        if (active) setPmsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/aif-master-list")
      .then(async (response) => {
        if (!response.ok) throw new Error("AIF registry unavailable");
        return response.json() as Promise<{ entries?: AifRegistryEntry[] }>;
      })
      .then((payload) => {
        if (!active) return;
        setAifOptions(Array.isArray(payload.entries) ? payload.entries : []);
      })
      .catch(() => {
        if (active) setAifError("We could not load the uploaded AIF registry.");
      })
      .finally(() => {
        if (active) setAifLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen">
      <AppHeader />
      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              SIF / PMS / AIF Investment Selection Form
            </h1>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <form className="space-y-6" onSubmit={handleGenerateReport}>
              <div>
                <h2 className="text-lg font-semibold">Investor Details</h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="investor-name" className="text-sm font-medium">
                      Name <span className="text-destructive">*</span>
                    </label>
                    <Input id="investor-name" name="name" required placeholder="Enter your name" />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="investor-dob" className="text-sm font-medium">
                      Date of Birth (DOB) <span className="text-destructive">*</span>
                    </label>
                    <Input id="investor-dob" name="dob" type="date" required />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="investor-phone" className="text-sm font-medium">
                      Phone Number
                    </label>
                    <Input id="investor-phone" name="phone" type="tel" placeholder="Enter your phone number" />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="investor-email" className="text-sm font-medium">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <Input id="investor-email" name="email" type="email" required placeholder="Enter your email address" />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="investor-amount" className="text-sm font-medium">
                      Amount (₹)
                    </label>
                    <Input
                      id="investor-amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Enter investment amount"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Choose Investment Category</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Every completed product row will appear in the consolidated report.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelections((current) => [
                        ...current,
                        { category: "", investment: "" },
                      ])
                    }
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 glass-button-outline"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add More</span>
                  </button>
                </div>
                <div className="mt-5 space-y-5">
                  {selections.map((selection, index) => {
                    const categoryLabel = selection.category
                      ? `Choose ${selection.category}`
                      : "Choose Investment";
                    const selectedPmsOption = pmsOptions.find(
                      (option) => option.name === selection.investment,
                    );

                    return (
                      <div key={index} className="space-y-5">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label
                              htmlFor={`investment-category-${index}`}
                              className="text-sm font-medium"
                            >
                              Choose Investment Category
                            </label>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelections((current) =>
                                    current.filter((_, currentIndex) => currentIndex !== index),
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                                aria-label={`Delete investment selection ${index + 1}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                          <Select
                            value={selection.category}
                            onValueChange={(value) => {
                              setSelections((current) =>
                                current.map((currentSelection, currentIndex) =>
                                  currentIndex === index
                                    ? {
                                        category: value as InvestmentCategory,
                                        investment: "",
                                      }
                                    : currentSelection,
                                ),
                              );
                            }}
                          >
                            <SelectTrigger
                              id={`investment-category-${index}`}
                              aria-label="Choose Investment Category"
                            >
                              <SelectValue placeholder="Choose Investment Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PMS">PMS</SelectItem>
                              <SelectItem value="AIF">AIF</SelectItem>
                              <SelectItem value="SIF">SIF</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                         {selection.category && (
                          <div className="space-y-2">
                            <label
                              htmlFor={`investment-selection-${index}`}
                              className="text-sm font-medium"
                            >
                              {categoryLabel}
                            </label>
                             {selection.category === "AIF" ? (
                               <SearchableSelect
                                 options={aifOptions.map((option) => option.name)}
                                 value={selection.investment}
                                 onChange={(value) =>
                                   setSelections((current) =>
                                     current.map((currentSelection, currentIndex) =>
                                       currentIndex === index
                                         ? { ...currentSelection, investment: value }
                                         : currentSelection,
                                     ),
                                   )
                                 }
                                 disabled={aifLoading || aifOptions.length === 0}
                                 placeholder={aifLoading ? "Loading AIF names…" : categoryLabel}
                               />
                             ) : (
                               <Select
                                 disabled={selection.category === "PMS" && (pmsLoading || pmsOptions.length === 0)}
                                 value={selection.investment}
                                 onValueChange={(value) =>
                                   setSelections((current) =>
                                     current.map((currentSelection, currentIndex) =>
                                       currentIndex === index
                                         ? { ...currentSelection, investment: value }
                                         : currentSelection,
                                     ),
                                   )
                                 }
                               >
                                 <SelectTrigger
                                   id={`investment-selection-${index}`}
                                   aria-label={categoryLabel}
                                   className="w-full"
                                 >
                                   <SelectValue
                                     placeholder={
                                       selection.category === "PMS" && pmsLoading
                                         ? "Loading PMS names…"
                                         : categoryLabel
                                     }
                                   />
                                 </SelectTrigger>
                                  <SelectContent className="max-h-[min(60vh,460px)]">
                                    {selection.category === "PMS"
                                      ? pmsOptions.map((option) => (
                                          <SelectItem key={option.name} value={option.name}>
                                            {option.name}
                                          </SelectItem>
                                        ))
                                      : investmentOptions[selection.category].map((option) => (
                                          <SelectItem key={option.label} value={option.label}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                  </SelectContent>
                               </Select>
                             )}
                             {selection.category === "PMS" && (
                               <p className={`flex items-center gap-1.5 text-xs ${pmsError ? "text-red-600" : "text-slate-500"}`}>
                                 {pmsLoading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                                  {pmsError || (pmsLoading ? "Loading names from the PMS AIF World CSV…" : `${pmsOptions.length} strategies from the PMS AIF World CSV`)}
                               </p>
                             )}
                              {selection.category === "PMS" && selectedPmsOption && (
                                <p className="text-xs text-slate-500">
                                  CSV URL status: {selectedPmsOption.urlVerification || "Not specified"} ·{" "}
                                  <a
                                    href={selectedPmsOption.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-[#0b7772] underline underline-offset-2"
                                  >
                                    Open source URL
                                  </a>
                                </p>
                              )}
                              {selection.category === "AIF" && (
                                <p className={`flex items-center gap-1.5 text-xs ${aifError ? "text-red-600" : "text-slate-500"}`}>
                                  {aifLoading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                                  {aifError || (aifLoading ? "Loading names from the uploaded SEBI registry…" : `${aifOptions.length.toLocaleString("en-IN")} unique AIF names from the uploaded registry`)}
                                </p>
                              )}
                              {selection.category === "SIF" && selection.investment && (
                                <SifHoldingsPreview
                                  state={sifHoldingsByProduct[selection.investment]}
                                />
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {hasCompleteSelection && !sifHoldingsLoading && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSavingProposal}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 glass-button-primary disabled:cursor-wait disabled:opacity-60"
                      >
                        {isSavingProposal
                          ? <LoaderCircle className="h-4 w-4 animate-spin" />
                          : <FileText className="h-4 w-4" />}
                        <span>{isSavingProposal ? "Saving proposal…" : "Generate Report"}</span>
                      </button>
                    </div>
                  )}
                  {submitError && (
                    <p className="text-sm text-destructive" role="alert">
                      {submitError}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}