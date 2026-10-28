"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotificationDropdown } from "./NotificationDropdown";
import { OutletSelector } from "./OutletSelector";
import { Building2, LogOut, ChevronDown, UserCheck } from "lucide-react";
import clsx from "clsx";
import { useOutlet } from "@/context/OutletContext";

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
  const { selectedOutletCode, setOutletId, branches, loadingOutlets } = useOutlet();

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
              <span className="font-bold text-plum tracking-wide text-base block leading-none">
                Madam Chockelets
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gold-700 font-semibold block mt-0.5">
                Digital Operations
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Authoritative Outlet Selector */}
        <div className="flex items-center gap-2">
          <OutletSelector />
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
