"use client";

import { useState } from "react";
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import LoginCardSection from "@/components/ui/login-signup";

const LandingDashboard = dynamic(
  () => import('@/components/landing/LandingDashboard').then(mod => mod.LandingDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return (
      <LoginCardSection
        onSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  return <LandingDashboard />;
}
