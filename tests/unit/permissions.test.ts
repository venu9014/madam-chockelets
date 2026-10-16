import { describe, it, expect } from "vitest";
import { PERMISSIONS } from "../../src/lib/auth";
import { ROLES } from "../../src/lib/constants";

describe("Permissions Matrix Unit Tests", () => {
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

  it("should permit task review to OWNER and BRANCH_MANAGER", () => {
    expect(PERMISSIONS.canReviewTasks(ROLES.OWNER)).toBe(true);
    expect(PERMISSIONS.canReviewTasks(ROLES.BRANCH_MANAGER)).toBe(true);
    expect(PERMISSIONS.canReviewTasks(ROLES.EMPLOYEE)).toBe(false);
    expect(PERMISSIONS.canReviewTasks(ROLES.AUDITOR)).toBe(false);
  });

  it("should designate AUDITOR as strictly read-only", () => {
    expect(PERMISSIONS.isReadOnly(ROLES.AUDITOR)).toBe(true);
    expect(PERMISSIONS.isReadOnly(ROLES.OWNER)).toBe(false);
    expect(PERMISSIONS.isReadOnly(ROLES.BRANCH_MANAGER)).toBe(false);
    expect(PERMISSIONS.isReadOnly(ROLES.EMPLOYEE)).toBe(false);
  });
});
