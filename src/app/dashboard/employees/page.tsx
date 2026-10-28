"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  Building2,
  Shield,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Lock,
  Sparkles,
  UserCheck,
  Filter,
} from "lucide-react";
import { useOutlet } from "@/context/OutletContext";
import clsx from "clsx";

interface EmployeeItem {
  id: string;
  employeeCode: string;
  designation: string;
  joinedDate: string;
  emergencyContact: string | null;
  active: boolean;
  employmentStatus: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string | null;
    avatarUrl: string | null;
    active: boolean;
  };
  branch: {
    id: string;
    code: string;
    name: string;
    city: string;
    wifiSsid: string | null;
    active: boolean;
  };
}

export default function EmployeeManagementPage() {
  const { selectedOutletCode, branches } = useOutlet();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("MadamChoc2026!");
  const [addRole, setAddRole] = useState("EMPLOYEE");
  const [addBranchCode, setAddBranchCode] = useState("WHF");
  const [addDesignation, setAddDesignation] = useState("Confectionery Artisan");
  const [addPhone, setAddPhone] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);
  const [addMessage, setAddMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const outletParam = selectedOutletCode && selectedOutletCode !== "ALL" ? `?branchId=${selectedOutletCode}` : "";
      const res = await fetch(`/api/employees${outletParam}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (e) {
      console.error("Failed to load employees", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.role) setCurrentUserRole(d.user.role);
      })
      .catch(() => {});
  }, [selectedOutletCode]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.user.name.toLowerCase().includes(q) ||
        emp.user.email.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.branch.name.toLowerCase().includes(q);

      const matchesRole = roleFilter === "ALL" || emp.user.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && emp.active && emp.employmentStatus === "ACTIVE") ||
        (statusFilter === "INACTIVE" && (!emp.active || emp.employmentStatus !== "ACTIVE"));

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchQuery, roleFilter, statusFilter]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) {
      setAddMessage({ text: "Name, email, and password are required.", type: "error" });
      return;
    }

    try {
      setSavingAdd(true);
      setAddMessage(null);

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
          role: addRole,
          branchCode: addBranchCode,
          designation: addDesignation.trim(),
          phone: addPhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAddMessage({ text: `Employee ${data.employee.user.name} created successfully!`, type: "success" });
        setTimeout(() => {
          setShowAddModal(false);
          setAddName("");
          setAddEmail("");
          fetchEmployees();
        }, 1200);
      } else {
        setAddMessage({ text: data.error || "Failed to create employee.", type: "error" });
      }
    } catch (err) {
      setAddMessage({ text: "Network error creating employee.", type: "error" });
    } finally {
      setSavingAdd(false);
    }
  };

  const activeEmployeesCount = employees.filter((e) => e.active && e.employmentStatus === "ACTIVE").length;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Staff Governance &amp; Roster
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-plum tracking-tight mt-0.5">
            Employee Management
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Official personnel registry, boutique assignments, authentication credentials, and role authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEmployees}
            className="p-2 rounded-lg bg-white border border-cream-border text-cocoa hover:text-plum hover:bg-cream transition-colors"
            title="Refresh staff registry"
          >
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin text-gold-600")} />
          </button>

          {(currentUserRole === "OWNER" || currentUserRole === "BRANCH_MANAGER") && (
            <button
              onClick={() => {
                setAddMessage(null);
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-plum font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-cream-border shadow-sm">
          <span className="text-[10px] font-bold uppercase text-neutralMuted block">Total Registered</span>
          <span className="text-2xl font-bold text-plum mt-1 block">{employees.length}</span>
          <span className="text-[11px] text-neutralMuted">Profiles across ateliers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cream-border shadow-sm">
          <span className="text-[10px] font-bold uppercase text-neutralMuted block">Active Employees</span>
          <span className="text-2xl font-bold text-emerald-800 mt-1 block">{activeEmployeesCount}</span>
          <span className="text-[11px] text-emerald-700">Currently active on roster</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cream-border shadow-sm">
          <span className="text-[10px] font-bold uppercase text-neutralMuted block">Scope Filter</span>
          <span className="text-xl font-bold text-gold-800 mt-1 block truncate">
            {selectedOutletCode === "ALL" ? "All Boutiques" : selectedOutletCode}
          </span>
          <span className="text-[11px] text-neutralMuted">Portal outlet scope</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cream-border shadow-sm">
          <span className="text-[10px] font-bold uppercase text-neutralMuted block">Whitefield Team</span>
          <span className="text-2xl font-bold text-plum mt-1 block">
            {employees.filter((e) => e.branch.code === "WHF").length}
          </span>
          <span className="text-[11px] text-neutralMuted">Salon &amp; Tasting Room</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-cream-border shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutralMuted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, employee code, or boutique..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutralMuted font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1 px-2.5 bg-cream-muted border border-cream-border rounded-lg text-xs font-semibold text-plum focus:outline-none focus:ring-1 focus:ring-gold-500"
            >
              <option value="ALL">All Roles</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="BRANCH_MANAGER">Managers</option>
              <option value="OWNER">Owner</option>
              <option value="AUDITOR">Auditor</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutralMuted font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 px-2.5 bg-cream-muted border border-cream-border rounded-lg text-xs font-semibold text-plum focus:outline-none focus:ring-1 focus:ring-gold-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-cream-border shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-cocoa">
            <thead className="bg-cream-muted text-plum uppercase font-bold text-[10px] tracking-wider border-b border-cream-border">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Name &amp; Contact</th>
                <th className="py-3 px-4">Assigned Boutique</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-muted">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-neutralMuted">
                    Loading employee roster...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-neutralMuted">
                    No employees match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isWhitefieldTest = emp.user.name === "Whitefield Test Employee";

                  return (
                    <tr
                      key={emp.id}
                      className={clsx(
                        "hover:bg-cream/40 transition-colors",
                        isWhitefieldTest && "bg-gold-50/40 border-l-4 border-l-gold-500 font-medium"
                      )}
                    >
                      {/* Employee Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-plum whitespace-nowrap">
                        <span className="bg-cream px-2 py-1 rounded border border-gold-300/60">
                          {emp.employeeCode}
                        </span>
                      </td>

                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-violet-100 border border-gold-300 flex items-center justify-center text-violet-900 font-bold text-xs shrink-0">
                            {emp.user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-plum block">{emp.user.name}</span>
                            <span className="text-[11px] text-neutralMuted font-mono block">
                              {emp.user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Boutique */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gold-700 shrink-0" />
                          <span className="font-semibold text-plum">{emp.branch.name}</span>
                          <span className="text-[10px] bg-gold-200 text-gold-900 px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0">
                            {emp.branch.code}
                          </span>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4 text-plum font-medium">
                        {emp.designation}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            emp.user.role === "OWNER"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : emp.user.role === "BRANCH_MANAGER"
                              ? "bg-violet-100 text-violet-900 border border-violet-300"
                              : emp.user.role === "AUDITOR"
                              ? "bg-blue-100 text-blue-900 border border-blue-300"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          )}
                        >
                          {emp.user.role.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-neutralMuted whitespace-nowrap">
                        {new Date(emp.joinedDate).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            emp.active && emp.employmentStatus === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-neutral-100 text-neutral-600 border border-neutral-300"
                          )}
                        >
                          <span
                            className={clsx(
                              "w-1.5 h-1.5 rounded-full",
                              emp.active && emp.employmentStatus === "ACTIVE" ? "bg-emerald-500" : "bg-neutral-400"
                            )}
                          />
                          {emp.active && emp.employmentStatus === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="bg-white rounded-2xl border border-gold-300 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cream-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gold-600" />
                <h3 className="font-serif font-bold text-lg text-plum">
                  Create Employee Profile
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutralMuted hover:text-plum text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {addMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold ${
                  addMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                    : "bg-rose-50 text-rose-900 border border-rose-300"
                }`}
              >
                {addMessage.text}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-plum mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Whitefield Test Employee"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:ring-1 focus:ring-gold-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="employee@madamchocolate.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:ring-1 focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-mono text-plum focus:ring-1 focus:ring-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Assigned Boutique *
                  </label>
                  <select
                    value={addBranchCode}
                    onChange={(e) => setAddBranchCode(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-semibold text-plum focus:ring-1 focus:ring-gold-500"
                  >
                    {branches.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Access Role *
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs font-semibold text-plum focus:ring-1 focus:ring-gold-500"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
                    <option value="AUDITOR">AUDITOR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={addDesignation}
                    onChange={(e) => setAddDesignation(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:ring-1 focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98000 00000"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full p-2 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:ring-1 focus:ring-gold-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-cream-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-cream-muted text-plum text-xs font-semibold hover:bg-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-4 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-plum font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  {savingAdd ? "Saving Profile..." : "Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
