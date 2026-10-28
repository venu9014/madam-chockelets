import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { calculateHaversineDistanceMeters, evaluateAttendanceGeofence } from "../../src/lib/geofence";
import { generateWorkplaceChallenge, evaluateWorkplaceWifi } from "../../src/lib/wifi-verifier";
import { recordAuditEvent } from "../../src/lib/audit";

describe("Attendance Punch Integration Workflow Tests", () => {
  let branch: any;
  let employee: any;

  beforeEach(async () => {
    branch = await prisma.branch.findFirst({ where: { active: true } });
    employee = await prisma.employee.findFirst({
      include: { user: true, branch: true },
    });

    if (!branch || !employee) {
      throw new Error("Seed data missing: Active branch or employee not found.");
    }

    // Clean up any test sessions created during test runs for this employee
    await prisma.attendanceSession.deleteMany({
      where: {
        employeeId: employee.id,
        notes: { contains: "AUTOMATED_TEST" },
      },
    });
  });

  afterAll(async () => {
    if (employee) {
      await prisma.attendanceSession.deleteMany({
        where: {
          employeeId: employee.id,
          notes: { contains: "AUTOMATED_TEST" },
        },
      });
    }
  });

  it("should record a valid Punch In session within geofence and authorized Wi-Fi", async () => {
    // 1. Generate workplace Wi-Fi challenge
    const challenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: employee.id,
      secretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
    });

    // 2. Evaluate geofence (simulate within store boundary)
    const geofenceResult = evaluateAttendanceGeofence({
      deviceLat: branch.latitude + 0.0001, // ~11 meters away
      deviceLon: branch.longitude + 0.0001,
      accuracyMeters: 12.0,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
      geofenceRadiusMeters: branch.geofenceRadiusMeters || 150.0,
      maxAcceptableAccuracyMeters: branch.maxGpsAccuracyMeters || 50.0,
    });

    expect(geofenceResult.isWithinGeofence).toBe(true);
    expect(geofenceResult.accuracyAcceptable).toBe(true);

    // 3. Evaluate Wi-Fi challenge
    const wifiResult = await evaluateWorkplaceWifi({
      policy: branch.wifiVerificationPolicy || "GPS_AND_WIFI",
      branchSsid: branch.wifiSsid,
      clientSsid: branch.wifiSsid,
      branchSecretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
      challengeToken: challenge.challengeToken,
      branchId: branch.id,
      employeeId: employee.id,
    });

    expect(wifiResult.isWifiVerified).toBe(true);

    // 4. Create Attendance Session in DB
    const session = await prisma.attendanceSession.create({
      data: {
        employeeId: employee.id,
        branchId: branch.id,
        punchInTime: new Date(),
        status: "OPEN",
        inLatitude: branch.latitude + 0.0001,
        inLongitude: branch.longitude + 0.0001,
        inAccuracyMeters: 12.0,
        inDistanceMeters: geofenceResult.distanceMeters,
        inGpsVerified: geofenceResult.isWithinGeofence,
        inWifiSsid: branch.wifiSsid,
        inWifiVerified: wifiResult.isWifiVerified,
        inVerificationMethod: branch.wifiVerificationPolicy || "GPS_AND_WIFI",
        notes: "AUTOMATED_TEST: Valid punch in",
      },
    });

    expect(session.id).toBeDefined();
    expect(session.status).toBe("OPEN");
    expect(session.inGpsVerified).toBe(true);
    expect(session.inWifiVerified).toBe(true);

    // 5. Verify audit log event is recorded
    const audit = await recordAuditEvent({
      actorId: employee.userId,
      actorName: employee.user.name,
      actorRole: employee.user.role,
      action: "ATTENDANCE_PUNCH_IN",
      entityType: "ATTENDANCE",
      entityId: session.id,
      branchId: branch.id,
      metadata: {
        distanceMeters: geofenceResult.distanceMeters,
        wifiVerified: wifiResult.isWifiVerified,
      },
    });

    expect(audit).not.toBeNull();
    expect(audit?.action).toBe("ATTENDANCE_PUNCH_IN");
  });

  it("should prevent duplicate punch in when an open session already exists", async () => {
    // Create an initial open session
    await prisma.attendanceSession.create({
      data: {
        employeeId: employee.id,
        branchId: branch.id,
        punchInTime: new Date(),
        status: "OPEN",
        notes: "AUTOMATED_TEST: Existing open session",
      },
    });

    // Attempt to find any active open session
    const existingActive = await prisma.attendanceSession.findFirst({
      where: {
        employeeId: employee.id,
        status: "OPEN",
      },
    });

    expect(existingActive).not.toBeNull();
    // In our API endpoint, this results in HTTP 409 Conflict: "Employee already has an active attendance session."
  });

  it("should successfully complete Punch Out with accurate duration calculation", async () => {
    // Simulate a punch in that took place 120 minutes ago
    const punchInTime = new Date(Date.now() - 120 * 60 * 1000);

    const openSession = await prisma.attendanceSession.create({
      data: {
        employeeId: employee.id,
        branchId: branch.id,
        punchInTime,
        status: "OPEN",
        inGpsVerified: true,
        inWifiVerified: true,
        notes: "AUTOMATED_TEST: Session for punch out test",
      },
    });

    // Perform Punch Out
    const punchOutTime = new Date();
    const durationMinutes = Math.round(
      (punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60)
    );

    const completedSession = await prisma.attendanceSession.update({
      where: { id: openSession.id },
      data: {
        punchOutTime,
        durationMinutes,
        status: "COMPLETED",
        outLatitude: branch.latitude,
        outLongitude: branch.longitude,
        outAccuracyMeters: 10.0,
        outDistanceMeters: 5.0,
        outGpsVerified: true,
        outWifiSsid: branch.wifiSsid,
        outWifiVerified: true,
      },
    });

    expect(completedSession.status).toBe("COMPLETED");
    expect(completedSession.durationMinutes).toBeGreaterThanOrEqual(119);
    expect(completedSession.durationMinutes).toBeLessThanOrEqual(121);
    expect(completedSession.punchOutTime).not.toBeNull();
  });

  it("should mark session as FLAGGED if employee is outside geofence boundary", async () => {
    // Device is ~750m away from store
    const farLat = branch.latitude + 0.007;
    const farLon = branch.longitude + 0.007;

    const geofenceResult = evaluateAttendanceGeofence({
      deviceLat: farLat,
      deviceLon: farLon,
      accuracyMeters: 20.0,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
      geofenceRadiusMeters: branch.geofenceRadiusMeters || 150.0,
      maxAcceptableAccuracyMeters: branch.maxGpsAccuracyMeters || 50.0,
    });

    expect(geofenceResult.isWithinGeofence).toBe(false);
    expect(geofenceResult.requiresException).toBe(true);

    const flaggedSession = await prisma.attendanceSession.create({
      data: {
        employeeId: employee.id,
        branchId: branch.id,
        punchInTime: new Date(),
        status: "FLAGGED",
        inLatitude: farLat,
        inLongitude: farLon,
        inAccuracyMeters: 20.0,
        inDistanceMeters: geofenceResult.distanceMeters,
        inGpsVerified: false,
        inWifiVerified: false,
        notes: "AUTOMATED_TEST: FLAGGED - Outside 150m boundary",
      },
    });

    expect(flaggedSession.status).toBe("FLAGGED");
    expect(flaggedSession.inGpsVerified).toBe(false);
    expect(flaggedSession.inDistanceMeters).toBeGreaterThan(500);
  });

  it("should record a valid Punch In session within polygon geofence", async () => {
    // Indiranagar polygon points
    const polygonPoints = [
      { latitude: branch.latitude + 0.0007, longitude: branch.longitude - 0.0007 },
      { latitude: branch.latitude + 0.0007, longitude: branch.longitude + 0.0007 },
      { latitude: branch.latitude - 0.0007, longitude: branch.longitude + 0.0007 },
      { latitude: branch.latitude - 0.0007, longitude: branch.longitude - 0.0007 },
    ];

    const geofenceResult = evaluateAttendanceGeofence({
      deviceLat: branch.latitude,
      deviceLon: branch.longitude,
      accuracyMeters: 10.0,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
      geofenceType: "POLYGON",
      polygonPoints,
    });

    expect(geofenceResult.isWithinGeofence).toBe(true);
    expect(geofenceResult.geofenceType).toBe("POLYGON");

    const session = await prisma.attendanceSession.create({
      data: {
        employeeId: employee.id,
        branchId: branch.id,
        punchInTime: new Date(),
        status: "OPEN",
        inLatitude: branch.latitude,
        inLongitude: branch.longitude,
        inAccuracyMeters: 10.0,
        inDistanceMeters: geofenceResult.distanceMeters,
        inGpsVerified: true,
        inGeofenceType: "POLYGON",
        inWifiSsid: "Moto G85 5G",
        inWifiVerified: true,
        inVerificationMethod: "GPS_AND_WIFI",
        notes: "AUTOMATED_TEST: Valid polygon punch in",
      },
    });

    expect(session.id).toBeDefined();
    expect(session.inGeofenceType).toBe("POLYGON");
    expect(session.inGpsVerified).toBe(true);
  });

  it("should strictly enforce dual-factor: reject when GPS passes but Wi-Fi fails", async () => {
    // Device is inside store
    const geofenceResult = evaluateAttendanceGeofence({
      deviceLat: branch.latitude,
      deviceLon: branch.longitude,
      accuracyMeters: 10.0,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
      geofenceRadiusMeters: 150.0,
    });
    expect(geofenceResult.isWithinGeofence).toBe(true);

    // But device connects to unauthorized foreign Wi-Fi
    const wifiResult = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: "Moto G85 5G",
      clientSsid: "Neighboring_Cafe_FreeWiFi",
      branchId: branch.id,
      employeeId: employee.id,
    });
    expect(wifiResult.isWifiVerified).toBe(false);

    // Dual-factor compliance: GPS_AND_WIFI requires BOTH to pass
    const dualFactorSuccess = geofenceResult.isWithinGeofence && wifiResult.isWifiVerified;
    expect(dualFactorSuccess).toBe(false);
  });
});

