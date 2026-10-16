import React from "react";
import Link from "next/link";
import clsx from "clsx";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    type?: "positive" | "negative" | "warning" | "neutral";
  };
  href?: string;
  className?: string;
  highlight?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  href,
  className,
  highlight = false,
}) => {
  const Content = (
    <div
      className={clsx(
        "relative p-5 rounded-xl border bg-white transition-all duration-200",
        highlight
          ? "border-gold-400 shadow-gold bg-gradient-to-b from-white to-gold-50/20"
          : "border-cream-border shadow-luxury hover:border-gold-300",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutralMuted">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold font-serif text-plum tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-neutralMuted flex items-center gap-1.5">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={clsx(
            "p-2.5 rounded-lg border",
            highlight
              ? "bg-gold-500 text-plum border-gold-600"
              : "bg-cream-muted text-gold-700 border-gold-200"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {badge && (
        <div className="mt-3 pt-3 border-t border-cream-muted flex items-center justify-between">
          <span
            className={clsx(
              "text-[11px] font-medium px-2 py-0.5 rounded-full",
              badge.type === "positive" && "bg-emerald-50 text-emerald-700",
              badge.type === "negative" && "bg-rose-50 text-rose-700",
              badge.type === "warning" && "bg-amber-50 text-amber-700",
              (!badge.type || badge.type === "neutral") && "bg-cream-muted text-neutralMuted"
            )}
          >
            {badge.text}
          </span>
          {href && (
            <span className="text-xs font-medium text-gold-700 hover:text-gold-900 flex items-center gap-0.5">
              View details &rarr;
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group">
        {Content}
      </Link>
    );
  }

  return Content;
};
