"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Plus,
  Filter,
  Search,
  Building2,
  Package,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import clsx from "clsx";

interface MovementRecord {
  id: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  referenceNumber: string;
  notes?: string | null;
  effectiveDate: string;
  product: { id: string; name: string; sku: string; unitOfMeasure: string; costPrice: number };
  branch: { id: string; name: string; code: string };
}

interface ProductSummary {
  id: string;
  sku: string;
  name: string;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  minStockThreshold: number;
  currentStock: number;
}

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const initialBranch = searchParams.get("branchId") || "ALL";

  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState(initialBranch);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // New Movement Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [movementType, setMovementType] = useState("WASTAGE");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [targetBranch, setTargetBranch] = useState("IND");
  const [submitting, setSubmitting] = useState(false);

  // Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferProduct, setTransferProduct] = useState("");
  const [transferSource, setTransferSource] = useState("IND");
  const [transferTarget, setTransferTarget] = useState("KOR");
  const [transferQty, setTransferQty] = useState("5");
  const [transferNotes, setTransferNotes] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [movRes, prodRes] = await Promise.all([
        fetch(`/api/inventory/movements?branchId=${branchFilter}&movementType=${typeFilter}&limit=100`),
        fetch("/api/dashboard/stats"),
      ]);

      if (movRes.ok) {
        const movData = await movRes.json();
        setMovements(movData.movements || []);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [branchFilter, typeFilter]);

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct,
          branchId: targetBranch,
          movementType,
          quantity: parseInt(quantity, 10),
          notes,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setNotes("");
        await fetchData();
      }
    } catch (err) {
      console.error("Error creating movement:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceBranchId: transferSource,
          targetBranchId: transferTarget,
          items: [
            {
              productId: transferProduct,
              quantity: parseInt(transferQty, 10),
            },
          ],
          notes: transferNotes,
        }),
      });

      if (res.ok) {
        setShowTransferModal(false);
        setTransferNotes("");
        await fetchData();
      }
    } catch (err) {
      console.error("Error creating transfer:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMovements = movements.filter((m) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.product.name.toLowerCase().includes(term) ||
      m.product.sku.toLowerCase().includes(term) ||
      m.referenceNumber.toLowerCase().includes(term) ||
      m.branch.name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Stock Integrity & Audit Ledger
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            Inventory Movements Ledger
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Authoritative, double-entry style stock ledger tracking receipts, POS sales deductions, transfers, and wastage write-downs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-3.5 py-2 rounded-lg bg-white border border-gold-400 text-plum font-semibold text-xs hover:bg-cream-muted transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-gold-700" />
            <span>Inter-Branch Transfer</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-plum font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Stock Movement</span>
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-cream-border shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase text-neutralMuted mr-1">
            Movement Type:
          </span>
          {["ALL", "OPENING_STOCK", "PURCHASE", "SALE", "TRANSFER_OUT", "TRANSFER_IN", "WASTAGE", "ADJUSTMENT"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={clsx(
                "px-2.5 py-1 rounded text-[11px] font-semibold transition-all uppercase tracking-wider",
                typeFilter === t
                  ? "bg-gold-500 text-plum shadow-sm"
                  : "bg-cream-muted text-cocoa/80 hover:bg-cream"
              )}
            >
              {t.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-neutralMuted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search SKU, invoice, branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-cream-border shadow-luxury overflow-hidden">
        <div className="p-4 bg-cream-muted/50 border-b border-cream-border flex items-center justify-between">
          <span className="font-serif font-bold text-sm text-plum">
            Recorded Ledger Transactions ({filteredMovements.length})
          </span>
          <span className="text-[11px] text-neutralMuted">
            Closing balances derived directly from signed eligible movements
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-cocoa">
            <thead className="bg-cream-muted text-plum uppercase font-bold text-[10px] tracking-wider border-b border-cream-border">
              <tr>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4">Boutique</th>
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4">Reference #</th>
                <th className="py-3 px-4 text-right">Quantity Impact</th>
                <th className="py-3 px-4 text-right">Unit Valuation (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-muted">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-neutralMuted">
                    Loading inventory movements...
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-neutralMuted">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const isPositive = mov.quantity > 0;

                  return (
                    <tr key={mov.id} className="hover:bg-cream/40 transition-colors">
                      <td className="py-3 px-4 text-neutralMuted">
                        {new Date(mov.effectiveDate).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-plum">
                        {mov.branch.name.split(" ")[0]}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-plum block">{mov.product.name}</span>
                        <span className="text-[10px] text-neutralMuted font-mono">
                          {mov.product.sku} &bull; {mov.product.unitOfMeasure}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={mov.movementType} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutralMuted">
                        {mov.referenceNumber}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={clsx(
                            "font-bold font-mono text-xs px-2 py-0.5 rounded",
                            isPositive
                              ? "text-emerald-800 bg-emerald-50"
                              : "text-rose-800 bg-rose-50"
                          )}
                        >
                          {isPositive ? `+${mov.quantity}` : mov.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-serif font-semibold text-plum">
                        ₹{mov.unitCost.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Movement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-plum/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-luxury-lg border border-gold-300">
            <h3 className="text-lg font-serif font-bold text-plum mb-1">
              Log Inventory Movement
            </h3>
            <p className="text-xs text-neutralMuted mb-4">
              Create a signed inventory transaction for wastage, tasting samples, or store purchase.
            </p>

            <form onSubmit={handleCreateMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Boutique</label>
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

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Movement Type</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-semibold"
                >
                  <option value="WASTAGE">Wastage / Heat Damage (-)</option>
                  <option value="COMPLIMENTARY">Complimentary Tasting (-)</option>
                  <option value="PURCHASE">Purchase / Factory Receipt (+)</option>
                  <option value="RETURN">Customer Return (+)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Product SKU</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  required
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs"
                >
                  <option value="">Select a chocolate SKU...</option>
                  <option value="MC-DRK-70">MC-DRK-70 — Dark Chocolate Bar 70%</option>
                  <option value="MC-MLK-CLS">MC-MLK-CLS — Bourbon Milk Chocolate Bar</option>
                  <option value="MC-WHT-SAFF">MC-WHT-SAFF — Saffron White Chocolate Bar</option>
                  <option value="MC-PRAL-12">MC-PRAL-12 — Royal Velvet Pralines (12 Pcs)</option>
                  <option value="MC-TRUF-16">MC-TRUF-16 — Gold Champagne Truffles (16 Pcs)</option>
                  <option value="MC-BRWN-06">MC-BRWN-06 — Fudge Truffle Brownies (6 Pcs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Broken ganache shell in display tier"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-cream-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-neutralMuted hover:text-plum font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-plum font-semibold text-xs rounded-lg shadow-sm"
                >
                  {submitting ? "Posting..." : "Post Movement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-plum/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-luxury-lg border border-gold-300">
            <h3 className="text-lg font-serif font-bold text-plum mb-1">
              Initiate Inter-Branch Stock Transfer
            </h3>
            <p className="text-xs text-neutralMuted mb-4">
              Dispatches inventory from source boutique with automatic ledger deduction and transit tracking.
            </p>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">From Boutique</label>
                  <select
                    value={transferSource}
                    onChange={(e) => setTransferSource(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs"
                  >
                    <option value="IND">Indiranagar</option>
                    <option value="KOR">Koramangala</option>
                    <option value="WHF">Whitefield</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">To Boutique</label>
                  <select
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs"
                  >
                    <option value="KOR">Koramangala</option>
                    <option value="IND">Indiranagar</option>
                    <option value="WHF">Whitefield</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Product</label>
                <select
                  value={transferProduct}
                  onChange={(e) => setTransferProduct(e.target.value)}
                  required
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs"
                >
                  <option value="">Select product to transfer...</option>
                  <option value="MC-PRAL-12">MC-PRAL-12 — Royal Velvet Assorted Pralines (12 Pcs)</option>
                  <option value="MC-TRUF-16">MC-TRUF-16 — Gold Champagne Truffle Box (16 Pcs)</option>
                  <option value="MC-DRK-70">MC-DRK-70 — Dark Chocolate Bar 70%</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  required
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Dispatch Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Refrigerated express van courier dispatch"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-cream-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3 py-1.5 text-xs text-neutralMuted hover:text-plum font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-plum font-semibold text-xs rounded-lg shadow-sm"
                >
                  {submitting ? "Dispatching..." : "Dispatch Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
