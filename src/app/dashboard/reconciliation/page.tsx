"use client";

import React, { useState, useEffect } from "react";
import { useOutlet } from "@/context/OutletContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Scale,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import clsx from "clsx";

interface Discrepancy {
  id: string;
  expectedQty: number;
  countedQty: number;
  varianceQty: number;
  unitCost: number;
  varianceValue: number;
  scenarioType: string;
  status: string;
  rootCause?: string | null;
  investigationNotes?: string | null;
  product: { id: string; name: string; sku: string; category: string; costPrice: number };
  branch: { id: string; name: string; code: string };
  countItem: {
    session: { sessionNumber: string; countDate: string };
  };
  adjustmentRequest?: {
    id: string;
    requestNumber: string;
    proposedQuantity: number;
    adjustmentValue: number;
    reason: string;
    status: string;
  } | null;
}

export default function ReconciliationPage() {
  const { selectedOutletCode, selectedOutletId, selectedOutlet, branches: contextBranches } = useOutlet();

  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<Discrepancy | null>(null);

  // Investigation Form
  const [rootCause, setRootCause] = useState("");
  const [investigationNotes, setInvestigationNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Adjustment Request Form
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Owner Approval Action
  const [approvalRunning, setApprovalRunning] = useState(false);

  const fetchDiscrepancies = async (outlet = selectedOutletCode) => {
    try {
      setLoading(true);
      const branchParam = outlet && outlet !== "ALL" ? `?branchId=${outlet}` : "";
      const res = await fetch(`/api/reconciliation/discrepancies${branchParam}`);
      if (res.ok) {
        const data = await res.json();
        setDiscrepancies(data.discrepancies || []);
      }
    } catch (err) {
      console.error("Failed to fetch discrepancies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedDiscrepancy(null);
    fetchDiscrepancies(selectedOutletCode);
  }, [selectedOutletCode]);

  const handleOpenDetail = (disc: Discrepancy) => {
    setSelectedDiscrepancy(disc);
    setRootCause(disc.rootCause || "");
    setInvestigationNotes(disc.investigationNotes || "");
  };

  const handleSaveInvestigation = async () => {
    if (!selectedDiscrepancy) return;
    try {
      setSavingNotes(true);
      const res = await fetch("/api/reconciliation/discrepancies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discrepancyId: selectedDiscrepancy.id,
          rootCause,
          investigationNotes,
          status: "INVESTIGATING",
        }),
      });

      if (res.ok) {
        await fetchDiscrepancies();
        setSelectedDiscrepancy((prev) =>
          prev ? { ...prev, rootCause, investigationNotes, status: "INVESTIGATING" } : null
        );
      }
    } catch (err) {
      console.error("Failed to update notes:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleRequestAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscrepancy) return;
    try {
      setSubmittingAdjustment(true);
      const res = await fetch("/api/reconciliation/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discrepancyId: selectedDiscrepancy.id,
          branchId: selectedDiscrepancy.branch.id,
          productId: selectedDiscrepancy.product.id,
          proposedQuantity: selectedDiscrepancy.varianceQty,
          reason: adjustmentReason,
        }),
      });

      if (res.ok) {
        setShowAdjustmentModal(false);
        setAdjustmentReason("");
        await fetchDiscrepancies();
        setSelectedDiscrepancy(null);
      }
    } catch (err) {
      console.error("Failed to request adjustment:", err);
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  const handleOwnerApproveAdjustment = async (adjustmentId: string, status: "APPROVED" | "REJECTED") => {
    try {
      setApprovalRunning(true);
      const res = await fetch("/api/reconciliation/adjustments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustmentId,
          status,
          approvalNotes: `Executive sign-off recorded by Owner. Ledger updated.`,
        }),
      });

      if (res.ok) {
        await fetchDiscrepancies();
        setSelectedDiscrepancy(null);
      }
    } catch (err) {
      console.error("Adjustment approval failed:", err);
    } finally {
      setApprovalRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Cycle Counting & Discrepancy Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            Physical Stock Reconciliation
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Compare physical counted stock against ledger expected balances, record investigation root causes, and submit adjustments for Owner approval.
          </p>
        </div>

        <div className="bg-cream-muted border border-gold-300 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
          <Scale className="w-4 h-4 text-gold-700" />
          <span className="font-semibold text-plum">
            Variance Formula: Physical Count &minus; Expected Ledger Balance
          </span>
        </div>
      </div>

      {/* Discrepancy Scenarios Table */}
      <div className="bg-white rounded-xl border border-cream-border shadow-luxury overflow-hidden">
        <div className="p-4 bg-cream-muted/60 border-b border-cream-border flex items-center justify-between">
          <span className="font-serif font-bold text-sm text-plum">
            Active Discrepancies & Scenarios ({discrepancies.length})
          </span>
          <span className="text-[11px] text-neutralMuted">
            Neutral, auditable investigation records (no misconduct presumption)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-cocoa">
            <thead className="bg-cream-muted text-plum uppercase font-bold text-[10px] tracking-wider border-b border-cream-border">
              <tr>
                <th className="py-3 px-4">Boutique</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Scenario Category</th>
                <th className="py-3 px-4 text-right">Physical Count</th>
                <th className="py-3 px-4 text-right">Expected Stock</th>
                <th className="py-3 px-4 text-right">Variance Qty</th>
                <th className="py-3 px-4 text-right">Variance Exposure (₹)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-muted">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-neutralMuted">
                    Loading reconciliation scenarios...
                  </td>
                </tr>
              ) : (
                discrepancies.map((disc) => {
                  const isPositive = disc.varianceQty > 0;

                  return (
                    <tr key={disc.id} className="hover:bg-cream/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-plum">
                        {disc.branch.name.split(" ")[0]}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-plum block">{disc.product.name}</span>
                        <span className="text-[10px] text-neutralMuted font-mono">{disc.product.sku}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-medium text-cocoa">
                          {disc.scenarioType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        {disc.countedQty}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-neutralMuted">
                        {disc.expectedQty}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={clsx(
                            "font-bold font-mono px-2 py-0.5 rounded text-xs",
                            isPositive
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-rose-50 text-rose-800"
                          )}
                        >
                          {isPositive ? `+${disc.varianceQty}` : disc.varianceQty}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-serif font-bold text-plum">
                        ₹{Math.abs(disc.varianceValue).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={disc.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(disc)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-cream-muted hover:bg-gold-500 hover:text-plum text-cocoa rounded border border-gold-300 transition-colors"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discrepancy Investigation & Adjustment Detail Drawer */}
      {selectedDiscrepancy && (
        <div className="fixed inset-0 bg-plum/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-luxury-lg border border-gold-300 p-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-cream-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold-700">
                    {selectedDiscrepancy.branch.name}
                  </span>
                  <StatusBadge status={selectedDiscrepancy.status} size="sm" />
                </div>
                <h2 className="text-xl font-serif font-bold text-plum">
                  {selectedDiscrepancy.product.name}
                </h2>
                <p className="text-xs text-neutralMuted mt-0.5">
                  SKU: {selectedDiscrepancy.product.sku} &bull; Count Session:{" "}
                  {selectedDiscrepancy.countItem.session.sessionNumber}
                </p>
              </div>

              <button
                onClick={() => setSelectedDiscrepancy(null)}
                className="p-1 rounded-lg text-neutralMuted hover:text-plum hover:bg-cream"
              >
                &times;
              </button>
            </div>

            {/* Variance Metric Box */}
            <div className="grid grid-cols-3 gap-3 my-4 p-4 rounded-xl bg-cream border border-cream-border text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-neutralMuted">Counted</span>
                <p className="text-lg font-serif font-bold text-plum mt-0.5">
                  {selectedDiscrepancy.countedQty}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutralMuted">Expected</span>
                <p className="text-lg font-serif font-bold text-neutralMuted mt-0.5">
                  {selectedDiscrepancy.expectedQty}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutralMuted">Financial Risk</span>
                <p className="text-lg font-serif font-bold text-rose-800 mt-0.5">
                  ₹{Math.abs(selectedDiscrepancy.varianceValue).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Investigation Notes & Root Cause */}
            <div className="space-y-3 my-4">
              <div>
                <label className="block text-xs font-semibold text-plum mb-1">
                  Root Cause Classification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Broken display samples not logged in daily wastage register"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full p-2.5 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">
                  Investigation Findings & Supporting Evidence
                </label>
                <textarea
                  rows={3}
                  placeholder="Record supervisor inquiry findings, CCTV review, or delivery slip matches..."
                  value={investigationNotes}
                  onChange={(e) => setInvestigationNotes(e.target.value)}
                  className="w-full p-2.5 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum"
                />
              </div>

              <button
                onClick={handleSaveInvestigation}
                disabled={savingNotes}
                className="px-3.5 py-1.5 bg-white border border-gold-400 text-plum font-semibold text-xs rounded-lg hover:bg-cream-muted transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-gold-700" />
                <span>{savingNotes ? "Saving..." : "Save Investigation Findings"}</span>
              </button>
            </div>

            {/* Pending Adjustment Section */}
            {selectedDiscrepancy.adjustmentRequest ? (
              <div className="my-4 p-4 rounded-xl bg-violet-50/50 border border-violet-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-bold text-xs text-violet-900">
                    Adjustment Request #{selectedDiscrepancy.adjustmentRequest.requestNumber}
                  </span>
                  <StatusBadge status={selectedDiscrepancy.adjustmentRequest.status} size="sm" />
                </div>
                <p className="text-xs text-cocoa/90 mb-3">
                  Reason: &ldquo;{selectedDiscrepancy.adjustmentRequest.reason}&rdquo; &bull; Proposed
                  adjustment: <strong>{selectedDiscrepancy.adjustmentRequest.proposedQuantity} units</strong> (
                  Valuation: ₹{Math.abs(selectedDiscrepancy.adjustmentRequest.adjustmentValue)})
                </p>

                {selectedDiscrepancy.adjustmentRequest.status === "PENDING" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-violet-200">
                    <span className="text-[11px] font-bold text-gold-900 uppercase">
                      Owner Authorization Required:
                    </span>
                    <button
                      onClick={() =>
                        handleOwnerApproveAdjustment(
                          selectedDiscrepancy.adjustmentRequest!.id,
                          "APPROVED"
                        )
                      }
                      disabled={approvalRunning}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Authorize Adjustment</span>
                    </button>
                    <button
                      onClick={() =>
                        handleOwnerApproveAdjustment(
                          selectedDiscrepancy.adjustmentRequest!.id,
                          "REJECTED"
                        )
                      }
                      disabled={approvalRunning}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              selectedDiscrepancy.status !== "RESOLVED" && (
                <div className="my-4 p-4 rounded-xl bg-amber-50/50 border border-amber-300 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-xs text-amber-950">
                      Request Authorized Stock Adjustment
                    </h4>
                    <p className="text-[11px] text-amber-900/80 mt-0.5">
                      Submit formal write-down or write-up request for Executive Owner sign-off.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAdjustmentModal(true)}
                    className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-plum font-semibold text-xs rounded-lg shadow-sm"
                  >
                    Request Adjustment
                  </button>
                </div>
              )
            )}

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-cream-border flex justify-end">
              <button
                onClick={() => setSelectedDiscrepancy(null)}
                className="px-4 py-2 text-xs font-semibold text-cocoa hover:text-plum"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Adjustment Modal */}
      {showAdjustmentModal && selectedDiscrepancy && (
        <div className="fixed inset-0 bg-plum/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-luxury-lg border border-gold-300">
            <h3 className="text-lg font-serif font-bold text-plum mb-1">
              Submit Stock Adjustment Request
            </h3>
            <p className="text-xs text-neutralMuted mb-4">
              Adjustment for {selectedDiscrepancy.product.name} ({selectedDiscrepancy.varianceQty} units).
            </p>

            <form onSubmit={handleRequestAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-plum mb-1">
                  Business Justification / Reason
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Sampling for seasonal media launch event; items photographed and written off."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full p-2.5 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum"
                />
              </div>

              <div className="pt-3 border-t border-cream-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-3 py-1.5 text-xs text-neutralMuted font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjustment}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-plum font-semibold text-xs rounded-lg shadow-sm"
                >
                  {submittingAdjustment ? "Submitting..." : "Submit to Owner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
