import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/auth";
import { NextRequest } from "next/server";
import { BAKERY_CATEGORIES, getBakeryCategoryLabel } from "../../src/lib/bakery-categories";

let currentTestCookie: string | null = null;

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      (name === "mc_ops_session" || name === "mc_session_token") && currentTestCookie
        ? { value: currentTestCookie }
        : undefined,
  }),
}));

import { GET as dashboardStatsHandler } from "../../src/app/api/dashboard/stats/route";

describe("Employee Dashboard Simplification & Management Analytics RBAC Tests", () => {
  let employeeUser: any;
  let managerUser: any;
  let ownerUser: any;

  let employeeToken: string;
  let managerToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    employeeUser = await prisma.user.findUnique({
      where: { email: "employee.rahul@madamchocolate.com" },
      include: { employee: true },
    });
    managerUser = await prisma.user.findUnique({
      where: { email: "manager.indiranagar@madamchocolate.com" },
      include: { employee: true },
    });
    ownerUser = await prisma.user.findUnique({
      where: { email: "owner@madamchocolate.com" },
      include: { employee: true },
    });

    if (!employeeUser || !managerUser || !ownerUser) {
      throw new Error("Test users not found in database.");
    }

    employeeToken = signSessionToken({
      userId: employeeUser.id,
      email: employeeUser.email,
      role: employeeUser.role,
    });

    managerToken = signSessionToken({
      userId: managerUser.id,
      email: managerUser.email,
      role: managerUser.role,
    });

    ownerToken = signSessionToken({
      userId: ownerUser.id,
      email: ownerUser.email,
      role: ownerUser.role,
    });
  });

  function createRequest(url: string, token: string) {
    currentTestCookie = token;
    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method: "GET",
      headers: {
        Cookie: `mc_ops_session=${token}; mc_session_token=${token}`,
      },
    });
  }

  it("Scenario 1: Employee dashboard stats endpoint strips all charts, graphs, and financial KPI metrics", async () => {
    const req = createRequest("/api/dashboard/stats?range=30d", employeeToken);
    const res = await dashboardStatsHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();

    // 1. All visualization datasets must be strictly empty arrays for employees
    expect(data.salesTrend).toEqual([]);
    expect(data.categoryPerformance).toEqual([]);
    expect(data.inventoryHealth).toEqual([]);
    expect(data.attendanceTrends).toEqual([]);

    // 2. Financial totals must not be leaked to operational staff
    expect(data.periodSummary.revenue).toBe(0);
    expect(data.periodSummary.unitsSold).toBe(0);
    expect(data.periodSummary.transactions).toBe(0);
    expect(data.periodSummary.avgOrderValue).toBe(0);

    // 3. Discrepancy & financial alert queues must not be leaked
    expect(data.discrepancyQueue).toEqual([]);
    expect(data.lowStockAlerts).toEqual([]);
    expect(data.categoryBreakdown).toEqual([]);

    // 4. Employee operational workspace must be delivered
    expect(data.employeeWorkspace).toBeDefined();
    expect(data.employeeWorkspace.employeeCode).toBeDefined();
    expect(data.employeeWorkspace.branchName).toBeDefined();
    expect(data.employeeWorkspace.wifiSsid).toBe("Moto G85 5G");
    expect(Array.isArray(data.employeeWorkspace.assignedTasks)).toBe(true);
  });

  it("Scenario 2: Branch Manager continues to receive full analytics visualizations & sales metrics", async () => {
    const req = createRequest("/api/dashboard/stats?range=30d", managerToken);
    const res = await dashboardStatsHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();

    // Managers receive rich analytics for their branch
    expect(Array.isArray(data.salesTrend)).toBe(true);
    expect(Array.isArray(data.categoryPerformance)).toBe(true);
    expect(Array.isArray(data.inventoryHealth)).toBe(true);
    expect(Array.isArray(data.attendanceTrends)).toBe(true);
    expect(data.periodSummary.revenue).toBeGreaterThanOrEqual(0);
  });

  it("Scenario 3: Owner continues to receive executive sales & inventory charts while exempt from attendance", async () => {
    const req = createRequest("/api/dashboard/stats?range=30d", ownerToken);
    const res = await dashboardStatsHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();

    // Owner receives full sales and category analytics
    expect(Array.isArray(data.salesTrend)).toBe(true);
    expect(Array.isArray(data.categoryPerformance)).toBe(true);
    expect(Array.isArray(data.inventoryHealth)).toBe(true);

    // Owner is strictly exempt from employee attendance tracking
    expect(data.attendanceTrends).toEqual([]);
    expect(data.summary.pendingAttendanceExceptions).toBe(0);
  });

  it("Scenario 4: Authoritative categories have no prohibited business-type words in display labels", () => {
    BAKERY_CATEGORIES.forEach((cat) => {
      const label = getBakeryCategoryLabel(cat.id);
      expect(label.toLowerCase()).not.toContain("bakery");
    });
  });
});
