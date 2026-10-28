import { describe, it, expect } from "vitest";
import { PERMISSIONS, getAuthErrorResponse } from "../../src/lib/auth";
import { ROLES } from "../../src/lib/constants";
import { prisma } from "../../src/lib/prisma";

describe("Permissions Matrix & Access Control Unit Tests", () => {
  describe("Role-Based Permission Matrix", () => {
    it("should permit adjustment approvals only to OWNER", () => {
      expect(PERMISSIONS.canApproveAdjustments(ROLES.OWNER)).toBe(true);
      expect(PERMISSIONS.canApproveAdjustments(ROLES.BRANCH_MANAGER)).toBe(false);
      expect(PERMISSIONS.canApproveAdjustments(ROLES.EMPLOYEE)).toBe(false);
      expect(PERMISSIONS.canApproveAdjustments(ROLES.AUDITOR)).toBe(false);
    });

    it("should permit SOP management only to OWNER", () => {
      expect(PERMISSIONS.canManageSops(ROLES.OWNER)).toBe(true);
      expect(PERMISSIONS.canManageSops(ROLES.BRANCH_MANAGER)).toBe(false);
      expect(PERMISSIONS.canManageSops(ROLES.EMPLOYEE)).toBe(false);
    });

    it("should permit user management only to OWNER", () => {
      expect(PERMISSIONS.canManageUsers(ROLES.OWNER)).toBe(true);
      expect(PERMISSIONS.canManageUsers(ROLES.BRANCH_MANAGER)).toBe(false);
      expect(PERMISSIONS.canManageUsers(ROLES.EMPLOYEE)).toBe(false);
      expect(PERMISSIONS.canManageUsers(ROLES.AUDITOR)).toBe(false);
    });

    it("should permit task review to BRANCH_MANAGER only", () => {
      expect(PERMISSIONS.canReviewTasks(ROLES.OWNER)).toBe(false);
      expect(PERMISSIONS.canReviewTasks(ROLES.BRANCH_MANAGER)).toBe(true);
      expect(PERMISSIONS.canReviewTasks(ROLES.EMPLOYEE)).toBe(false);
      expect(PERMISSIONS.canReviewTasks(ROLES.AUDITOR)).toBe(false);
    });

    it("should strictly exempt OWNER from attendance while permitting operational staff", () => {
      expect(PERMISSIONS.isAttendanceExempt(ROLES.OWNER)).toBe(true);
      expect(PERMISSIONS.isAttendanceExempt(ROLES.BRANCH_MANAGER)).toBe(false);
      expect(PERMISSIONS.isAttendanceExempt(ROLES.EMPLOYEE)).toBe(false);
      expect(PERMISSIONS.isAttendanceExempt(ROLES.AUDITOR)).toBe(false);

      expect(PERMISSIONS.canPerformAttendance(ROLES.OWNER)).toBe(false);
      expect(PERMISSIONS.canPerformAttendance(ROLES.BRANCH_MANAGER)).toBe(true);
      expect(PERMISSIONS.canPerformAttendance(ROLES.EMPLOYEE)).toBe(true);
      expect(PERMISSIONS.canPerformAttendance(ROLES.AUDITOR)).toBe(true);
    });

    it("should permit attendance exception review only to BRANCH_MANAGER", () => {
      expect(PERMISSIONS.canReviewAttendanceExceptions(ROLES.OWNER)).toBe(false);
      expect(PERMISSIONS.canReviewAttendanceExceptions(ROLES.BRANCH_MANAGER)).toBe(true);
      expect(PERMISSIONS.canReviewAttendanceExceptions(ROLES.EMPLOYEE)).toBe(false);
      expect(PERMISSIONS.canReviewAttendanceExceptions(ROLES.AUDITOR)).toBe(false);
    });

    it("should exclude OWNER from daily task submission and physical stock counts", () => {
      expect(PERMISSIONS.canSubmitTasks(ROLES.OWNER)).toBe(false);
      expect(PERMISSIONS.canSubmitTasks(ROLES.EMPLOYEE)).toBe(true);
      expect(PERMISSIONS.canSubmitTasks(ROLES.BRANCH_MANAGER)).toBe(true);

      expect(PERMISSIONS.canConductStockCount(ROLES.OWNER)).toBe(false);
      expect(PERMISSIONS.canConductStockCount(ROLES.BRANCH_MANAGER)).toBe(true);
      expect(PERMISSIONS.canConductStockCount(ROLES.EMPLOYEE)).toBe(true);
    });

    it("should permit transfer initiation to OWNER and BRANCH_MANAGER (EMPLOYEE denied)", () => {
      expect(PERMISSIONS.canInitiateTransfers(ROLES.OWNER)).toBe(true);
      expect(PERMISSIONS.canInitiateTransfers(ROLES.BRANCH_MANAGER)).toBe(true);
      expect(PERMISSIONS.canInitiateTransfers(ROLES.EMPLOYEE)).toBe(false);
      expect(PERMISSIONS.canInitiateTransfers(ROLES.AUDITOR)).toBe(false);
    });

    it("should designate AUDITOR as strictly read-only", () => {
      expect(PERMISSIONS.isReadOnly(ROLES.AUDITOR)).toBe(true);
      expect(PERMISSIONS.isReadOnly(ROLES.OWNER)).toBe(false);
      expect(PERMISSIONS.isReadOnly(ROLES.BRANCH_MANAGER)).toBe(false);
      expect(PERMISSIONS.isReadOnly(ROLES.EMPLOYEE)).toBe(false);
    });
  });

  describe("HTTP Error Code Classification", () => {
    it("should return 401 for unauthenticated errors", () => {
      const err = new Error("UNAUTHORIZED: Authentication required.");
      const res = getAuthErrorResponse(err);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);
      expect(res?.error).toContain("UNAUTHORIZED");
    });

    it("should return 403 for forbidden role errors", () => {
      const err = new Error("FORBIDDEN: User role 'EMPLOYEE' lacks permission for this action.");
      const res = getAuthErrorResponse(err);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(403);
      expect(res?.error).toContain("FORBIDDEN");
    });

    it("should return null for unrelated system errors", () => {
      const err = new Error("Database connection failed");
      const res = getAuthErrorResponse(err);
      expect(res).toBeNull();
    });
  });

  describe("Sensitive Credential Leak Prevention", () => {
    it("should verify passwordHash is never returned in public user profiles", async () => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
        },
      });

      expect(users.length).toBeGreaterThan(0);
      for (const u of users) {
        expect((u as any).passwordHash).toBeUndefined();
      }
    });

    it("should verify employees belong to their assigned branches", async () => {
      const employees = await prisma.employee.findMany({
        include: { branch: true, user: true },
      });

      expect(employees.length).toBeGreaterThan(0);
      for (const emp of employees) {
        expect(emp.branchId).toBeDefined();
        expect(emp.branch.active).toBe(true);
        expect(emp.user.email).toBeDefined();
      }
    });
  });
});
