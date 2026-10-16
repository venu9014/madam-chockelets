import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FileText, Clock, CheckSquare, ShieldCheck, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SopsPage() {
  await requireAuth();

  const sops = await prisma.sop.findMany({
    include: {
      versions: {
        where: { status: "PUBLISHED" },
        include: {
          checklistItems: {
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Quality Governance & Procedures
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            Standard Operating Procedures (SOPs)
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Authoritative, version-controlled operational protocols for boutique hygiene, display standards, temperatures, and stock counts.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-[11px] text-amber-900 flex items-center gap-2 max-w-sm">
          <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>Initial SOPs are illustrative demonstration protocols subject to corporate sign-off.</span>
        </div>
      </div>

      {/* Grid of 10 SOPs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sops.map((sop) => {
          const currentVersion = sop.versions[0];

          return (
            <div
              key={sop.id}
              className="bg-white rounded-xl border border-cream-border p-5 shadow-luxury hover:border-gold-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Meta Bar */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-cream-muted text-gold-800 border border-gold-300/60">
                      {sop.code}
                    </span>
                    <span className="text-[11px] font-semibold text-neutralMuted uppercase">
                      {sop.category}
                    </span>
                  </div>
                  <StatusBadge status={currentVersion?.status || "PUBLISHED"} size="sm" />
                </div>

                <h3 className="font-serif font-bold text-lg text-plum leading-snug">
                  {sop.title}
                </h3>
                <p className="text-xs text-cocoa/80 mt-1.5 leading-relaxed">
                  {sop.description}
                </p>

                {/* Instructions Box */}
                {currentVersion && (
                  <div className="mt-4 p-3 rounded-lg bg-cream/70 border border-cream-border text-xs text-cocoa/90">
                    <p className="font-semibold text-plum flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-gold-700" />
                      Protocol Instruction
                    </p>
                    <p className="text-xs leading-relaxed">{currentVersion.instructions}</p>
                  </div>
                )}

                {/* Checklist Preview */}
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutralMuted mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-gold-600" />
                    Checklist Verification Items ({currentVersion?.checklistItems.length || 0})
                  </p>

                  <ul className="space-y-1.5">
                    {currentVersion?.checklistItems.map((item) => (
                      <li
                        key={item.id}
                        className="text-xs text-cocoa/80 flex items-start gap-2 bg-cream/30 p-1.5 rounded"
                      >
                        <span className="font-bold text-gold-700 text-[10px] mt-0.5">
                          {item.sequence}.
                        </span>
                        <span className="flex-1 leading-tight">{item.title}</span>
                        {item.evidenceRequired !== "NONE" && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 flex-shrink-0">
                            {item.evidenceRequired}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-3 border-t border-cream-border flex items-center justify-between text-[11px] text-neutralMuted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gold-600" />
                  Due Cut-off: <strong className="text-plum">{currentVersion?.deadlineTime || "10:00"}</strong>
                </span>
                <span>Recurrence: <strong className="text-plum">{sop.frequency}</strong></span>
                <span>Version: <strong className="text-plum">v{currentVersion?.versionNumber || 1}.0</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
