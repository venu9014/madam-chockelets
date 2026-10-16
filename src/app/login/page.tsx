"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

const DEMO_PERSONAS = [
  {
    role: "OWNER",
    email: "owner@madamchocolate.com",
    name: "Ananya Deshmukh",
    title: "Executive Owner & Chief Chocolatier",
    badge: "Full Governance & All Branches",
    color: "border-gold-400 bg-gold-50/30",
  },
  {
    role: "BRANCH_MANAGER",
    email: "manager.indiranagar@madamchocolate.com",
    name: "Vikram Rathore",
    title: "Boutique General Manager",
    badge: "Indiranagar Branch Only",
    color: "border-violet-300 bg-violet-50/30",
  },
  {
    role: "EMPLOYEE",
    email: "employee.rahul@madamchocolate.com",
    name: "Rahul Verma",
    title: "Senior Display & Pastry Artisan",
    badge: "Checklists & Attendance",
    color: "border-cream-border bg-white",
  },
  {
    role: "AUDITOR",
    email: "auditor@madamchocolate.com",
    name: "Pooja Hegde",
    title: "Principal Internal Auditor",
    badge: "Read-Only Across System",
    color: "border-neutralMuted-border bg-white",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Authentication failed.");
      }
    } catch (err) {
      setError("Network or server error during sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSwitch = async (demoEmail: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Demo persona login failed.");
      }
    } catch (err) {
      setError("Error signing in as demo persona.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Crest */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-plum border-2 border-gold-400 flex items-center justify-center text-gold-400 font-serif font-black text-2xl shadow-luxury mb-4">
          MC
        </div>

        <h1 className="text-3xl font-serif font-black text-plum tracking-tight">
          MADAM CHOCOLATE
        </h1>
        <p className="text-xs uppercase tracking-widest text-gold-700 font-bold mt-1">
          Digital Operations Platform &bull; Staff Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Demo Fast-Track Card */}
        <div className="bg-white py-6 px-6 sm:px-8 shadow-luxury-lg rounded-2xl border border-gold-300/80 mb-6">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cream-border">
            <Sparkles className="w-4 h-4 text-gold-600" />
            <h2 className="font-serif font-bold text-sm text-plum">
              Instant 1-Click Demo Personas
            </h2>
          </div>

          <p className="text-xs text-cocoa/80 mb-4 leading-relaxed">
            Select a verified demonstration account to explore role-specific permissions and branch views instantly:
          </p>

          <div className="space-y-2.5">
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.email}
                onClick={() => handleDemoSwitch(p.email)}
                disabled={loading}
                className={clsx(
                  "w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all hover:border-gold-500 hover:shadow-sm",
                  p.color
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-xs text-plum">{p.name}</span>
                    <span className="text-[10px] uppercase font-bold text-gold-800 bg-gold-100 px-1.5 py-0.5 rounded">
                      {p.role.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutralMuted mt-0.5">{p.title}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-neutralMuted block">{p.badge}</span>
                  <span className="text-xs font-semibold text-gold-700 hover:text-gold-900 inline-flex items-center gap-0.5 mt-0.5">
                    Enter &rarr;
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Standard Credentials Card */}
        <div className="bg-white py-6 px-6 sm:px-8 shadow-sm rounded-2xl border border-cream-border">
          <h3 className="font-serif font-bold text-xs text-plum uppercase tracking-wider mb-3">
            Or Sign In With Registered Credentials
          </h3>

          <form onSubmit={handleCustomLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-plum mb-1">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutralMuted absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="name@madamchocolate.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-plum mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutralMuted absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-plum font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{loading ? "Verifying..." : "Sign In to Operations Console"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-neutralMuted">
            Demo password for all accounts: <code className="font-mono font-bold text-plum">MadamChoc2026!</code>
          </p>
        </div>
      </div>
    </div>
  );
}
