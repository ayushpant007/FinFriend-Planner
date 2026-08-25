"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SipOptimizerReport } from '@/components/planner/SipOptimizerReport';
import type { SipOptimizerReportData, GoalWithCalculations } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ShareReportLink } from '@/components/planner/ShareReportLink';

function SipOptimizerReportPageContent() {
  const searchParams = useSearchParams();
  const [reportData, setReportData] = useState<(SipOptimizerReportData & { goalsWithCalculations: GoalWithCalculations[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPreview = searchParams.get('preview') === 'true';

  useEffect(() => {
    async function loadReport() {
      const reportId = searchParams.get('id');

      if (!reportId) {
        setError("No report ID provided. Please generate a report first.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/get-report?id=${reportId}&type=sip`);
        if (response.ok) {
          const result = await response.json();
          setReportData(result.data);
        } else {
          setError("Report not found. It may have been deleted or the link is invalid.");
        }
      } catch (e) {
        console.error("Failed to load SIP optimizer report data:", e);
        setError("Could not load report data. Please try again.");
      }

      setIsLoading(false);
    }

    loadReport();
  }, [searchParams]);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen">
            Loading report...
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-screen text-red-500 gap-4">
            <span>{error}</span>
            <Link href="/">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Planner
                </Button>
            </Link>
        </div>
    );
  }

  if (!reportData) {
    return (
        <div className="flex items-center justify-center h-screen">
            No report to display.
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <main>
            <div className="mx-auto max-w-7xl px-4 pt-4 md:px-8">
              <ShareReportLink />
            </div>
            <SipOptimizerReport data={reportData} isPreview={isPreview} />
        </main>
    </div>
  );
}

export default function SipOptimizerReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          Loading report...
        </div>
      }
    >
      <SipOptimizerReportPageContent />
    </Suspense>
  );
}
