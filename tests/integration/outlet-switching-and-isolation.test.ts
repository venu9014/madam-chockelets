import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/auth";
import { evaluateAttendanceGeofence } from "../../src/lib/geofence";
import { NextRequest } from "next/server";

let currentTestCookie: string | null = null;
let currentOutletCookie: string | null = null;

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      if ((name === "mc_ops_session" || name === "mc_session_token") && currentTestCookie) {
        return { value: currentTestCookie };
      }
      if (name === "mc_selected_outlet" && currentOutletCookie) {
        return { value: currentOutletCookie };
      }
      return undefined;
    },
  }),
}));

import { GET as getDashboardStats } from "../../src/app/api/dashboard/stats/route";
import { GET as getAttendanceSession } from "../../src/app/api/attendance/session/route";
import { GET as getAttendanceHistory } from "../../src/app/api/attendance/history/route";
import { GET as getTasks } from "../../src/app/api/tasks/route";
import { GET as getInventoryMovements } from "../../src/app/api/inventory/movements/route";
import { GET as getReconciliationDiscrepancies } from "../../src/app/api/reconciliation/discrepancies/route";
import { GET as getAttendanceSettings, PUT as putAttendanceSettings } from "../../src/app/api/attendance/settings/route";
import { GET as getBranchById, PUT as putBranchById } from "../../src/app/api/branches/[id]/route";

function createRequest(
  url: string,
  options?: { method?: string; body?: any; token?: string; outletCookie?: string }
) {
  currentTestCookie = options?.token || null;
  currentOutletCookie = options?.outletCookie || null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const cookieParts: string[] = [];
  if (options?.token) {
    cookieParts.push(`mc_ops_session=${options.token}`);
  }
  if (options?.outletCookie) {
    cookieParts.push(`mc_selected_outlet=${options.outletCookie}`);
  }
  if (cookieParts.length > 0) {
    headers["Cookie"] = cookieParts.join("; ");
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options?.method || "GET",
    headers,
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });
}

describe("Outlet Switching, Branch Resolution & Security Isolation Integration Tests", () => {
  let ownerUser: any;
  let managerIndUser: any;
  let employeeRahul: any;
  let auditorUser: any;

  let branchMhd: any;
  let branchInd: any;
  let branchKor: any;

  let ownerToken: string;
  let managerIndToken: string;
  let employeeToken: string;
  let auditorToken: string;

  beforeAll(async () => {
    // 1. Fetch Branches
    branchMhd = await prisma.branch.findUnique({ where: { code: "MHD" } });
    branchInd = await prisma.branch.findUnique({ where: { code: "IND" } });
    branchKor = await prisma.branch.findUnique({ where: { code: "KOR" } });

    expect(branchMhd).not.toBeNull();
    expect(branchInd).not.toBeNull();
    expect(branchKor).not.toBeNull();

    // 2. Fetch Users
    ownerUser = await prisma.user.findUnique({
      where: { email: "owner@madamchocolate.com" },
      include: { employee: true },
    });
    managerIndUser = await prisma.user.findUnique({
      where: { email: "manager.indiranagar@madamchocolate.com" },
      include: { employee: true },
    });
    employeeRahul = await prisma.user.findUnique({
      where: { email: "employee.rahul@madamchocolate.com" },
      include: { employee: true },
    });
    auditorUser = await prisma.user.findUnique({
      where: { email: "auditor@madamchocolate.com" },
      include: { employee: true },
    });

    // 3. Generate Valid Session Tokens
    ownerToken = signSessionToken({
      userId: ownerUser.id,
      email: ownerUser.email,
      role: ownerUser.role,
    });
    managerIndToken = signSessionToken({
      userId: managerIndUser.id,
      email: managerIndUser.email,
      role: managerIndUser.role,
    });
    employeeToken = signSessionToken({
      userId: employeeRahul.id,
      email: employeeRahul.email,
      role: employeeRahul.role,
    });
    auditorToken = signSessionToken({
      userId: auditorUser.id,
      email: auditorUser.email,
      role: auditorUser.role,
    });
  });

  describe("1. Branch Persistence & Metadata Validation", () => {
    it("Mahadevapura outlet has authoritative coordinates and Moto G85 5G Wi-Fi configuration", () => {
      expect(branchMhd.name).toBe("Mahadevapura");
      expect(branchMhd.code).toBe("MHD");
      expect(branchMhd.latitude).toBeCloseTo(12.99023, 5);
      expect(branchMhd.longitude).toBeCloseTo(77.68781, 5);
      expect(branchMhd.geofenceRadiusMeters).toBe(150);
      expect(branchMhd.wifiSsid).toBe("Moto G85 5G");
      expect(branchMhd.active).toBe(true);
    });

    it("Geofence correctly identifies device inside Mahadevapura center vs distant location", () => {
      const centerTest = evaluateAttendanceGeofence({
        deviceLat: 12.99023,
        deviceLon: 77.68781,
        branchLat: branchMhd.latitude,
        branchLon: branchMhd.longitude,
        geofenceRadiusMeters: branchMhd.geofenceRadiusMeters,
        accuracyMeters: 10,
        maxAcceptableAccuracyMeters: 50,
        locationTimestamp: new Date(),
      });
      expect(centerTest.isWithinGeofence).toBe(true);
      expect(centerTest.distanceMeters).toBeLessThan(5);

      const indiranagarDevice = evaluateAttendanceGeofence({
        deviceLat: branchInd.latitude,
        deviceLon: branchInd.longitude,
        branchLat: branchMhd.latitude,
        branchLon: branchMhd.longitude,
        geofenceRadiusMeters: branchMhd.geofenceRadiusMeters,
        accuracyMeters: 10,
        maxAcceptableAccuracyMeters: 50,
        locationTimestamp: new Date(),
      });
      expect(indiranagarDevice.isWithinGeofence).toBe(false);
      expect(indiranagarDevice.status).toBe("OUTSIDE_GEOFENCE");
      expect(indiranagarDevice.distanceMeters).toBeGreaterThan(3000);
    });
  });

  describe("2. Single Source of Truth & Branch Code / CUID Resolution", () => {
    it("GET /api/dashboard/stats resolves branch code MHD and returns Mahadevapura metrics", async () => {
      const req = createRequest("/api/dashboard/stats?branchId=MHD", { token: ownerToken });
      const res = await getDashboardStats(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.summary).toBeDefined();
      expect(data.attendanceDistribution).toBeDefined();
      expect(Array.isArray(data.branchComparison)).toBe(true);
    });

    it("GET /api/dashboard/stats falls back to mc_selected_outlet cookie when query param is omitted", async () => {
      const req = createRequest("/api/dashboard/stats", {
        token: ownerToken,
        outletCookie: "MHD",
      });
      const res = await getDashboardStats(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.summary).toBeDefined();
    });

    it("GET /api/attendance/session resolves targetBranchId and returns target branch details", async () => {
      const req = createRequest("/api/attendance/session?branchId=MHD", { token: employeeToken });
      const res = await getAttendanceSession(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.branch).toBeDefined();
      expect(data.branch.code).toBe("MHD");
      expect(data.branch.latitude).toBeCloseTo(12.99023, 5);
      expect(data.branch.longitude).toBeCloseTo(77.68781, 5);
      expect(data.branch.wifiSsid).toBe("Moto G85 5G");
    });

    it("GET /api/branches/[id] resolves branch by 3-letter code MHD", async () => {
      const req = createRequest("/api/branches/MHD", { token: ownerToken });
      const res = await getBranchById(req, { params: { id: "MHD" } });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.branch.code).toBe("MHD");
      expect(data.branch.name).toBe("Mahadevapura");
      expect(data.branch.latitude).toBeCloseTo(12.99023, 5);
    });
  });

  describe("3. Role-Based Access Control & Strict Outlet Isolation", () => {
    it("Branch Manager is locked to their assigned outlet in GET /api/dashboard/stats", async () => {
      // Indiranagar manager requests Mahadevapura via query param, but backend locks to IND
      const req = createRequest("/api/dashboard/stats?branchId=MHD", { token: managerIndToken });
      const res = await getDashboardStats(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      // Branch comparison for a branch manager must only include their own branch
      expect(data.branchComparison.length).toBe(1);
      expect(data.branchComparison[0].branchCode).toBe("IND");
    });

    it("Indiranagar Branch Manager is forbidden from modifying Mahadevapura settings (HTTP 403)", async () => {
      const req = createRequest("/api/attendance/settings", {
        method: "PUT",
        token: managerIndToken,
        body: {
          branchId: branchMhd.id,
          wifiSsid: "Hacked SSID",
        },
      });
      const res = await putAttendanceSettings(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toMatch(/Forbidden|assigned branch/i);
    });

    it("Indiranagar Branch Manager is forbidden from modifying Mahadevapura via /api/branches/MHD (HTTP 403)", async () => {
      const req = createRequest("/api/branches/MHD", {
        method: "PUT",
        token: managerIndToken,
        body: {
          name: "Unauthorized Rename",
        },
      });
      const res = await putBranchById(req, { params: { id: "MHD" } });
      expect(res.status).toBe(403);
    });

    it("Employee role is strictly forbidden from accessing inventory movements (HTTP 403)", async () => {
      const req = createRequest("/api/inventory/movements?branchId=MHD", { token: employeeToken });
      const res = await getInventoryMovements(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toMatch(/Forbidden|Executive/i);
    });

    it("Owner role is strictly exempt from attendance history tracking (HTTP 403)", async () => {
      const req = createRequest("/api/attendance/history?branchId=MHD", { token: ownerToken });
      const res = await getAttendanceHistory(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toMatch(/exempt/i);
    });

    it("Owner role accessing attendance session receives isExempt: true", async () => {
      const req = createRequest("/api/attendance/session?branchId=MHD", { token: ownerToken });
      const res = await getAttendanceSession(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.isExempt).toBe(true);
      expect(data.message).toMatch(/exempt/i);
    });
  });

  describe("4. Cross-Module Data Scoping (Tasks, Discrepancies, Attendance Settings)", () => {
    it("GET /api/tasks filters by branch code MHD without error", async () => {
      const req = createRequest("/api/tasks?branchId=MHD", { token: ownerToken });
      const res = await getTasks(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data.tasks)).toBe(true);
      data.tasks.forEach((t: any) => {
        expect(t.branch.code).toBe("MHD");
      });
    });

    it("GET /api/reconciliation/discrepancies filters by branch code MHD", async () => {
      const req = createRequest("/api/reconciliation/discrepancies?branchId=MHD", { token: ownerToken });
      const res = await getReconciliationDiscrepancies(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data.discrepancies)).toBe(true);
      data.discrepancies.forEach((d: any) => {
        expect(d.branch.code).toBe("MHD");
      });
    });

    it("GET /api/attendance/settings filters by branch code MHD and returns Mahadevapura policy", async () => {
      const req = createRequest("/api/attendance/settings?branchId=MHD", { token: ownerToken });
      const res = await getAttendanceSettings(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.branches.length).toBe(1);
      expect(data.branches[0].code).toBe("MHD");
      expect(data.branches[0].latitude).toBeCloseTo(12.99023, 5);
      expect(data.branches[0].longitude).toBeCloseTo(77.68781, 5);
    });
  });
});
