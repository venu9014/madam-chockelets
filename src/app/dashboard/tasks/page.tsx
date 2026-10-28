"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useOutlet } from "@/context/OutletContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CheckSquare,
  Clock,
  User,
  Building2,
  Calendar,
  AlertCircle,
  Camera,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Search,
  Filter,
} from "lucide-react";
import clsx from "clsx";

interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
  status: string;
  priority: string;
  branch: { id: string; code: string; name: string };
  assignedEmployee?: { user: { name: string; email: string } } | null;
  sopVersion: {
    id: string;
    title: string;
    instructions: string;
    deadlineTime: string;
    checklistItems: Array<{
      id: string;
      sequence: number;
      title: string;
      description?: string | null;
      isRequired: boolean;
      evidenceRequired: string;
      minNumericVal?: number | null;
      maxNumericVal?: number | null;
      unit?: string | null;
    }>;
  };
  submissions: Array<{
    id: string;
    submissionSeq: number;
    submittedAt: string;
    submittedBy: { name: string; email: string };
    notes?: string | null;
    answers: Array<{
      id: string;
      checklistItemId: string;
      isChecked: boolean;
      valueText?: string | null;
      valueNumber?: number | null;
    }>;
    reviews: Array<{
      id: string;
      status: string;
      comments?: string | null;
      reviewedAt: string;
      reviewer: { name: string; role: string };
    }>;
    evidence: Array<{
      id: string;
      fileUrl: string;
      fileName: string;
      caption?: string | null;
      isDemoPlaceholder: boolean;
    }>;
  }>;
}

export default function TasksPage() {
  const { selectedOutletCode, selectedOutletId, selectedOutlet, branches: contextBranches } = useOutlet();

  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get("id");
  const initialStatus = searchParams.get("status") || "ALL";

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchTerm, setSearchTerm] = useState("");

  // Submission form state
  const [submitting, setSubmitting] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [checklistResponses, setChecklistResponses] = useState<Record<string, { isChecked: boolean; valueNumber?: string }>>({});
  const [attachEvidence, setAttachEvidence] = useState(true);
  const [reviewComments, setReviewComments] = useState("");
  const [reviewActionRunning, setReviewActionRunning] = useState(false);

  const fetchTasks = async (outlet = selectedOutletCode) => {
    try {
      setLoading(true);
      const branchParam = outlet && outlet !== "ALL" ? `&branchId=${outlet}` : "";
      const res = await fetch(`/api/tasks?status=${statusFilter}${branchParam}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);

        if (initialTaskId) {
          const found = (data.tasks || []).find((t: TaskItem) => t.id === initialTaskId);
          if (found) setSelectedTask(found);
        }
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(selectedOutletCode);
  }, [statusFilter, selectedOutletCode]);

  const handleSelectTask = (task: TaskItem) => {
    setSelectedTask(task);
    // Pre-populate response checklist
    const initialResponses: Record<string, { isChecked: boolean; valueNumber?: string }> = {};
    const latestSubmission = task.submissions[0];

    task.sopVersion.checklistItems.forEach((item) => {
      const prevAnswer = latestSubmission?.answers.find((a) => a.checklistItemId === item.id);
      initialResponses[item.id] = {
        isChecked: prevAnswer ? prevAnswer.isChecked : false,
        valueNumber: prevAnswer?.valueNumber != null ? String(prevAnswer.valueNumber) : "",
      };
    });
    setChecklistResponses(initialResponses);
    setSubmissionNotes(latestSubmission?.notes || "");
  };

  const handleToggleCheck = (itemId: string) => {
    setChecklistResponses((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        isChecked: !prev[itemId]?.isChecked,
      },
    }));
  };

  const handleNumericChange = (itemId: string, val: string) => {
    setChecklistResponses((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        valueNumber: val,
      },
    }));
  };

  const handleSubmitTask = async () => {
    if (!selectedTask) return;
    try {
      setSubmitting(true);
      const formattedAnswers = Object.entries(checklistResponses).map(([checklistItemId, data]) => ({
        checklistItemId,
        isChecked: data.isChecked,
        valueNumber: data.valueNumber ? parseFloat(data.valueNumber) : undefined,
      }));

      const res = await fetch(`/api/tasks/${selectedTask.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: submissionNotes,
          answers: formattedAnswers,
          evidenceUrl: attachEvidence
            ? "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600"
            : undefined,
          evidenceCaption: "[DEMO EVIDENCE] Checklist verification photograph",
        }),
      });

      if (res.ok) {
        await fetchTasks();
        setSelectedTask(null);
      }
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAction = async (status: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED") => {
    if (!selectedTask) return;
    try {
      setReviewActionRunning(true);
      const res = await fetch(`/api/tasks/${selectedTask.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          comments: reviewComments,
        }),
      });

      if (res.ok) {
        await fetchTasks();
        setSelectedTask(null);
        setReviewComments("");
      }
    } catch (err) {
      console.error("Review action failed:", err);
    } finally {
      setReviewActionRunning(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.title.toLowerCase().includes(term) ||
      t.branch.name.toLowerCase().includes(term) ||
      t.sopVersion.title.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cream-border">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700 block">
            Operational Adherence & Verification
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-plum tracking-tight mt-0.5">
            Tasks, Checklists & Approvals
          </h1>
          <p className="text-xs text-cocoa/80 mt-1">
            Complete daily opening/closing procedures, submit photographic evidence, and review team compliance.
          </p>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-cream-border shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {["ALL", "PENDING", "IN_PROGRESS", "SUBMITTED", "CHANGES_REQUESTED", "APPROVED", "OVERDUE"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all uppercase tracking-wider text-[11px]",
                statusFilter === st
                  ? "bg-gold-500 text-plum shadow-sm"
                  : "bg-cream-muted text-cocoa/80 hover:bg-cream"
              )}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-neutralMuted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search checklists, branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-neutralMuted">
            Loading operational tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-neutralMuted bg-white rounded-xl border border-cream-border">
            No operational tasks match the selected filter.
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleSelectTask(task)}
              className="bg-white rounded-xl border border-cream-border p-4 shadow-luxury hover:border-gold-400 hover:shadow-gold transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-neutralMuted flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-gold-600" />
                    {task.branch.name.split(" ")[0]}
                  </span>
                  <StatusBadge status={task.status} size="sm" />
                </div>

                <h3 className="font-serif font-bold text-sm text-plum line-clamp-1">
                  {task.title}
                </h3>
                <p className="text-[11px] text-cocoa/80 line-clamp-2 mt-1">
                  {task.sopVersion.instructions}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-cream-muted flex items-center justify-between text-[11px] text-neutralMuted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gold-600" />
                  Due: {task.dueTime}
                </span>
                <span className="font-medium text-gold-800">
                  {task.sopVersion.checklistItems.length} checklist items
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Execution / Review Modal Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 bg-plum/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-luxury-lg border border-gold-300 p-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-cream-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold-700">
                    {selectedTask.branch.name}
                  </span>
                  <StatusBadge status={selectedTask.status} size="sm" />
                </div>
                <h2 className="text-xl font-serif font-bold text-plum">
                  {selectedTask.title}
                </h2>
                <p className="text-xs text-neutralMuted mt-0.5">
                  Due by {selectedTask.dueTime} &bull; SOP Ref: {selectedTask.sopVersion.title}
                </p>
              </div>

              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-neutralMuted hover:text-plum hover:bg-cream"
              >
                &times;
              </button>
            </div>

            {/* Instructions */}
            <div className="my-4 p-3 bg-cream rounded-lg border border-cream-border text-xs text-cocoa">
              <strong className="block text-plum mb-0.5 text-[11px] uppercase tracking-wider">
                Operating Protocol
              </strong>
              {selectedTask.sopVersion.instructions}
            </div>

            {/* Checklist items */}
            <div className="space-y-3 my-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutralMuted">
                Verification Checklist Items
              </h4>

              {selectedTask.sopVersion.checklistItems.map((item) => {
                const resp = checklistResponses[item.id] || { isChecked: false };

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-cream-border bg-cream/40 flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={resp.isChecked}
                        onChange={() => handleToggleCheck(item.id)}
                        className="mt-1 w-4 h-4 text-gold-600 rounded border-gold-300 focus:ring-gold-500 cursor-pointer"
                      />
                      <div className="flex-1 text-xs">
                        <span className="font-medium text-plum">{item.title}</span>
                        {item.description && (
                          <p className="text-[11px] text-neutralMuted mt-0.5">{item.description}</p>
                        )}
                      </div>
                      {item.evidenceRequired !== "NONE" && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800">
                          {item.evidenceRequired}
                        </span>
                      )}
                    </div>

                    {item.evidenceRequired === "NUMERIC_VALUE" && (
                      <div className="pl-7 flex items-center gap-2">
                        <span className="text-[11px] text-neutralMuted">Observed reading:</span>
                        <input
                          type="number"
                          placeholder={`${item.minNumericVal ?? ""} - ${item.maxNumericVal ?? ""} ${item.unit ?? ""}`}
                          value={resp.valueNumber || ""}
                          onChange={(e) => handleNumericChange(item.id, e.target.value)}
                          className="w-32 px-2 py-1 bg-white border border-gold-200 rounded text-xs font-mono"
                        />
                        <span className="text-xs text-gold-800 font-bold">{item.unit}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Evidence attachment option */}
            <div className="my-4 p-3 rounded-lg bg-gold-50/40 border border-gold-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Camera className="w-4 h-4 text-gold-700" />
                <span className="font-semibold text-plum">
                  Attach Photo Evidence Placeholder
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs text-cocoa cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachEvidence}
                  onChange={(e) => setAttachEvidence(e.target.checked)}
                  className="rounded text-gold-600 focus:ring-gold-500"
                />
                <span className="text-[11px]">[DEMO PLACEHOLDER]</span>
              </label>
            </div>

            {/* Notes textarea */}
            <div className="my-4">
              <label className="block text-xs font-semibold text-plum mb-1">
                Operational Notes / Deviations
              </label>
              <textarea
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Document any showcase temperature deviations, restocking needs, or observations..."
                rows={2}
                className="w-full p-2.5 bg-cream-muted border border-cream-border rounded-lg text-xs text-plum focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>

            {/* Review History if previously submitted */}
            {selectedTask.submissions.length > 0 && (
              <div className="my-4 p-3 bg-cream-muted rounded-lg border border-cream-border">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutralMuted mb-2">
                  Previous Submission History (v{selectedTask.submissions.length})
                </p>
                {selectedTask.submissions.map((sub) => (
                  <div key={sub.id} className="text-xs space-y-1 mb-2 pb-2 border-b border-cream-border last:border-0 last:mb-0">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-plum">Submitted by {sub.submittedBy.name}</span>
                      <span className="text-neutralMuted">{new Date(sub.submittedAt).toLocaleString()}</span>
                    </div>
                    {sub.notes && <p className="text-cocoa/80 italic">&ldquo;{sub.notes}&rdquo;</p>}
                    {sub.reviews.map((rev) => (
                      <div key={rev.id} className="mt-1 p-2 bg-white rounded border border-gold-200">
                        <span className="font-bold text-[10px] uppercase text-violet-800 block">
                          Reviewer: {rev.reviewer.name} ({rev.status})
                        </span>
                        <p className="text-cocoa/90">{rev.comments}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Actions for Employees vs Managers */}
            <div className="mt-6 pt-4 border-t border-cream-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-xs font-semibold text-cocoa hover:text-plum"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Employee Submission Button */}
                <button
                  onClick={handleSubmitTask}
                  disabled={submitting}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-plum font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{submitting ? "Submitting..." : "Submit Checklist"}</span>
                </button>

                {/* Manager / Owner Review Actions */}
                <div className="flex items-center gap-1.5 pl-2 border-l border-cream-border">
                  <button
                    onClick={() => handleReviewAction("APPROVED")}
                    disabled={reviewActionRunning}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => handleReviewAction("CHANGES_REQUESTED")}
                    disabled={reviewActionRunning}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Request Changes</span>
                  </button>

                  <button
                    onClick={() => handleReviewAction("REJECTED")}
                    disabled={reviewActionRunning}
                    className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
