'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CasReportResults } from '@/components/cas/CasReportResults';

export default function CasReportResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <CasReportResults />
    </Suspense>
  );
}
