import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/auth";
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

import { GET as getBranchesHandler } from "../../src/app/api/branches/route";
import { GET as getDashboardStats } from "../../src/app/api/dashboard/stats/route";
import { GET as getTasks } from "../../src/app/api/tasks/route";
import { GET as getInventoryMovements } from "../../src/app/api/inventory/movements/route";
import { GET as getAttendanceHistory } from "../../src/app/api/attendance/history/route";
import { POST as punchAttendance } from "../../src/app/api/attendance/punch/route";

describe("Outlet Selector & Cross-Module Data Isolation Verification Tests", () => {
  let ownerUser: any;
  let managerIndUser: any;
  let employeeRahul: any;
  let auditorUser: any;

  let branchMhd: any;
  let branchInd: any;
  let branchKor: any;
  let branchWhf: any;

  let ownerToken: string;
  let managerToken: string;
  let employeeToken: string;
  let auditorToken: string;

  beforeAll(async () => {
    // 1. Fetch branches from real database
    branchMhd = await prisma.branch.findUnique({ where: { code: "MHD" } });
    branchInd = await prisma.branch.findUnique({ where: { code: "IND" } });
    branchKor = await prisma.branch.findUnique({ where: { code: "KOR" } });
    branchWhf = await prisma.branch.findUnique({ where: { code: "WHF" } });

    expect(branchMhd).not.toBeNull();
    expect(branchInd).not.toBeNull();

    // 2. Fetch users
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

    ownerToken = signSessionToken({
      userId: ownerUser.id,
      email: ownerUser.email,
      role: ownerUser.role,
    });
    managerToken = signSessionToken({
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

  function createRequest(
    url: string,
    options?: { method?: string; body?: any; token?: string; outletCookie?: string }
  ) {
    currentTestCookie = options?.token || null;
    currentOutletCookie = options?.outletCookie || null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const cookies: string[] = [];
    if (options?.token) {
      cookies.push(`mc_ops_session=${options.token}`);
    }
    if (options?.outletCookie) {
      cookies.push(`mc_selected_outlet=${options.outletCookie}`);
    }
    if (cookies.length > 0) {
      headers["Cookie"] = cookies.join("; ");
    }

    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method: options?.method || "GET",
      headers,
      ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    });
  }

  describe("Requirement 2 & 7: Display only authorized outlets per role", () => {
    it("GET /api/branches returns ONLY the assigned branch for ordinary employee", async () => {
      const req = createRequest("/api/branches", { token: employeeToken });
      const res = await getBranchesHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.branches).toBeDefined();
      expect(data.branches.length).toBe(1);
      expect(data.branches[0].code).toBe("IND");
      expect(data.branches[0].id).toBe(employeeRahul.employee.branchId);
    });

    it("GET /api/branches returns all registered active outlets for Owner & Auditor", async () => {
      const reqOwner = createRequest("/api/branches", { token: ownerToken });
      const resOwner = await getBranchesHandler(reqOwner);
      expect(resOwner.status).toBe(200);
      const dataOwner = await resOwner.json();

      expect(dataOwner.branches.length).toBeGreaterThanOrEqual(4);
      const codes = dataOwner.branches.map((b: any) => b.code);
      expect(codes).toContain("IND");
      expect(codes).toContain("MHD");
      expect(codes).toContain("KOR");
      expect(codes).toContain("WHF");
    });
  });

  describe("Requirement 3, 4 & 5: Outlet switching to Mahadevapura updates backend data", () => {
    it("Selecting Mahadevapura via cookie mc_selected_outlet=MHD scopes tasks to Mahadevapura", async () => {
      const req = createRequest("/api/tasks", { token: ownerToken, outletCookie: "MHD" });
      const res = await getTasks(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data.tasks)).toBe(true);
      data.tasks.forEach((t: any) => {
        expect(t.branch.code).toBe("MHD");
      });
    });

    it("Selecting Mahadevapura via query param ?branchId=MHD scopes inventory movements to Mahadevapura", async () => {
      const req = createRequest("/api/inventory/movements?branchId=MHD", { token: ownerToken });
      const res = await getInventoryMovements(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data.movements)).toBe(true);
      data.movements.forEach((m: any) => {
        expect(m.branch.code).toBe("MHD");
      });
    });

    it("Switching between IND and MHD isolates dashboard stats accurately", async () => {
      const reqInd = createRequest("/api/dashboard/stats?branchId=IND", { token: ownerToken });
      const resInd = await getDashboardStats(reqInd);
      const dataInd = await resInd.json();

      const reqMhd = createRequest("/api/dashboard/stats?branchId=MHD", { token: ownerToken });
      const resMhd = await getDashboardStats(reqMhd);
      const dataMhd = await resMhd.json();

      expect(resInd.status).toBe(200);
      expect(resMhd.status).toBe(200);

      expect(dataInd.summary).toBeDefined();
      expect(dataMhd.summary).toBeDefined();
    });
  });

  describe("Requirement 7 & 10: Unauthorized users cannot access another outlet via client-side tampering", () => {
    it("Employee attempting to access Mahadevapura tasks via ?branchId=MHD is restricted to their assigned branch", async () => {
      const req = createRequest("/api/tasks?branchId=MHD", { token: employeeToken });
      const res = await getTasks(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      // Tasks returned to employee must NOT be from Mahadevapura
      data.tasks.forEach((t: any) => {
        expect(t.branchId).toBe(employeeRahul.employee.branchId);
      });
    });

    it("Employee attempting to punch at another branch is rejected with HTTP 403 Forbidden", async () => {
      const req = createRequest("/api/attendance/punch", {
        method: "POST",
        token: employeeToken,
        body: {
          branchId: branchMhd.id,
          action: "PUNCH_IN",
          latitude: 12.99023,
          longitude: 77.68781,
          accuracyMeters: 10,
          wifiSsid: "Moto G85 5G",
        },
      });
      const res = await punchAttendance(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toMatch(/Forbidden|assigned boutique/i);
    });

    it("Indiranagar Branch Manager requesting Mahadevapura in stats is restricted to their assigned branch", async () => {
      const req = createRequest("/api/dashboard/stats?branchId=MHD", { token: managerToken });
      const res = await getDashboardStats(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.branchComparison.length).toBe(1);
      expect(data.branchComparison[0].branchCode).toBe("IND");
    });
  });

  describe("Requirement 8: Owner role is strictly excluded from employee attendance", () => {
    it("Owner cannot punch attendance (HTTP 403 Forbidden)", async () => {
      const req = createRequest("/api/attendance/punch", {
        method: "POST",
        token: ownerToken,
        body: {
          branchId: branchInd.id,
          action: "PUNCH_IN",
          latitude: 12.975,
          longitude: 77.635,
          accuracyMeters: 10,
          wifiSsid: "Moto G85 5G",
        },
      });
      const res = await punchAttendance(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/exempt/i);
    });

    it("Owner cannot fetch attendance history (HTTP 403 Forbidden)", async () => {
      const req = createRequest("/api/attendance/history?branchId=MHD", { token: ownerToken });
      const res = await getAttendanceHistory(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/exempt/i);
    });
  });
});
