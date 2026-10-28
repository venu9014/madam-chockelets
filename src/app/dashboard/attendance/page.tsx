"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { calculateHaversineDistanceMeters } from "@/lib/geofence";
import {
  Clock,
  MapPin,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Building2,
  Check,
  X,
  Radio,
  Sliders,
  RefreshCw,
  LogOut,
  LogIn,
  Info,
  Calendar,
  UserCheck,
  Filter,
} from "lucide-react";
import clsx from "clsx";
import { DEFAULT_AUTHORIZED_SSID } from "@/lib/bakery-categories";
import { useOutlet } from "@/context/OutletContext";

interface ActiveSession {
  id: string;
  punchInTime: string;
  status: string;
  inDistanceMeters?: number | null;
  inAccuracyMeters?: number | null;
  inGpsVerified: boolean;
  inWifiSsid?: string | null;
  inWifiVerified: boolean;
  inVerificationMethod: string;
  elapsedSeconds: number;
}

interface AttendanceSessionRecord {
  id: string;
  punchInTime: string;
  punchOutTime?: string | null;
  durationMinutes?: number | null;
  status: string;
  inDistanceMeters?: number | null;
  inAccuracyMeters?: number | null;
  inGpsVerified: boolean;
  inWifiSsid?: string | null;
  inWifiVerified: boolean;
  inVerificationMethod: string;
  outDistanceMeters?: number | null;
  outAccuracyMeters?: number | null;
  outGpsVerified?: boolean | null;
  outWifiSsid?: string | null;
  outWifiVerified?: boolean | null;
  deviceDetails?: string | null;
  notes?: string | null;
  shiftEvaluation?: {
    shiftType: string;
    scheduledStart: string;
    isLate: boolean;
    minutesLate: number;
    isOvertime: boolean;
    overtimeMinutes: number;
    isEarlyDeparture: boolean;
    isMissedCheckout: boolean;
    effectiveDurationMinutes: number;
    statusLabel: string;
  };
  employee: {
    employeeCode: string;
    user: { name: string; email: string };
  };
  branch: { name: string; code: string };
}

interface WorkplaceBranch {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceType?: "CIRCLE" | "POLYGON";
  geofenceRadiusMeters: number;
  geofencePolygonJson?: string | null;
  maxGpsAccuracyMeters: number;
  maxLocationAgeSeconds?: number;
  wifiVerificationPolicy: string;
  wifiSsid?: string | null;
  wifiBssid?: string | null;
  requireBssidVerification?: boolean;
  secondaryBssids?: string | null;
  active?: boolean;
  updatedAt?: string;
}

interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  designation: string;
  avatarUrl?: string | null;
  role: string;
}

export default function AttendancePage() {
  const { selectedOutletCode, selectedOutletId, selectedOutlet, branches: contextBranches } = useOutlet();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [workplace, setWorkplace] = useState<WorkplaceBranch | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [todaySummary, setTodaySummary] = useState<{
    sessionCount: number;
    totalMinutesWorked: number;
    formattedTotalHours?: string;
    totalOvertimeMinutes?: number;
    isLateToday?: boolean;
    hasMissedCheckout?: boolean;
    scheduledShift?: string;
    lastPunchTime: string | null;
  }>({ sessionCount: 0, totalMinutesWorked: 0, lastPunchTime: null });

  // Running elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Verification telemetry
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(15.0);
  const [simulatedSsid, setSimulatedSsid] = useState<string>(DEFAULT_AUTHORIZED_SSID);
  const [simulatedBssid, setSimulatedBssid] = useState<string>("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeExpiresAt, setChallengeExpiresAt] = useState<string | null>(null);

  // Action status
  const [punching, setPunching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<string[]>([]);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<any | null>(null);
  const [overallStatus, setOverallStatus] = useState<"Approved" | "Rejected" | "Ready for Punch">("Ready for Punch");

  // History state
  const [historyRecords, setHistoryRecords] = useState<AttendanceSessionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("ALL");

  // Admin settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editRadius, setEditRadius] = useState<number>(150);
  const [editAccuracy, setEditAccuracy] = useState<number>(50);
  const [editPolicy, setEditPolicy] = useState<string>("GPS_AND_WIFI");
  const [editSsid, setEditSsid] = useState<string>(DEFAULT_AUTHORIZED_SSID);
  const [editBssid, setEditBssid] = useState<string>("");
  const [editRequireBssid, setEditRequireBssid] = useState<boolean>(false);
  const [editSecondaryBssids, setEditSecondaryBssids] = useState<string>("");
  const [editGeofenceType, setEditGeofenceType] = useState<"CIRCLE" | "POLYGON">("POLYGON");
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editLat, setEditLat] = useState<number>(12.9784);
  const [editLon, setEditLon] = useState<number>(77.6408);
  const [savingSettings, setSavingSettings] = useState(false);

  const [isExempt, setIsExempt] = useState(false);
  const [exemptMessage, setExemptMessage] = useState<string>("");

  // Real-time proximity and network calculation
  const currentDistanceMeters =
    workplace && gpsLatitude != null && gpsLongitude != null
      ? Math.round(calculateHaversineDistanceMeters(workplace.latitude, workplace.longitude, gpsLatitude, gpsLongitude))
      : null;

  const isAccuracyPoor =
    Boolean(workplace && gpsAccuracy != null && gpsAccuracy > (workplace.maxGpsAccuracyMeters || 50));

  const isOutsideGeofence =
    Boolean(workplace && currentDistanceMeters != null && currentDistanceMeters > workplace.geofenceRadiusMeters && !isAccuracyPoor);

  const isWrongWifi =
    Boolean(
      workplace &&
        simulatedSsid &&
        workplace.wifiSsid &&
        simulatedSsid.trim().toLowerCase() !== workplace.wifiSsid.trim().toLowerCase()
    );

  const isWifiDisconnected = !simulatedSsid || !simulatedSsid.trim();

  // 3 Independent Verification Statuses
  const liveGpsStatus: "Verified" | "Outside Geofence" | "Accuracy Insufficient" | "Pending Acquisition" = (() => {
    if (gpsLatitude == null || gpsLongitude == null) return "Pending Acquisition";
    if (isAccuracyPoor) return "Accuracy Insufficient";
    if (isOutsideGeofence) return "Outside Geofence";
    return "Verified";
  })();

  const liveWifiStatus: "Verified" | "Not Verified" | "Unavailable" = (() => {
    if (isWifiDisconnected) return "Unavailable";
    if (isWrongWifi) return "Not Verified";
    return "Verified";
  })();

  const liveOverallStatus: "Approved" | "Rejected" | "Ready for Punch" = (() => {
    if (activeSession) return "Approved";
    if (overallStatus === "Rejected") return "Rejected";
    if (overallStatus === "Approved") return "Approved";
    if (liveGpsStatus === "Verified" && liveWifiStatus === "Verified") return "Approved";
    if (liveGpsStatus === "Outside Geofence" || liveGpsStatus === "Accuracy Insufficient" || liveWifiStatus === "Not Verified") {
      return "Rejected";
    }
    return "Ready for Punch";
  })();

  // Fetch session & challenge
  const fetchSessionData = async (targetBranch = selectedOutletCode) => {
    try {
      setLoading(true);
      const queryParam = targetBranch && targetBranch !== "ALL" ? `?branchId=${targetBranch}` : "";
      const res = await fetch(`/api/attendance/session${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.isExempt) {
          setIsExempt(true);
          setExemptMessage(data.message || "Executive Owner accounts are strictly exempt from employee attendance tracking.");
          setLoading(false);
          return;
        }

        setProfile(data.employee);
        setWorkplace(data.branch);
        setActiveSession(data.activeSession);
        setTodaySummary(data.todaySummary);

        if (data.activeSession) {
          setElapsedSeconds(data.activeSession.elapsedSeconds || 0);
        }

        // Initialize admin settings form values
        if (data.branch) {
          setEditRadius(data.branch.geofenceRadiusMeters);
          setEditAccuracy(data.branch.maxGpsAccuracyMeters);
          setEditPolicy(data.branch.wifiVerificationPolicy);
          setEditSsid(data.branch.wifiSsid || DEFAULT_AUTHORIZED_SSID);
          setEditBssid(data.branch.wifiBssid || "");
          setEditRequireBssid(Boolean(data.branch.requireBssidVerification));
          setEditGeofenceType(data.branch.geofenceType || "CIRCLE");
          setEditActive(data.branch.active !== false);
          setEditLat(data.branch.latitude);
          setEditLon(data.branch.longitude);
          setSimulatedSsid(data.branch.wifiSsid || DEFAULT_AUTHORIZED_SSID);
        }

        // Fetch challenge and history for operational personnel
        fetchChallenge(targetBranch);
        fetchHistory(targetBranch);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch fresh Wi-Fi challenge
  const fetchChallenge = async (targetBranch = selectedOutletCode) => {
    if (isExempt) return;
    try {
      const queryParam = targetBranch && targetBranch !== "ALL" ? `?branchId=${targetBranch}` : "";
      const res = await fetch(`/api/attendance/wifi-challenge${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        setChallengeToken(data.challengeToken);
        setChallengeExpiresAt(data.expiresAt);
      }
    } catch (err) {
      console.error("Failed to fetch challenge:", err);
    }
  };

  // Fetch attendance history
  const fetchHistory = async (targetBranch = selectedOutletCode) => {
    if (isExempt) return;
    try {
      setHistoryLoading(true);
      const branchParam = targetBranch && targetBranch !== "ALL" ? `&branchId=${targetBranch}` : "";
      const res = await fetch(`/api/attendance/history?status=${historyFilter}&limit=30${branchParam}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setActionError(null);
    setActionSuccess(null);
    setDiagnostic(null);
    fetchSessionData(selectedOutletCode);
  }, [selectedOutletCode]);

  useEffect(() => {
    if (!isExempt && profile) {
      fetchHistory(selectedOutletCode);
    }
  }, [historyFilter, isExempt, selectedOutletCode]);

  // Live timer interval when session is OPEN
  useEffect(() => {
    let interval: any = null;
    if (activeSession && activeSession.status === "OPEN") {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  // Request actual device GPS via browser Geolocation API
  const handleAcquireDeviceGps = () => {
    if (!navigator.geolocation) {
      setActionError("GPS disabled or unavailable: Geolocation API is not supported by your browser or environment.");
      return;
    }

    setActionError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLatitude(pos.coords.latitude);
        setGpsLongitude(pos.coords.longitude);
        setGpsAccuracy(Math.round(pos.coords.accuracy * 10) / 10);
        setActionSuccess(`Live GPS coordinates acquired: ±${Math.round(pos.coords.accuracy)}m accuracy.`);
      },
      (err) => {
        let msg = "Failed to acquire location: ";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied: Location access was blocked in browser/device settings. Please allow location access in your browser address bar and retry.";
          setGpsLatitude(null);
          setGpsLongitude(null);
          setGpsAccuracy(null);
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "GPS disabled or unavailable: Device location signal is unavailable. Please ensure GPS/location services are enabled on your device.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out: GPS signal acquisition timed out. Please retry in an open area with clear sky view.";
        }
        setActionError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  // Preset Scenario Handlers
  const handleApplyPreset = (scenario: string) => {
    if (!workplace) return;
    setActionError(null);
    setActionSuccess(null);
    setDiagnostic(null);

    switch (scenario) {
      case "INSIDE_SUCCESS":
        // 25m inside store
        setGpsLatitude(workplace.latitude + 0.0001);
        setGpsLongitude(workplace.longitude + 0.0001);
        setGpsAccuracy(15.0);
        setSimulatedSsid(workplace.wifiSsid || DEFAULT_AUTHORIZED_SSID);
        fetchChallenge();
        setActionSuccess("Preset loaded: Inside permitted area (~25m) with authorized workplace Wi-Fi.");
        break;

      case "OUTSIDE_BREACH":
        // ~750m away from store
        setGpsLatitude(workplace.latitude + 0.007);
        setGpsLongitude(workplace.longitude + 0.007);
        setGpsAccuracy(18.0);
        setSimulatedSsid(workplace.wifiSsid || DEFAULT_AUTHORIZED_SSID);
        setActionError("Preset loaded: Device simulated 750m away (Outside Geofence).");
        break;

      case "POOR_ACCURACY":
        // Within coords but ±380m accuracy
        setGpsLatitude(workplace.latitude);
        setGpsLongitude(workplace.longitude);
        setGpsAccuracy(380.0);
        setSimulatedSsid(workplace.wifiSsid || DEFAULT_AUTHORIZED_SSID);
        setActionError("Location Accuracy Insufficient — GPS accuracy is ±380m, exceeding 50m threshold.");
        setActionErrors(["Location Accuracy Insufficient — Device GPS accuracy is ±380m, exceeding allowable threshold of 50m."]);
        setOverallStatus("Rejected");
        break;

      case "WRONG_WIFI":
        // Inside geofence but wrong Wi-Fi SSID
        setGpsLatitude(workplace.latitude + 0.0001);
        setGpsLongitude(workplace.longitude + 0.0001);
        setGpsAccuracy(15.0);
        setSimulatedSsid("Public-Coffee-Shop-Free-WiFi");
        setActionError("Wi-Fi Not Verified — You are not connected to the authorized workplace Wi-Fi network.");
        setActionErrors(["Wi-Fi Not Verified — You are not connected to the authorized workplace Wi-Fi network."]);
        setOverallStatus("Rejected");
        break;

      case "GPS_DENIED":
        setGpsLatitude(null);
        setGpsLongitude(null);
        setGpsAccuracy(null);
        setActionError("GPS Location Required: Device location permissions denied / disabled.");
        setActionErrors(["GPS Location Required: Location access was blocked or denied in browser settings."]);
        setOverallStatus("Rejected");
        break;
    }

  };

  // Execute Punch (In or Out)
  const handleExecutePunch = async (action: "PUNCH_IN" | "PUNCH_OUT") => {
    try {
      setPunching(true);
      setActionError(null);
      setActionErrors([]);
      setActionSuccess(null);
      setDiagnostic(null);

      // Pre-flight check: Prevent duplicate Punch In
      if (action === "PUNCH_IN" && activeSession) {
        setActionError("Attendance already recorded: An attendance session is already open. You must punch out before starting a new session.");
        setActionErrors(["Attendance already recorded: An attendance session is already open. You must punch out before starting a new session."]);
        setPunching(false);
        return;
      }

      // Pre-flight check: Prevent Punch Out without open session
      if (action === "PUNCH_OUT" && !activeSession) {
        setActionError("Check-out unavailable: No active attendance session found to punch out. Please punch in first.");
        setActionErrors(["Check-out unavailable: No active attendance session found to punch out. Please punch in first."]);
        setPunching(false);
        return;
      }

      // Evaluate pre-flight checks independently
      const errors: string[] = [];

      // 1. Evaluate GPS independently
      if (action === "PUNCH_IN") {
        if (gpsLatitude == null || gpsLongitude == null) {
          errors.push("GPS Location Required: Please click 'Acquire Live Browser GPS' or select a hardware test preset to verify your presence.");
        } else if (isAccuracyPoor) {
          errors.push(`Location Accuracy Insufficient: Device GPS accuracy is ±${gpsAccuracy}m, which exceeds the required threshold of ${workplace?.maxGpsAccuracyMeters || 50}m. Move to an open area with clear sky view.`);
        } else if (isOutsideGeofence) {
          errors.push(`Location Warning: Outside Geofence — You are outside the authorized workplace area (${currentDistanceMeters}m away; permitted radius: ${workplace?.geofenceRadiusMeters || 150}m). Move inside the registered boundary and retry.`);
        }

        // 2. Evaluate Wi-Fi independently
        if (workplace?.wifiVerificationPolicy !== "GPS_ONLY") {
          if (isWifiDisconnected || isWrongWifi) {
            errors.push("Wi-Fi Not Verified — You are not connected to the authorized workplace Wi-Fi network.");
          }
        }

        if (errors.length > 0) {
          setActionErrors(errors);
          setActionError(errors.join(" \n"));
          setOverallStatus("Rejected");
          setPunching(false);
          return;
        }
      }

      // Always fetch a fresh single-use Wi-Fi presence challenge token before submitting
      let tokenToUse = null;
      const branchParam = (workplace?.code || (selectedOutletCode !== "ALL" ? selectedOutletCode : ""))
        ? `?branchId=${workplace?.code || selectedOutletCode}`
        : "";
      const chalRes = await fetch(`/api/attendance/wifi-challenge${branchParam}`);
      if (chalRes.ok) {
        const chalData = await chalRes.json();
        tokenToUse = chalData.challengeToken;
        setChallengeToken(tokenToUse);
      }

      const payload = {
        action,
        branchId: workplace?.id || workplace?.code || (selectedOutletCode !== "ALL" ? selectedOutletCode : undefined),
        latitude: gpsLatitude,
        longitude: gpsLongitude,
        accuracyMeters: gpsAccuracy,
        locationTimestamp: Date.now(),
        challengeToken: tokenToUse,
        wifiSsid: simulatedSsid,
        deviceDetails: "Madam Chocolate Ops Web/Mobile Client",
        notes: action === "PUNCH_IN" ? "Employee shift check-in" : "Employee shift checkout",
        isSimulated: true,
      };

      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setActionErrors([]);
        setActionError(null);
        setOverallStatus("Approved");
        if (action === "PUNCH_IN") {
          setActionSuccess(`Punch In confirmed at ${new Date(data.session.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Shift session is now open.`);
        } else {
          setActionSuccess(`Punch Out confirmed! Total shift duration: ${Math.floor((data.session.durationMinutes || 0) / 60)}h ${(data.session.durationMinutes || 0) % 60}m.`);
        }
        setDiagnostic(data.diagnostic);
        await fetchSessionData();
        await fetchHistory();
        await fetchChallenge();
      } else {
        const errList: string[] = [];
        if (data.errors?.gps) errList.push(data.errors.gps);
        if (data.errors?.wifi) errList.push(data.errors.wifi);
        if (Array.isArray(data.failureReasons) && data.failureReasons.length > 0) {
          data.failureReasons.forEach((r: string) => {
            if (!errList.includes(r)) errList.push(r);
          });
        }
        if (errList.length === 0 && data.error) errList.push(data.error);

        setActionErrors(errList);
        setActionError(errList.join(" \n"));
        setOverallStatus("Rejected");
        if (data.diagnostic) {
          setDiagnostic(data.diagnostic);
        }
      }
    } catch (err) {
      console.error("Punch execution error:", err);
      setActionError("Network or server connection error. Please retry.");
    } finally {
      setPunching(false);
    }
  };

  // Acquire Live GPS coordinates to set workplace location
  const handleUseCurrentLocationForBranch = () => {
    if (!navigator.geolocation) {
      setActionError("Geolocation API is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditLat(Number(pos.coords.latitude.toFixed(6)));
        setEditLon(Number(pos.coords.longitude.toFixed(6)));
        setActionSuccess(`Acquired live workplace coordinates: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      (err) => {
        setActionError(`Failed to acquire current location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save Admin Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workplace) return;
    try {
      setSavingSettings(true);
      const res = await fetch("/api/attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: workplace.id,
          geofenceRadiusMeters: editRadius,
          maxGpsAccuracyMeters: editAccuracy,
          wifiVerificationPolicy: editPolicy,
          wifiSsid: editSsid,
          wifiBssid: editBssid ? editBssid.trim() : null,
          requireBssidVerification: editRequireBssid,
          geofenceType: editGeofenceType,
          active: editActive,
          latitude: editLat,
          longitude: editLon,
        }),
      });

      if (res.ok) {
        setShowSettingsModal(false);
        setActionSuccess("Workplace boundary and Wi-Fi verification policy updated successfully.");
        await fetchSessionData();
      } else {
        const err = await res.json();
        setActionError(err.error || "Failed to update settings.");
      }
    } catch (err) {
      console.error("Save settings error:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isManager = profile?.role === "BRANCH_MANAGER";

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Time, Attendance & Presence Verification
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            GPS + Workplace Wi-Fi Attendance
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Dual-factor presence verification: Haversine geofence + cryptographic workplace Wi-Fi network challenge.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isExempt && isManager && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3.5 py-2 bg-white border border-gold-400 text-plum font-semibold text-xs rounded-lg hover:bg-cream-muted transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5 text-gold-700" />
              <span>Configure Workplace</span>
            </button>
          )}

          <button
            onClick={() => {
              fetchSessionData();
            }}
            className="p-2 bg-white border border-cream-border rounded-lg text-cocoa hover:text-plum hover:bg-cream-muted shadow-sm"
            title="Refresh attendance status"
          >
            <RefreshCw className="w-4 h-4 text-gold-600" />
          </button>
        </div>
      </div>

      {isExempt ? (
        <div className="bg-white rounded-2xl border border-gold-300 p-8 shadow-luxury text-center space-y-4 my-8 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-gold-100 text-gold-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8 text-gold-600" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
              Executive Governance Policy
            </span>
            <h2 className="text-2xl font-serif font-black text-plum">
              Attendance Tracking Exempt
            </h2>
            <p className="text-xs text-cocoa/80 leading-relaxed max-w-lg mx-auto">
              {exemptMessage ||
                "Executive Owner accounts are strictly exempt from punch timers, geofence validations, and employee attendance tracking in accordance with Madam Chocolate Governance Rules."}
            </p>
          </div>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2.5 bg-plum text-gold-300 text-xs font-semibold rounded-lg hover:bg-plum-light transition-colors shadow-sm"
            >
              Go to Executive Overview
            </Link>
            <Link
              href="/dashboard/settings"
              className="px-4 py-2.5 bg-cream text-plum border border-gold-400 text-xs font-semibold rounded-lg hover:bg-gold-50 transition-colors shadow-sm"
            >
              Configure Workplace Geofences
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Employee Greeting & Active Workplace Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-luxury flex flex-col justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-violet-100 border-2 border-gold-400 flex items-center justify-center text-violet-900 font-serif font-black text-lg shadow-sm">
              {profile ? profile.name.slice(0, 2).toUpperCase() : "MC"}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-700 block">
                {profile?.designation || "Confectionery Artisan"}
              </span>
              <h2 className="font-serif font-bold text-lg text-plum leading-snug">
                {profile ? `Good day, ${profile.name}` : "Welcome to Attendance"}
              </h2>
              <p className="text-xs text-neutralMuted font-mono mt-0.5">
                ID: {profile?.employeeCode || "MC-001"} &bull; {profile?.role?.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-cream-border grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-cream/70">
              <span className="text-[10px] text-neutralMuted block">Today&apos;s Sessions</span>
              <span className="font-bold text-plum text-sm">{todaySummary.sessionCount} shifts</span>
            </div>
            <div className="p-2.5 rounded-lg bg-cream/70">
              <span className="text-[10px] text-neutralMuted block">Total Hours Today</span>
              <span className="font-bold text-gold-800 text-sm">
                {Math.floor(todaySummary.totalMinutesWorked / 60)}h {todaySummary.totalMinutesWorked % 60}m
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Workplace Location & Policy Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-cream-border p-5 shadow-luxury flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-gold-600" />
                Assigned Workplace
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-100 text-violet-900 px-2 py-0.5 rounded-full">
                {workplace?.wifiVerificationPolicy?.replace(/_/g, " ") || "GPS + Wi-Fi"}
              </span>
            </div>

            <h3 className="font-serif font-bold text-xl text-plum">
              {workplace?.name || "Indiranagar Boutique & Atelier"}
            </h3>
            <p className="text-xs text-cocoa/80 mt-1">{workplace?.address}</p>
          </div>

          <div className="mt-4 pt-3 border-t border-cream-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-cream/60">
              <span className="text-[10px] text-neutralMuted block">Coordinates</span>
              <span className="font-mono font-semibold text-plum text-[11px]">
                {workplace?.latitude.toFixed(4)}, {workplace?.longitude.toFixed(4)}
              </span>
            </div>

            <div className="p-2 rounded bg-cream/60">
              <span className="text-[10px] text-neutralMuted block">Geofence Radius</span>
              <span className="font-bold text-plum">
                {workplace?.geofenceRadiusMeters} metres
              </span>
            </div>

            <div className="p-2 rounded bg-cream/60">
              <span className="text-[10px] text-neutralMuted block">Required GPS Accuracy</span>
              <span className="font-bold text-plum">
                &le; {workplace?.maxGpsAccuracyMeters} metres
              </span>
            </div>

            <div className="p-2 rounded bg-cream/60">
              <span className="text-[10px] text-neutralMuted block">Workplace Wi-Fi SSID</span>
              <span className="font-mono font-bold text-violet-800 text-[11px] truncate block">
                {workplace?.wifiSsid || "MadamChoc-Secure"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Punch Console */}
      <div className="bg-white rounded-2xl border-2 border-gold-400 shadow-luxury-lg p-6 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-cream-border">
          {/* Status Display */}
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                "w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all",
                activeSession
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm animate-pulse"
                  : "bg-cream-muted border-gold-300 text-gold-700"
              )}
            >
              <Clock className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase font-bold tracking-widest text-neutralMuted">
                  Current Status:
                </span>
                <span
                  className={clsx(
                    "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                    activeSession
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  )}
                >
                  {activeSession ? "Punched In & Active" : "Not Punched In"}
                </span>
              </div>

              {activeSession ? (
                <div>
                  <p className="font-mono font-bold text-3xl sm:text-4xl text-plum tracking-tight">
                    {formatTimer(elapsedSeconds)}
                  </p>
                  <p className="text-xs text-neutralMuted mt-0.5">
                    Punched in at{" "}
                    <strong className="text-plum">
                      {new Date(activeSession.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </strong>{" "}
                    &bull; Location: {activeSession.inDistanceMeters ?? 0}m from store
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-serif font-bold text-2xl text-plum">
                    Ready for Shift Attendance
                  </p>
                  <p className="text-xs text-neutralMuted mt-0.5">
                    Acquire GPS &amp; Wi-Fi verification to record shift start.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Punch Action Buttons */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Punch In Button */}
            <button
              onClick={() => handleExecutePunch("PUNCH_IN")}
              disabled={Boolean(activeSession) || punching}
              className={clsx(
                "flex-1 md:flex-initial px-6 py-4 rounded-xl font-serif font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2",
                activeSession
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-lg hover:scale-[1.02]"
              )}
            >
              <LogIn className="w-5 h-5" />
              <span>{punching && !activeSession ? "Verifying..." : "Punch In"}</span>
            </button>

            {/* Punch Out Button */}
            <button
              onClick={() => handleExecutePunch("PUNCH_OUT")}
              disabled={!activeSession || punching}
              className={clsx(
                "flex-1 md:flex-initial px-6 py-4 rounded-xl font-serif font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2",
                !activeSession
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 hover:shadow-lg hover:scale-[1.02]"
              )}
            >
              <LogOut className="w-5 h-5" />
              <span>{punching && activeSession ? "Recording..." : "Punch Out"}</span>
            </button>
          </div>
        </div>

        {/* Live Verification Telemetry Bar */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* GPS Geofence Box */}
          <div className="p-4 rounded-xl bg-cream border border-cream-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold-700" />
                <span className="font-semibold text-xs text-plum">GPS Location Telemetry</span>
              </div>
              <button
                onClick={handleAcquireDeviceGps}
                className="text-[11px] font-semibold text-gold-700 hover:text-gold-900 underline flex items-center gap-1"
              >
                Acquire Live Browser GPS
              </button>
            </div>

            <div className="text-xs space-y-1 text-cocoa">
              <div className="flex justify-between">
                <span className="text-neutralMuted">Coordinates:</span>
                <span className="font-mono font-semibold">
                  {gpsLatitude != null && gpsLongitude != null
                    ? `${gpsLatitude.toFixed(5)}, ${gpsLongitude.toFixed(5)}`
                    : "Not acquired (Click 'Acquire Live Browser GPS' or select preset)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutralMuted">Accuracy:</span>
                <span
                  className={clsx(
                    "font-semibold",
                    gpsAccuracy && gpsAccuracy <= (workplace?.maxGpsAccuracyMeters || 50)
                      ? "text-emerald-700"
                      : "text-rose-700"
                  )}
                >
                  {gpsAccuracy != null ? `±${gpsAccuracy}m` : "Unknown"} (Limit: {workplace?.maxGpsAccuracyMeters || 50}m)
                </span>
              </div>
            </div>
          </div>

          {/* Wi-Fi Verification Box */}
          <div className="p-4 rounded-xl bg-cream border border-cream-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-violet-700" />
                <span className="font-semibold text-xs text-plum">Workplace Wi-Fi Telemetry</span>
              </div>
              <button
                onClick={() => fetchChallenge()}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 underline flex items-center gap-1"
              >
                Refresh Challenge
              </button>
            </div>

            <div className="text-xs space-y-1 text-cocoa">
              <div className="flex justify-between">
                <span className="text-neutralMuted">Detected SSID:</span>
                <span
                  className={clsx(
                    "font-mono font-semibold",
                    simulatedSsid === workplace?.wifiSsid ? "text-emerald-700" : "text-amber-800"
                  )}
                >
                  {simulatedSsid || "None (Disconnected)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutralMuted">LAN Challenge Status:</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {challengeToken ? "Fresh (HMAC-SHA256 Token Active)" : "Requesting..."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Independent Verification Statuses Card */}
        {!isExempt && (
          <div className="mt-4 bg-white rounded-xl border border-cream-border p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-cream-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-plum">
                Independent Verification Status Breakdown
              </span>
              <span className="text-[10px] text-neutralMuted font-medium">Dual-Factor Assessment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. GPS Location Status */}
              <div className="p-3 rounded-lg bg-cream/60 border border-cream-border flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-neutralMuted">GPS Location</span>
                  <MapPin className="w-3.5 h-3.5 text-gold-700" />
                </div>
                <div className="mt-2">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      liveGpsStatus === "Verified"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : liveGpsStatus === "Accuracy Insufficient"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : liveGpsStatus === "Outside Geofence"
                        ? "bg-rose-100 text-rose-900 border border-rose-300"
                        : "bg-neutral-100 text-neutral-700 border border-neutral-300"
                    )}
                  >
                    <span
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        liveGpsStatus === "Verified"
                          ? "bg-emerald-500"
                          : liveGpsStatus === "Accuracy Insufficient"
                          ? "bg-amber-500"
                          : liveGpsStatus === "Outside Geofence"
                          ? "bg-rose-500"
                          : "bg-neutral-400"
                      )}
                    />
                    {liveGpsStatus}
                  </span>
                  <span className="text-[10px] text-neutralMuted block mt-1">
                    {currentDistanceMeters != null ? `${currentDistanceMeters}m from boutique center` : "Pending GPS acquisition"}
                  </span>
                </div>
              </div>

              {/* 2. Workplace Wi-Fi Status */}
              <div className="p-3 rounded-lg bg-cream/60 border border-cream-border flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-neutralMuted">Workplace Wi-Fi</span>
                  <Wifi className="w-3.5 h-3.5 text-violet-700" />
                </div>
                <div className="mt-2">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      liveWifiStatus === "Verified"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : liveWifiStatus === "Unavailable"
                        ? "bg-neutral-100 text-neutral-700 border border-neutral-300"
                        : "bg-rose-100 text-rose-900 border border-rose-300"
                    )}
                  >
                    <span
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        liveWifiStatus === "Verified"
                          ? "bg-emerald-500"
                          : liveWifiStatus === "Unavailable"
                          ? "bg-neutral-500"
                          : "bg-rose-500"
                      )}
                    />
                    {liveWifiStatus}
                  </span>
                  <span className="text-[10px] text-neutralMuted block mt-1 truncate">
                    SSID: {simulatedSsid || "None (Disconnected)"}
                  </span>
                </div>
              </div>

              {/* 3. Overall Attendance Status */}
              <div className="p-3 rounded-lg bg-cream/60 border border-cream-border flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-neutralMuted">Overall Attendance</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-plum" />
                </div>
                <div className="mt-2">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      activeSession || liveOverallStatus === "Approved"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : liveOverallStatus === "Rejected"
                        ? "bg-rose-100 text-rose-900 border border-rose-300"
                        : "bg-amber-100 text-amber-900 border border-amber-300"
                    )}
                  >
                    <span
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        activeSession || liveOverallStatus === "Approved"
                          ? "bg-emerald-500"
                          : liveOverallStatus === "Rejected"
                          ? "bg-rose-500"
                          : "bg-amber-500"
                      )}
                    />
                    {activeSession ? "Approved (Active Shift)" : liveOverallStatus}
                  </span>
                  <span className="text-[10px] text-neutralMuted block mt-1">
                    {activeSession ? "Session OPEN" : liveOverallStatus === "Rejected" ? "Rejection reason(s) noted below" : "Ready for Punch"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Accuracy Insufficient Warning */}
        {isAccuracyPoor && !isExempt && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs flex items-start gap-3 shadow-sm animate-in fade-in-50 duration-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold text-amber-900 text-sm">
                Location Accuracy Insufficient
              </strong>
              <p className="mt-1 leading-relaxed">
                Device GPS accuracy is ±<strong>{gpsAccuracy}m</strong>, which is insufficient to determine whether you are inside the authorized boundary (maximum allowable threshold: <strong>{workplace?.maxGpsAccuracyMeters || 50}m</strong>). Please move to an open area with clear sky view and retry.
              </p>
            </div>
          </div>
        )}

        {/* Real-time Workplace Boundary Proximity Warning */}
        {isOutsideGeofence && !isExempt && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs flex items-start gap-3 shadow-sm animate-in fade-in-50 duration-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold text-amber-900 text-sm">
                Location warning: You are outside the authorized workplace area. Move inside the registered boundary and try again. Your attendance has not been confirmed.
              </strong>
              <p className="mt-1 leading-relaxed">
                Your current GPS position is <strong>{currentDistanceMeters}m</strong> away from {workplace?.name}.
                The authorized attendance perimeter is within <strong>{workplace?.geofenceRadiusMeters}m</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Real-time Wi-Fi Network Mismatch Warning */}
        {isWrongWifi && !isExempt && (
          <div className="mt-4 p-4 rounded-xl bg-violet-50 border-2 border-violet-300 text-violet-950 text-xs flex items-start gap-3 shadow-sm animate-in fade-in-50 duration-200">
            <Wifi className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold text-violet-900 text-sm">
                Wi-Fi Not Verified — You are not connected to the authorized workplace Wi-Fi network.
              </strong>
              <p className="mt-1 leading-relaxed">
                Connected network &quot;{simulatedSsid}&quot; is not an authorized boutique Wi-Fi access point.
                Dual-factor verification requires connecting to authorized network: <strong>&quot;{workplace?.wifiSsid}&quot;</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Action Rejection Error Banner */}
        {actionErrors.length > 0 && !isExempt && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs flex items-start gap-3 shadow-sm animate-in fade-in-50 duration-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <strong className="block font-bold text-rose-900 text-sm">
                Attendance Verification Rejected
              </strong>
              {actionErrors.map((err, idx) => (
                <p key={idx} className="leading-relaxed font-semibold text-rose-900">
                  &bull; {err}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Missed Check-Out Alert Banner */}
        {todaySummary.hasMissedCheckout && !isExempt && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs flex items-start gap-3 shadow-sm animate-in fade-in-50 duration-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold text-rose-900 text-sm">
                Missed Check-Out Detected from Previous Shift
              </strong>
              <p className="mt-1 leading-relaxed">
                You have an open attendance session from a previous calendar day that was never checked out.
                Please check out to close the previous shift or contact your branch manager to review your attendance log.
              </p>
            </div>
          </div>
        )}

        {/* Action Error Banner (Fallback) */}
        {actionErrors.length === 0 && actionError && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Attendance Verification Rejected</strong>
              <p className="mt-0.5 leading-relaxed">{actionError}</p>
            </div>
          </div>
        )}

        {/* Action Success Banner */}
        {actionSuccess && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Attendance Confirmed</strong>
              <p className="mt-0.5 leading-relaxed">{actionSuccess}</p>
            </div>
          </div>
        )}

        {/* Diagnostic Accordion */}
        {diagnostic && (
          <div className="mt-4 p-3 bg-cream-muted rounded-xl text-xs space-y-1 font-mono text-[11px] text-cocoa">
            <span className="font-bold text-plum block text-xs font-serif">Server Verification Diagnostic:</span>
            <p>GPS Outcome: {diagnostic.gps?.status} &bull; {diagnostic.gps?.description}</p>
            <p>Wi-Fi Outcome: {diagnostic.wifi?.status} &bull; {diagnostic.wifi?.message}</p>
            <p>Enforced Policy: {diagnostic.policy}</p>
          </div>
        )}

        {/* 8-Stage Verification Pipeline Telemetry */}
        <div className="mt-6 pt-4 border-t border-cream-border">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-700 block mb-2">
            Verification Pipeline Telemetry (8 Verification Checkpoints)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* 1. Authentication */}
            <div className="p-2.5 rounded-xl bg-white border border-cream-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-neutralMuted">
                <span>1. Auth Identity</span>
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="mt-1">
                <span className="font-bold text-plum block truncate">{profile?.name || "Authenticating"}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Active &amp; Scoped</span>
              </div>
            </div>

            {/* 2. Wi-Fi SSID */}
            <div className="p-2.5 rounded-xl bg-white border border-cream-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-neutralMuted">
                <span>2. Wi-Fi SSID</span>
                <Wifi className={clsx("w-3.5 h-3.5", simulatedSsid === (workplace?.wifiSsid || DEFAULT_AUTHORIZED_SSID) ? "text-emerald-600" : "text-rose-600")} />
              </div>
              <div className="mt-1">
                <span className="font-mono text-[11px] font-bold truncate block">{simulatedSsid || "None"}</span>
                <span className={clsx("text-[10px] font-semibold", simulatedSsid === (workplace?.wifiSsid || DEFAULT_AUTHORIZED_SSID) ? "text-emerald-700" : "text-rose-700")}>
                  {simulatedSsid === (workplace?.wifiSsid || DEFAULT_AUTHORIZED_SSID) ? "Authorised Match" : "Mismatch / Disallowed"}
                </span>
              </div>
            </div>

            {/* 3. Router BSSID */}
            <div className="p-2.5 rounded-xl bg-white border border-cream-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-neutralMuted">
                <span>3. Router BSSID</span>
                <Radio className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div className="mt-1">
                <span className="font-mono text-[11px] font-semibold truncate block">{simulatedBssid || "Dynamic / Default"}</span>
                <span className="text-[10px] text-neutralMuted font-medium">
                  {workplace?.requireBssidVerification ? "Mandatory Verification" : "Optional Verification"}
                </span>
              </div>
            </div>

            {/* 4. GPS Acquisition */}
            <div className="p-2.5 rounded-xl bg-white border border-cream-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-neutralMuted">
                <span>4. GPS Coordinates</span>
                <MapPin className={clsx("w-3.5 h-3.5", gpsLatitude != null ? "text-emerald-600" : "text-amber-600")} />
              </div>
              <div className="mt-1">
                <span className="font-mono text-[11px] font-semibold truncate block">
                  {gpsLatitude != null ? `${gpsLatitude.toFixed(4)}, ${gpsLongitude?.toFixed(4)}` : "Pending Acquisition"}
                </span>
                <span className={clsx("text-[10px] font-semibold", gpsLatitude != null ? "text-emerald-700" : "text-amber-700")}>
                  {gpsLatitude != null ? "Acquired" : "Awaiting Fix"}
                </span>
              </div>
            </div>

            {/* 5. Accuracy & Freshness */}
            <div className="p-2.5 rounded-xl bg-white border border-cream-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-neutralMuted">
                <span>5. Accuracy &amp; Freshness</span>
                <Clock className={clsx("w-3.5 h-3.5", gpsAccuracy && gpsAccuracy <= (workplace?.maxGpsAccuracyMeters || 50) ? "text-emerald-600" : "text-rose-600")} />
              </div>
              <div className="mt-1">
                <span className="font-bold text-[11px] text-plum block">
                  {gpsAccuracy != null ? `±${gpsAccuracy}m` : "Unknown"}
                </span>
                <span className={clsx("text-[10px] font-semibold", gpsAccuracy && gpsAccuracy <= (workplace?.maxGpsAccuracyMeters || 50) ? "text-emerald-700" : "text-rose-700")}>
                  {gpsAccuracy && gpsAccuracy <= (workplace?.maxGpsAccuracyMeters || 50) ? "Tolerance Met (<50m)" : "Exceeds Limit (>50m)"}
                </span>
              </div>
            </div>

            {/* 6. Geofence Boundary */}
            <div className="p-2.5 rounded-xl bg-white border border-cream-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-neutralMuted">
                <span>6. Geofence Boundary</span>
                <ShieldCheck className="w-3.5 h-3.5 text-gold-600" />
              </div>
              <div className="mt-1">
                <span className="font-semibold text-[11px] text-plum block">
                  {workplace?.geofenceType === "POLYGON" ? "Polygon (Ray-Casting)" : "Circle (Haversine)"}
                </span>
                <span className="text-[10px] text-gold-800 font-medium">Perimeter Enforced</span>
              </div>
            </div>

            {/* 7. Server Handshake */}
            <div className="p-2.5 rounded-xl bg-white border border-cream-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-neutralMuted">
                <span>7. LAN Challenge</span>
                <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div className="mt-1">
                <span className="font-mono text-[11px] font-bold text-violet-800 block truncate">
                  {challengeToken ? "HMAC Token Active" : "Handshake Ready"}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Single-Use Challenge</span>
              </div>
            </div>

            {/* 8. Final Outcome */}
            <div className="p-2.5 rounded-xl bg-white border border-cream-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-neutralMuted">
                <span>8. Final Outcome</span>
                {activeSession ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                )}
              </div>
              <div className="mt-1">
                <span className="font-bold text-[11px] text-plum block">
                  {activeSession ? "Session OPEN" : "Ready for Punch"}
                </span>
                <span className={clsx("text-[10px] font-semibold", activeSession ? "text-emerald-700" : "text-neutralMuted")}>
                  {activeSession ? "Dual-Factor Verified" : "Standby"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Simulator Preset Toolbar */}
        <div className="mt-6 pt-4 border-t border-cream-border">

          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutralMuted">
              Test &amp; Evaluation Presets (Simulate Mobile Network &amp; Hardware States):
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleApplyPreset("INSIDE_SUCCESS")}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-semibold"
            >
              ✓ Inside Geofence (25m) + Authorized Wi-Fi
            </button>
            <button
              onClick={() => handleApplyPreset("OUTSIDE_BREACH")}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-semibold"
            >
              ⚠ Outside Geofence (750m Breach)
            </button>
            <button
              onClick={() => handleApplyPreset("POOR_ACCURACY")}
              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-semibold"
            >
              ⚠ Low GPS Accuracy (±380m)
            </button>
            <button
              onClick={() => handleApplyPreset("WRONG_WIFI")}
              className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-300 text-[11px] font-semibold"
            >
              ⚠ Wrong Wi-Fi SSID
            </button>
            <button
              onClick={() => handleApplyPreset("GPS_DENIED")}
              className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 text-[11px] font-semibold"
            >
              ⚠ GPS Permission Denied
            </button>
          </div>
        </div>
      </div>

      {/* Attendance History Section */}
      <div className="bg-white rounded-2xl border border-cream-border shadow-luxury overflow-hidden">
        <div className="p-5 border-b border-cream-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-plum">
              Attendance Session History
            </h3>
            <p className="text-xs text-neutralMuted mt-0.5">
              Verified punch-in and punch-out history with duration, GPS accuracy, and Wi-Fi audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {["ALL", "COMPLETED", "OPEN", "FLAGGED"].map((st) => (
              <button
                key={st}
                onClick={() => setHistoryFilter(st)}
                className={clsx(
                  "px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider text-[11px] transition-all",
                  historyFilter === st
                    ? "bg-gold-500 text-plum shadow-sm"
                    : "bg-cream-muted text-cocoa hover:bg-cream"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-cocoa">
            <thead className="bg-cream-muted text-plum uppercase font-bold text-[10px] tracking-wider border-b border-cream-border">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Boutique</th>
                <th className="py-3 px-4">Punch In</th>
                <th className="py-3 px-4">Punch Out</th>
                <th className="py-3 px-4 text-right">Duration</th>
                <th className="py-3 px-4">Shift &amp; Punctuality</th>
                <th className="py-3 px-4">Verification Breakdown</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-muted">
              {historyLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-neutralMuted">
                    Loading attendance sessions...
                  </td>
                </tr>
              ) : historyRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-neutralMuted">
                    No attendance session records match the current filter.
                  </td>
                </tr>
              ) : (
                historyRecords.map((session) => (
                  <tr key={session.id} className="hover:bg-cream/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-plum whitespace-nowrap">
                      {new Date(session.punchInTime).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-plum block">{session.employee.user.name}</span>
                      <span className="text-[10px] text-neutralMuted font-mono">
                        {session.employee.employeeCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{session.branch.name.split(" ")[0]}</td>
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {new Date(session.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {session.punchOutTime
                        ? new Date(session.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-serif font-bold text-plum">
                      {session.durationMinutes
                        ? `${Math.floor(session.durationMinutes / 60)}h ${session.durationMinutes % 60}m`
                        : session.status === "OPEN"
                        ? "Active"
                        : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      {session.shiftEvaluation ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {session.shiftEvaluation.isMissedCheckout ? (
                            <span className="bg-rose-100 text-rose-900 border border-rose-300 text-[10px] px-2 py-0.5 rounded font-bold">
                              Missed Check-Out
                            </span>
                          ) : session.shiftEvaluation.isLate ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] px-2 py-0.5 rounded font-bold">
                              Late (+{session.shiftEvaluation.minutesLate}m)
                            </span>
                          ) : session.shiftEvaluation.isOvertime ? (
                            <span className="bg-violet-100 text-violet-900 border border-violet-300 text-[10px] px-2 py-0.5 rounded font-bold">
                              Overtime (+{Math.round(session.shiftEvaluation.overtimeMinutes / 60 * 10) / 10}h)
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] px-2 py-0.5 rounded font-bold">
                              On Time
                            </span>
                          )}
                          <span className="text-[10px] text-neutralMuted font-mono">
                            {session.shiftEvaluation.shiftType}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutralMuted font-mono">Standard Shift</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {session.inGpsVerified ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            GPS ✓ ({session.inDistanceMeters ?? 0}m)
                          </span>
                        ) : (
                          <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            GPS ✕
                          </span>
                        )}

                        {session.inWifiVerified ? (
                          <span className="bg-violet-50 text-violet-800 border border-violet-200 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Wi-Fi ✓
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Wi-Fi ✕
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={session.status} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Admin Settings Modal */}
      {showSettingsModal && workplace && (
        <div className="fixed inset-0 bg-plum/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-luxury-lg border border-gold-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-700 block">
                  Boutique Administration
                </span>
                <h3 className="font-bold text-lg text-plum">
                  Attendance &amp; Authorised Wi-Fi Settings
                </h3>
                <p className="text-xs text-neutralMuted mt-0.5">
                  Configure workplace geofence radius and authorized Wi-Fi network policy for {workplace.name}.
                </p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-neutralMuted hover:text-plum p-1"
              >
                &times;
              </button>
            </div>

            {/* Authoritative Workplace Overview Card */}
            <div className="p-3.5 bg-cream-muted/70 rounded-xl border border-cream-border mb-4 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutralMuted">Assigned Boutique Branch:</span>
                <span className="font-bold text-plum">{workplace.name} ({workplace.code})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutralMuted">Default Authorised SSID:</span>
                <span className="font-mono font-bold text-gold-800">{workplace.wifiSsid || DEFAULT_AUTHORIZED_SSID}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutralMuted">Last Configuration Update:</span>
                <span className="font-mono text-[11px] text-neutralMuted">
                  {workplace.updatedAt
                    ? new Date(workplace.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
                    : "Baseline configuration"}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* Authorised Network Status */}
              <div>
                <label className="block text-xs font-semibold text-plum mb-1">
                  Authorised Network Verification Status
                </label>
                <select
                  value={editActive ? "ACTIVE" : "INACTIVE"}
                  onChange={(e) => setEditActive(e.target.value === "ACTIVE")}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-semibold"
                >
                  <option value="ACTIVE">Active (Strict Attendance Verification Enforced)</option>
                  <option value="INACTIVE">Inactive (Temporarily Suspended for Maintenance)</option>
                </select>
              </div>

              {/* Wi-Fi SSID & BSSID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Authorised Wi-Fi SSID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={DEFAULT_AUTHORIZED_SSID}
                    value={editSsid}
                    onChange={(e) => setEditSsid(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-neutralMuted">Default: {DEFAULT_AUTHORIZED_SSID}</span>
                </div>


                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Registered Router BSSID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 00:14:22:01:45:10 (or blank)"
                    value={editBssid}
                    onChange={(e) => setEditBssid(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono"
                  />
                  <span className="text-[10px] text-neutralMuted">Leave blank if unknown</span>
                </div>
              </div>

              {/* Policy */}
              <div>
                <label className="block text-xs font-semibold text-plum mb-1">
                  Workplace Verification Strategy Policy
                </label>
                <select
                  value={editPolicy}
                  onChange={(e) => setEditPolicy(e.target.value)}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-semibold"
                >
                  <option value="GPS_AND_WIFI">GPS + Workplace Wi-Fi (Strict Dual-Factor)</option>
                  <option value="GPS_ONLY">GPS Geofencing Only</option>
                  <option value="WIFI_ONLY">Workplace Wi-Fi / LAN Only</option>
                  <option value="GPS_OR_WIFI">GPS OR Workplace Wi-Fi (Either Pass)</option>
                </select>
              </div>

              {/* Coordinates with Live GPS Acquisition */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-plum">Geographic Coordinates</span>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocationForBranch}
                    className="text-[11px] text-gold-700 hover:text-gold-900 font-semibold underline flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3 text-gold-600" />
                    Use Device Location
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutralMuted mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={editLat}
                      onChange={(e) => setEditLat(parseFloat(e.target.value))}
                      required
                      className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutralMuted mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={editLon}
                      onChange={(e) => setEditLon(parseFloat(e.target.value))}
                      required
                      className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Geofence Type */}
              <div>
                <label className="block text-xs font-semibold text-plum mb-1">
                  Workplace Geofence Geometry Model
                </label>
                <select
                  value={editGeofenceType}
                  onChange={(e) => setEditGeofenceType(e.target.value as "CIRCLE" | "POLYGON")}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-semibold"
                >
                  <option value="CIRCLE">Circular Perimeter (Center Point + Radius in Metres)</option>
                  <option value="POLYGON">Polygon Boundary (Convex Hull / Store Footprint)</option>
                </select>
              </div>

              {/* Mandatory BSSID Toggle with Disclosure */}
              <div className="p-3 bg-cream-muted/50 rounded-xl border border-cream-border text-xs">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRequireBssid}
                    onChange={(e) => setEditRequireBssid(e.target.checked)}
                    className="mt-0.5 rounded text-gold-600 focus:ring-gold-500"
                  />
                  <div>
                    <span className="font-semibold text-plum block">
                      Enforce Mandatory Router Hardware MAC (BSSID) Matching
                    </span>
                    <span className="text-[10px] text-neutralMuted leading-tight block mt-0.5">
                      Note: Standard web browsers cannot expose router MAC addresses due to W3C sandboxing. Leave unchecked for browser web access (presence verified via LAN challenge + SSID + GPS). Only check if using dedicated native hardware/kiosk MDM agents.
                    </span>
                  </div>
                </label>
              </div>

              {/* Tolerances */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Geofence Radius (metres)
                  </label>
                  <input
                    type="number"
                    min="25"
                    max="1000"
                    value={editRadius}
                    onChange={(e) => setEditRadius(parseFloat(e.target.value))}
                    required
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono"
                  />
                  <span className="text-[10px] text-neutralMuted">Default: 150m</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Max GPS Accuracy Threshold (metres)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    value={editAccuracy}
                    onChange={(e) => setEditAccuracy(parseFloat(e.target.value))}
                    required
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono"
                  />
                  <span className="text-[10px] text-neutralMuted">Default: 50m</span>
                </div>
              </div>

              <div className="pt-3 border-t border-cream-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-3 py-1.5 text-xs text-neutralMuted font-semibold hover:bg-cream/40 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white font-semibold text-xs rounded-lg shadow-sm"
                >
                  {savingSettings ? "Saving Settings..." : "Save Attendance Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
