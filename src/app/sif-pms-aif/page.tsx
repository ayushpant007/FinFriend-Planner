"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LoaderCircle, Plus, Trash2 } from "lucide-react";
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
import { InvestmentCategory, investmentOptions } from "@/lib/sif-pms-aif";
import type { AifRegistryEntry } from "@/lib/aif-registry";

type InvestmentSelection = {
  category: InvestmentCategory | "";
  investment: string;
};

type PmsOption = {
  name: string;
  url: string;
  category: string;
};

export default function SifPmsAifPage() {
  const router = useRouter();
  const [pmsOptions, setPmsOptions] = useState<PmsOption[]>([]);
  const [aifOptions, setAifOptions] = useState<AifRegistryEntry[]>([]);
  const [pmsLoading, setPmsLoading] = useState(true);
  const [aifLoading, setAifLoading] = useState(true);
  const [pmsError, setPmsError] = useState("");
  const [aifError, setAifError] = useState("");
  const [selections, setSelections] = useState<InvestmentSelection[]>([
    { category: "", investment: "" },
  ]);
  const hasCompleteSelection = selections.some(
    (selection) => selection.category && selection.investment,
  );

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
            <div className="space-y-6">
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
                      Email Address
                    </label>
                    <Input id="investor-email" name="email" type="email" placeholder="Enter your email address" />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold">Choose Investment Category</h2>
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
                                 {pmsError || (pmsLoading ? "Loading names from the uploaded PMS master list…" : `${pmsOptions.length} PMS strategies from the uploaded PMS AIF World list`)}
                               </p>
                             )}
                              {selection.category === "AIF" && (
                                <p className={`flex items-center gap-1.5 text-xs ${aifError ? "text-red-600" : "text-slate-500"}`}>
                                  {aifLoading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                                  {aifError || (aifLoading ? "Loading names from the uploaded SEBI registry…" : `${aifOptions.length.toLocaleString("en-IN")} unique AIF names from the uploaded registry`)}
                                </p>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {hasCompleteSelection && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const selection = selections.find(
                            (currentSelection) =>
                              currentSelection.category && currentSelection.investment,
                          );
                          if (!selection) return;
                          const query = new URLSearchParams({
                            category: selection.category,
                            product: selection.investment,
                          });
                          router.push(`/sif-pms-aif/report?${query.toString()}`);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 glass-button-primary"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Generate Report</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}