"use client";

import { Construction } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";

export default function SifPmsAifReportPage() {
  return (
    <main className="min-h-screen">
      <AppHeader />
      <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-6 py-16">
        <div className="glass-card w-full max-w-xl p-10 text-center sm:p-14">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Construction className="h-8 w-8" />
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Report Generation
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            This report page is under construction.
          </p>
        </div>
      </section>
    </main>
  );
}