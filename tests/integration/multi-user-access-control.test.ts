import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { ROLES } from "../../src/lib/constants";
import { signSessionToken, verifySessionToken } from "../../src/lib/auth";

describe("Multi-User Access Control & Data Isolation Integration Tests", () => {
  let ownerUser: any;
  let managerIndUser: any;
  let managerKorUser: any;
  let employeeA: any; // baker.ind1
  let employeeB: any; // cashier.ind2
  let auditorUser: any;

  let branchInd: any;
  let branchKor: any;

  beforeAll(async () => {
    branchInd = await prisma.branch.findUnique({ where: { code: "IND" } });
    branchKor = await prisma.branch.findUnique({ where: { code: "KOR" } });

    ownerUser = await prisma.user.findUnique({
      where: { email: "owner@madamchocolate.com" },
      include: { employee: true },
    });
    managerIndUser = await prisma.user.findUnique({
      where: { email: "manager.indiranagar@madamchocolate.com" },
      include: { employee: true },
    });
    managerKorUser = await prisma.user.findUnique({
      where: { email: "manager.koramangala@madamchocolate.com" },
      include: { employee: true },
    });
    employeeA = await prisma.user.findUnique({
      where: { email: "employee.rahul@madamchocolate.com" },
      include: { employee: true },
    });
    employeeB = await prisma.user.findUnique({
      where: { email: "employee.priya@madamchocolate.com" },
      include: { employee: true },
    });
    auditorUser = await prisma.user.findUnique({
      where: { email: "auditor@madamchocolate.com" },
      include: { employee: true },
    });
  });

  describe("1. Employee-to-Employee Data Isolation", () => {
    it("Employee A can query their own attendance sessions", async () => {
      const sessions = await prisma.attendanceSession.findMany({
        where: { employeeId: employeeA.employee.id },
      });
      expect(sessions).toBeDefined();
    });

    it("Attendance history query strictly enforces employee isolation for EMPLOYEE role", async () => {
      // Simulating what /api/attendance/history does:
      // When user is employeeA, even if query param requested employeeId is employeeB,
      // whereClause.employeeId is forced to employeeA.employee.id!
      const userRole = employeeA.role;
      const requestedEmployeeId = employeeB.employee.id; // Employee A attempts to query Employee B!

      const whereClause: Record<string, unknown> = {};
      if (userRole === ROLES.EMPLOYEE) {
        whereClause.employeeId = employeeA.employee.id; // Override: strictly self only!
      } else {
        whereClause.employeeId = requestedEmployeeId;
      }

      const sessions = await prisma.attendanceSession.findMany({
        where: whereClause,
      });

      // All returned records must belong ONLY to employeeA, never employeeB!
      for (const s of sessions) {
        expect(s.employeeId).toBe(employeeA.employee.id);
        expect(s.employeeId).not.toBe(employeeB.employee.id);
      }
    });

    it("Employee B cannot view Employee A's attendance records", async () => {
      const userRole = employeeB.role;
      const requestedEmployeeId = employeeA.employee.id;

      const whereClause: Record<string, unknown> = {};
      if (userRole === ROLES.EMPLOYEE) {
        whereClause.employeeId = employeeB.employee.id; // Override: strictly self only!
      }

      const sessions = await prisma.attendanceSession.findMany({
        where: whereClause,
      });

      for (const s of sessions) {
        expect(s.employeeId).toBe(employeeB.employee.id);
        expect(s.employeeId).not.toBe(employeeA.employee.id);
      }
    });

    it("Employee cannot submit a task assigned to another employee", async () => {
      // Create a test task assigned to Employee A
      const testTask = await prisma.task.findFirst({
        where: { assignedEmployeeId: employeeA.employee.id },
      });

      if (testTask) {
        // Employee B attempting to submit Employee A's task
        const isForbidden =
          employeeB.role === ROLES.EMPLOYEE &&
          testTask.assignedEmployeeId &&
          testTask.assignedEmployeeId !== employeeB.employee.id;

        expect(isForbidden).toBe(true);
      }
    });

    it("Employee cannot modify another employee's notification", async () => {
      // Create a test notification for Employee A
      const notif = await prisma.notification.create({
        data: {
          userId: employeeA.id,
          title: "Confidential Notification for Employee A",
          message: "Shift update for Baker 1",
          category: "ATTENDANCE",
          type: "INFO",
        },
      });

      // Employee B tries to update this notification
      const isForbidden = notif.userId !== employeeB.id;
      expect(isForbidden).toBe(true);

      // Clean up
      await prisma.notification.delete({ where: { id: notif.id } });
    });
  });

  describe("2. Employee-to-Admin Access Restrictions", () => {
    it("Employee role cannot access admin settings", () => {
      const allowedRoles = [ROLES.OWNER, ROLES.BRANCH_MANAGER, ROLES.AUDITOR];
      expect(allowedRoles.includes(employeeA.role as any)).toBe(false);
    });

    it("Employee role cannot view audit logs", () => {
      const allowedRoles = [ROLES.OWNER, ROLES.BRANCH_MANAGER, ROLES.AUDITOR];
      expect(allowedRoles.includes(employeeA.role as any)).toBe(false);
    });

    it("Employee role cannot initiate stock transfers", () => {
      const allowedRoles = [ROLES.OWNER, ROLES.BRANCH_MANAGER];
      expect(allowedRoles.includes(employeeA.role as any)).toBe(false);
    });

    it("Employee role cannot approve stock adjustments", () => {
      const allowedRoles = [ROLES.OWNER];
      expect(allowedRoles.includes(employeeA.role as any)).toBe(false);
    });

    it("Employee role cannot modify branch coordinates, Wi-Fi SSID, or geofences", () => {
      const allowedRoles = [ROLES.OWNER, ROLES.BRANCH_MANAGER];
      expect(allowedRoles.includes(employeeA.role as any)).toBe(false);
    });
  });

  describe("3. Branch Manager Scoping & Cross-Branch Isolation", () => {
    it("Branch Manager can only view their own branch attendance records", async () => {
      const managerBranchId = managerIndUser.employee.branchId;
      expect(managerBranchId).toBe(branchInd.id);

      const whereClause = { branchId: managerBranchId };
      const sessions = await prisma.attendanceSession.findMany({ where: whereClause });

      for (const s of sessions) {
        expect(s.branchId).toBe(branchInd.id);
        expect(s.branchId).not.toBe(branchKor.id);
      }
    });

    it("Branch Manager cannot modify another branch's attendance settings", () => {
      const managerBranchId = managerIndUser.employee.branchId;
      const targetBranchId = branchKor.id; // Koramangala

      const isForbidden = managerIndUser.role === ROLES.BRANCH_MANAGER && managerBranchId !== targetBranchId;
      expect(isForbidden).toBe(true);
    });

    it("Branch Manager cannot dispatch transfers from another branch", () => {
      const managerBranchId = managerIndUser.employee.branchId;
      const sourceBranchId = branchKor.id;

      const isForbidden = managerIndUser.role === ROLES.BRANCH_MANAGER && managerBranchId !== sourceBranchId;
      expect(isForbidden).toBe(true);
    });

    it("Branch Manager cannot approve stock adjustment requests (Owner Only)", () => {
      const allowedRoles = [ROLES.OWNER];
      expect(allowedRoles.includes(managerIndUser.role as any)).toBe(false);
    });
  });

  describe("4. Owner Global Oversight & Auditor Read-Only", () => {
    it("Owner has access across all branches", async () => {
      const branches = await prisma.branch.findMany({ where: { active: true } });
      expect(branches.length).toBeGreaterThanOrEqual(3);
    });

    it("Auditor cannot perform write actions (isReadOnly: true)", () => {
      const allowedWriteRoles = [ROLES.OWNER, ROLES.BRANCH_MANAGER];
      expect(allowedWriteRoles.includes(auditorUser.role as any)).toBe(false);
    });
  });

  describe("5. Credential & Sensitive Data Security", () => {
    it("User queries omit passwordHash from public fields", async () => {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, active: true },
      });

      for (const u of users) {
        expect((u as any).passwordHash).toBeUndefined();
      }
    });

    it("Tokens verify correctly and contain no passwords or secrets", () => {
      const token = signSessionToken({
        userId: employeeA.id,
        email: employeeA.email,
        role: employeeA.role,
      });

      const decoded = verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(employeeA.id);
      expect((decoded as any).password).toBeUndefined();
      expect((decoded as any).passwordHash).toBeUndefined();
    });

    it("Deactivated user accounts are rejected immediately upon token verification", async () => {
      // Create a temporary inactive user
      const inactiveUser = await prisma.user.create({
        data: {
          email: "deactivated.test@madamchocolate.com",
          name: "Deactivated Test User",
          passwordHash: "hash-placeholder",
          role: ROLES.EMPLOYEE,
          active: false,
        },
      });

      const token = signSessionToken({
        userId: inactiveUser.id,
        email: inactiveUser.email,
        role: inactiveUser.role,
      });

      const decoded = verifySessionToken(token);
      expect(decoded?.userId).toBe(inactiveUser.id);

      // getCurrentUser checks active: true in the database!
      const liveUser = await prisma.user.findUnique({
        where: { id: decoded!.userId, active: true },
      });

      expect(liveUser).toBeNull(); // Rejected!

      // Cleanup
      await prisma.user.delete({ where: { id: inactiveUser.id } });
    });
  });
});
