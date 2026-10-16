"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Search, Filter, Terminal, User, Building2, Calendar } from "lucide-react";
import clsx from "clsx";

interface AuditEvent {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  branchId?: string | null;
  metadataJson?: string | null;
  ipAddress: string;
  createdAt: string;
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/audit?limit=100");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.auditEvents || []);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.action.toLowerCase().includes(term) ||
      e.actorName.toLowerCase().includes(term) ||
      e.entityType.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Tamper-Resistant Traceability
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            Operational Audit Ledger
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Immutable system logs tracking authentication, task reviews, inventory adjustments, attendance, and administrative events.
          </p>
        </div>

        <div className="bg-plum text-gold-400 border border-gold-500/40 rounded-lg px-3 py-2 text-xs flex items-center gap-2 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-gold-400" />
          <span>Append-Only Historical Storage</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-cream-border shadow-sm">
        <Search className="w-4 h-4 text-neutralMuted" />
        <input
          type="text"
          placeholder="Filter by action (e.g. TASK_APPROVED, STOCK_ADJUSTMENT), actor, or entity..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-plum focus:outline-none"
        />
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-xl border border-cream-border shadow-luxury overflow-hidden">
        <div className="p-4 bg-cream-muted/60 border-b border-cream-border flex items-center justify-between">
          <span className="font-serif font-bold text-sm text-plum">
            Recorded Audit Log Stream ({filteredEvents.length})
          </span>
          <span className="text-[11px] text-neutralMuted">
            Timestamped in UTC / Displayed in Asia/Kolkata
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-cocoa">
            <thead className="bg-cream-muted text-plum uppercase font-bold text-[10px] tracking-wider border-b border-cream-border">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4 text-right">Metadata Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-muted">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-neutralMuted">
                    Loading audit events...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-neutralMuted">
                    No audit records match the query.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-cream/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-neutralMuted">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-plum block">{ev.actorName}</span>
                      <span className="text-[10px] text-gold-700 font-medium uppercase">
                        {ev.actorRole}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-violet-900 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                        {ev.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-cocoa">{ev.entityType}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-neutralMuted">{ev.ipAddress}</td>
                    <td className="py-3 px-4 text-right">
                      {ev.metadataJson ? (
                        <button
                          onClick={() => setSelectedEvent(ev)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-cream-muted hover:bg-gold-500 hover:text-plum text-cocoa rounded border border-gold-300 transition-colors"
                        >
                          Inspect JSON
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutralMuted">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-plum/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-plum text-cream rounded-2xl max-w-lg w-full p-6 shadow-luxury-lg border border-gold-400">
            <div className="flex items-center justify-between pb-3 border-b border-gold-500/30 mb-3">
              <span className="font-mono text-xs font-bold text-gold-400">
                AUDIT METADATA &bull; {selectedEvent.action}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-neutralMuted hover:text-white"
              >
                &times;
              </button>
            </div>

            <pre className="p-3 bg-plum-dark rounded-lg font-mono text-[11px] text-gold-200 overflow-x-auto max-h-80 border border-gold-500/20">
              {JSON.stringify(JSON.parse(selectedEvent.metadataJson || "{}"), null, 2)}
            </pre>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 bg-gold-500 text-plum font-semibold text-xs rounded-lg shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
