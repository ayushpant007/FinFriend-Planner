"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Report } from '@/components/planner/Report';
import type { ReportData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ShareReportLink } from '@/components/planner/ShareReportLink';

function ReportPageContent() {
  const searchParams = useSearchParams();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      const reportId = searchParams.get('id');

      if (!reportId) {
        setError("No report ID provided. Please generate a report first.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/get-report?id=${reportId}&type=detailed&t=${Date.now()}`);
        if (response.ok) {
          const result = await response.json();
          setReportData(result.data);
        } else {
          setError("Report not found. It may have been deleted or the link is invalid.");
        }
      } catch (e) {
        console.error("Failed to load report data:", e);
        setError("Could not load report data. Please try again.");
      }

      setIsLoading(false);
    }

    loadReport();
  }, [searchParams]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading report...</div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center h-screen text-red-500 gap-4">
        <span>{error}</span>
        <Link href="/">
            <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Planner
            </Button>
        </Link>
    </div>;
  }

  if (!reportData) {
    return <div className="flex items-center justify-center h-screen">No report to display.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
        <main className="container mx-auto p-4 md:p-8">
            <ShareReportLink />
            <Report data={reportData} />
        </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading report...</div>}>
      <ReportPageContent />
    </Suspense>
  );
}
