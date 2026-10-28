"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useOutlet } from "@/context/OutletContext";
import { OutletSelector } from "./OutletSelector";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Clock,
  Boxes,
  Scale,
  ShieldCheck,
  FileSpreadsheet,
  Package,
  Sparkles,
  Settings,
  Building2,
  Users,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

interface SidebarProps {
  userRole?: string;
}

const NAV_ITEMS = [
  {
    label: "Executive Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["OWNER", "BRANCH_MANAGER", "EMPLOYEE", "AUDITOR"],
  },
  {
    label: "SOP Protocol Library",
    href: "/dashboard/sops",
    icon: FileText,
    roles: ["OWNER", "BRANCH_MANAGER", "EMPLOYEE", "AUDITOR"],
  },
  {
    label: "Tasks & Checklists",
    href: "/dashboard/tasks",
    icon: CheckSquare,
    roles: ["BRANCH_MANAGER", "EMPLOYEE", "AUDITOR"],
  },
  {
    label: "Staff Attendance",
    href: "/dashboard/attendance",
    icon: Clock,
    roles: ["BRANCH_MANAGER", "EMPLOYEE", "AUDITOR"],
  },
  {
    label: "Employee Management",
    href: "/dashboard/employees",
    icon: Users,
    roles: ["OWNER", "BRANCH_MANAGER", "AUDITOR"],
  },
  {
    label: "Inventory Movements",
    href: "/dashboard/inventory",
    icon: Boxes,
    roles: ["OWNER", "BRANCH_MANAGER", "AUDITOR"],
  },
  {
    label: "Stock Reconciliation",
    href: "/dashboard/reconciliation",
    icon: Scale,
    roles: ["OWNER", "BRANCH_MANAGER", "AUDITOR"],
  },
  {
    label: "Operational Audit Log",
    href: "/dashboard/audit",
    icon: ShieldCheck,
    roles: ["OWNER", "AUDITOR", "BRANCH_MANAGER"],
  },
  {
    label: "CSV Imports & Exports",
    href: "/dashboard/imports",
    icon: FileSpreadsheet,
    roles: ["OWNER", "BRANCH_MANAGER"],
  },
  {
    label: "Floor Cleanliness",
    href: "/dashboard/cleanliness",
    icon: Sparkles,
    roles: ["BRANCH_MANAGER", "EMPLOYEE", "AUDITOR"],
  },
  {
    label: "Product Catalog",
    href: "/dashboard/products",
    icon: Package,
    roles: ["OWNER", "BRANCH_MANAGER", "EMPLOYEE", "AUDITOR"],
  },
  {
    label: "Outlets & Boutiques",
    href: "/dashboard/outlets",
    icon: Building2,
    roles: ["OWNER", "BRANCH_MANAGER", "AUDITOR"],
  },
  {
    label: "Workplace & System Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["OWNER", "BRANCH_MANAGER"],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ userRole = "OWNER" }) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { selectedOutletCode } = useOutlet();

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole.toUpperCase())
  ).map((item) => {
    if (item.href === "/dashboard" && userRole.toUpperCase() === "EMPLOYEE") {
      return { ...item, label: "My Workspace" };
    }
    return item;
  });

  const getHref = (baseHref: string) => {
    if (selectedOutletCode && selectedOutletCode !== "ALL") {
      return `${baseHref}?branchId=${selectedOutletCode}`;
    }
    return baseHref;
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-3 bg-plum text-gold-400 rounded-full shadow-luxury-lg border border-gold-400 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-plum/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          "fixed top-24 bottom-0 left-0 w-64 bg-plum text-cream border-r border-gold-500/30 z-40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Navigation List */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          {/* Mobile Outlet Selector */}
          <div className="lg:hidden mb-3 px-1">
            <OutletSelector className="w-full" />
          </div>

          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400">
              Operations Control
            </span>
          </div>

          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={getHref(item.href)}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group",
                  isActive
                    ? "bg-gold-500 text-plum font-semibold shadow-gold border-r-2 border-gold-300"
                    : "text-cream-muted hover:text-white hover:bg-plum-light"
                )}
              >
                <Icon
                  className={clsx(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-plum"
                      : "text-gold-400/80 group-hover:text-gold-300"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Public Boutique Link */}
        <div className="p-3 border-t border-gold-500/20 bg-plum-dark">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between p-2.5 rounded-lg text-xs text-gold-300 hover:text-white bg-plum-light/50 border border-gold-500/20 hover:border-gold-400 transition-colors"
          >
            <span className="font-serif">Public Boutique Showcase</span>
            <ExternalLink className="w-3.5 h-3.5 text-gold-400" />
          </Link>
        </div>
      </aside>
    </>
  );
};
