"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, UserCheck, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface DemoBannerProps {
  currentUser?: {
    name: string;
    role: string;
    email: string;
    branchName?: string | null;
  } | null;
}

const DEMO_PERSONAS = [
  {
    role: "OWNER",
    email: "owner@madamchocolate.com",
    name: "Ananya Deshmukh",
    label: "Owner",
    scope: "All Branches (Full Access)",
  },
  {
    role: "BRANCH_MANAGER",
    email: "manager.indiranagar@madamchocolate.com",
    name: "Vikram Rathore",
    label: "Manager (IND)",
    scope: "Indiranagar Boutique Only",
  },
  {
    role: "EMPLOYEE",
    email: "employee.rahul@madamchocolate.com",
    name: "Rahul Verma",
    label: "Employee (IND)",
    scope: "Display & Tasks (IND)",
  },
  {
    role: "EMPLOYEE",
    email: "employee.whitefield@madamchocolate.com",
    name: "Whitefield Employee",
    label: "Employee (WHF)",
    scope: "Whitefield Salon & Tasting Room",
  },
  {
    role: "AUDITOR",
    email: "auditor@madamchocolate.com",
    name: "Pooja Hegde",
    label: "Auditor",
    scope: "Audit Trail (Read-Only)",
  },
];

export const DemoBanner: React.FC<DemoBannerProps> = ({ currentUser }) => {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSwitchPersona = async (email: string) => {
    try {
      setSwitching(email);
      const res = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        router.refresh();
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to switch demo persona:", err);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="bg-plum text-cream border-b border-gold-500/40 px-4 py-2 sm:px-6 text-xs sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        {/* Banner Title */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-gold-500/20 text-gold-300 font-semibold px-2.5 py-0.5 rounded-full border border-gold-500/30 tracking-wider text-[11px]">
            <Sparkles className="w-3 h-3 text-gold-400" />
            DEMO ENVIRONMENT — FICTIONAL DATA
          </span>

          {currentUser && (
            <span className="text-cream-muted hidden lg:inline">
              Active Persona:{" "}
              <strong className="text-white font-medium">{currentUser.name}</strong> (
              <span className="text-gold-300">{currentUser.role}</span>
              {currentUser.branchName ? ` — ${currentUser.branchName}` : ""})
            </span>
          )}
        </div>

        {/* 1-Click Role Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <span className="text-neutralMuted-light text-[11px] mr-1 hidden sm:inline">
            Quick Switch:
          </span>

          {DEMO_PERSONAS.map((p) => {
            const isActive = currentUser?.email?.toLowerCase() === p.email.toLowerCase();

            return (
              <button
                key={p.email}
                onClick={() => handleSwitchPersona(p.email)}
                disabled={Boolean(switching) || isActive}
                title={`Switch to ${p.name} (${p.scope})`}
                className={clsx(
                  "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                  isActive
                    ? "bg-gold-500 text-plum font-semibold shadow-gold cursor-default"
                    : "bg-plum-light hover:bg-violet-900/60 text-cream-muted hover:text-white border border-gold-500/20"
                )}
              >
                {isActive && <CheckCircle2 className="w-3 h-3" />}
                {switching === p.email ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : null}
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
