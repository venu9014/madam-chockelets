"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOutlet } from "@/context/OutletContext";
import { KPICard } from "@/components/ui/KPICard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SalesRevenueChart } from "@/components/charts/SalesRevenueChart";
import { CategoryPerformanceChart } from "@/components/charts/CategoryPerformanceChart";
import { InventoryHealthChart } from "@/components/charts/InventoryHealthChart";
import { AttendanceTrendsChart } from "@/components/charts/AttendanceTrendsChart";
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
  PieChart,
  UserCheck,
  Calendar,
  Filter,
  DollarSign,
  ShoppingBag,
  MapPin,
  Wifi,
  CheckSquare,
  Sparkles,
  BookOpen,
  Layers,
} from "lucide-react";

const CATEGORY_META: Record<
  string,
  { label: string; color: string; hex: string; bgLight: string; border: string; text: string }
> = {
  CAKES_PASTRIES: {
    label: "Cakes & Pastries",
    color: "bg-[#8B1E3F]",
    hex: "#8B1E3F",
    bgLight: "bg-[#8B1E3F]/10",
    border: "border-[#8B1E3F]/30",
    text: "text-[#8B1E3F]",
  },
  CHOCOLATES_TRUFFLES: {
    label: "Chocolates & Truffles",
    color: "bg-[#4A1525]",
    hex: "#4A1525",
    bgLight: "bg-[#4A1525]/10",
    border: "border-[#4A1525]/30",
    text: "text-[#4A1525]",
  },
  COOKIES_BISCUITS: {
    label: "Cookies & Biscuits",
    color: "bg-[#C6A45B]",
    hex: "#C6A45B",
    bgLight: "bg-[#C6A45B]/15",
    border: "border-[#C6A45B]/40",
    text: "text-[#8A6D2B]",
  },
  CUPCAKES_MUFFINS: {
    label: "Cupcakes & Muffins",
    color: "bg-[#A0522D]",
    hex: "#A0522D",
    bgLight: "bg-[#A0522D]/10",
    border: "border-[#A0522D]/30",
    text: "text-[#A0522D]",
  },
  BREADS_BUNS: {
    label: "Breads & Buns",
    color: "bg-[#D27D2D]",
    hex: "#D27D2D",
    bgLight: "bg-[#D27D2D]/10",
    border: "border-[#D27D2D]/30",
    text: "text-[#D27D2D]",
  },
  DONUTS: {
    label: "Donuts",
    color: "bg-[#9B4F96]",
    hex: "#9B4F96",
    bgLight: "bg-[#9B4F96]/10",
    border: "border-[#9B4F96]/30",
    text: "text-[#9B4F96]",
  },
  BROWNIES_BARS: {
    label: "Brownies & Dessert Bars",
    color: "bg-[#3D2314]",
    hex: "#3D2314",
    bgLight: "bg-[#3D2314]/10",
    border: "border-[#3D2314]/30",
    text: "text-[#3D2314]",
  },
  PUFFS_SAVOURIES: {
    label: "Puffs & Savouries",
    color: "bg-[#D97706]",
    hex: "#D97706",
    bgLight: "bg-[#D97706]/10",
    border: "border-[#D97706]/30",
    text: "text-[#D97706]",
  },
  INGREDIENTS_PACKAGING: {
    label: "Ingredients & Packaging",
    color: "bg-[#475569]",
    hex: "#475569",
    bgLight: "bg-[#475569]/10",
    border: "border-[#475569]/30",
    text: "text-[#475569]",
  },
};

interface DashboardStats {
  dateBounds?: {
    rangeKey: string;
    label: string;
    startDate: string;
    endDate: string;
  };
  periodSummary?: {
    revenue: number;
    unitsSold: number;
    transactions: number;
    avgOrderValue: number;
    hoursWorked: number;
    sopCompliancePercent: number;
  };
  salesTrend?: Array<{
    date: string;
    label: string;
    revenue: number;
    unitsSold: number;
    transactions: number;
  }>;
  categoryPerformance?: Array<{
    category: string;
    label: string;
    color: string;
    revenue: number;
    unitsSold: number;
    stockUnits: number;
    valuation: number;
    sharePercent: number;
  }>;
  inventoryHealth?: Array<{
    category: string;
    label: string;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  }>;
  attendanceTrends?: Array<{
    date: string;
    label: string;
    verified: number;
    late: number;
    flagged: number;
    totalHours: number;
  }>;
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
  categoryBreakdown?: Array<{
    category: string;
    productCount: number;
    totalUnits: number;
    totalValue: number;
  }>;
  branches?: Array<{
    id: string;
    code: string;
    name: string;
    city: string;
  }>;
  employeeWorkspace?: {
    employeeId?: string;
    employeeCode?: string;
    designation?: string;
    branchName?: string;
    branchCode?: string;
    wifiSsid?: string;
    activeSession?: any;
    recentSessions?: any[];
    assignedTasks?: any[];
  };
}

export default function DashboardOverviewPage() {
  const {
    selectedOutletCode,
    selectedOutletId,
    selectedOutlet,
    branches: contextBranches,
    setOutletId,
    user: contextUser,
  } = useOutlet();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>(contextUser?.role || "OWNER");
  const [userBranchId, setUserBranchId] = useState<string | null>(contextUser?.branchId || null);

  // Date Filter State
  const [selectedRange, setSelectedRange] = useState<string>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (contextUser?.role) {
      setCurrentUserRole(contextUser.role);
      setUserBranchId(contextUser.branchId || null);
    } else {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user?.role) {
            setCurrentUserRole(data.user.role);
            if (data.user.branchId) {
              setUserBranchId(data.user.branchId);
            }
          }
        })
        .catch(() => {});
    }
  }, [contextUser]);

  const fetchStats = async (outletToFetch = selectedOutletCode) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      let url = `/api/dashboard/stats?branchId=${outletToFetch}&range=${selectedRange}`;
      if (selectedRange === "custom" && customStart && customEnd) {
        url += `&startDate=${encodeURIComponent(customStart)}&endDate=${encodeURIComponent(customEnd)}`;
      }

      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to load dashboard metrics.");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // Cancelled in favor of newer selection
      }
      console.error("Failed to load dashboard metrics:", err);
      setError("Network interruption or server communication error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedOutletCode);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedOutletCode, selectedRange]);

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      fetchStats(selectedOutletCode);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <RefreshCw className="w-8 h-8 text-gold-500 animate-spin mb-4" />
        <p className="font-serif text-lg font-bold text-plum">
          Loading Madam Chocolate Operations Intelligence...
        </p>
        <p className="text-xs text-neutralMuted mt-1">
          Aggregating sales ledgers, inventory balances, and staff compliance records
        </p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-xl border border-cream-border shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-600 mb-3" />
        <h3 className="font-serif font-bold text-lg text-plum">Failed to Load Dashboard Data</h3>
        <p className="text-xs text-neutralMuted max-w-md mt-1 mb-4">{error}</p>
        <button
          onClick={() => fetchStats()}
          className="px-4 py-2 bg-plum text-cream rounded-lg text-xs font-semibold hover:bg-plum/90 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gold-400" />
          <span>Retry Loading Data</span>
        </button>
      </div>
    );
  }

  const s = stats?.summary;
  const p = stats?.periodSummary;

  const totalCatValuation =
    stats?.categoryBreakdown?.reduce((acc, c) => acc + c.totalValue, 0) || 0;
  const totalCatUnits =
    stats?.categoryBreakdown?.reduce((acc, c) => acc + c.totalUnits, 0) || 0;

  const totalAttEvents =
    (stats?.attendanceDistribution?.VERIFIED || 0) +
    (stats?.attendanceDistribution?.FLAGGED || 0) +
    (stats?.attendanceDistribution?.PENDING_EXCEPTION || 0) +
    (stats?.attendanceDistribution?.REJECTED || 0);

  const verifiedPercent =
    totalAttEvents > 0
      ? Math.round(((stats?.attendanceDistribution?.VERIFIED || 0) / totalAttEvents) * 100)
      : 0;

  const rangeButtons = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "this_month", label: "This Month" },
    { id: "custom", label: "Custom" },
  ];

  const canFilterBranches = currentUserRole === "OWNER" || currentUserRole === "AUDITOR";

  // DEDICATED OPERATIONAL WORKSPACE FOR EMPLOYEES (Zero charts, zero financial leak, clean execution)
  if (currentUserRole === "EMPLOYEE") {
    const emp = stats?.employeeWorkspace;
    const activeSession = emp?.activeSession;
    const assignedTasks = emp?.assignedTasks || [];

    return (
      <div className="space-y-6 animate-in fade-in-50 duration-200 max-w-6xl">
        {/* Employee Header & Welcome Banner */}
        <div className="bg-white rounded-2xl border border-cream-border p-6 shadow-luxury flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-700 bg-gold-100 px-2 py-0.5 rounded">
                Operational Staff Workspace
              </span>
              <span className="text-xs text-neutralMuted font-mono">
                {emp?.employeeCode || "Staff Member"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-plum tracking-tight">
              Welcome, {contextUser?.name || "Artisan"}
            </h1>
            <p className="text-xs text-cocoa/80 mt-1 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                <span>Assigned Boutique: <strong>{emp?.branchName || contextUser?.branchName || "Assigned Boutique"}</strong></span>
              </span>
              <span>&bull;</span>
              <span>{emp?.designation || "Confectionery Operations"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchStats()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-muted border border-gold-300 text-xs font-semibold text-plum hover:bg-cream transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gold-600 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Status</span>
            </button>
            <Link
              href="/dashboard/attendance"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-plum hover:bg-plum-light text-gold-400 text-xs font-semibold shadow-sm transition-colors"
            >
              <Clock className="w-4 h-4 text-gold-400" />
              <span>Attendance Desk</span>
            </Link>
          </div>
        </div>

        {/* Operational Overview Row (Zero financial metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Shift Attendance Status */}
          <div className="bg-white p-4 rounded-xl border border-cream-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutralMuted">
                Shift Status
              </span>
              {activeSession ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ON DUTY
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] bg-neutral-100 text-neutral-700 font-bold px-2 py-0.5 rounded-full">
                  OFF DUTY
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-plum mt-2">
              {activeSession ? "Active Shift" : "Shift Not Started"}
            </p>
            <p className="text-[11px] text-neutralMuted mt-1">
              {activeSession
                ? `Clocked in at ${new Date(activeSession.punchInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "Clock in using dual-factor verified attendance"}
            </p>
          </div>

          {/* 2. Logged Shift Hours */}
          <div className="bg-white p-4 rounded-xl border border-cream-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutralMuted">
                Personal Hours
              </span>
              <Clock className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-xl font-bold text-emerald-800 mt-2">
              {p?.hoursWorked || 0} Hours
            </p>
            <p className="text-[11px] text-neutralMuted mt-1">
              Verified operational shift hours logged
            </p>
          </div>

          {/* 3. Assigned Checklists Due Today */}
          <div className="bg-white p-4 rounded-xl border border-cream-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutralMuted">
                Assigned Checklists
              </span>
              <CheckSquare className="w-4 h-4 text-violet-700" />
            </div>
            <p className="text-xl font-bold text-plum mt-2">
              {s?.tasksDueToday || 0} Tasks Due
            </p>
            <p className="text-[11px] text-neutralMuted mt-1">
              {s?.completedTasks || 0} completed &bull; {s?.overdueTasks || 0} overdue
            </p>
          </div>

          {/* 4. SOP Execution Compliance */}
          <div className="bg-white p-4 rounded-xl border border-cream-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutralMuted">
                Task Compliance
              </span>
              <CheckCircle2 className="w-4 h-4 text-gold-700" />
            </div>
            <p className="text-xl font-bold text-plum mt-2">
              {s?.sopCompliancePercent || 0}%
            </p>
            <p className="text-[11px] text-neutralMuted mt-1">
              Standard operating procedure execution
            </p>
          </div>
        </div>

        {/* Quick Shift Attendance Action Plinth */}
        <div className="bg-white rounded-2xl border border-gold-300 p-6 shadow-luxury">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-700 block">
                Direct Workplace Attendance
              </span>
              <h2 className="text-lg font-bold text-plum mt-0.5">
                {activeSession ? "Currently Clocked In" : "Ready for Shift Check-In"}
              </h2>
              <p className="text-xs text-cocoa/80 mt-1">
                Verified dual-factor presence via workplace Wi-Fi (<strong>{emp?.wifiSsid || "Moto G85 5G"}</strong>) &amp; boutique GPS geofence.
              </p>
            </div>

            <Link
              href="/dashboard/attendance"
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                activeSession
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{activeSession ? "Go to Shift Punch Out" : "Punch In for Today's Shift"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-cream-muted rounded-xl border border-cream-border">
              <div className="flex items-center gap-1.5 text-neutralMuted mb-1">
                <Wifi className="w-3.5 h-3.5 text-gold-700" />
                <span className="font-semibold text-[10px] uppercase">Workplace Wi-Fi</span>
              </div>
              <p className="font-mono font-bold text-gold-900">{emp?.wifiSsid || "Moto G85 5G"}</p>
              <span className="text-[10px] text-neutralMuted">Required connection network</span>
            </div>

            <div className="p-3 bg-cream-muted rounded-xl border border-cream-border">
              <div className="flex items-center gap-1.5 text-neutralMuted mb-1">
                <MapPin className="w-3.5 h-3.5 text-violet-700" />
                <span className="font-semibold text-[10px] uppercase">Boutique Perimeter</span>
              </div>
              <p className="font-bold text-plum">{emp?.branchName || contextUser?.branchName || "Assigned Boutique"}</p>
              <span className="text-[10px] text-neutralMuted">GPS polygon geofence active</span>
            </div>

            <div className="p-3 bg-cream-muted rounded-xl border border-cream-border">
              <div className="flex items-center gap-1.5 text-neutralMuted mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span className="font-semibold text-[10px] uppercase">Shift Verification</span>
              </div>
              <p className="font-bold text-emerald-800">{activeSession ? "Session Verified" : "Awaiting Punch In"}</p>
              <span className="text-[10px] text-neutralMuted">Dual-factor cryptographic token</span>
            </div>
          </div>
        </div>

        {/* Assigned Operational Tasks & Checklists Section */}
        <div className="bg-white rounded-2xl border border-cream-border p-6 shadow-luxury">
          <div className="flex items-center justify-between pb-4 border-b border-cream-border mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-700 block">
                Daily Execution
              </span>
              <h2 className="text-lg font-bold text-plum mt-0.5">
                Today's Assigned Checklists &amp; SOP Tasks
              </h2>
            </div>
            <Link
              href="/dashboard/tasks"
              className="text-xs font-semibold text-gold-700 hover:text-gold-900 flex items-center gap-1"
            >
              <span>View All Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {assignedTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutralMuted">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-plum">All Assigned Tasks Completed</p>
              <p className="text-neutralMuted mt-0.5">No pending checklists scheduled for today's shift.</p>
            </div>
          ) : (
            <div className="divide-y divide-cream-border">
              {assignedTasks.map((task: any) => (
                <div key={task.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-plum">{task.title}</span>
                      <StatusBadge status={task.status} />
                    </div>
                    {task.sopTitle && (
                      <p className="text-xs text-neutralMuted mt-0.5">
                        Protocol: <strong className="text-cocoa">{task.sopTitle}</strong>
                        {task.sopCategory && ` • ${task.sopCategory}`}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/tasks?taskId=${task.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cream-muted border border-cream-border text-xs font-semibold text-plum hover:bg-cream transition-colors self-start sm:self-center"
                  >
                    <span>Execute Checklist</span>
                    <ArrowRight className="w-3 h-3 text-gold-600" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operational Guidelines & Standards Noticeboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-cream-border p-5 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-plum font-bold text-sm border-b border-cream-border pb-2">
              <Sparkles className="w-4 h-4 text-gold-600" />
              <span>Confectionery Display Standards</span>
            </div>
            <ul className="text-xs text-cocoa/90 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-600 mt-1.5 shrink-0" />
                <span><strong>Display Plinth Temperature:</strong> Maintain chocolate showcase strictly at 16°C – 18°C with relative humidity below 50%.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-600 mt-1.5 shrink-0" />
                <span><strong>Hygiene Protocol:</strong> Sanitary glove change required every 60 minutes and immediately after cash or packaging handling.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-600 mt-1.5 shrink-0" />
                <span><strong>Artisanal Batch Presentation:</strong> Inspect chocolate truffles and praline surfaces for bloom or condensation every 2 hours.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-cream-border p-5 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-plum font-bold text-sm border-b border-cream-border pb-2">
              <BookOpen className="w-4 h-4 text-violet-600" />
              <span>Shift Handover &amp; Closing Notice</span>
            </div>
            <ul className="text-xs text-cocoa/90 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-1.5 shrink-0" />
                <span><strong>Shift Completion:</strong> Ensure all opening or mid-day SOP checklists are submitted before initiating punch out.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-1.5 shrink-0" />
                <span><strong>Floor Cleanliness:</strong> Conduct visual surface screening of the kitchen and customer foyer before shift closing.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-1.5 shrink-0" />
                <span><strong>Escalation:</strong> Report any showcase refrigeration anomalies or packaging damage immediately to the Boutique Manager.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Quick Operational Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/dashboard/attendance"
            className="p-4 bg-white rounded-xl border border-cream-border shadow-sm hover:border-gold-400 hover:shadow-gold transition-all text-center group"
          >
            <Clock className="w-6 h-6 text-gold-700 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="block font-bold text-xs text-plum">Attendance Desk</span>
            <span className="text-[10px] text-neutralMuted block mt-0.5">Punch in/out shifts</span>
          </Link>

          <Link
            href="/dashboard/tasks"
            className="p-4 bg-white rounded-xl border border-cream-border shadow-sm hover:border-gold-400 hover:shadow-gold transition-all text-center group"
          >
            <CheckSquare className="w-6 h-6 text-violet-700 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="block font-bold text-xs text-plum">Daily Checklists</span>
            <span className="text-[10px] text-neutralMuted block mt-0.5">Execute SOP tasks</span>
          </Link>

          <Link
            href="/dashboard/cleanliness"
            className="p-4 bg-white rounded-xl border border-cream-border shadow-sm hover:border-gold-400 hover:shadow-gold transition-all text-center group"
          >
            <Sparkles className="w-6 h-6 text-emerald-700 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="block font-bold text-xs text-plum">Floor Cleanliness</span>
            <span className="text-[10px] text-neutralMuted block mt-0.5">Surface inspection</span>
          </Link>

          <Link
            href="/dashboard/sops"
            className="p-4 bg-white rounded-xl border border-cream-border shadow-sm hover:border-gold-400 hover:shadow-gold transition-all text-center group"
          >
            <BookOpen className="w-6 h-6 text-plum mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="block font-bold text-xs text-plum">SOP Protocols</span>
            <span className="text-[10px] text-neutralMuted block mt-0.5">Operational library</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Executive Command Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-plum tracking-tight mt-0.5">
            Operations & Compliance Intelligence
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Real-time multi-branch operational KPIs, inventory integrity, and staff governance for Bengaluru ateliers.
          </p>
        </div>

        <button
          onClick={() => fetchStats()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gold-300 text-xs font-medium text-plum hover:bg-cream-muted transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gold-600 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Date Range & Branch Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-cream-border shadow-luxury flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutralMuted mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gold-600" />
            Time Range:
          </span>
          {rangeButtons.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRange(r.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedRange === r.id
                  ? "bg-plum text-cream shadow-sm"
                  : "bg-cream-muted text-cocoa hover:bg-cream hover:text-plum border border-cream-border"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if selected */}
        {selectedRange === "custom" && (
          <form onSubmit={handleApplyCustomRange} className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded border border-cream-border text-xs focus:ring-1 focus:ring-gold-500"
              required
            />
            <span className="text-neutralMuted">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded border border-cream-border text-xs focus:ring-1 focus:ring-gold-500"
              required
            />
            <button
              type="submit"
              className="px-3 py-1 rounded bg-gold-600 text-white font-semibold hover:bg-gold-700 transition-colors"
            >
              Apply
            </button>
          </form>
        )}

        {/* Branch Filter dropdown */}
        {canFilterBranches && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutralMuted flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-gold-600" />
              Atelier:
            </span>
            <select
              value={selectedOutletCode}
              onChange={(e) => setOutletId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gold-300 text-xs font-semibold text-plum bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
            >
              <option value="ALL">All Ateliers (Bengaluru)</option>
              {(contextBranches.length > 0 ? contextBranches : stats?.branches || []).map((b: any) => (
                <option key={b.id || b.branchId} value={b.code || b.branchCode}>
                  {b.name} ({b.code || b.branchCode})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Period Analytics KPI Strip (Dynamically bound to Selected Range) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-cream-border shadow-luxury">
        <div className="p-3.5 bg-cream rounded-lg border border-gold-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-800">
              Period Sales
            </span>
            <DollarSign className="w-4 h-4 text-gold-700" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-plum mt-1">
            ₹{(p?.revenue ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-neutralMuted mt-0.5">
            {stats?.dateBounds?.label || "Selected period"}
          </p>
        </div>

        <div className="p-3.5 bg-cream rounded-lg border border-cream-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted">
              Units Dispatched
            </span>
            <ShoppingBag className="w-4 h-4 text-plum" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-plum mt-1">
            {(p?.unitsSold ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-neutralMuted mt-0.5">
            {p?.transactions ?? 0} sales transactions
          </p>
        </div>

        <div className="p-3.5 bg-cream rounded-lg border border-cream-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted">
              Avg Order Value
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-plum mt-1">
            ₹{(p?.avgOrderValue ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-neutralMuted mt-0.5">
            Per transaction average
          </p>
        </div>

        {currentUserRole === "OWNER" ? (
          <div className="p-3.5 bg-cream rounded-lg border border-cream-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted">
                Adjustment Sign-Offs
              </span>
              <Scale className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-800 mt-1">
              {s?.pendingAdjustmentApprovals ?? 0}
            </p>
            <p className="text-[10px] text-neutralMuted mt-0.5">
              Awaiting executive sign-off
            </p>
          </div>
        ) : (
          <div className="p-3.5 bg-cream rounded-lg border border-cream-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutralMuted">
                Staff Hours Logged
              </span>
              <Clock className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">
              {p?.hoursWorked ?? 0}h
            </p>
            <p className="text-[10px] text-neutralMuted mt-0.5">
              Verified operational presence
            </p>
          </div>
        )}
      </div>

      {/* Main Interactive Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Sales & Revenue Time-Series Chart */}
        <div className="bg-white rounded-xl border border-cream-border p-6 shadow-luxury">
          <SalesRevenueChart
            data={stats?.salesTrend || []}
            loading={loading}
            dateRangeLabel={stats?.dateBounds?.label}
          />
        </div>

        {/* 2. Category Capitalization Chart */}
        <div className="bg-white rounded-xl border border-cream-border p-6 shadow-luxury">
          <CategoryPerformanceChart
            data={stats?.categoryPerformance || []}
            loading={loading}
          />
        </div>
      </div>

      {/* Secondary Visualizations Grid: Inventory Health & Attendance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Inventory Stock Health Chart */}
        <div className="bg-white rounded-xl border border-cream-border p-6 shadow-luxury">
          <InventoryHealthChart
            data={stats?.inventoryHealth || []}
            loading={loading}
          />
        </div>

        {/* 4. Workforce Attendance & Hours Chart (Role-guarded: Only shown for Managers & Auditors, Owner 100% excluded) */}
        {currentUserRole !== "OWNER" ? (
          <div className="bg-white rounded-xl border border-cream-border p-6 shadow-luxury">
            <AttendanceTrendsChart
              data={stats?.attendanceTrends || []}
              loading={loading}
              dateRangeLabel={stats?.dateBounds?.label}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-cream-border p-6 shadow-luxury flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gold-700 block">
                  Executive Governance
                </span>
                <h3 className="font-serif font-bold text-base text-plum">
                  Boutique Operations Overview
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Active Governance
              </span>
            </div>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-cream">
                <div>
                  <p className="text-xs font-semibold text-plum">Total Atelier Valuation</p>
                  <p className="text-[10px] text-neutralMuted">Physical confectionery stock across all {s?.activeBranches ?? 0} boutiques</p>
                </div>
                <span className="font-serif font-black text-base text-plum">
                  ₹{totalCatValuation.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-cream">
                <div>
                  <p className="text-xs font-semibold text-plum">SOP Operational Compliance</p>
                  <p className="text-[10px] text-neutralMuted">Checklists and daily opening protocols verified</p>
                </div>
                <span className="font-serif font-bold text-base text-emerald-800">
                  {s?.sopCompliancePercent ?? 0}%
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-cream">
                <div>
                  <p className="text-xs font-semibold text-plum">Active Retail Boutiques</p>
                  <p className="text-[10px] text-neutralMuted">Bengaluru operations network</p>
                </div>
                <span className="font-serif font-bold text-base text-gold-800">
                  {s?.activeBranches ?? 0} Boutiques
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-cream-border flex items-center justify-between text-xs text-neutralMuted">
              <span>Executive Owner Role Exemption Active</span>
              <span className="text-[11px] font-mono text-gold-700 font-medium">RBAC Least-Privilege Enforced</span>
            </div>
          </div>
        )}
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
          subtitle={`${s?.activeEmployees ?? 0} active employees`}
          icon={Building2}
          badge={{
            text: stats?.branchComparison?.map((b: any) => b.name.split(" ")[0]).join(", ") || `${s?.activeBranches ?? 0} Outlets`,
            type: "neutral",
          }}
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
                {currentUserRole !== "OWNER" && (
                  <th className="py-3 px-4">Pending Exceptions</th>
                )}
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
                  {currentUserRole !== "OWNER" && (
                    <td className="py-3.5 px-4">
                      {branch.pendingExceptions > 0 ? (
                        <span className="text-amber-800 font-semibold">{branch.pendingExceptions} Pending</span>
                      ) : (
                        <span className="text-neutralMuted">0</span>
                      )}
                    </td>
                  )}
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
