"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const Planner = dynamic(() => import('@/components/planner/Planner').then(mod => mod.Planner), {
  ssr: false,
  loading: () => <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

export default function PlannerPage() {
  return (
    <main>
      <Planner />
    </main>
  );
}
