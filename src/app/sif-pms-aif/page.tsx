"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InvestmentCategory = "PMS" | "AIF" | "SIF";
type InvestmentSelection = {
  category: InvestmentCategory | "";
  investment: string;
};

const investmentOptions: Record<InvestmentCategory, string[]> = {
  SIF: [
    "DynaSIF Equity Ex-Top 100 Long-Short Fund",
    "QSIF Equity Ex-Top 100 Long-Short Fund",
    "iSIF Equity Ex-Top 100 Long-Short Fund",
    "Arudha Equity Long-Short Fund",
    "Summit Equity Long-Short Fund",
  ],
  PMS: [
    "ICICI Prudential Emerging Leaders PMS",
    "Abakkus Emerging Opportunities PMS",
    "Helios India Rising Portfolio",
    "Motilal Oswal Founders Strategy PMS",
    "ABSL Select Sector Portfolio PMS",
  ],
  AIF: [
    "ICICI Prudential Emerging Leaders Fund — Series III",
    "Helios India Emerging Star Fund",
    "ABSL Select Sector Fund — AIF Category III — Mid & Small Cap Growth Opportunity",
  ],
};

export default function SifPmsAifPage() {
  const [selections, setSelections] = useState<InvestmentSelection[]>([
    { category: "", investment: "" },
  ]);

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
                            <Select
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
                              >
                                <SelectValue placeholder={categoryLabel} />
                              </SelectTrigger>
                              <SelectContent>
                                {investmentOptions[selection.category].map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}