"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Wifi,
  ShieldCheck,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Navigation,
  Globe,
  RefreshCw,
  Search,
  Check,
  ArrowRight,
  Users,
} from "lucide-react";
import { DEFAULT_AUTHORIZED_SSID } from "@/lib/bakery-categories";
import { useOutlet } from "@/context/OutletContext";

interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  geofenceType?: "CIRCLE" | "POLYGON";
  geofenceRadiusMeters: number;
  maxGpsAccuracyMeters: number;
  maxLocationAgeSeconds?: number;
  wifiVerificationPolicy: string;
  wifiSsid: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function OutletsManagementPage() {
  const { refreshOutlets, selectedOutletCode, setOutletId } = useOutlet();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Add Outlet Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addLat, setAddLat] = useState<number>(12.99023);
  const [addLng, setAddLng] = useState<number>(77.68781);
  const [addRadius, setAddRadius] = useState<number>(150);
  const [addSsid, setAddSsid] = useState<string>(DEFAULT_AUTHORIZED_SSID);
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit Outlet Modal
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLat, setEditLat] = useState<number>(12.99023);
  const [editLng, setEditLng] = useState<number>(77.68781);
  const [editRadius, setEditRadius] = useState<number>(150);
  const [editSsid, setEditSsid] = useState<string>(DEFAULT_AUTHORIZED_SSID);
  const [editActive, setEditActive] = useState<boolean>(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/branches?includeInactive=true");
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch (e) {
      console.error("Failed to fetch branches", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.role) setUserRole(d.user.role);
      })
      .catch(() => {});
  }, []);

  const handleOpenEdit = (b: Branch) => {
    setEditingBranch(b);
    setEditName(b.name);
    setEditAddress(b.address);
    setEditLat(b.latitude);
    setEditLng(b.longitude);
    setEditRadius(b.geofenceRadiusMeters);
    setEditSsid(b.wifiSsid || DEFAULT_AUTHORIZED_SSID);
    setEditActive(b.active);
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addCode.trim()) {
      setMessage({ text: "Outlet name and 3-letter code are required.", type: "error" });
      return;
    }

    try {
      setSavingAdd(true);
      setMessage(null);
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          code: addCode.trim().toUpperCase(),
          address: addAddress.trim() || `${addName.trim()}, Bengaluru`,
          latitude: Number(addLat),
          longitude: Number(addLng),
          geofenceRadiusMeters: Number(addRadius),
          wifiSsid: addSsid.trim() || DEFAULT_AUTHORIZED_SSID,
          active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Failed to create outlet.", type: "error" });
      } else {
        setShowAddModal(false);
        setAddName("");
        setAddCode("");
        setAddAddress("");
        setMessage({ text: `Outlet "${data.branch?.name}" created successfully!`, type: "success" });
        await fetchBranches();
        await refreshOutlets();
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Network error creating outlet.", type: "error" });
    } finally {
      setSavingAdd(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    try {
      setSavingEdit(true);
      setMessage(null);
      const res = await fetch(`/api/branches/${editingBranch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          address: editAddress.trim(),
          latitude: Number(editLat),
          longitude: Number(editLng),
          geofenceRadiusMeters: Number(editRadius),
          wifiSsid: editSsid.trim() || DEFAULT_AUTHORIZED_SSID,
          active: editActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Failed to update outlet.", type: "error" });
      } else {
        setEditingBranch(null);
        setMessage({ text: `Outlet "${data.branch?.name}" updated successfully!`, type: "success" });
        await fetchBranches();
        await refreshOutlets();
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Network error updating outlet.", type: "error" });
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredBranches = branches.filter((b) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Workplace Management & Locations
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-plum tracking-tight mt-0.5">
            Outlets &amp; Boutiques
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Authoritative registry of artisanal chocolate boutiques, geographic pin coordinates, dual-factor Wi-Fi &amp; geofence perimeters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBranches}
            className="p-2 rounded-lg bg-white border border-cream-border text-cocoa hover:text-plum hover:bg-cream transition-colors"
            title="Refresh outlets list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {userRole === "OWNER" && (
            <button
              onClick={() => {
                setMessage(null);
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-plum font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Workplace Outlet</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert banner */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
              : "bg-rose-50 text-rose-900 border border-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-cream-border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutralMuted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by outlet name, code, or address..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </div>
        <div className="text-xs text-neutralMuted font-medium">
          Showing <strong className="text-plum font-bold">{filteredBranches.length}</strong> registered outlets
        </div>
      </div>

      {/* Outlets Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-neutralMuted">
          Loading boutique outlets registry...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBranches.map((b) => (
            <div
              key={b.id}
              className={`bg-white rounded-2xl border p-5 shadow-luxury transition-all relative ${
                b.code === "MHD"
                  ? "border-gold-400 ring-1 ring-gold-400/50 bg-gradient-to-br from-white to-gold-50/20"
                  : "border-cream-border"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-cream-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-plum text-gold-300 flex items-center justify-center font-serif font-black text-sm shadow-sm">
                    {b.code}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-plum leading-snug">
                      {b.name}
                    </h3>
                    <span className="text-[11px] text-cocoa/70 block">{b.address}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      b.active
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-neutral-100 text-neutral-600 border border-neutral-300"
                    }`}
                  >
                    {b.active ? "Active" : "Inactive"}
                  </span>

                  {userRole === "OWNER" && (
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1.5 rounded-lg text-neutralMuted hover:text-plum hover:bg-cream-muted transition-colors"
                      title="Edit Outlet Settings"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Geographic Coordinates & Pin */}
              <div className="grid grid-cols-2 gap-3 py-3 border-b border-cream-border text-xs">
                <div>
                  <span className="text-[10px] text-neutralMuted uppercase tracking-wider block font-semibold">
                    Geographic Coordinates
                  </span>
                  <div className="flex items-center gap-1 mt-0.5 font-mono font-bold text-plum">
                    <MapPin className="w-3.5 h-3.5 text-gold-700 shrink-0" />
                    <span>
                      {b.latitude.toFixed(5)}° N, {b.longitude.toFixed(5)}° E
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-neutralMuted uppercase tracking-wider block font-semibold">
                    Geofence Perimeter
                  </span>
                  <div className="flex items-center gap-1 mt-0.5 font-mono text-plum font-semibold">
                    <Radio className="w-3.5 h-3.5 text-gold-700 shrink-0" />
                    <span>
                      {b.geofenceRadiusMeters}m radius ({b.geofenceType || "CIRCLE"})
                    </span>
                  </div>
                </div>
              </div>

              {/* Wi-Fi & Verification Parameters */}
              <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                <div>
                  <span className="text-[10px] text-neutralMuted uppercase tracking-wider block font-semibold">
                    Authorised Workplace Wi-Fi
                  </span>
                  <div className="flex items-center gap-1 mt-0.5 font-mono font-bold text-gold-900">
                    <Wifi className="w-3.5 h-3.5 text-gold-700 shrink-0" />
                    <span>{b.wifiSsid || DEFAULT_AUTHORIZED_SSID}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-neutralMuted uppercase tracking-wider block font-semibold">
                    Verification Policy
                  </span>
                  <div className="flex items-center gap-1 mt-0.5 font-semibold text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{b.wifiVerificationPolicy.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </div>

              {b.code === "MHD" && (
                <div className="mt-3 pt-2.5 border-t border-gold-200 text-[11px] text-gold-900 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exact target coordinates verified: 12.99023° N, 77.68781° E</span>
                </div>
              )}

              {/* Staff Roster & Scope Switcher Bar */}
              <div className="mt-3 pt-3 border-t border-cream-border flex items-center justify-between gap-2">
                <Link
                  href={`/dashboard/employees`}
                  className="text-[11px] font-semibold text-cocoa hover:text-gold-700 flex items-center gap-1 transition-colors"
                  title="View Boutique Personnel"
                >
                  <Users className="w-3.5 h-3.5 text-gold-600" />
                  <span>Personnel Roster</span>
                </Link>

                {selectedOutletCode === b.code ? (
                  <span className="px-2.5 py-1 rounded-lg bg-plum text-gold-300 font-bold text-[11px] flex items-center gap-1.5 shadow-sm">
                    <Check className="w-3 h-3 text-gold-400" />
                    Currently Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOutletId(b.code)}
                    className="px-2.5 py-1 rounded-lg bg-cream-muted hover:bg-gold-500 hover:text-plum border border-gold-300 text-plum font-semibold text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <span>Switch to this Outlet</span>
                    <ArrowRight className="w-3 h-3 text-gold-700" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add New Workplace Outlet */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="bg-white rounded-2xl border border-gold-300 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cream-border">
              <div className="flex items-center gap-2 text-plum">
                <Building2 className="w-5 h-5 text-gold-700" />
                <h3 className="font-serif font-bold text-lg text-plum">Add New Workplace Outlet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-cocoa/60 hover:text-plum p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOutlet} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Outlet Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mahadevapura"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-medium text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Branch Code (3 Letters) *</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="e.g. MHD"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono font-bold text-plum uppercase focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Workplace Address</label>
                <input
                  type="text"
                  placeholder="e.g. Outer Ring Road, Mahadevapura, Bengaluru"
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-medium text-plum focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Latitude Pin *</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={addLat}
                    onChange={(e) => setAddLat(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Longitude Pin *</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={addLng}
                    onChange={(e) => setAddLng(parseFloat(e.target.value) || 0)}
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
                    value={addRadius}
                    onChange={(e) => setAddRadius(parseInt(e.target.value) || 150)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Authorised Wi-Fi SSID</label>
                  <input
                    type="text"
                    required
                    value={addSsid}
                    onChange={(e) => setAddSsid(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-cream-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-cream-muted text-cocoa font-semibold text-xs rounded-lg hover:bg-cream border border-cream-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-4 py-2 bg-gold-600 hover:bg-gold-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{savingAdd ? "Creating Outlet..." : "Create Workplace Outlet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Workplace Outlet */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="bg-white rounded-2xl border border-gold-300 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cream-border">
              <div className="flex items-center gap-2 text-plum">
                <Edit2 className="w-5 h-5 text-gold-700" />
                <h3 className="font-serif font-bold text-lg text-plum">
                  Edit Outlet: {editingBranch.name} ({editingBranch.code})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBranch(null)}
                className="text-cocoa/60 hover:text-plum p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Outlet Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-medium text-plum focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Workplace Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-medium text-plum focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={editLat}
                    onChange={(e) => setEditLat(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={editLng}
                    onChange={(e) => setEditLng(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Geofence Radius (m)</label>
                  <input
                    type="number"
                    min={20}
                    max={1000}
                    required
                    value={editRadius}
                    onChange={(e) => setEditRadius(parseInt(e.target.value) || 150)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">Authorised Wi-Fi SSID</label>
                  <input
                    type="text"
                    required
                    value={editSsid}
                    onChange={(e) => setEditSsid(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-plum mb-1">Status</label>
                <select
                  value={editActive ? "ACTIVE" : "INACTIVE"}
                  onChange={(e) => setEditActive(e.target.value === "ACTIVE")}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-semibold text-plum"
                >
                  <option value="ACTIVE">Active (Fully Operational)</option>
                  <option value="INACTIVE">Inactive (Suspended)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-cream-border">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-4 py-2 bg-cream-muted text-cocoa font-semibold text-xs rounded-lg hover:bg-cream border border-cream-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-plum hover:bg-plum-900 disabled:opacity-50 text-gold-300 font-semibold text-xs rounded-lg shadow-sm transition-colors"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
