"use client";

import React, { useState, useEffect } from "react";
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
  Wifi,
  MapPin,
  Building2,
  Sliders,
  Save,
  Clock,
  ShieldCheck,
  Plus,
  Trash2,
  Crosshair,
  HelpCircle,
  Navigation,
  Globe,
} from "lucide-react";
import { DEFAULT_AUTHORIZED_SSID } from "@/lib/bakery-categories";
import { useOutlet } from "@/context/OutletContext";

interface Point {
  latitude: number;
  longitude: number;
}

interface BranchSetting {
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
  wifiSsid: string | null;
  wifiBssid: string | null;
  requireBssidVerification?: boolean;
  secondaryBssids?: string | null;
  active: boolean;
  updatedAt?: string;
}

export default function SettingsPage() {
  const { selectedOutletCode, selectedOutletId, setOutletId, refreshOutlets } = useOutlet();

  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  // Branches Wi-Fi & Geofence Settings State
  const [branches, setBranches] = useState<BranchSetting[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [editSsid, setEditSsid] = useState(DEFAULT_AUTHORIZED_SSID);
  const [editBssid, setEditBssid] = useState("");
  const [editRequireBssid, setEditRequireBssid] = useState(false);
  const [editSecondaryBssids, setEditSecondaryBssids] = useState("");
  const [editPolicy, setEditPolicy] = useState("GPS_AND_WIFI");
  const [editGeofenceType, setEditGeofenceType] = useState<"CIRCLE" | "POLYGON">("POLYGON");
  const [editRadius, setEditRadius] = useState(150);
  const [editAccuracy, setEditAccuracy] = useState(50);
  const [editMaxAge, setEditMaxAge] = useState(60);
  const [editActive, setEditActive] = useState(true);
  const [editLat, setEditLat] = useState(12.9784);
  const [editLng, setEditLng] = useState(77.6408);
  const [editPoints, setEditPoints] = useState<Point[]>([]);
  const [savingBranch, setSavingBranch] = useState(false);
  const [branchSaveSuccess, setBranchSaveSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Add Outlet Modal State
  const [showAddOutletModal, setShowAddOutletModal] = useState(false);
  const [newOutletName, setNewOutletName] = useState("");
  const [newOutletCode, setNewOutletCode] = useState("");
  const [newOutletAddress, setNewOutletAddress] = useState("");
  const [newOutletLat, setNewOutletLat] = useState<number>(12.99023);
  const [newOutletLng, setNewOutletLng] = useState<number>(77.68781);
  const [newOutletRadius, setNewOutletRadius] = useState<number>(150);
  const [newOutletSsid, setNewOutletSsid] = useState<string>(DEFAULT_AUTHORIZED_SSID);
  const [creatingOutlet, setCreatingOutlet] = useState(false);
  const [createOutletError, setCreateOutletError] = useState<string | null>(null);

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const res = await fetch("/api/attendance/settings");
      if (res.ok) {
        const data = await res.json();
        const bList: BranchSetting[] = data.branches || [];
        setBranches(bList);
        if (bList.length > 0) {
          let target = bList[0];
          if (selectedOutletCode && selectedOutletCode !== "ALL") {
            const found = bList.find((b) => b.code.toUpperCase() === selectedOutletCode.toUpperCase() || b.id === selectedOutletId);
            if (found) target = found;
          }
          populateForm(target);
        }
      }
    } catch (e) {
      console.error("Failed to fetch branch settings", e);
    } finally {
      setLoadingBranches(false);
    }
  };

  const populateForm = (b: BranchSetting) => {
    setSelectedBranchId(b.id);
    setEditSsid(b.wifiSsid || DEFAULT_AUTHORIZED_SSID);
    setEditBssid(b.wifiBssid || "");
    setEditRequireBssid(Boolean(b.requireBssidVerification));
    try {
      if (b.secondaryBssids) {
        const parsed = JSON.parse(b.secondaryBssids);
        setEditSecondaryBssids(Array.isArray(parsed) ? parsed.join(", ") : b.secondaryBssids);
      } else {
        setEditSecondaryBssids("");
      }
    } catch {
      setEditSecondaryBssids(b.secondaryBssids || "");
    }
    setEditPolicy(b.wifiVerificationPolicy || "GPS_AND_WIFI");
    setEditGeofenceType(b.geofenceType || "CIRCLE");
    setEditRadius(b.geofenceRadiusMeters || 150);
    setEditAccuracy(b.maxGpsAccuracyMeters || 50);
    setEditMaxAge(b.maxLocationAgeSeconds || 60);
    setEditActive(b.active !== false);
    setEditLat(b.latitude);
    setEditLng(b.longitude);

    try {
      const parsedPoints = b.geofencePolygonJson ? JSON.parse(b.geofencePolygonJson) : [];
      if (Array.isArray(parsedPoints) && parsedPoints.length >= 3) {
        setEditPoints(parsedPoints);
      } else {
        // Initialize 4-vertex bounding box around branch center (~100m)
        setEditPoints([
          { latitude: Number((b.latitude + 0.0007).toFixed(5)), longitude: Number((b.longitude - 0.0007).toFixed(5)) },
          { latitude: Number((b.latitude + 0.0007).toFixed(5)), longitude: Number((b.longitude + 0.0007).toFixed(5)) },
          { latitude: Number((b.latitude - 0.0007).toFixed(5)), longitude: Number((b.longitude + 0.0007).toFixed(5)) },
          { latitude: Number((b.latitude - 0.0007).toFixed(5)), longitude: Number((b.longitude - 0.0007).toFixed(5)) },
        ]);
      }
    } catch {
      setEditPoints([]);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.role) setCurrentUserRole(d.user.role);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (branches.length > 0 && selectedOutletCode && selectedOutletCode !== "ALL") {
      const found = branches.find(
        (b) => b.code.toUpperCase() === selectedOutletCode.toUpperCase() || b.id === selectedOutletId
      );
      if (found && found.id !== selectedBranchId) {
        populateForm(found);
      }
    }
  }, [selectedOutletCode, branches]);

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletName.trim() || !newOutletCode.trim()) {
      setCreateOutletError("Outlet name and 3-letter code are required.");
      return;
    }

    try {
      setCreatingOutlet(true);
      setCreateOutletError(null);
      const res = await fetch("/api/attendance/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOutletName.trim(),
          code: newOutletCode.trim().toUpperCase(),
          address: newOutletAddress.trim() || `${newOutletName.trim()}, Bengaluru`,
          latitude: Number(newOutletLat),
          longitude: Number(newOutletLng),
          geofenceRadiusMeters: Number(newOutletRadius),
          wifiSsid: newOutletSsid.trim() || DEFAULT_AUTHORIZED_SSID,
          active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateOutletError(data.error || "Failed to create outlet.");
      } else {
        setShowAddOutletModal(false);
        setNewOutletName("");
        setNewOutletCode("");
        setNewOutletAddress("");
        await fetchBranches();
        await refreshOutlets();
        if (data.branch?.id) {
          setSelectedBranchId(data.branch.id);
          populateForm(data.branch);
          if (data.branch.code) setOutletId(data.branch.code);
        }
        setBranchSaveSuccess(`Outlet "${data.branch?.name || "New Outlet"}" created successfully!`);
      }
    } catch (err: any) {
      setCreateOutletError(err.message || "Network error creating outlet.");
    } finally {
      setCreatingOutlet(false);
    }
  };

  const handleSelectBranch = (branchId: string) => {
    setBranchSaveSuccess(null);
    const b = branches.find((item) => item.id === branchId);
    if (b) {
      populateForm(b);
      setOutletId(b.code);
    }
  };

  const handleAddPoint = () => {
    if (editPoints.length === 0) {
      setEditPoints([{ latitude: editLat, longitude: editLng }]);
    } else {
      const last = editPoints[editPoints.length - 1];
      setEditPoints([
        ...editPoints,
        {
          latitude: Number((last.latitude + 0.0002).toFixed(5)),
          longitude: Number((last.longitude + 0.0002).toFixed(5)),
        },
      ]);
    }
  };

  const handleUpdatePoint = (index: number, field: "latitude" | "longitude", value: string) => {
    const num = parseFloat(value);
    const updated = [...editPoints];
    updated[index] = {
      ...updated[index],
      [field]: isNaN(num) ? 0 : num,
    };
    setEditPoints(updated);
  };

  const handleRemovePoint = (index: number) => {
    if (editPoints.length <= 3) {
      alert("A polygon geofence requires at least 3 vertices.");
      return;
    }
    setEditPoints(editPoints.filter((_, i) => i !== index));
  };

  const handleAddressSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase();
    if (query.includes("indiranagar") || query.includes("100 feet")) {
      setEditLat(12.9784);
      setEditLng(77.6408);
      setBranchSaveSuccess("Found: Indiranagar 100 Feet Road (12.9784, 77.6408). Updated pin.");
    } else if (query.includes("koramangala") || query.includes("80 feet")) {
      setEditLat(12.9352);
      setEditLng(77.6245);
      setBranchSaveSuccess("Found: Koramangala 80 Feet Road (12.9352, 77.6245). Updated pin.");
    } else if (query.includes("whitefield") || query.includes("itpl")) {
      setEditLat(12.9698);
      setEditLng(77.7499);
      setBranchSaveSuccess("Found: Whitefield ITPL Main Road (12.9698, 77.7499). Updated pin.");
    } else {
      setBranchSaveSuccess(`Simulated geocoding for "${searchQuery}". Coordinates centered on Bengaluru luxury district.`);
      setEditLat(12.975);
      setEditLng(77.635);
    }
  };

  const handleSaveBranchSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;

    if (editGeofenceType === "POLYGON" && editPoints.length < 3) {
      alert("Polygon geofence requires at least 3 vertices.");
      return;
    }

    try {
      setSavingBranch(true);
      setBranchSaveSuccess(null);

      // Parse secondary BSSIDs into clean JSON array
      const secBssidsArray = editSecondaryBssids
        ? editSecondaryBssids
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const res = await fetch("/api/attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId,
          latitude: editLat,
          longitude: editLng,
          geofenceType: editGeofenceType,
          geofenceRadiusMeters: editRadius,
          geofencePolygonJson: JSON.stringify(editPoints),
          maxGpsAccuracyMeters: editAccuracy,
          maxLocationAgeSeconds: editMaxAge,
          wifiVerificationPolicy: editPolicy,
          wifiSsid: editSsid.trim(),
          wifiBssid: editBssid ? editBssid.trim() : null,
          requireBssidVerification: editRequireBssid,
          secondaryBssids: JSON.stringify(secBssidsArray),
          active: editActive,
        }),
      });

      if (res.ok) {
        setBranchSaveSuccess("Workplace branch Wi-Fi, GPS geofence & BSSID settings updated successfully!");
        fetchBranches();
        refreshOutlets();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update branch settings.");
      }
    } catch (err) {
      alert("Network error updating branch settings.");
    } finally {
      setSavingBranch(false);
    }
  };

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

  const currentBranch = branches.find((b) => b.id === selectedBranchId);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200 max-w-5xl">
      {/* Header */}
      <div className="pb-4 border-b border-cream-border">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
          Platform Administration
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-plum tracking-tight mt-0.5">
          Workplace Attendance &amp; System Settings
        </h1>
        <p className="text-xs text-cocoa/80 mt-1">
          Manage authoritative workplace Wi-Fi configurations, polygon &amp; circular GPS geofences, and operational parameters.
        </p>
      </div>

      {/* SECTION: Authorised Wi-Fi & Attendance Administration Card */}
      <div className="bg-white rounded-2xl border border-gold-300 p-6 shadow-luxury">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-cream-border mb-5">
          <div className="flex items-center gap-2.5 text-plum">
            <div className="p-2 bg-gold-100 rounded-xl text-gold-800">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-plum">
                Authorised Workplace Wi-Fi &amp; Geofence Administration
              </h3>
              <p className="text-xs text-cocoa/70">
                Configure authorized workplace Wi-Fi SSIDs, router BSSID requirements, and precise circular or polygon GPS geofences.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-muted border border-gold-300 text-xs font-semibold text-plum">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-600" />
            Authorised Access Only
          </span>
        </div>

        {/* Branch Selector Tabs */}
        {loadingBranches ? (
          <div className="py-8 text-center text-xs text-neutralMuted">Loading boutique branches...</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelectBranch(b.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    selectedBranchId === b.id
                      ? "bg-plum text-gold-300 shadow-md ring-1 ring-gold-400"
                      : "bg-cream-muted text-neutralMuted hover:bg-cream hover:text-plum border border-cream-border"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{b.name}</span>
                  <span className="font-mono text-[10px] opacity-75">({b.code})</span>
                </button>
              ))}

              {currentUserRole === "OWNER" && (
                <button
                  type="button"
                  onClick={() => {
                    setCreateOutletError(null);
                    setShowAddOutletModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 bg-gold-100 text-gold-900 hover:bg-gold-200 border border-gold-300 ml-auto flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Outlet</span>
                </button>
              )}
            </div>

            {currentBranch && (
              <form onSubmit={handleSaveBranchSettings} className="space-y-5">
                {/* Authoritative Information Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-cream-muted/50 rounded-xl border border-cream-border text-xs">
                  <div>
                    <span className="text-[10px] text-neutralMuted block">Assigned Boutique Branch</span>
                    <strong className="text-plum font-semibold">{currentBranch.name}</strong>
                    <span className="text-[10px] text-cocoa/70 block">{currentBranch.address}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutralMuted block">Default Authorised Network</span>
                    <strong className="text-gold-900 font-mono text-sm block">
                      {currentBranch.wifiSsid || DEFAULT_AUTHORIZED_SSID}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-semibold">Standard Authorised SSID</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutralMuted block">Last Configuration Update</span>
                    <span className="font-mono text-[11px] text-plum block">
                      {currentBranch.updatedAt
                        ? new Date(currentBranch.updatedAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Baseline configuration"}
                    </span>
                    <span className="text-[10px] text-neutralMuted">Protected by audit trail</span>
                  </div>
                </div>

                {/* Sub-section: Address Search & Pin Adjustment */}
                <div className="p-4 rounded-xl bg-cream border border-cream-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-plum flex items-center gap-1.5">
                      <Crosshair className="w-4 h-4 text-gold-700" />
                      Branch Location Coordinates &amp; Pin Adjustment
                    </span>
                    <span className="text-[11px] text-neutralMuted font-mono">
                      Pin: {editLat.toFixed(5)}, {editLng.toFixed(5)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search address or district (e.g. 100 Feet Road Indiranagar, Koramangala)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 p-2 bg-white border border-cream-border rounded-lg text-xs font-medium focus:outline-none focus:border-gold-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddressSearch}
                      className="px-3.5 py-2 bg-plum text-gold-300 font-semibold text-xs rounded-lg hover:bg-plum-900 transition-colors flex items-center gap-1"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Adjust Pin</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-plum mb-0.5">Latitude Pin</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={editLat}
                        onChange={(e) => setEditLat(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-cream-border rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-plum mb-0.5">Longitude Pin</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={editLng}
                        onChange={(e) => setEditLng(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-cream-border rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-section: Geofence Type Selector (Polygon vs Circle) */}
                <div className="p-4 rounded-xl bg-white border border-cream-border space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-cream-border">
                    <div>
                      <span className="text-xs font-bold text-plum block">Geofence Geometry Model</span>
                      <span className="text-[11px] text-cocoa/70">
                        Choose between circular radial perimeter or arbitrary polygon boundary for attendance validation.
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-cream-muted p-1 rounded-xl border border-cream-border">
                      <button
                        type="button"
                        onClick={() => setEditGeofenceType("POLYGON")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          editGeofenceType === "POLYGON"
                            ? "bg-plum text-gold-300 shadow-sm"
                            : "text-neutralMuted hover:text-plum"
                        }`}
                      >
                        Polygon Geofence (Ray-Casting)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditGeofenceType("CIRCLE")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          editGeofenceType === "CIRCLE"
                            ? "bg-plum text-gold-300 shadow-sm"
                            : "text-neutralMuted hover:text-plum"
                        }`}
                      >
                        Circular Geofence (Haversine)
                      </button>
                    </div>
                  </div>

                  {editGeofenceType === "POLYGON" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-plum">Polygon Vertices ({editPoints.length} points)</span>
                          <span className="text-[10px] text-neutralMuted block">
                            At least 3 vertices required. Points form a closed bounding polygon.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddPoint}
                          className="px-2.5 py-1.5 bg-gold-100 hover:bg-gold-200 text-gold-900 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Vertex</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {editPoints.map((pt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-cream-muted/60 rounded-lg border border-cream-border text-xs"
                          >
                            <span className="w-6 font-bold text-neutralMuted text-center font-mono">#{idx + 1}</span>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-neutralMuted">Lat:</span>
                                <input
                                  type="number"
                                  step="0.00001"
                                  value={pt.latitude}
                                  onChange={(e) => handleUpdatePoint(idx, "latitude", e.target.value)}
                                  className="w-full p-1 bg-white border border-cream-border rounded font-mono text-[11px]"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-neutralMuted">Lng:</span>
                                <input
                                  type="number"
                                  step="0.00001"
                                  value={pt.longitude}
                                  onChange={(e) => handleUpdatePoint(idx, "longitude", e.target.value)}
                                  className="w-full p-1 bg-white border border-cream-border rounded font-mono text-[11px]"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePoint(idx)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              title="Delete point"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {editPoints.length < 3 ? (
                        <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                          ⚠️ Polygon requires at least 3 vertices to form a valid boundary.
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Polygon boundary valid with {editPoints.length} vertices. Ray-Casting algorithm will enforce containment.</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-plum mb-1">
                          Circular Radius (metres)
                        </label>
                        <input
                          type="number"
                          min="25"
                          max="2000"
                          value={editRadius}
                          onChange={(e) => setEditRadius(parseFloat(e.target.value) || 150)}
                          className="w-full p-2.5 bg-white border border-cream-border rounded-lg text-xs font-mono font-bold focus:border-gold-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-neutralMuted">Configurable default: 150m</span>
                      </div>
                      <div className="p-3 bg-cream-muted rounded-lg border border-cream-border text-xs flex flex-col justify-center">
                        <span className="font-semibold text-plum">Haversine Great-Circle Distance</span>
                        <span className="text-[11px] text-cocoa/70 mt-0.5">
                          Evaluates Euclidean sphere distance from pin ({editLat.toFixed(4)}, {editLng.toFixed(4)}).
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-section: Wi-Fi, BSSID & Tolerances Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-plum mb-1">
                      Authorised Wi-Fi SSID *
                    </label>
                    <input
                      type="text"
                      required
                      value={editSsid}
                      onChange={(e) => setEditSsid(e.target.value)}
                      className="w-full p-2.5 bg-white border border-cream-border rounded-lg text-xs font-mono font-bold focus:border-gold-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-neutralMuted">Default standard: {DEFAULT_AUTHORIZED_SSID}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-plum mb-1">
                      Verification Policy Strategy
                    </label>
                    <select
                      value={editPolicy}
                      onChange={(e) => setEditPolicy(e.target.value)}
                      className="w-full p-2.5 bg-white border border-cream-border rounded-lg text-xs font-semibold focus:border-gold-500 focus:outline-none"
                    >
                      <option value="GPS_AND_WIFI">GPS + Workplace Wi-Fi (Strict Dual-Factor)</option>
                      <option value="GPS_ONLY">GPS Geofencing Only</option>
                      <option value="WIFI_ONLY">Workplace Wi-Fi / LAN Only</option>
                      <option value="GPS_OR_WIFI">GPS OR Workplace Wi-Fi (Either Pass)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-plum mb-1">
                      Primary Registered Router BSSID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 00:14:22:01:45:10 (Leave blank if not registered)"
                      value={editBssid}
                      onChange={(e) => setEditBssid(e.target.value)}
                      className="w-full p-2.5 bg-white border border-cream-border rounded-lg text-xs font-mono focus:border-gold-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-neutralMuted">
                      Leave blank if hardware MAC inspection is not active.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-plum mb-1">
                      Secondary Approved BSSIDs / APs (Comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 00:11:22:33:44:55, aa:bb:cc:dd:ee:ff"
                      value={editSecondaryBssids}
                      onChange={(e) => setEditSecondaryBssids(e.target.value)}
                      className="w-full p-2.5 bg-white border border-cream-border rounded-lg text-xs font-mono focus:border-gold-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-neutralMuted">
                      Supports multiple access points for multi-story stores.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-plum mb-1">
                      Max GPS Accuracy Tolerance (metres)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={editAccuracy}
                      onChange={(e) => setEditAccuracy(parseFloat(e.target.value) || 50)}
                      className="w-full p-2.5 bg-white border border-cream-border rounded-lg text-xs font-mono focus:border-gold-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-neutralMuted">Threshold default: 50m</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-plum mb-1">
                      Max Location Freshness Age (seconds)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={editMaxAge}
                      onChange={(e) => setEditMaxAge(parseInt(e.target.value, 10) || 60)}
                      className="w-full p-2.5 bg-white border border-cream-border rounded-lg text-xs font-mono focus:border-gold-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-neutralMuted">Rejects stale client timestamps (&gt;60s)</span>
                  </div>
                </div>

                {/* Checkbox: Enforce Mandatory BSSID Verification */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="bssid-req"
                      checked={editRequireBssid}
                      onChange={(e) => setEditRequireBssid(e.target.checked)}
                      className="w-4 h-4 rounded text-gold-600 focus:ring-gold-500 border-gray-300"
                    />
                    <label htmlFor="bssid-req" className="text-xs font-semibold text-amber-950 cursor-pointer">
                      Enforce Mandatory Router BSSID Verification
                    </label>
                  </div>
                  <span className="text-[11px] text-amber-800">
                    {editRequireBssid ? "Strict Hardware BSSID Required" : "Optional (BSSID checked only if supplied)"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-cream-border">
                  <div className="text-xs text-neutralMuted font-mono">
                    Mode: {editGeofenceType} | SSID: {editSsid}
                  </div>

                  <button
                    type="submit"
                    disabled={savingBranch}
                    className="px-5 py-2.5 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-serif font-bold text-xs shadow-gold transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingBranch ? "Saving Settings..." : "Save Workplace Geofence & Wi-Fi Configuration"}</span>
                  </button>
                </div>

                {branchSaveSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{branchSaveSuccess}</span>
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </div>

      {/* System Specifications Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-xl border border-cream-border shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-gold-700">
            <Server className="w-4 h-4" />
            <h4 className="font-serif font-bold text-sm text-plum">
              Application &amp; Runtime
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
              Relational Storage &amp; Time
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
          <h3 className="font-bold text-base">
            Restore Deterministic Demo Dataset
          </h3>
        </div>

        <p className="text-xs text-cocoa leading-relaxed mb-4">
          This operation resets all operational tables (tasks, attendance punches, stock movements, and audit records) and re-seeds the exact deterministic baseline dataset (3 branches with <strong>{DEFAULT_AUTHORIZED_SSID}</strong> Wi-Fi, 12 employees, 18 luxury confectionery products, 10 SOPs, 10 discrepancy scenarios).
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

      {/* Modal: Add Workplace Outlet (Owner Only) */}
      {showAddOutletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="bg-white rounded-2xl border border-gold-300 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cream-border">
              <div className="flex items-center gap-2 text-plum">
                <Building2 className="w-5 h-5 text-gold-700" />
                <h3 className="font-serif font-bold text-lg text-plum">Add New Workplace Outlet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOutletModal(false)}
                className="text-cocoa/60 hover:text-plum p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOutlet} className="space-y-4">
              {createOutletError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {createOutletError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Outlet Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mahadevapura"
                    value={newOutletName}
                    onChange={(e) => setNewOutletName(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-medium text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Branch Code (3 Letters)</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="e.g. MHD"
                    value={newOutletCode}
                    onChange={(e) => setNewOutletCode(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono font-bold text-plum uppercase focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Workplace Address</label>
                <input
                  type="text"
                  placeholder="e.g. Outer Ring Road, Mahadevapura, Bengaluru"
                  value={newOutletAddress}
                  onChange={(e) => setNewOutletAddress(e.target.value)}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-medium text-plum focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Latitude Pin</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={newOutletLat}
                    onChange={(e) => setNewOutletLat(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Longitude Pin</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={newOutletLng}
                    onChange={(e) => setNewOutletLng(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Geofence Radius (meters)</label>
                  <input
                    type="number"
                    min={20}
                    max={1000}
                    required
                    value={newOutletRadius}
                    onChange={(e) => setNewOutletRadius(parseInt(e.target.value) || 150)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Authorised Wi-Fi SSID</label>
                  <input
                    type="text"
                    required
                    value={newOutletSsid}
                    onChange={(e) => setNewOutletSsid(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-cream-border">
                <button
                  type="button"
                  onClick={() => setShowAddOutletModal(false)}
                  className="px-4 py-2 bg-cream-muted text-cocoa font-semibold text-xs rounded-lg hover:bg-cream border border-cream-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOutlet}
                  className="px-4 py-2 bg-gold-600 hover:bg-gold-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{creatingOutlet ? "Creating Outlet..." : "Create Workplace Outlet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
