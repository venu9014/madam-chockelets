"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KPICard } from "@/components/ui/KPICard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  PackageX,
  Scale,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Boxes,
  FileSpreadsheet,
} from "lucide-react";

interface DashboardStats {
  summary: {
    activeBranches: number;
    activeEmployees: number;
    tasksDueToday: number;
    completedTasks: number;
    overdueTasks: number;
    pendingApprovals: number;
    changesRequestedTasks: number;
    sopCompliancePercent: number;
    pendingAttendanceExceptions: number;
    lowStockProducts: number;
    negativeStockProducts: number;
    unresolvedDiscrepancies: number;
    pendingAdjustmentApprovals: number;
  };
  attendanceDistribution: {
    VERIFIED: number;
    FLAGGED: number;
    PENDING_EXCEPTION: number;
    REJECTED: number;
  };
  branchComparison: Array<{
    branchId: string;
    branchCode: string;
    name: string;
    city: string;
    complianceRate: number;
    approvedTasks: number;
    overdueTasks: number;
    pendingExceptions: number;
    openDiscrepancies: number;
    varianceExposure: number;
  }>;
  overdueQueue: Array<{
    id: string;
    title: string;
    dueTime: string;
    branch: { name: string; code: string };
    assignedEmployee?: { user: { name: string } } | null;
  }>;
  discrepancyQueue: Array<{
    id: string;
    scenarioType: string;
    varianceQty: number;
    varianceValue: number;
    status: string;
    product: { name: string; sku: string };
    branch: { name: string; code: string };
  }>;
  lowStockAlerts: Array<{
    sku: string;
    name: string;
    currentStock: number;
    threshold: number;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    actorName: string;
    actorRole: string;
    createdAt: string;
  }>;
}

export default function DashboardOverviewPage() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId") || "ALL";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/stats?branchId=${branchId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [branchId]);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <RefreshCw className="w-8 h-8 text-gold-500 animate-spin mb-4" />
        <p className="font-serif text-lg font-bold text-plum">
          Loading Madam Chocolate Operations Intelligence...
        </p>
        <p className="text-xs text-neutralMuted mt-1">
          Aggregating ledger balances, tasks, and branch compliance records
        </p>
      </div>
    );
  }

  const s = stats?.summary;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Executive Command Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            Operations & Compliance Intelligence
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Real-time multi-branch operational KPIs, inventory integrity, and staff governance for Bengaluru ateliers.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gold-300 text-xs font-medium text-plum hover:bg-cream-muted transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gold-600 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="SOP Compliance"
          value={`${s?.sopCompliancePercent ?? 0}%`}
          subtitle="Approved vs assigned protocols"
          icon={CheckCircle2}
          highlight={true}
          badge={{
            text: `${s?.completedTasks ?? 0} Approved / ${s?.pendingApprovals ?? 0} In Review`,
            type: "positive",
          }}
          href="/dashboard/tasks"
        />

        <KPICard
          title="Active Boutiques"
          value={s?.activeBranches ?? 0}
          subtitle={`${s?.activeEmployees ?? 0} authorized employees`}
          icon={Building2}
          badge={{ text: "Indiranagar, Koramangala, Whitefield", type: "neutral" }}
        />

        <KPICard
          title="Overdue Tasks"
          value={s?.overdueTasks ?? 0}
          subtitle="Checklists past operational cut-off"
          icon={Clock}
          badge={{
            text: s?.overdueTasks ? "Action Required" : "All On Time",
            type: s?.overdueTasks ? "negative" : "positive",
          }}
          href="/dashboard/tasks?status=OVERDUE"
        />

        <KPICard
          title="Stock Discrepancies"
          value={s?.unresolvedDiscrepancies ?? 0}
          subtitle={`${s?.pendingAdjustmentApprovals ?? 0} adjustments awaiting sign-off`}
          icon={Scale}
          badge={{
            text: s?.unresolvedDiscrepancies ? "Under Investigation" : "Reconciled",
            type: s?.unresolvedDiscrepancies ? "warning" : "positive",
          }}
          href="/dashboard/reconciliation"
        />
      </div>

      {/* Secondary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-cream-border shadow-sm">
        <div className="p-3 bg-cream rounded-lg">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted">
            Tasks Due Today
          </p>
          <p className="text-xl font-serif font-bold text-plum mt-1">
            {s?.tasksDueToday ?? 0}
          </p>
        </div>

        <div className="p-3 bg-cream rounded-lg">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted">
            Attendance Exceptions
          </p>
          <p className="text-xl font-serif font-bold text-amber-800 mt-1">
            {s?.pendingAttendanceExceptions ?? 0}
          </p>
        </div>

        <div className="p-3 bg-cream rounded-lg">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted">
            Low Stock SKUs
          </p>
          <p className="text-xl font-serif font-bold text-orange-800 mt-1">
            {s?.lowStockProducts ?? 0}
          </p>
        </div>

        <div className="p-3 bg-cream rounded-lg">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted">
            Negative Stock Anomalies
          </p>
          <p className="text-xl font-serif font-bold text-rose-800 mt-1">
            {s?.negativeStockProducts ?? 0}
          </p>
        </div>
      </div>

      {/* Branch Comparison Table & Compliance Heatmap */}
      <div className="bg-white rounded-xl border border-cream-border shadow-luxury overflow-hidden">
        <div className="p-5 border-b border-cream-border flex items-center justify-between">
          <div>
            <h2 className="font-serif font-bold text-lg text-plum">
              Boutique Comparison & Compliance Matrix
            </h2>
            <p className="text-xs text-neutralMuted mt-0.5">
              Live operational metrics evaluated across all 3 retail confectioneries.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gold-100 text-gold-900 border border-gold-300">
            INR (₹) Standard
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-cocoa">
            <thead className="bg-cream-muted text-plum uppercase font-bold text-[10px] tracking-wider border-b border-cream-border">
              <tr>
                <th className="py-3 px-4">Boutique Location</th>
                <th className="py-3 px-4">SOP Compliance</th>
                <th className="py-3 px-4">Approved Tasks</th>
                <th className="py-3 px-4">Overdue Tasks</th>
                <th className="py-3 px-4">Pending Exceptions</th>
                <th className="py-3 px-4">Open Discrepancies</th>
                <th className="py-3 px-4 text-right">Variance Exposure (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-muted">
              {stats?.branchComparison.map((branch) => (
                <tr key={branch.branchId} className="hover:bg-cream/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-plum block">{branch.name}</span>
                    <span className="text-[10px] text-neutralMuted">Code: {branch.branchCode} &bull; {branch.city}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-cream-border rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gold-500 h-2 rounded-full"
                          style={{ width: `${branch.complianceRate}%` }}
                        />
                      </div>
                      <span className="font-bold text-plum">{branch.complianceRate}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-emerald-800">{branch.approvedTasks}</td>
                  <td className="py-3.5 px-4">
                    {branch.overdueTasks > 0 ? (
                      <span className="text-rose-700 font-bold">{branch.overdueTasks} Overdue</span>
                    ) : (
                      <span className="text-neutralMuted">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {branch.pendingExceptions > 0 ? (
                      <span className="text-amber-800 font-semibold">{branch.pendingExceptions} Pending</span>
                    ) : (
                      <span className="text-neutralMuted">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {branch.openDiscrepancies > 0 ? (
                      <span className="text-violet-800 font-semibold">{branch.openDiscrepancies} Open</span>
                    ) : (
                      <span className="text-neutralMuted">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-serif font-bold text-plum">
                    ₹{branch.varianceExposure.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Queues: Overdue Tasks & Discrepancy Investigations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Tasks Queue */}
        <div className="bg-white rounded-xl border border-cream-border p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600" />
              <h3 className="font-serif font-bold text-base text-plum">
                Overdue Operational Queue
              </h3>
            </div>
            <Link
              href="/dashboard/tasks?status=OVERDUE"
              className="text-xs font-semibold text-gold-700 hover:text-gold-900 flex items-center gap-1"
            >
              View all ({s?.overdueTasks ?? 0}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.overdueQueue && stats.overdueQueue.length > 0 ? (
              stats.overdueQueue.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border border-rose-200/60 bg-rose-50/30 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-plum truncate">{task.title}</p>
                    <p className="text-[10px] text-neutralMuted mt-0.5">
                      {task.branch.name} &bull; Due by {task.dueTime} &bull; Assignee:{" "}
                      {task.assignedEmployee?.user.name || "Boutique Lead"}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/tasks?id=${task.id}`}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-white text-rose-800 border border-rose-200 hover:bg-rose-50"
                  >
                    Review
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutralMuted text-center py-6">
                No overdue tasks currently pending. Excellent adherence!
              </p>
            )}
          </div>
        </div>

        {/* Discrepancy Investigation Queue */}
        <div className="bg-white rounded-xl border border-cream-border p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-4">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-gold-700" />
              <h3 className="font-serif font-bold text-base text-plum">
                Discrepancy Investigation Queue
              </h3>
            </div>
            <Link
              href="/dashboard/reconciliation"
              className="text-xs font-semibold text-gold-700 hover:text-gold-900 flex items-center gap-1"
            >
              All discrepancies <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.discrepancyQueue && stats.discrepancyQueue.length > 0 ? (
              stats.discrepancyQueue.map((disc) => (
                <div
                  key={disc.id}
                  className="p-3 rounded-lg border border-gold-200/80 bg-gold-50/20 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-plum truncate">{disc.product.name}</p>
                      <StatusBadge status={disc.status} size="sm" />
                    </div>
                    <p className="text-[10px] text-neutralMuted mt-0.5">
                      {disc.branch.name} &bull; Scenario: {disc.scenarioType.replace(/_/g, " ")}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold font-serif text-plum">
                      {disc.varianceQty > 0 ? `+${disc.varianceQty}` : disc.varianceQty} units
                    </p>
                    <p className="text-[10px] text-neutralMuted font-mono">
                      ₹{Math.abs(disc.varianceValue).toLocaleString("en-IN")} exp.
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutralMuted text-center py-6">
                All physical counts reconciled. No discrepancy investigations pending.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Live Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-cream-border p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-4">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-orange-600" />
              <h3 className="font-serif font-bold text-base text-plum">
                Low Stock Threshold Alerts
              </h3>
            </div>
            <Link
              href="/dashboard/inventory"
              className="text-xs font-semibold text-gold-700 hover:text-gold-900 flex items-center gap-1"
            >
              Open Ledger <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-cream-muted">
            {stats?.lowStockAlerts && stats.lowStockAlerts.length > 0 ? (
              stats.lowStockAlerts.map((item) => (
                <div key={item.sku} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-plum">{item.name}</p>
                    <p className="text-[10px] text-neutralMuted font-mono">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-700">
                      {item.currentStock} units
                    </span>
                    <span className="text-[10px] text-neutralMuted block">
                      Min threshold: {item.threshold}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutralMuted text-center py-4">
                All SKUs comfortably above safety stock thresholds.
              </p>
            )}
          </div>
        </div>

        {/* Live Operational Audit Feed */}
        <div className="bg-white rounded-xl border border-cream-border p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gold-700" />
              <h3 className="font-serif font-bold text-base text-plum">
                Live Operational Audit Stream
              </h3>
            </div>
            <Link
              href="/dashboard/audit"
              className="text-xs font-semibold text-gold-700 hover:text-gold-900 flex items-center gap-1"
            >
              View Full Audit Log <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {stats?.recentAuditLogs.map((log) => (
              <div key={log.id} className="p-2.5 rounded-lg bg-cream flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-plum block">
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-neutralMuted">
                    By {log.actorName} ({log.actorRole})
                  </span>
                </div>
                <span className="text-[10px] text-neutralMuted flex-shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
