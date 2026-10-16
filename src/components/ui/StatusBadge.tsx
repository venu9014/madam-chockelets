import React from "react";
import clsx from "clsx";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
  className,
}) => {
  const normalized = status.toUpperCase().replace(/\s+/g, "_");

  let styles = "bg-cream-muted text-plum border border-neutralMuted-border";

  switch (normalized) {
    case "APPROVED":
    case "VERIFIED":
    case "MATCH":
    case "HEALTHY":
    case "COMPLETED":
    case "SUCCESSFUL_INSIDE_GEOFENCE":
      styles = "bg-emerald-50 text-emerald-800 border-emerald-200";
      break;

    case "SUBMITTED":
    case "IN_PROGRESS":
    case "IN_TRANSIT":
    case "PUBLISHED":
      styles = "bg-violet-50 text-violet-800 border-violet-200";
      break;

    case "PENDING":
    case "PENDING_EXCEPTION":
    case "AWAITING_APPROVAL":
    case "INVESTIGATING":
    case "LOW_STOCK":
      styles = "bg-amber-50 text-amber-800 border-amber-300";
      break;

    case "CHANGES_REQUESTED":
    case "FLAGGED":
    case "POOR_GPS_ACCURACY":
      styles = "bg-orange-50 text-orange-800 border-orange-200";
      break;

    case "OVERDUE":
    case "REJECTED":
    case "DISCREPANCY":
    case "OUTSIDE_GEOFENCE":
    case "CRITICAL_OUT_OF_STOCK":
    case "NEGATIVE_ANOMALY":
    case "FAILED":
      styles = "bg-rose-50 text-rose-800 border-rose-200";
      break;

    case "CANCELLED":
    case "ARCHIVED":
    case "DRAFT":
      styles = "bg-gray-100 text-gray-700 border-gray-200";
      break;
  }

  const label = status.replace(/_/g, " ");

  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded-full uppercase tracking-wider",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        styles,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {label}
    </span>
  );
};
