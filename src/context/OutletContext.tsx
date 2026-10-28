"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export interface Branch {
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
  wifiBssid?: string | null;
  requireBssidVerification?: boolean;
  active: boolean;
}

export interface UserContextInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  branchId?: string | null;
  branchCode?: string | null;
  branchName?: string | null;
}

interface OutletContextType {
  selectedOutletId: string; // "ALL" or branch code/id (e.g. "MHD", "IND", or cuid)
  selectedOutletCode: string; // "ALL" or 3-letter uppercase code (e.g. "MHD")
  selectedOutlet: Branch | null; // null if "ALL"
  branches: Branch[];
  loadingOutlets: boolean;
  errorOutlets: string | null;
  setOutletId: (outletId: string) => void;
  refreshOutlets: () => Promise<void>;
  user: UserContextInfo | null;
}

const OutletContext = createContext<OutletContextType>({
  selectedOutletId: "ALL",
  selectedOutletCode: "ALL",
  selectedOutlet: null,
  branches: [],
  loadingOutlets: true,
  errorOutlets: null,
  setOutletId: () => {},
  refreshOutlets: async () => {},
  user: null,
});

export const OUTLET_COOKIE_NAME = "mc_selected_outlet";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

interface OutletProviderProps {
  children: ReactNode;
  initialUser?: UserContextInfo | null;
}

export const OutletProvider: React.FC<OutletProviderProps> = ({ children, initialUser = null }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<UserContextInfo | null>(initialUser);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [errorOutlets, setErrorOutlets] = useState<string | null>(null);
  const [selectedOutletId, setSelectedOutletIdState] = useState<string>("ALL");

  // Fetch branches from authoritative API
  const fetchBranches = useCallback(async () => {
    try {
      setLoadingOutlets(true);
      setErrorOutlets(null);
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        const list: Branch[] = data.branches || [];
        setBranches(list);
        return list;
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorOutlets(errData.error || "Failed to load boutique outlets.");
      }
    } catch (e) {
      console.error("Failed to load branches in OutletProvider:", e);
      setErrorOutlets("Network error loading boutique outlets.");
    } finally {
      setLoadingOutlets(false);
    }
    return [];
  }, []);

  // Fetch user profile if not provided
  useEffect(() => {
    if (!initialUser) {
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.user) {
            setUser({
              id: d.user.id,
              name: d.user.name,
              email: d.user.email,
              role: d.user.role,
              branchId: d.user.branchId,
              branchCode: d.user.branchCode,
              branchName: d.user.branchName,
            });
          }
        })
        .catch(() => {});
    }
  }, [initialUser]);

  // Initial load: fetch branches and resolve single source of truth for outlet
  useEffect(() => {
    let isMounted = true;
    fetchBranches().then((loadedBranches) => {
      if (!isMounted) return;

      // 1. Role lock for Branch Managers and Employees
      if ((user?.role === "BRANCH_MANAGER" || user?.role === "EMPLOYEE") && (user.branchId || user.branchCode)) {
        const lockedBranch = loadedBranches.find(
          (b) => b.id === user.branchId || b.code === user.branchCode
        ) || loadedBranches[0];
        const resolved = lockedBranch ? lockedBranch.code : user.branchCode || user.branchId || "WHF";
        setSelectedOutletIdState(resolved);
        setCookie(OUTLET_COOKIE_NAME, resolved);
        return;
      }

      // 1b. Single authorized branch fallback for employees
      if (user?.role === "EMPLOYEE" && loadedBranches.length === 1) {
        setSelectedOutletIdState(loadedBranches[0].code);
        setCookie(OUTLET_COOKIE_NAME, loadedBranches[0].code);
        return;
      }

      // 2. Query parameter
      const paramOutlet = searchParams.get("branchId");
      if (paramOutlet) {
        const valid =
          paramOutlet === "ALL" ||
          loadedBranches.some((b) => b.id === paramOutlet || b.code === paramOutlet);
        if (valid) {
          setSelectedOutletIdState(paramOutlet);
          setCookie(OUTLET_COOKIE_NAME, paramOutlet);
          return;
        }
      }

      // 3. Saved Cookie
      const savedCookie = getCookie(OUTLET_COOKIE_NAME);
      if (savedCookie) {
        const valid =
          savedCookie === "ALL" ||
          loadedBranches.some((b) => b.id === savedCookie || b.code === savedCookie);
        if (valid) {
          setSelectedOutletIdState(savedCookie);
          return;
        }
      }

      // 4. Saved LocalStorage
      try {
        const savedStorage = localStorage.getItem(OUTLET_COOKIE_NAME);
        if (savedStorage) {
          const valid =
            savedStorage === "ALL" ||
            loadedBranches.some((b) => b.id === savedStorage || b.code === savedStorage);
          if (valid) {
            setSelectedOutletIdState(savedStorage);
            setCookie(OUTLET_COOKIE_NAME, savedStorage);
            return;
          }
        }
      } catch {}

      // 5. Default
      setSelectedOutletIdState("ALL");
      setCookie(OUTLET_COOKIE_NAME, "ALL");
    });

    return () => {
      isMounted = false;
    };
  }, [fetchBranches, searchParams, user?.role, user?.branchId, user?.branchCode]);

  // Authoritative setter function
  const setOutletId = useCallback(
    (newOutletId: string) => {
      const cleanId = (newOutletId || "ALL").trim();

      // Enforce role isolation: Branch Managers and Employees cannot change to another outlet
      if ((user?.role === "BRANCH_MANAGER" || user?.role === "EMPLOYEE") && (user.branchId || user.branchCode)) {
        const lockedBranch = branches.find(
          (b) => b.id === user.branchId || b.code === user.branchCode
        ) || branches[0];
        const locked = lockedBranch ? lockedBranch.code : user.branchCode || user.branchId || "WHF";
        setSelectedOutletIdState(locked);
        setCookie(OUTLET_COOKIE_NAME, locked);
        return;
      }

      // Match branch
      const matched = branches.find((b) => b.id === cleanId || b.code === cleanId);
      const finalCode = matched ? matched.code : cleanId === "ALL" ? "ALL" : cleanId;

      // Update state immediately
      setSelectedOutletIdState(finalCode);

      // Persist across navigation and reloads
      setCookie(OUTLET_COOKIE_NAME, finalCode);
      try {
        localStorage.setItem(OUTLET_COOKIE_NAME, finalCode);
      } catch {}

      // Update URL search parameters seamlessly
      const params = new URLSearchParams(searchParams.toString());
      if (finalCode === "ALL") {
        params.delete("branchId");
      } else {
        params.set("branchId", finalCode);
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });

      // Dispatch global event for instant notification across non-React or independent trees
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mc-outlet-changed", {
            detail: {
              outletId: finalCode,
              branch: matched || null,
            },
          })
        );
      }
    },
    [branches, pathname, router, searchParams, user?.branchCode, user?.branchId, user?.role]
  );

  // Compute resolved Branch object
  const selectedOutlet =
    selectedOutletId === "ALL"
      ? null
      : branches.find((b) => b.id === selectedOutletId || b.code === selectedOutletId) || null;

  const selectedOutletCode = selectedOutlet ? selectedOutlet.code : "ALL";

  return (
    <OutletContext.Provider
      value={{
        selectedOutletId,
        selectedOutletCode,
        selectedOutlet,
        branches,
        loadingOutlets,
        errorOutlets,
        setOutletId,
        refreshOutlets: async () => {
          await fetchBranches();
        },
        user,
      }}
    >
      {children}
    </OutletContext.Provider>
  );
};

export const useOutlet = () => {
  const context = useContext(OutletContext);
  if (!context) {
    throw new Error("useOutlet must be used within an OutletProvider");
  }
  return context;
};
