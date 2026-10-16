"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

const SAMPLE_SALES_CSV = `sku,quantity,reference,notes
MC-DRK-70,5,INV-POS-20261016-01,Evening retail counter sale
MC-MLK-CLS,3,INV-POS-20261016-02,Gift hamper add-on purchase
MC-WHT-SAFF,2,INV-POS-20261016-03,Festive saffron tasting box
MC-PRAL-12,4,INV-POS-20261016-04,Corporate gift box order
INVALID-SKU-99,10,INV-POS-20261016-05,Simulated validation error row`;

export default function ImportsPage() {
  const [csvContent, setCsvContent] = useState("");
  const [jobType, setJobType] = useState("SALES_IMPORT");
  const [targetBranch, setTargetBranch] = useState("IND");
  const [running, setRunning] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [commitResult, setCommitResult] = useState<any | null>(null);

  const handleLoadSample = () => {
    setCsvContent(SAMPLE_SALES_CSV);
    setPreviewResult(null);
    setCommitResult(null);
  };

  const handleDryRun = async () => {
    try {
      setRunning(true);
      setCommitResult(null);
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvData: csvContent,
          jobType,
          branchId: targetBranch,
          isDryRun: true,
          fileName: "sample_sales_import.csv",
        }),
      });

      const data = await res.json();
      setPreviewResult(data);
    } catch (err) {
      console.error("Dry run error:", err);
    } finally {
      setRunning(false);
    }
  };

  const handleExecuteCommit = async () => {
    try {
      setRunning(true);
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvData: csvContent,
          jobType,
          branchId: targetBranch,
          isDryRun: false,
          fileName: "sample_sales_import.csv",
        }),
      });

      const data = await res.json();
      setCommitResult(data);
    } catch (err) {
      console.error("Commit error:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Batch Operations & Data Feeds
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            CSV Imports & Formula-Sanitized Exports
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Transaction-safe parsing for POS daily sales exports and warehouse cycle counts with dry-run previews and injection protection.
          </p>
        </div>

        <button
          onClick={handleLoadSample}
          className="px-3.5 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-plum font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-plum" />
          <span>Load Fictional Sample Sales CSV</span>
        </button>
      </div>

      {/* Import Configuration Panel */}
      <div className="bg-white rounded-xl border border-cream-border p-6 shadow-luxury">
        <h3 className="font-serif font-bold text-base text-plum mb-3">
          Import Feed Setup & Dry-Run Validation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-plum mb-1">
              Data Feed Type
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs"
            >
              <option value="SALES_IMPORT">Daily POS Register Sales (Stock Deductions)</option>
              <option value="PHYSICAL_STOCK_IMPORT">Physical Stock Count Batch Import</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-plum mb-1">
              Target Boutique
            </label>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs"
            >
              <option value="IND">Indiranagar Boutique & Atelier</option>
              <option value="KOR">Koramangala Flagship Confectionery</option>
              <option value="WHF">Whitefield Salon & Tasting Room</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-plum mb-1">
            CSV Text Stream
          </label>
          <textarea
            rows={6}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="sku,quantity,reference,notes..."
            className="w-full p-3 font-mono text-xs bg-cream-muted border border-cream-border rounded-lg text-plum focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleDryRun}
            disabled={running || !csvContent.trim()}
            className="px-4 py-2 bg-white border border-gold-400 text-plum font-semibold text-xs rounded-lg hover:bg-cream-muted transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 text-gold-700" />
            <span>{running ? "Analyzing..." : "1. Run Dry-Run Preview"}</span>
          </button>

          {previewResult && (
            <button
              onClick={handleExecuteCommit}
              disabled={running}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>2. Confirm & Commit to Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* Dry Run Preview Results */}
      {previewResult && (
        <div className="bg-white rounded-xl border border-gold-300 p-6 shadow-luxury">
          <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-4">
            <h3 className="font-serif font-bold text-base text-plum">
              Dry-Run Validation Summary
            </h3>
            <span
              className={clsx(
                "text-xs font-bold px-2.5 py-1 rounded-full uppercase",
                previewResult.errorCount > 0
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
              )}
            >
              {previewResult.validCount} Valid &bull; {previewResult.errorCount} Errors Detected
            </span>
          </div>

          {/* Row errors */}
          {previewResult.validationErrors && previewResult.validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
              <strong className="block text-rose-900 font-bold">Row-Level Validation Errors:</strong>
              {previewResult.validationErrors.map((err: any, i: number) => (
                <div key={i} className="text-rose-800 flex items-center gap-2">
                  <span className="font-bold">Row {err.row}:</span> {err.error}
                </div>
              ))}
            </div>
          )}

          {/* Preview Rows */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-cocoa">
              <thead className="bg-cream-muted uppercase font-bold text-[10px] text-plum">
                <tr>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3 text-right">Quantity</th>
                  <th className="py-2 px-3 text-right">Unit Cost</th>
                  <th className="py-2 px-3">Reference</th>
                  <th className="py-2 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-muted">
                {previewResult.previewRows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-cream/40">
                    <td className="py-2 px-3 font-mono font-semibold text-plum">{row.sku}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                      {row.quantity}
                    </td>
                    <td className="py-2 px-3 text-right font-serif">₹{row.unitCost}</td>
                    <td className="py-2 px-3 font-mono text-neutralMuted">{row.referenceNumber}</td>
                    <td className="py-2 px-3 text-neutralMuted">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commit Result */}
      {commitResult && (
        <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-xl shadow-sm text-emerald-950">
          <div className="flex items-center gap-2 font-serif font-bold text-base mb-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>CSV Batch Successfully Posted to Ledger!</span>
          </div>
          <p className="text-xs">
            Import Job ID: <span className="font-mono">{commitResult.importJob?.id}</span> &bull;{" "}
            {commitResult.summary?.successfulRows} movements posted to database ledger.
          </p>
        </div>
      )}
    </div>
  );
}
