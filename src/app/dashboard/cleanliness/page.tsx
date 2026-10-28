"use client";

import React, { useState, useEffect } from "react";
import { useOutlet } from "@/context/OutletContext";
import {
  Sparkles,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Info,
  RefreshCw,
  Upload,
  ShieldCheck,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";

interface InspectionRecord {
  id: string;
  zone: string;
  imageUrl: string;
  cleanlinessScore: number;
  status: string;
  visibleDebris: boolean;
  debrisNotes: string;
  disclaimer: string;
  inspectedAt: string;
  inspector: { name: string; role: string };
  branch: { name: string; code: string };
}

const ZONES = [
  { id: "KITCHEN", label: "Culinary Kitchen & Production Deck" },
  { id: "SERVICE_COUNTER", label: "Front Service & POS Counter" },
  { id: "DISPLAY_AREA", label: "Display Plinths & Pastry Showcase" },
  { id: "PACKAGING_STATION", label: "Packaging & Ribbon Assembly" },
  { id: "ENTRANCE", label: "Store Entryway & Welcome Foyer" },
];

const PRESETS = [
  {
    label: "Clean Kitchen Floor (Compliant)",
    scenario: "CLEAN",
    url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
    desc: "Polished tiles, clear work zone, zero visible debris.",
  },
  {
    label: "Flour & Crumb Dusting (Attention)",
    scenario: "CRUMBS_SPILL",
    url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800",
    desc: "Flour dusting and pastry crust crumbs near prep table.",
  },
  {
    label: "Motion Blur (Rejected)",
    scenario: "BLURRY",
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
    desc: "Excessive motion blur obscuring tile cleanliness.",
  },
  {
    label: "Dark / Shadowed Recess (Rejected)",
    scenario: "DARK",
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800",
    desc: "Insufficient lighting, deep shadows under chillers.",
  },
];

export default function CleanlinessPage() {
  const { selectedOutletCode, selectedOutletId, selectedOutlet } = useOutlet();

  const [zone, setZone] = useState("KITCHEN");
  const [selectedPhoto, setSelectedPhoto] = useState(PRESETS[0].url);
  const [simScenario, setSimScenario] = useState<string>("CLEAN");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<InspectionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async (outlet = selectedOutletCode) => {
    try {
      const branchParam = outlet && outlet !== "ALL" ? `?branchId=${outlet}` : "";
      const res = await fetch(`/api/cleanliness${branchParam}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.inspections || []);
      }
    } catch (e) {
      console.error("Failed to load inspections", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory(selectedOutletCode);
  }, [selectedOutletCode]);

  const handleInspect = async () => {
    setIsSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/cleanliness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedOutletCode !== "ALL" ? selectedOutletCode : undefined,
          zone,
          imageUrl: selectedPhoto,
          simulatedScenario: simScenario,
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.analysis);
        fetchHistory(selectedOutletCode);
      } else {
        alert(data.error || "Inspection analysis failed.");
      }
    } catch (e) {
      alert("Network error submitting floor inspection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgCleanlinessScore =
    history.length > 0
      ? Math.round(history.reduce((acc, h) => acc + h.cleanlinessScore, 0) / history.length)
      : 94;

  const passedCount = history.filter((h) => h.status === "PASSED").length;
  const passRate = history.length > 0 ? Math.round((passedCount / history.length) * 100) : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Hygiene & Visual Surface Standards
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            Floor Cleanliness Inspection
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Capture or upload floor zone photography to evaluate visible surface cleanliness, debris, and flour dusting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-muted border border-gold-300 text-xs font-semibold text-plum">
            <ShieldCheck className="w-4 h-4 text-gold-600" />
            Audit-Grade Traceability
          </span>
        </div>
      </div>

      {/* Hygiene & Cleanliness Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-cream-border shadow-sm">
        <div className="p-3 bg-cream rounded-lg">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted block">
            Atelier Hygiene Index
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-serif font-black text-plum">
              {avgCleanlinessScore}
            </span>
            <span className="text-xs text-neutralMuted font-mono">/ 100</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
            Standard: &ge;85 Passed
          </span>
        </div>

        <div className="p-3 bg-cream rounded-lg">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted block">
            Visual Pass Rate
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-serif font-black text-emerald-800">
              {passRate}%
            </span>
          </div>
          <span className="text-[10px] text-neutralMuted mt-0.5 block">
            {passedCount} of {history.length || 1} audits passed
          </span>
        </div>

        <div className="p-3 bg-cream rounded-lg">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted block">
            Monitored Zones
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-serif font-black text-gold-900">
              {ZONES.length}
            </span>
            <span className="text-xs text-neutralMuted font-mono">Zones</span>
          </div>
          <span className="text-[10px] text-neutralMuted mt-0.5 block">
            Kitchen, Plinths, Counters
          </span>
        </div>

        <div className="p-3 bg-cream rounded-lg">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted block">
            Regulatory Adherence
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-serif font-bold text-plum">
              SOP-HYG-04
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
            FSSAI Inspection Ready
          </span>
        </div>
      </div>

      {/* Mandatory Regulatory / Microbiological Disclaimer Alert */}
      <div className="bg-amber-50/70 border border-amber-300/80 rounded-xl p-4 text-xs text-amber-950 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Photographic Surface Analysis Notice:</p>
          <p className="text-amber-900 leading-relaxed">
            Visual inspection technology assesses visible dirt, spilled flour, pastry crumbs, and physical surface debris.
            <strong> It cannot detect invisible pathogens or verify microbiological sterilization.</strong> Formal sanitization routines must follow Madame Chocolate Standard Operating Procedure SOP-HYG-04.
          </p>
        </div>
      </div>

      {/* Main Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Capture & Analysis Console */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-xl border border-cream-border p-5 shadow-luxury">
            <h2 className="text-sm font-bold text-plum uppercase tracking-wider mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-gold-600" />
              1. Select Inspection Zone
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
              {ZONES.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setZone(z.id)}
                  className={`text-left p-3 rounded-lg border text-xs font-medium transition-all ${
                    zone === z.id
                      ? "border-gold-500 bg-gold-50/60 text-plum font-bold shadow-sm"
                      : "border-cream-border hover:bg-cream/40 text-neutralMuted"
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>

            <h2 className="text-sm font-serif font-bold text-plum uppercase tracking-wider mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-gold-600" />
              2. Capture Floor Photography (or Sample Scenario)
            </h2>

            <p className="text-xs text-cocoa/70 mb-3">
              Select one of the calibrated quality sample photos or paste an image URL:
            </p>

            {/* Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedPhoto(p.url);
                    setSimScenario(p.scenario);
                  }}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    selectedPhoto === p.url
                      ? "border-gold-500 bg-gold-100/50 text-plum font-semibold ring-1 ring-gold-400"
                      : "border-cream-border bg-white hover:bg-cream/30 text-neutralMuted"
                  }`}
                >
                  <div className="font-semibold text-plum">{p.label}</div>
                  <div className="text-[10px] text-neutralMuted truncate">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Photo Preview Frame */}
            <div className="relative h-60 rounded-xl overflow-hidden border border-cream-border bg-cream-muted mb-4 group">
              <img
                src={selectedPhoto}
                alt="Floor Inspection Target"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-plum/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs flex items-center justify-between">
                <span>Target: {ZONES.find((z) => z.id === zone)?.label}</span>
                <span className="text-[10px] text-gold-300 font-mono">Calibrated Camera</span>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-plum mb-1">
                Inspector Observation Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Checked during morning flour mixing shift..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-cream-border focus:outline-none focus:border-gold-500"
              />
            </div>

            {/* Run Analysis Action */}
            <button
              onClick={handleInspect}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-serif font-bold text-sm tracking-wide shadow-gold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing Visible Surface Cleanliness...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-gold-200" />
                  Analyze Floor Cleanliness & Log Inspection
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Real-Time Results / Gauge */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-xl border border-cream-border p-5 shadow-luxury min-h-[460px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-4">
                <h3 className="font-serif font-bold text-base text-plum flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gold-600" />
                  Analysis Evaluation
                </h3>
                {result && (
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      result.status === "PASSED"
                        ? "bg-green-100 text-green-800 border border-green-300"
                        : result.status === "NEEDS_ATTENTION"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-red-100 text-red-800 border border-red-300"
                    }`}
                  >
                    {result.status.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {!result ? (
                <div className="py-16 text-center text-neutralMuted space-y-3">
                  <Camera className="w-12 h-12 mx-auto text-gold-300 opacity-60" />
                  <p className="text-xs">
                    Select a zone and click <strong>Analyze Floor Cleanliness</strong> to view live surface score, debris detection, and quality diagnostics.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cleanliness Score Gauge */}
                  <div className="text-center p-4 bg-cream/40 rounded-xl border border-cream-border">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutralMuted block">
                      Surface Cleanliness Index
                    </span>
                    <div className="text-4xl font-serif font-black text-plum mt-1">
                      {result.cleanlinessScore}
                      <span className="text-base text-neutralMuted font-normal"> / 100</span>
                    </div>
                    <p className="text-xs text-cocoa/80 mt-1 max-w-xs mx-auto">
                      {result.debrisNotes}
                    </p>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-cream-muted/50 rounded-lg border border-cream-border">
                      <span className="text-[10px] text-neutralMuted block">Lighting & Brightness</span>
                      <span className="font-mono font-bold text-plum">
                        {result.metrics?.brightness}%{" "}
                        {result.metrics?.brightness < 30 ? "(Underlit)" : "(Optimal)"}
                      </span>
                    </div>

                    <div className="p-3 bg-cream-muted/50 rounded-lg border border-cream-border">
                      <span className="text-[10px] text-neutralMuted block">Sharpness / Blur Metric</span>
                      <span className="font-mono font-bold text-plum">
                        {result.metrics?.sharpness}%{" "}
                        {result.metrics?.sharpness < 40 ? "(Blurred)" : "(Crisp)"}
                      </span>
                    </div>

                    <div className="p-3 bg-cream-muted/50 rounded-lg border border-cream-border">
                      <span className="text-[10px] text-neutralMuted block">Debris / Crumb Clusters</span>
                      <span className="font-mono font-bold text-plum">
                        {result.metrics?.debrisCount} detected
                      </span>
                    </div>

                    <div className="p-3 bg-cream-muted/50 rounded-lg border border-cream-border">
                      <span className="text-[10px] text-neutralMuted block">Surface Coverage</span>
                      <span className="font-mono font-bold text-plum">
                        {result.metrics?.surfaceCoverage}% verified
                      </span>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-1.5 pt-2">
                    <h4 className="text-xs font-bold text-plum uppercase tracking-wider">
                      Recommended Actions:
                    </h4>
                    <ul className="space-y-1 text-xs text-cocoa/80">
                      {result.recommendations?.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-gold-600 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-cream-border text-[10px] text-neutralMuted text-center">
              Recorded to immutable branch audit log upon submission.
            </div>
          </div>
        </div>
      </div>

      {/* Inspection History Table */}
      <div className="bg-white rounded-xl border border-cream-border overflow-hidden shadow-luxury">
        <div className="p-4 border-b border-cream-border flex items-center justify-between">
          <h2 className="font-serif font-bold text-base text-plum flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold-600" />
            Recent Floor Cleanliness Inspection History
          </h2>
          <span className="text-xs text-neutralMuted">{history.length} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-cream-muted/60 text-plum font-semibold border-b border-cream-border">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Branch & Zone</th>
                <th className="py-3 px-4">Inspector</th>
                <th className="py-3 px-4">Cleanliness Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Photo Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-border">
              {loadingHistory ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutralMuted">
                    Loading inspection log...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutralMuted">
                    No cleanliness inspections recorded yet. Submit your first inspection above!
                  </td>
                </tr>
              ) : (
                history.map((rec) => (
                  <tr key={rec.id} className="hover:bg-cream/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-neutralMuted">
                      {new Date(rec.inspectedAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-plum block">{rec.branch.name}</span>
                      <span className="text-[10px] text-gold-800 font-mono">
                        {ZONES.find((z) => z.id === rec.zone)?.label || rec.zone}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-plum font-medium">{rec.inspector.name}</span>
                      <span className="text-[10px] text-neutralMuted block">{rec.inspector.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-serif font-black text-plum text-sm">
                        {rec.cleanlinessScore}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          rec.status === "PASSED"
                            ? "bg-green-100 text-green-800"
                            : rec.status === "NEEDS_ATTENTION"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {rec.status === "PASSED" ? (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        ) : rec.status === "NEEDS_ATTENTION" ? (
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-600" />
                        )}
                        {rec.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-12 h-10 rounded border border-cream-border overflow-hidden bg-cream-muted">
                        <img
                          src={rec.imageUrl}
                          alt="Inspection"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
