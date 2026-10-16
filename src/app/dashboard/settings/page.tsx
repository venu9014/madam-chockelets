"use client";

import React, { useState } from "react";
import {
  Settings,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Server,
  Database,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleResetDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPhrase !== "RESET_DEMO_DATA") return;

    try {
      setResetting(true);
      setResultMessage(null);
      setIsError(false);

      const res = await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmPhrase }),
      });

      const data = await res.json();
      if (res.ok) {
        setResultMessage("Demo dataset restored to baseline deterministic state successfully! Reloading in 2s...");
        setConfirmPhrase("");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setIsError(true);
        setResultMessage(data.error || "Reset failed.");
      }
    } catch (err) {
      setIsError(true);
      setResultMessage("Network or server error during reset.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-cream-border">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
          Platform Administration
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
          System Architecture & Demo Reset
        </h1>
        <p className="text-xs text-cocoa/80 mt-1">
          Inspect persistent runtime specifications, localization rules, and execute controlled demo environment resets.
        </p>
      </div>

      {/* System Specifications Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-xl border border-cream-border shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-gold-700">
            <Server className="w-4 h-4" />
            <h4 className="font-serif font-bold text-sm text-plum">
              Application & Runtime
            </h4>
          </div>
          <ul className="text-xs space-y-1 text-cocoa">
            <li>Framework: <strong>Next.js 14 (App Router)</strong></li>
            <li>Language: <strong>TypeScript 5 (Strict Mode)</strong></li>
            <li>Styling: <strong>Tailwind CSS (Madam Luxury Design System)</strong></li>
            <li>Authentication: <strong>Argon2id / Bcrypt + HTTP-Only Session JWT</strong></li>
          </ul>
        </div>

        <div className="p-4 bg-white rounded-xl border border-cream-border shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-gold-700">
            <Database className="w-4 h-4" />
            <h4 className="font-serif font-bold text-sm text-plum">
              Relational Storage & Time
            </h4>
          </div>
          <ul className="text-xs space-y-1 text-cocoa">
            <li>ORM: <strong>Prisma 5 with Atomic Transactions</strong></li>
            <li>Dev Database: <strong>SQLite (Zero-Config Persistent Engine)</strong></li>
            <li>Currency: <strong>INR (₹) Fixed-Precision Math</strong></li>
            <li>Timezone: <strong>Asia/Kolkata (IST Standard)</strong></li>
          </ul>
        </div>
      </div>

      {/* Demo Reset Card */}
      <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-luxury">
        <div className="flex items-center gap-2 text-rose-800 pb-3 border-b border-rose-100 mb-4">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="font-serif font-bold text-base">
            Restore Deterministic Demo Dataset
          </h3>
        </div>

        <p className="text-xs text-cocoa leading-relaxed mb-4">
          This operation resets all operational tables (tasks, attendance punches, stock movements, and audit records) and re-seeds the exact deterministic baseline dataset (3 branches, 12 employees, 18 products, 10 SOPs, 10 discrepancy scenarios).
        </p>

        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-950 mb-4">
          <strong>Production Safeguard:</strong> This endpoint is permanently disabled in production environments and requires explicit passphrase verification.
        </div>

        <form onSubmit={handleResetDemo} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-plum mb-1">
              Type <span className="font-mono text-rose-700 font-bold">RESET_DEMO_DATA</span> to confirm:
            </label>
            <input
              type="text"
              placeholder="RESET_DEMO_DATA"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              className="w-full sm:w-80 p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <button
            type="submit"
            disabled={confirmPhrase !== "RESET_DEMO_DATA" || resetting}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
            <span>{resetting ? "Resetting Environment..." : "Reset Demo Environment"}</span>
          </button>
        </form>

        {resultMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs font-medium ${
              isError
                ? "bg-rose-50 text-rose-900 border border-rose-200"
                : "bg-emerald-50 text-emerald-900 border border-emerald-200"
            }`}
          >
            {resultMessage}
          </div>
        )}
      </div>
    </div>
  );
}
