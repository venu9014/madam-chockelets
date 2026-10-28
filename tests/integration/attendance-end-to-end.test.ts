import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/auth";
import { ROLES } from "../../src/lib/constants";
import { generateWorkplaceChallenge } from "../../src/lib/wifi-verifier";
import { isPointInPolygon } from "../../src/lib/geofence";
import { NextRequest } from "next/server";

let currentTestCookie: string | null = null;

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      (name === "mc_ops_session" || name === "mc_session_token") && currentTestCookie
        ? { value: currentTestCookie }
        : undefined,
  }),
}));

import { POST as punchHandler } from "../../src/app/api/attendance/punch/route";
import { POST as checkinHandler } from "../../src/app/api/attendance/checkin/route";

describe("End-to-End Comprehensive Attendance System Tests", () => {
  let employeeUser: any;
  let managerUser: any;
  let auditorUser: any;
  let ownerUser: any;
  let branch: any;

  let employeeToken: string;
  let managerToken: string;
  let auditorToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    branch = await prisma.branch.findFirst({
      where: { code: "IND", active: true },
    });

    if (!branch) {
      throw new Error("Seed branch IND not found.");
    }

    employeeUser = await prisma.user.findUnique({
      where: { email: "employee.rahul@madamchocolate.com" },
      include: { employee: true },
    });
    managerUser = await prisma.user.findUnique({
      where: { email: "manager.indiranagar@madamchocolate.com" },
      include: { employee: true },
    });
    auditorUser = await prisma.user.findUnique({
      where: { email: "auditor@madamchocolate.com" },
      include: { employee: true },
    });
    ownerUser = await prisma.user.findUnique({
      where: { email: "owner@madamchocolate.com" },
      include: { employee: true },
    });

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

    auditorToken = signSessionToken({
      userId: auditorUser.id,
      email: auditorUser.email,
      role: auditorUser.role,
    });

    ownerToken = signSessionToken({
      userId: ownerUser.id,
      email: ownerUser.email,
      role: ownerUser.role,
    });

    // Clean up any test attendance sessions or events from previous runs
    const testEmployeeIds = [
      employeeUser?.employee?.id,
      managerUser?.employee?.id,
      auditorUser?.employee?.id,
    ].filter(Boolean);

    if (testEmployeeIds.length > 0) {
      await prisma.attendanceSession.deleteMany({
        where: {
          employeeId: { in: testEmployeeIds },
          notes: { contains: "AUTOMATED_E2E" },
        },
      });
      await prisma.attendanceEvent.deleteMany({
        where: {
          employeeId: { in: testEmployeeIds },
          notes: { contains: "AUTOMATED_E2E" },
        },
      });
    }
  });

  afterEach(async () => {
    // Clean up any test attendance sessions created during each test
    const testEmployeeIds = [
      employeeUser?.employee?.id,
      managerUser?.employee?.id,
      auditorUser?.employee?.id,
    ].filter(Boolean);

    if (testEmployeeIds.length > 0) {
      await prisma.attendanceSession.deleteMany({
        where: {
          employeeId: { in: testEmployeeIds },
          notes: { contains: "AUTOMATED_E2E" },
        },
      });
      await prisma.attendanceEvent.deleteMany({
        where: {
          employeeId: { in: testEmployeeIds },
          notes: { contains: "AUTOMATED_E2E" },
        },
      });
    }
  });

  function createRequest(url: string, body: any, token?: string) {
    currentTestCookie = token || null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Cookie"] = `mc_ops_session=${token}; mc_session_token=${token}`;
    }
    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  // 1. Authorized employee inside geofence with Wi-Fi verification passing
  it("Scenario 1: Authorized employee inside geofence with required Wi-Fi passes verification", async () => {
    const challenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: employeeUser.employee.id,
      secretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
    });

    const req = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_IN",
        latitude: branch.latitude + 0.0001,
        longitude: branch.longitude + 0.0001,
        accuracyMeters: 12.0,
        locationTimestamp: Date.now(),
        challengeToken: challenge.challengeToken,
        wifiSsid: branch.wifiSsid,
        notes: "AUTOMATED_E2E: Valid check in",
      },
      employeeToken
    );

    const res = await punchHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.session.status).toBe("OPEN");
    expect(data.session.inGpsVerified).toBe(true);
    expect(data.session.inWifiVerified).toBe(true);

    // Verify database persistence
    const savedSession = await prisma.attendanceSession.findUnique({
      where: { id: data.session.id },
    });
    expect(savedSession).not.toBeNull();
    expect(savedSession?.status).toBe("OPEN");

    // Clean up
    await prisma.attendanceSession.delete({ where: { id: data.session.id } });
  });

  // 2. Employee outside the geofence
  it("Scenario 2: Employee outside geofence boundary is rejected with location warning", async () => {
    const challenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: employeeUser.employee.id,
      secretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
    });

    const req = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_IN",
        latitude: branch.latitude + 0.01, // ~1.1 km away
        longitude: branch.longitude + 0.01,
        accuracyMeters: 15.0,
        locationTimestamp: Date.now(),
        challengeToken: challenge.challengeToken,
        wifiSsid: branch.wifiSsid,
        notes: "AUTOMATED_E2E: Outside geofence",
      },
      employeeToken
    );

    const res = await punchHandler(req);
    expect(res.status).toBe(422);

    const data = await res.json();
    expect(data.error).toContain("Location warning: You are outside the authorized workplace area");
  });

  // 3. Employee on incorrect Wi-Fi
  it("Scenario 3: Employee on unauthorized Wi-Fi network is rejected", async () => {
    const req = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_IN",
        latitude: branch.latitude + 0.0001,
        longitude: branch.longitude + 0.0001,
        accuracyMeters: 10.0,
        locationTimestamp: Date.now(),
        wifiSsid: "Neighboring_Cafe_Guest_Wifi",
        notes: "AUTOMATED_E2E: Wrong wifi",
      },
      employeeToken
    );

    const res = await punchHandler(req);
    expect(res.status).toBe(422);

    const data = await res.json();
    expect(data.error).toContain("Connected to unauthorized network");
  });

  // 4. Wi-Fi disconnected / no SSID provided
  it("Scenario 4: Wi-Fi disconnected (missing SSID) is rejected when policy requires Wi-Fi", async () => {
    const req = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_IN",
        latitude: branch.latitude + 0.0001,
        longitude: branch.longitude + 0.0001,
        accuracyMeters: 10.0,
        locationTimestamp: Date.now(),
        wifiSsid: "",
        notes: "AUTOMATED_E2E: Disconnected wifi",
      },
      employeeToken
    );

    const res = await punchHandler(req);
    expect(res.status).toBe(422);

    const data = await res.json();
    expect(data.error).toContain("No active Wi-Fi connection detected");
  });

  // 5. Denied location permissions / null coordinates
  it("Scenario 5: Denied location permissions (null GPS coordinates) is rejected", async () => {
    const req = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_IN",
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        wifiSsid: branch.wifiSsid,
        notes: "AUTOMATED_E2E: Null GPS",
      },
      employeeToken
    );

    const res = await punchHandler(req);
    expect(res.status).toBe(422);

    const data = await res.json();
    expect(data.error).toContain("No GPS coordinates provided");
  });

  // 6. Duplicate check-in and invalid check-out
  it("Scenario 6: Prevents duplicate punch in and prevents punch out without check-in", async () => {
    // 6a. Attempt punch-out when no session is open -> 400 Bad Request
    const outWithoutInReq = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_OUT",
        latitude: branch.latitude + 0.0001,
        longitude: branch.longitude + 0.0001,
        accuracyMeters: 10.0,
        wifiSsid: branch.wifiSsid,
        notes: "AUTOMATED_E2E: Punch out without in",
      },
      employeeToken
    );
    const outWithoutInRes = await punchHandler(outWithoutInReq);
    expect(outWithoutInRes.status).toBe(400);
    const outData = await outWithoutInRes.json();
    expect(outData.error).toContain("No active attendance session found to punch out");

    // 6b. Create open session
    const openSession = await prisma.attendanceSession.create({
      data: {
        employeeId: employeeUser.employee.id,
        branchId: branch.id,
        punchInTime: new Date(),
        status: "OPEN",
        notes: "AUTOMATED_E2E: Open session",
      },
    });

    // 6c. Attempt duplicate punch-in while session is open -> 409 Conflict
    const dupReq = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_IN",
        latitude: branch.latitude + 0.0001,
        longitude: branch.longitude + 0.0001,
        accuracyMeters: 10.0,
        wifiSsid: branch.wifiSsid,
        notes: "AUTOMATED_E2E: Duplicate punch in",
      },
      employeeToken
    );
    const dupRes = await punchHandler(dupReq);
    expect(dupRes.status).toBe(409);
    const dupData = await dupRes.json();
    expect(dupData.error).toContain("An attendance session is already open");

    // Clean up
    await prisma.attendanceSession.delete({ where: { id: openSession.id } });
  });

  // 7. Successful Punch In followed by valid Punch Out with shift duration
  it("Scenario 7: Full shift lifecycle: Punch In, work duration, then valid Punch Out", async () => {
    const punchInTime = new Date(Date.now() - 90 * 60 * 1000); // 90 min ago
    const session = await prisma.attendanceSession.create({
      data: {
        employeeId: employeeUser.employee.id,
        branchId: branch.id,
        punchInTime,
        status: "OPEN",
        inGpsVerified: true,
        inWifiVerified: true,
        notes: "AUTOMATED_E2E: Full shift test",
      },
    });

    const challenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: employeeUser.employee.id,
      secretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
    });

    const outReq = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_OUT",
        latitude: branch.latitude + 0.0001,
        longitude: branch.longitude + 0.0001,
        accuracyMeters: 10.0,
        locationTimestamp: Date.now(),
        challengeToken: challenge.challengeToken,
        wifiSsid: branch.wifiSsid,
        notes: "AUTOMATED_E2E: Punch out",
      },
      employeeToken
    );

    const outRes = await punchHandler(outReq);
    expect(outRes.status).toBe(200);

    const outData = await outRes.json();
    expect(outData.success).toBe(true);
    expect(outData.session.status).toBe("COMPLETED");
    expect(outData.session.durationMinutes).toBeGreaterThanOrEqual(89);
    expect(outData.session.durationMinutes).toBeLessThanOrEqual(91);

    // Verify database record
    const updated = await prisma.attendanceSession.findUnique({
      where: { id: session.id },
    });
    expect(updated?.status).toBe("COMPLETED");
    expect(updated?.punchOutTime).not.toBeNull();

    // Clean up
    await prisma.attendanceSession.delete({ where: { id: session.id } });
  });

  // 8. Branch Manager personal attendance
  it("Scenario 8: Branch Manager can record personal attendance when on premises", async () => {
    const challenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: managerUser.employee.id,
      secretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
    });

    const req = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_IN",
        latitude: branch.latitude + 0.0001,
        longitude: branch.longitude + 0.0001,
        accuracyMeters: 10.0,
        locationTimestamp: Date.now(),
        challengeToken: challenge.challengeToken,
        wifiSsid: branch.wifiSsid,
        notes: "AUTOMATED_E2E: Manager personal punch in",
      },
      managerToken
    );

    const res = await punchHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.session.status).toBe("OPEN");

    // Clean up
    await prisma.attendanceSession.delete({ where: { id: data.session.id } });
  });

  // 9. Auditor personal attendance
  it("Scenario 9: Auditor can record personal attendance when on premises", async () => {
    const challenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: auditorUser.employee.id,
      secretKey: branch.wifiSecretKey || "mc-workplace-secret-2026",
    });

    const req = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_IN",
        latitude: branch.latitude + 0.0001,
        longitude: branch.longitude + 0.0001,
        accuracyMeters: 10.0,
        locationTimestamp: Date.now(),
        challengeToken: challenge.challengeToken,
        wifiSsid: branch.wifiSsid,
        notes: "AUTOMATED_E2E: Auditor personal punch in",
      },
      auditorToken
    );

    const res = await punchHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.session.status).toBe("OPEN");

    // Clean up
    await prisma.attendanceSession.delete({ where: { id: data.session.id } });
  });

  // 10. Owner complete exclusion from attendance
  it("Scenario 10: Owner is strictly excluded from all attendance punch workflows (403 Forbidden)", async () => {
    const req = createRequest(
      "/api/attendance/punch",
      {
        action: "PUNCH_IN",
        latitude: branch.latitude,
        longitude: branch.longitude,
        accuracyMeters: 10.0,
        wifiSsid: branch.wifiSsid,
      },
      ownerToken
    );

    const res = await punchHandler(req);
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toContain("strictly exempt from employee attendance");
  });

  // 11. Direct API validation on /api/attendance/checkin
  it("Scenario 11: Direct API calls to /api/attendance/checkin strictly enforce dual-factor and duplicate prevention", async () => {
    // 11a. Owner blocked on checkin route
    const ownerCheckinReq = createRequest(
      "/api/attendance/checkin",
      {
        eventType: "CHECK_IN",
        branchId: branch.id,
        latitude: branch.latitude,
        longitude: branch.longitude,
      },
      ownerToken
    );
    const ownerCheckinRes = await checkinHandler(ownerCheckinReq);
    expect(ownerCheckinRes.status).toBe(403);

    // 11b. Employee outside geofence on checkin route rejected with 422
    const outsideReq = createRequest(
      "/api/attendance/checkin",
      {
        eventType: "CHECK_IN",
        branchId: branch.id,
        latitude: branch.latitude + 0.02,
        longitude: branch.longitude + 0.02,
        wifiSsid: branch.wifiSsid,
      },
      employeeToken
    );
    const outsideRes = await checkinHandler(outsideReq);
    expect(outsideRes.status).toBe(422);

    // 11c. Employee on wrong Wi-Fi on checkin route rejected with 422
    const wrongWifiReq = createRequest(
      "/api/attendance/checkin",
      {
        eventType: "CHECK_IN",
        branchId: branch.id,
        latitude: branch.latitude + 0.0001,
        longitude: branch.longitude + 0.0001,
        wifiSsid: "Public-Hotspot",
      },
      employeeToken
    );
    const wrongWifiRes = await checkinHandler(wrongWifiReq);
    expect(wrongWifiRes.status).toBe(422);
  });

  // 12. Boundary polygon handling
  it("Scenario 12: Points on polygon edges and vertices are correctly classified as inside", () => {
    const polygon = [
      { latitude: 12.9790, longitude: 77.6400 },
      { latitude: 12.9790, longitude: 77.6416 },
      { latitude: 12.9778, longitude: 77.6416 },
      { latitude: 12.9778, longitude: 77.6400 },
    ];

    // Point exactly on top edge: lat 12.9790, lng 77.6408
    const onEdgePoint = { latitude: 12.9790, longitude: 77.6408 };
    expect(isPointInPolygon(onEdgePoint, polygon)).toBe(true);

    // Point exactly on vertex: lat 12.9790, lng 77.6400
    const onVertexPoint = { latitude: 12.9790, longitude: 77.6400 };
    expect(isPointInPolygon(onVertexPoint, polygon)).toBe(true);

    // Point clearly outside: lat 12.9850, lng 77.6408
    const outsidePoint = { latitude: 12.9850, longitude: 77.6408 };
    expect(isPointInPolygon(outsidePoint, polygon)).toBe(false);
  });
});
