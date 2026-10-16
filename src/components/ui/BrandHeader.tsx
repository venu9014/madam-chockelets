"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NotificationDropdown } from "./NotificationDropdown";
import { Building2, LogOut, ChevronDown, UserCheck } from "lucide-react";
import clsx from "clsx";

interface BrandHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    branchId?: string | null;
    branchCode?: string | null;
    branchName?: string | null;
  } | null;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ user }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentBranch = searchParams.get("branchId") || (user?.role === "BRANCH_MANAGER" ? user.branchId : "ALL");

  const handleBranchChange = (branchId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (branchId === "ALL") {
      params.delete("branchId");
    } else {
      params.set("branchId", branchId);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <header className="bg-white border-b border-cream-border sticky top-8 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity / Monogram */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-plum border border-gold-400 flex items-center justify-center text-gold-400 font-serif font-black text-lg shadow-sm group-hover:border-gold-300 transition-colors">
              MC
            </div>
            <div>
              <span className="font-serif font-bold text-plum tracking-wider text-base block leading-none">
                MADAM CHOCOLATE
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gold-700 font-semibold block mt-0.5">
                Digital Operations
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Branch Scope Selector */}
        <div className="hidden md:flex items-center gap-2">
          {user?.role === "BRANCH_MANAGER" ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cream-muted border border-gold-300/60 text-xs">
              <Building2 className="w-3.5 h-3.5 text-gold-700" />
              <span className="text-neutralMuted font-medium">Branch:</span>
              <span className="font-semibold text-plum">
                {user.branchName || "Assigned Boutique"}
              </span>
              <span className="text-[10px] bg-gold-200 text-gold-900 px-1.5 py-0.5 rounded uppercase font-bold">
                Assigned
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gold-700" />
              <select
                value={currentBranch || "ALL"}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="text-xs bg-cream-muted border border-gold-300/80 rounded-lg px-3 py-1.5 text-plum font-medium focus:outline-none focus:ring-1 focus:ring-gold-500 transition-all cursor-pointer"
              >
                <option value="ALL">All Branches (Consolidated Oversight)</option>
                <option value="IND">Indiranagar Boutique & Atelier</option>
                <option value="KOR">Koramangala Flagship Confectionery</option>
                <option value="WHF">Whitefield Salon & Tasting Room</option>
              </select>
            </div>
          )}
        </div>

        {/* Right: Notifications & User Profile */}
        <div className="flex items-center gap-3">
          <NotificationDropdown />

          <div className="h-6 w-px bg-cream-border hidden sm:block" />

          {/* User Profile Info */}
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-300 flex items-center justify-center text-violet-800 text-xs font-bold uppercase shadow-sm">
                {user.name.slice(0, 2)}
              </div>

              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-plum truncate max-w-[120px]">
                  {user.name}
                </p>
                <p className="text-[10px] text-gold-700 font-medium uppercase tracking-wider">
                  {user.role.replace("_", " ")}
                </p>
              </div>

              <button
                onClick={handleLogout}
                title="Sign out of operations session"
                className="p-1.5 rounded-lg text-neutralMuted hover:text-rose-700 hover:bg-rose-50 transition-colors ml-1"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 bg-gold-500 text-plum rounded-lg hover:bg-gold-600 transition-colors shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
