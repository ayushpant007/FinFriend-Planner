"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import { PieChart } from "lucide-react";
import Image from "next/image";

const logoUrl = "/finfriend-planner-logo.png";

export function AppHeader() {
  const router = useRouter();

  const handleAllocationClick = () => {
    router.push("/allocation");
  };

  return (
    <header className="glass-header sticky top-0 z-[100] w-full">
      <div className="container flex h-28 items-center">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-64">
                <Image 
                  src={logoUrl}
                  alt="FinFriend Planner Logo" 
                  fill
                  sizes="256px"
                  style={{ objectFit: 'contain' }}
                  priority
              />
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <button
            onClick={handleAllocationClick}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 glass-button-outline"
            title="Jump to Asset & Fund Allocation"
          >
            <PieChart className="h-4 w-4" />
            <span>Allocation</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
