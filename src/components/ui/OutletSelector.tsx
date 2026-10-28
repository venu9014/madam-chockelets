"use client";

import React, { useState, useRef, useEffect } from "react";
import { useOutlet, Branch } from "@/context/OutletContext";
import { Building2, ChevronDown, Check, RefreshCw, AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import clsx from "clsx";

interface OutletSelectorProps {
  className?: string;
  compactOnMobile?: boolean;
}

export const OutletSelector: React.FC<OutletSelectorProps> = ({
  className = "",
  compactOnMobile = false,
}) => {
  const {
    selectedOutletCode,
    selectedOutlet,
    branches,
    loadingOutlets,
    errorOutlets,
    setOutletId,
    refreshOutlets,
    user,
  } = useOutlet();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Loading State
  if (loadingOutlets && branches.length === 0) {
    return (
      <div
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cream-muted border border-gold-300/60 text-xs text-neutralMuted animate-pulse",
          className
        )}
      >
        <RefreshCw className="w-3.5 h-3.5 text-gold-600 animate-spin" />
        <span className="font-medium">Loading boutiques...</span>
      </div>
    );
  }

  // Error State
  if (errorOutlets && branches.length === 0) {
    return (
      <div
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800",
          className
        )}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span className="font-medium truncate max-w-[140px]">{errorOutlets}</span>
        <button
          onClick={() => refreshOutlets()}
          className="text-[10px] underline font-bold hover:text-rose-900 ml-1"
        >
          Retry
        </button>
      </div>
    );
  }

  // Determine user permission: Employees and single-branch managers are locked to their assigned outlet
  const isEmployee = user?.role === "EMPLOYEE";
  const isSingleBranchManager = user?.role === "BRANCH_MANAGER" && !!user?.branchId;
  const isLockedToSingle = isEmployee || (isSingleBranchManager && branches.length <= 1);

  // If user is locked to a single assigned outlet (ordinary employee)
  if (isLockedToSingle) {
    const singleBranch = branches[0] || selectedOutlet;
    const branchName = singleBranch?.name || user?.branchName || "Assigned Boutique";
    const branchCode = singleBranch?.code || user?.branchCode || "IND";

    return (
      <div
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cream-muted border border-gold-300/60 text-xs select-none shadow-sm",
          className
        )}
        title={`Your account is authorized exclusively for ${branchName}`}
      >
        <Building2 className="w-3.5 h-3.5 text-gold-700 shrink-0" />
        <span className="text-neutralMuted font-medium hidden sm:inline">Boutique:</span>
        <span className="font-semibold text-plum truncate max-w-[160px] sm:max-w-[200px]">
          {branchName}
        </span>
        <span className="text-[10px] bg-gold-200 text-gold-900 px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0">
          {branchCode}
        </span>
        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold uppercase flex items-center gap-1 shrink-0">
          <Lock className="w-2.5 h-2.5" />
          Assigned
        </span>
      </div>
    );
  }

  // Empty State if no branches found
  if (branches.length === 0) {
    return (
      <div
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cream-muted border border-cream-border text-xs text-neutralMuted",
          className
        )}
      >
        <Building2 className="w-3.5 h-3.5 text-neutralMuted" />
        <span>No authorized outlets</span>
      </div>
    );
  }

  // Multi-Outlet Manager / Owner / Auditor Selector
  const canViewAll = user?.role === "OWNER" || user?.role === "AUDITOR";
  const currentLabel =
    selectedOutletCode === "ALL"
      ? "All Boutiques (Consolidated)"
      : selectedOutlet?.name || selectedOutletCode;

  const handleSelect = (code: string) => {
    setOutletId(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cream-muted border text-xs text-plum font-medium transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer",
          isOpen
            ? "border-gold-500 bg-white ring-1 ring-gold-500/40"
            : "border-gold-300/80 hover:border-gold-400 hover:bg-cream"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Boutique Outlet"
      >
        <Building2 className="w-3.5 h-3.5 text-gold-700 shrink-0" />
        <span className="text-neutralMuted font-medium hidden sm:inline">Outlet:</span>
        <span className="font-semibold text-plum truncate max-w-[140px] sm:max-w-[200px]">
          {currentLabel}
        </span>
        <span className="text-[10px] bg-plum text-gold-300 px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0">
          {selectedOutletCode}
        </span>
        <ChevronDown
          className={clsx(
            "w-3.5 h-3.5 text-gold-700 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-1.5 w-72 sm:w-80 bg-white rounded-xl border border-gold-300 shadow-luxury-lg z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Menu Header */}
          <div className="px-3 py-2 bg-cream-muted border-b border-cream-border flex items-center justify-between text-[11px]">
            <span className="font-bold text-plum uppercase tracking-wider">
              Authorized Outlets ({branches.length})
            </span>
            {user?.role && (
              <span className="text-[10px] font-semibold text-gold-800 bg-gold-100 px-1.5 py-0.5 rounded uppercase">
                {user.role.replace("_", " ")}
              </span>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
            {/* Option: All Boutiques (Consolidated Oversight) */}
            {canViewAll && (
              <button
                type="button"
                onClick={() => handleSelect("ALL")}
                className={clsx(
                  "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors",
                  selectedOutletCode === "ALL"
                    ? "bg-plum text-gold-300 font-bold shadow-sm"
                    : "text-plum hover:bg-cream-muted"
                )}
                role="option"
                aria-selected={selectedOutletCode === "ALL"}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    className={clsx(
                      "w-4 h-4 shrink-0",
                      selectedOutletCode === "ALL" ? "text-gold-400" : "text-gold-700"
                    )}
                  />
                  <div>
                    <span className="block font-semibold">All Boutiques (Consolidated)</span>
                    <span
                      className={clsx(
                        "text-[10px] block",
                        selectedOutletCode === "ALL" ? "text-gold-200" : "text-neutralMuted"
                      )}
                    >
                      Enterprise aggregated analytics
                    </span>
                  </div>
                </div>
                {selectedOutletCode === "ALL" && (
                  <Check className="w-4 h-4 text-gold-400 shrink-0" />
                )}
              </button>
            )}

            {/* Individual Authorized Outlets */}
            {branches.map((b) => {
              const isSelected = selectedOutletCode === b.code || selectedOutletCode === b.id;
              return (
                <button
                  key={b.id || b.code}
                  type="button"
                  onClick={() => handleSelect(b.code)}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors",
                    isSelected
                      ? "bg-plum text-gold-300 font-bold shadow-sm"
                      : "text-plum hover:bg-cream-muted"
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={clsx(
                        "w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0",
                        isSelected
                          ? "bg-gold-500 text-plum font-black"
                          : "bg-cream-muted text-plum border border-cream-border"
                      )}
                    >
                      {b.code}
                    </div>
                    <div className="truncate">
                      <span className="block font-semibold truncate">{b.name}</span>
                      <span
                        className={clsx(
                          "text-[10px] block truncate",
                          isSelected ? "text-gold-200" : "text-neutralMuted"
                        )}
                      >
                        {b.city} &bull; {b.wifiSsid || "Moto G85 5G"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {b.code === "MHD" && (
                      <span
                        className={clsx(
                          "text-[9px] px-1.5 py-0.2 rounded font-bold uppercase",
                          isSelected
                            ? "bg-gold-400/20 text-gold-200 border border-gold-400/40"
                            : "bg-violet-100 text-violet-800 border border-violet-200"
                        )}
                      >
                        New
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-gold-400" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer status notice */}
          <div className="px-3 py-1.5 bg-cream/60 border-t border-cream-border text-[10px] text-neutralMuted flex items-center justify-between">
            <span>Selection persists across navigation</span>
            <span className="font-mono text-plum">{selectedOutletCode}</span>
          </div>
        </div>
      )}
    </div>
  );
};
