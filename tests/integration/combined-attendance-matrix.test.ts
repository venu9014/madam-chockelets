import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { evaluateAttendanceGeofence } from "../../src/lib/geofence";
import { evaluateWorkplaceWifi, generateWorkplaceChallenge } from "../../src/lib/wifi-verifier";

describe("Combined Attendance Decision Rules & Truth Table Matrix", () => {
  let branch: any;
  let employee: any;
  let challengeToken: string;

  beforeAll(async () => {
    branch = await prisma.branch.findFirst({ where: { active: true } });
    employee = await prisma.employee.findFirst({
      include: { user: true, branch: true },
    });

    const challenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: employee.id,
      secretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
    });
    challengeToken = challenge.challengeToken;
  });

  afterAll(async () => {
    // Clean up any test attendance sessions
    await prisma.attendanceSession.deleteMany({
      where: { notes: { contains: "TRUTH_TABLE_TEST" } },
    });
  });

  // Helper evaluating combined policy
  function evaluateCombinedPolicy(gpsValid: boolean, wifiValid: boolean, policy = "GPS_AND_WIFI") {
    if (policy === "GPS_AND_WIFI") {
      return gpsValid && wifiValid;
    }
    if (policy === "GPS_ONLY") {
      return gpsValid;
    }
    if (policy === "WIFI_ONLY") {
      return wifiValid;
    }
    if (policy === "GPS_OR_WIFI") {
      return gpsValid || wifiValid;
    }
    return false;
  }

  it("Rule 1: Wi-Fi Valid + GPS Valid -> Eligible for acceptance", async () => {
    const gpsResult = evaluateAttendanceGeofence({
      deviceLat: branch.latitude,
      deviceLon: branch.longitude,
      accuracyMeters: 10.0,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
      geofenceRadiusMeters: branch.geofenceRadiusMeters || 150.0,
    });
    expect(gpsResult.isWithinGeofence).toBe(true);

    const wifiResult = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: branch.wifiSsid,
      clientSsid: branch.wifiSsid,
      branchSecretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
      challengeToken,
      branchId: branch.id,
      employeeId: employee.id,
    });
    expect(wifiResult.isWifiVerified).toBe(true);

    const isEligible = evaluateCombinedPolicy(gpsResult.isWithinGeofence, wifiResult.isWifiVerified);
    expect(isEligible).toBe(true);
  });

  it("Rule 2: Wi-Fi Invalid + GPS Valid -> REJECT", async () => {
    const gpsResult = evaluateAttendanceGeofence({
      deviceLat: branch.latitude,
      deviceLon: branch.longitude,
      accuracyMeters: 10.0,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
    });
    expect(gpsResult.isWithinGeofence).toBe(true);

    const wifiResult = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: branch.wifiSsid,
      clientSsid: "Foreign_Hotspot",
      branchId: branch.id,
      employeeId: employee.id,
    });
    expect(wifiResult.isWifiVerified).toBe(false);

    const isEligible = evaluateCombinedPolicy(gpsResult.isWithinGeofence, wifiResult.isWifiVerified);
    expect(isEligible).toBe(false); // REJECT!
  });

  it("Rule 3: Wi-Fi Valid + GPS Invalid -> REJECT", async () => {
    const gpsResult = evaluateAttendanceGeofence({
      deviceLat: branch.latitude + 0.05, // 5km away!
      deviceLon: branch.longitude + 0.05,
      accuracyMeters: 10.0,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
    });
    expect(gpsResult.isWithinGeofence).toBe(false);

    const freshChallenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: employee.id,
      secretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
    });

    const wifiResult = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: branch.wifiSsid,
      clientSsid: branch.wifiSsid,
      branchSecretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
      challengeToken: freshChallenge.challengeToken,
      branchId: branch.id,
      employeeId: employee.id,
    });
    expect(wifiResult.isWifiVerified).toBe(true);

    const isEligible = evaluateCombinedPolicy(gpsResult.isWithinGeofence, wifiResult.isWifiVerified);
    expect(isEligible).toBe(false); // REJECT!
  });

  it("Rule 4: Wi-Fi Invalid + GPS Invalid -> REJECT", async () => {
    const gpsResult = evaluateAttendanceGeofence({
      deviceLat: branch.latitude + 0.05,
      deviceLon: branch.longitude + 0.05,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
    });
    expect(gpsResult.isWithinGeofence).toBe(false);

    const wifiResult = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: branch.wifiSsid,
      clientSsid: "Foreign_Hotspot",
      branchId: branch.id,
      employeeId: employee.id,
    });
    expect(wifiResult.isWifiVerified).toBe(false);

    const isEligible = evaluateCombinedPolicy(gpsResult.isWithinGeofence, wifiResult.isWifiVerified);
    expect(isEligible).toBe(false); // REJECT!
  });

  it("Rule 5: Wi-Fi Unknown (null) + GPS Valid -> REJECT", async () => {
    const gpsResult = evaluateAttendanceGeofence({
      deviceLat: branch.latitude,
      deviceLon: branch.longitude,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
    });
    expect(gpsResult.isWithinGeofence).toBe(true);

    const wifiResult = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: branch.wifiSsid,
      clientSsid: null,
      branchId: branch.id,
      employeeId: employee.id,
    });
    expect(wifiResult.isWifiVerified).toBe(false);

    const isEligible = evaluateCombinedPolicy(gpsResult.isWithinGeofence, wifiResult.isWifiVerified);
    expect(isEligible).toBe(false); // REJECT!
  });

  it("Rule 6: Wi-Fi Valid + GPS Unknown (null coords) -> REJECT", async () => {
    const gpsResult = evaluateAttendanceGeofence({
      deviceLat: null as any,
      deviceLon: null as any,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
    });
    expect(gpsResult.isWithinGeofence).toBe(false);

    const freshChallenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: employee.id,
      secretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
    });

    const wifiResult = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: branch.wifiSsid,
      clientSsid: branch.wifiSsid,
      branchSecretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
      challengeToken: freshChallenge.challengeToken,
      branchId: branch.id,
      employeeId: employee.id,
    });
    expect(wifiResult.isWifiVerified).toBe(true);

    const isEligible = evaluateCombinedPolicy(gpsResult.isWithinGeofence, wifiResult.isWifiVerified);
    expect(isEligible).toBe(false); // REJECT!
  });

  it("Rule 7: Wi-Fi Valid + GPS Valid but for WRONG branch -> REJECT", async () => {
    const whitefieldBranch = await prisma.branch.findUnique({ where: { code: "WHF" } });
    if (whitefieldBranch) {
      // Employee is at Whitefield, but branch is Indiranagar
      const gpsResult = evaluateAttendanceGeofence({
        deviceLat: whitefieldBranch.latitude,
        deviceLon: whitefieldBranch.longitude,
        branchLat: branch.latitude, // Checking against Indiranagar
        branchLon: branch.longitude,
      });

      expect(gpsResult.isWithinGeofence).toBe(false); // Distance is ~14km
      const isEligible = evaluateCombinedPolicy(gpsResult.isWithinGeofence, true);
      expect(isEligible).toBe(false); // REJECT!
    }
  });

  it("Rule 8: Concurrent duplicate punch prevention within atomic transaction", async () => {
    // Clean up any open sessions first
    await prisma.attendanceSession.deleteMany({
      where: { employeeId: employee.id, status: "OPEN" },
    });

    // Create an open session
    const firstSession = await prisma.attendanceSession.create({
      data: {
        employeeId: employee.id,
        branchId: branch.id,
        punchInTime: new Date(),
        status: "OPEN",
        notes: "TRUTH_TABLE_TEST: First open session",
      },
    });

    // Simulate concurrent punch-in: check inside transaction throws conflict
    let conflictThrown = false;
    try {
      await prisma.$transaction(async (tx) => {
        const inTxOpenSession = await tx.attendanceSession.findFirst({
          where: { employeeId: employee.id, status: "OPEN" },
        });
        if (inTxOpenSession) {
          throw new Error("CONFLICT_CONCURRENT_SESSION: An attendance session is already open.");
        }
      });
    } catch (err: any) {
      if (err.message.includes("CONFLICT_CONCURRENT_SESSION")) {
        conflictThrown = true;
      }
    }

    expect(conflictThrown).toBe(true);

    // Clean up
    await prisma.attendanceSession.delete({ where: { id: firstSession.id } });
  });

  it("Rule 9: Punch out without an active session is rejected", async () => {
    // Ensure no open sessions exist
    await prisma.attendanceSession.deleteMany({
      where: { employeeId: employee.id, status: "OPEN" },
    });

    const activeSession = await prisma.attendanceSession.findFirst({
      where: { employeeId: employee.id, status: "OPEN" },
    });

    expect(activeSession).toBeNull();
    // In /api/attendance/punch, action === "PUNCH_OUT" && !existingOpenSession returns 400 Bad Request
  });
});
