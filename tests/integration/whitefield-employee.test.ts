import { describe, it, expect } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { ROLES } from "../../src/lib/constants";
import { verifyPassword, signSessionToken, verifySessionToken } from "../../src/lib/auth";

describe("Whitefield Test Employee Integration Tests", () => {
  it("should have created and persisted Whitefield Test Employee with exact details", async () => {
    const employee = await prisma.employee.findFirst({
      where: {
        user: { email: "employee.whitefield@madamchocolate.com" },
      },
      include: {
        user: true,
        branch: true,
      },
    });

    expect(employee).not.toBeNull();
    expect(employee?.user.name).toBe("Whitefield Test Employee");
    expect(employee?.user.email).toBe("employee.whitefield@madamchocolate.com");
    expect(employee?.user.role).toBe(ROLES.EMPLOYEE);
    expect(employee?.user.active).toBe(true);
    expect(employee?.active).toBe(true);
    expect(employee?.employmentStatus).toBe("ACTIVE");

    // Must be assigned exclusively to Whitefield
    expect(employee?.branch.code).toBe("WHF");
    expect(employee?.branch.name).toContain("Whitefield");

    // Must have a valid unique employee code
    expect(employee?.employeeCode).toMatch(/^MC-WHF-\d{3}/);
  });

  it("should verify secure password authentication using bcrypt", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "employee.whitefield@madamchocolate.com" },
    });

    expect(user).not.toBeNull();

    // Correct password must pass
    const isValid = await verifyPassword("MadamChoc2026!", user!.passwordHash);
    expect(isValid).toBe(true);

    // Incorrect password must fail
    const isInvalid = await verifyPassword("WrongPassword123!", user!.passwordHash);
    expect(isInvalid).toBe(false);
  });

  it("should generate a valid session token that resolves to the Whitefield employee", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "employee.whitefield@madamchocolate.com" },
      include: {
        employee: {
          include: { branch: true },
        },
      },
    });

    expect(user).not.toBeNull();
    const token = signSessionToken({
      userId: user!.id,
      email: user!.email,
      role: user!.role,
    });

    const decoded = verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(user!.id);
    expect(decoded?.email).toBe(user!.email);
    expect(decoded?.role).toBe(ROLES.EMPLOYEE);
    expect(user!.employee?.branch.code).toBe("WHF");
    expect(user!.employee?.branch.name).toContain("Whitefield");
    expect(user!.employee?.branch.code).not.toBe("IND");
  });

  it("should ensure Whitefield employee's outlet scope is strictly Whitefield", async () => {
    const empUser = await prisma.user.findUnique({
      where: { email: "employee.whitefield@madamchocolate.com" },
      include: {
        employee: {
          include: { branch: true },
        },
      },
    });

    // In /api/branches, for user.role === EMPLOYEE:
    // branchWhere = { id: user.branchId, active: true }
    const authorizedBranches = await prisma.branch.findMany({
      where: {
        id: empUser!.employee!.branchId,
        active: true,
      },
    });

    expect(authorizedBranches.length).toBe(1);
    expect(authorizedBranches[0].code).toBe("WHF");
    expect(authorizedBranches[0].name).toContain("Whitefield");
  });

  it("should preserve all existing employees and boutique records without regression", async () => {
    // 1. Indiranagar employee Rahul Verma must still exist and be assigned to IND
    const rahul = await prisma.employee.findFirst({
      where: { user: { email: "employee.rahul@madamchocolate.com" } },
      include: { user: true, branch: true },
    });
    expect(rahul).not.toBeNull();
    expect(rahul?.branch.code).toBe("IND");

    // 2. Whitefield manager Kabir Sen must still exist and be assigned to WHF
    const kabir = await prisma.employee.findFirst({
      where: { user: { email: "manager.whitefield@madamchocolate.com" } },
      include: { user: true, branch: true },
    });
    expect(kabir).not.toBeNull();
    expect(kabir?.branch.code).toBe("WHF");

    // 3. Branches count must include IND, KOR, WHF, MHD
    const allBranches = await prisma.branch.findMany({ where: { active: true } });
    const codes = allBranches.map((b) => b.code);
    expect(codes).toContain("IND");
    expect(codes).toContain("KOR");
    expect(codes).toContain("WHF");
    expect(codes).toContain("MHD");
  });
});
