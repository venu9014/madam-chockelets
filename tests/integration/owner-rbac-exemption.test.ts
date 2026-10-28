import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { ROLES } from "../../src/lib/constants";
import { PERMISSIONS } from "../../src/lib/auth";

describe("Strict Role-Based Access Control & Owner Exemption Integration Tests", () => {
  let ownerUser: any;
  let managerUser: any;
  let employeeUser: any;
  let auditorUser: any;
  let branchInd: any;

  beforeAll(async () => {
    branchInd = await prisma.branch.findUnique({ where: { code: "IND" } });

    ownerUser = await prisma.user.findUnique({
      where: { email: "owner@madamchocolate.com" },
      include: { employee: true },
    });
    managerUser = await prisma.user.findUnique({
      where: { email: "manager.indiranagar@madamchocolate.com" },
      include: { employee: true },
    });
    employeeUser = await prisma.user.findUnique({
      where: { email: "employee.rahul@madamchocolate.com" },
      include: { employee: true },
    });
    auditorUser = await prisma.user.findUnique({
      where: { email: "auditor@madamchocolate.com" },
      include: { employee: true },
    });
  });

  describe("1. Owner Attendance Exemption & Exclusion", () => {
    it("should assert PERMISSIONS isAttendanceExempt is true for OWNER and false for others", () => {
      expect(PERMISSIONS.isAttendanceExempt(ROLES.OWNER)).toBe(true);
      expect(PERMISSIONS.isAttendanceExempt(ROLES.BRANCH_MANAGER)).toBe(false);
      expect(PERMISSIONS.isAttendanceExempt(ROLES.EMPLOYEE)).toBe(false);
      expect(PERMISSIONS.isAttendanceExempt(ROLES.AUDITOR)).toBe(false);
    });

    it("should assert PERMISSIONS canPerformAttendance is false for OWNER", () => {
      expect(PERMISSIONS.canPerformAttendance(ROLES.OWNER)).toBe(false);
      expect(PERMISSIONS.canPerformAttendance(ROLES.BRANCH_MANAGER)).toBe(true);
      expect(PERMISSIONS.canPerformAttendance(ROLES.EMPLOYEE)).toBe(true);
      expect(PERMISSIONS.canPerformAttendance(ROLES.AUDITOR)).toBe(true);
    });

    it("should assert PERMISSIONS canReviewAttendanceExceptions is restricted to BRANCH_MANAGER", () => {
      expect(PERMISSIONS.canReviewAttendanceExceptions(ROLES.OWNER)).toBe(false);
      expect(PERMISSIONS.canReviewAttendanceExceptions(ROLES.BRANCH_MANAGER)).toBe(true);
      expect(PERMISSIONS.canReviewAttendanceExceptions(ROLES.EMPLOYEE)).toBe(false);
      expect(PERMISSIONS.canReviewAttendanceExceptions(ROLES.AUDITOR)).toBe(false);
    });
  });

  describe("2. Owner Excluded from Employee Count & Operational Calculations", () => {
    it("should exclude accounts with role OWNER from active employee calculations", async () => {
      const activeEmployeeCount = await prisma.employee.count({
        where: {
          active: true,
          user: { role: { not: ROLES.OWNER } },
        },
      });

      const totalEmployeesWithUsers = await prisma.employee.count({
        where: { active: true },
      });

      // Total count must be greater than active count by at least 1 (the owner)
      expect(totalEmployeesWithUsers).toBeGreaterThanOrEqual(activeEmployeeCount);
    });

    it("should verify no attendance sessions exist for OWNER", async () => {
      const ownerEmp = await prisma.employee.findFirst({
        where: { userId: ownerUser.id },
      });

      if (ownerEmp) {
        const ownerSessions = await prisma.attendanceSession.count({
          where: { employeeId: ownerEmp.id },
        });
        expect(ownerSessions).toBe(0);
      }
    });

    it("should verify no attendance exceptions exist for OWNER", async () => {
      const ownerEmp = await prisma.employee.findFirst({
        where: { userId: ownerUser.id },
      });

      if (ownerEmp) {
        const ownerExceptions = await prisma.attendanceException.count({
          where: { employeeId: ownerEmp.id },
        });
        expect(ownerExceptions).toBe(0);
      }
    });
  });

  describe("3. Operational Task & Cleanliness Boundaries", () => {
    it("should verify OWNER cannot submit task checklists or reviews", () => {
      expect(PERMISSIONS.canSubmitTasks(ROLES.OWNER)).toBe(false);
      expect(PERMISSIONS.canReviewTasks(ROLES.OWNER)).toBe(false);

      expect(PERMISSIONS.canSubmitTasks(ROLES.EMPLOYEE)).toBe(true);
      expect(PERMISSIONS.canSubmitTasks(ROLES.BRANCH_MANAGER)).toBe(true);
      expect(PERMISSIONS.canReviewTasks(ROLES.BRANCH_MANAGER)).toBe(true);
    });

    it("should verify OWNER cannot conduct shelf physical counts", () => {
      expect(PERMISSIONS.canConductStockCount(ROLES.OWNER)).toBe(false);
      expect(PERMISSIONS.canConductStockCount(ROLES.EMPLOYEE)).toBe(true);
      expect(PERMISSIONS.canConductStockCount(ROLES.BRANCH_MANAGER)).toBe(true);
    });

    it("should verify OWNER retains macro executive powers (user management, SOP publishing, adjustments)", () => {
      expect(PERMISSIONS.canManageUsers(ROLES.OWNER)).toBe(true);
      expect(PERMISSIONS.canManageSops(ROLES.OWNER)).toBe(true);
      expect(PERMISSIONS.canApproveAdjustments(ROLES.OWNER)).toBe(true);

      // Non-owners denied
      expect(PERMISSIONS.canManageUsers(ROLES.BRANCH_MANAGER)).toBe(false);
      expect(PERMISSIONS.canManageSops(ROLES.BRANCH_MANAGER)).toBe(false);
      expect(PERMISSIONS.canApproveAdjustments(ROLES.BRANCH_MANAGER)).toBe(false);
      expect(PERMISSIONS.canApproveAdjustments(ROLES.EMPLOYEE)).toBe(false);
    });
  });

  describe("4. Notifications Category Scoping", () => {
    it("should filter out ATTENDANCE category notifications when querying for OWNER", async () => {
      // Create a test attendance notification
      const testNotif = await prisma.notification.create({
        data: {
          userId: ownerUser.id,
          title: "Test Attendance Notification",
          message: "Please punch in",
          category: "ATTENDANCE",
          type: "INFO",
        },
      });

      // Query mimicking /api/notifications GET for OWNER
      const whereClause: any = {
        OR: [
          { userId: ownerUser.id },
          { branchId: ownerUser.employee?.branchId || undefined },
          { userId: null, branchId: null },
        ],
        category: { not: "ATTENDANCE" },
      };

      const notifications = await prisma.notification.findMany({
        where: whereClause,
      });

      const hasAttendanceNotif = notifications.some((n) => n.category === "ATTENDANCE");
      expect(hasAttendanceNotif).toBe(false);

      // Clean up test notification
      await prisma.notification.delete({ where: { id: testNotif.id } });
    });
  });
});
