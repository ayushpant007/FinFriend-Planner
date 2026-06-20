"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter, usePathname } from "next/navigation";
import { PieChart, LayoutDashboard } from "lucide-react";
import Image from "next/image";

const logoUrl = "/finfriend-planner-logo.png";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const isAllocation = pathname === "/allocation";

  return (
    <header className="glass-header sticky top-0 z-[100] w-full">
      <div className="container flex h-28 items-center">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-64 cursor-pointer" onClick={() => router.push("/planner")}>
              <Image
                src={logoUrl}
                alt="FinFriend Planner Logo"
                fill
                sizes="256px"
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isAllocation ? (
            <button
              onClick={() => router.push("/planner")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 glass-button-outline"
              title="Go to Full Planner"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Full Planner</span>
            </button>
          ) : (
            <button
              onClick={() => router.push("/allocation")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 glass-button-outline"
              title="Go to Fund Allocation view"
            >
              <PieChart className="h-4 w-4" />
              <span>Fund Allocation</span>
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
