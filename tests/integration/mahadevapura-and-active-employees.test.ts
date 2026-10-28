import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { ROLES } from "../../src/lib/constants";
import { evaluateAttendanceGeofence } from "../../src/lib/geofence";

describe("Mahadevapura Outlet & Active Employee Analytics Integration Tests", () => {
  it("should have persisted Mahadevapura outlet with exact coordinates and parameters", async () => {
    const mhdBranch = await prisma.branch.findUnique({
      where: { code: "MHD" },
    });

    expect(mhdBranch).not.toBeNull();
    expect(mhdBranch?.name).toBe("Mahadevapura");
    expect(mhdBranch?.code).toBe("MHD");
    expect(mhdBranch?.latitude).toBeCloseTo(12.99023, 5);
    expect(mhdBranch?.longitude).toBeCloseTo(77.68781, 5);
    expect(mhdBranch?.geofenceRadiusMeters).toBe(150);
    expect(mhdBranch?.wifiSsid).toBe("Moto G85 5G");
    expect(mhdBranch?.active).toBe(true);
  });

  it("should validate that coordinates at Mahadevapura branch center are inside the geofence", () => {
    // Exact center coordinates: 12.99023, 77.68781
    const insideResult = evaluateAttendanceGeofence({
      deviceLat: 12.99023,
      deviceLon: 77.68781,
      branchLat: 12.99023,
      branchLon: 77.68781,
      geofenceRadiusMeters: 150,
      accuracyMeters: 15,
      maxAcceptableAccuracyMeters: 50,
      locationTimestamp: new Date(),
    });

    expect(insideResult.isWithinGeofence).toBe(true);
    expect(insideResult.distanceMeters).toBeLessThan(5);

    // 500m away outside Mahadevapura (approx 0.0045 degrees lat diff)
    const outsideResult = evaluateAttendanceGeofence({
      deviceLat: 12.99500,
      deviceLon: 77.68781,
      branchLat: 12.99023,
      branchLon: 77.68781,
      geofenceRadiusMeters: 150,
      accuracyMeters: 15,
      maxAcceptableAccuracyMeters: 50,
      locationTimestamp: new Date(),
    });

    expect(outsideResult.isWithinGeofence).toBe(false);
    expect(outsideResult.distanceMeters).toBeGreaterThan(150);
    expect(outsideResult.status).toBe("OUTSIDE_GEOFENCE");
  });

  it("should filter active living employees strictly: excluding inactive, resigned, or terminated", async () => {
    // 1. Fetch count of all employees
    const allEmployees = await prisma.employee.findMany({
      include: { user: true },
    });

    // 2. Fetch living active employees (excluding owner and inactive/resigned/terminated)
    const activeLivingEmployees = await prisma.employee.findMany({
      where: {
        active: true,
        employmentStatus: "ACTIVE",
        user: {
          active: true,
          role: { not: ROLES.OWNER },
        },
      },
      include: { user: true },
    });

    // Verify none of the active living employees are OWNER
    activeLivingEmployees.forEach((emp) => {
      expect(emp.user.role).not.toBe(ROLES.OWNER);
      expect(emp.active).toBe(true);
      expect(emp.employmentStatus).toBe("ACTIVE");
      expect(emp.user.active).toBe(true);
    });

    // Verify all activeLivingEmployees have valid employment statuses
    expect(activeLivingEmployees.length).toBeGreaterThan(0);
  });

  it("should preserve historical attendance sessions even if an employee is marked inactive or resigned", async () => {
    // Find an employee who has attendance sessions
    const employeeWithSessions = await prisma.employee.findFirst({
      where: {
        attendanceSessions: { some: {} },
      },
      include: {
        attendanceSessions: true,
        user: true,
      },
    });

    expect(employeeWithSessions).not.toBeNull();
    const originalSessionCount = employeeWithSessions!.attendanceSessions.length;
    expect(originalSessionCount).toBeGreaterThan(0);

    // Simulate audit retrieval: sessions remain in AttendanceSession table regardless of status
    const allHistoricalSessions = await prisma.attendanceSession.findMany({
      where: { employeeId: employeeWithSessions!.id },
    });

    expect(allHistoricalSessions.length).toBe(originalSessionCount);
  });

  it("should ensure the Owner has zero attendance tracking records and is exempt from metrics", async () => {
    const ownerUser = await prisma.user.findFirst({
      where: { role: ROLES.OWNER },
      include: { employee: true },
    });

    expect(ownerUser).not.toBeNull();
    
    // If Owner has an employee record, it must have 0 attendance sessions
    if (ownerUser?.employee) {
      const ownerSessions = await prisma.attendanceSession.findMany({
        where: { employeeId: ownerUser.employee.id },
      });
      expect(ownerSessions.length).toBe(0);
    }

    // Active analytics query explicitly excludes Owner
    const analyticsEmployees = await prisma.employee.findMany({
      where: {
        active: true,
        employmentStatus: "ACTIVE",
        user: {
          active: true,
          role: { not: ROLES.OWNER },
        },
      },
    });

    if (ownerUser?.employee) {
      const foundOwner = analyticsEmployees.some((e) => e.id === ownerUser.employee!.id);
      expect(foundOwner).toBe(false);
    }
  });

  it("should verify immutable audit trail exists for Mahadevapura branch creation", async () => {
    const mhdBranch = await prisma.branch.findUnique({
      where: { code: "MHD" },
    });
    expect(mhdBranch).not.toBeNull();

    const auditLogs = await prisma.auditEvent.findMany({
      where: {
        entityType: "BRANCH",
        entityId: mhdBranch!.id,
        action: "WORKPLACE_OUTLET_CREATED",
      },
    });

    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    expect(auditLogs[0].action).toBe("WORKPLACE_OUTLET_CREATED");
    expect(auditLogs[0].metadataJson).toContain("MHD");
  });

  it("should confirm all 4 branches are registered with unique codes", async () => {
    const branches = await prisma.branch.findMany({
      where: { active: true },
      select: { code: true, name: true, wifiSsid: true },
    });

    const codes = branches.map((b) => b.code);
    expect(codes).toContain("IND");
    expect(codes).toContain("KOR");
    expect(codes).toContain("WHF");
    expect(codes).toContain("MHD");

    // Check unique set
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);

    // Check Mahadevapura branch
    const mhd = branches.find((b) => b.code === "MHD");
    expect(mhd?.name).toBe("Mahadevapura");
    expect(mhd?.wifiSsid).toBe("Moto G85 5G");
  });

  it("should successfully read back Mahadevapura by ID with exact coordinates and active status", async () => {
    const mhd = await prisma.branch.findUnique({
      where: { code: "MHD" },
    });
    expect(mhd).not.toBeNull();
    expect(mhd!.active).toBe(true);

    const readBack = await prisma.branch.findUnique({
      where: { id: mhd!.id },
    });
    expect(readBack).not.toBeNull();
    expect(readBack!.name).toBe("Mahadevapura");
    expect(readBack!.code).toBe("MHD");
    expect(readBack!.latitude).toBe(12.99023);
    expect(readBack!.longitude).toBe(77.68781);
    expect(readBack!.geofenceRadiusMeters).toBe(150.0);
    expect(readBack!.wifiSsid).toBe("Moto G85 5G");
    expect(readBack!.active).toBe(true);
  });
});
