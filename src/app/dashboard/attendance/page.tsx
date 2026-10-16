"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldAlert,
  Building2,
  Check,
  X,
  Radio,
} from "lucide-react";
import clsx from "clsx";

interface AttendanceEvent {
  id: string;
  eventType: string;
  timestamp: string;
  distanceFromBranchMeters?: number | null;
  isWithinGeofence: boolean;
  status: string;
  simulationScenario?: string | null;
  notes?: string | null;
  employee: {
    employeeCode: string;
    designation: string;
    user: { name: string; email: string };
  };
  branch: { name: string; code: string };
}

interface AttendanceException {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reviewerNotes?: string | null;
  employee: {
    employeeCode: string;
    user: { name: string; email: string };
  };
  branch: { name: string; code: string };
  attendanceEvent: {
    distanceFromBranchMeters?: number | null;
    timestamp: string;
  };
  reviewer?: { name: string; role: string } | null;
}

export default function AttendancePage() {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [exceptions, setExceptions] = useState<AttendanceException[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const [eventsRes, excRes] = await Promise.all([
        fetch("/api/attendance/checkin?limit=30"),
        fetch("/api/attendance/exceptions"),
      ]);

      if (excRes.ok) {
        const excData = await excRes.json();
        setExceptions(excData.exceptions || []);
      }
    } catch (err) {
      console.error("Failed to load attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // Simulator Triggers
  const handleRunSimulation = async (scenario: string) => {
    try {
      setSimulating(true);
      setActionMessage(null);

      let payload: Record<string, unknown> = {
        isSimulated: true,
        simulationScenario: scenario,
      };

      if (scenario === "INSIDE_GEOFENCE") {
        payload = {
          ...payload,
          eventType: "CHECK_IN",
          latitude: 12.9785, // Inside Indiranagar (12.9784)
          longitude: 77.6409,
          accuracyMeters: 12.0,
          notes: "[SIMULATION] Check-in inside store perimeter (28m from entrance).",
        };
      } else if (scenario === "OUTSIDE_GEOFENCE") {
        payload = {
          ...payload,
          eventType: "CHECK_IN",
          latitude: 12.985, // ~750m away from Indiranagar
          longitude: 77.648,
          accuracyMeters: 18.0,
          notes: "[SIMULATION] Checked in from CMH Road metro station due to traffic signal breakdown.",
        };
      } else if (scenario === "GPS_DENIED") {
        payload = {
          ...payload,
          eventType: "CHECK_IN",
          latitude: null,
          longitude: null,
          accuracyMeters: null,
          notes: "[SIMULATION] Mobile browser location permissions denied by associate.",
        };
      } else if (scenario === "POOR_ACCURACY") {
        payload = {
          ...payload,
          eventType: "CHECK_IN",
          latitude: 12.9784,
          longitude: 77.6408,
          accuracyMeters: 380.0, // Exceeds 100m threshold
          notes: "[SIMULATION] Basement cellular triangulation with low GPS confidence (±380m).",
        };
      } else if (scenario === "CHECK_OUT") {
        payload = {
          ...payload,
          eventType: "CHECK_OUT",
          latitude: 12.9784,
          longitude: 77.6408,
          accuracyMeters: 10.0,
          notes: "[SIMULATION] End-of-shift checkout inside boutique geofence.",
        };
      }

      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Scenario "${scenario}" executed: ${data.geofence?.description || "Success"}`);
        await fetchAttendanceData();
      } else {
        setActionMessage(`Simulation error: ${data.error}`);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulating(false);
    }
  };

  // Manager Exception Review
  const handleReviewException = async (exceptionId: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/attendance/exceptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exceptionId,
          status,
          reviewerNotes: `Reviewed and ${status.toLowerCase()} by store supervisor.`,
        }),
      });

      if (res.ok) {
        await fetchAttendanceData();
      }
    } catch (err) {
      console.error("Failed to review exception:", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Time & Attendance Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            Staff Attendance & Geofencing Simulator
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Server-side Haversine geofence verification, exception approval queues, and interactive scenario simulation.
          </p>
        </div>

        <div className="bg-gold-50 border border-gold-300 rounded-lg px-3 py-2 text-[11px] text-gold-900 flex items-center gap-2 max-w-sm">
          <Radio className="w-4 h-4 text-gold-700 flex-shrink-0 animate-pulse" />
          <span>Geofence Boundary: 150m radius around configured retail store coordinates.</span>
        </div>
      </div>

      {/* Interactive Simulation Sandbox */}
      <div className="bg-white rounded-xl border border-gold-300/80 p-5 shadow-luxury">
        <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-4">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-gold-700" />
            <h3 className="font-serif font-bold text-base text-plum">
              Interactive Attendance Simulator (6 Scenarios)
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-100 text-violet-900 px-2.5 py-0.5 rounded-full">
            Server Verified
          </span>
        </div>

        <p className="text-xs text-cocoa/80 mb-4">
          Test real-time GPS coordinate calculations, radius breaches, permission denials, and manager exception queues with one click:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => handleRunSimulation("INSIDE_GEOFENCE")}
            disabled={simulating}
            className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-left transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-emerald-900">1. Inside Geofence</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[11px] text-emerald-800/80">
              Check-in within 30m of store coordinates. Automatically marked as <strong>VERIFIED</strong>.
            </p>
          </button>

          <button
            onClick={() => handleRunSimulation("OUTSIDE_GEOFENCE")}
            disabled={simulating}
            className="p-3 rounded-lg border border-amber-300 bg-amber-50/40 hover:bg-amber-50 text-left transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-amber-900">2. Outside Geofence (750m)</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-[11px] text-amber-800/80">
              Attempt check-in from metro station. Triggers an <strong>Attendance Exception</strong>.
            </p>
          </button>

          <button
            onClick={() => handleRunSimulation("GPS_DENIED")}
            disabled={simulating}
            className="p-3 rounded-lg border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-left transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-rose-900">3. Permission Denied</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-[11px] text-rose-800/80">
              Browser denies coordinates. Flagged for manager review with location missing.
            </p>
          </button>

          <button
            onClick={() => handleRunSimulation("POOR_ACCURACY")}
            disabled={simulating}
            className="p-3 rounded-lg border border-orange-200 bg-orange-50/40 hover:bg-orange-50 text-left transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-orange-900">4. Poor GPS Accuracy (380m)</span>
              <Radio className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-[11px] text-orange-800/80">
              Accuracy exceeds 100m threshold. Flagged for low confidence triangulation.
            </p>
          </button>

          <button
            onClick={() => handleRunSimulation("CHECK_OUT")}
            disabled={simulating}
            className="p-3 rounded-lg border border-violet-200 bg-violet-50/40 hover:bg-violet-50 text-left transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-violet-900">5. Standard Check-Out</span>
              <Clock className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-[11px] text-violet-800/80">
              End-of-shift departure within boutique geofence boundary.
            </p>
          </button>

          <div className="p-3 rounded-lg border border-cream-border bg-cream flex flex-col justify-center text-left">
            <span className="font-semibold text-xs text-plum">6. Fictional Data Guard</span>
            <p className="text-[11px] text-neutralMuted mt-1">
              All simulated events are explicitly watermarked and never confused with live real-world biometrics.
            </p>
          </div>
        </div>

        {actionMessage && (
          <div className="mt-4 p-3 rounded-lg bg-gold-50 border border-gold-300 text-xs text-gold-900 font-medium">
            {actionMessage}
          </div>
        )}
      </div>

      {/* Attendance Exceptions Review Queue */}
      <div className="bg-white rounded-xl border border-cream-border shadow-luxury overflow-hidden">
        <div className="p-5 border-b border-cream-border flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-lg text-plum">
              Attendance Exceptions Awaiting Manager Review
            </h3>
            <p className="text-xs text-neutralMuted mt-0.5">
              Review outside-geofence check-ins, delayed arrivals, and device permission errors.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
            {exceptions.filter((e) => e.status === "PENDING").length} Pending Review
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-cocoa">
            <thead className="bg-cream-muted text-plum uppercase font-bold text-[10px] tracking-wider border-b border-cream-border">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Boutique</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-muted">
              {exceptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-neutralMuted">
                    No attendance exceptions currently require review.
                  </td>
                </tr>
              ) : (
                exceptions.map((exc) => (
                  <tr key={exc.id} className="hover:bg-cream/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-plum block">{exc.employee.user.name}</span>
                      <span className="text-[10px] text-neutralMuted font-mono">
                        {exc.employee.employeeCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{exc.branch.name}</td>
                    <td className="py-3.5 px-4 text-neutralMuted">
                      {new Date(exc.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                      at {new Date(exc.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-xs text-cocoa truncate">{exc.reason}</p>
                      {exc.attendanceEvent.distanceFromBranchMeters && (
                        <span className="text-[10px] text-amber-700 font-semibold block">
                          {exc.attendanceEvent.distanceFromBranchMeters}m from store center
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={exc.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {exc.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleReviewException(exc.id, "APPROVED")}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px] flex items-center gap-1 shadow-sm"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => handleReviewException(exc.id, "REJECTED")}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium text-[11px] flex items-center gap-1 shadow-sm"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutralMuted">
                          Reviewed by {exc.reviewer?.name || "Manager"}
                        </span>
                      )}
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
