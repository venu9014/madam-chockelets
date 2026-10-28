import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { evaluateAttendanceGeofence } from "@/lib/geofence";
import { evaluateWorkplaceWifi } from "@/lib/wifi-verifier";
import { recordAuditEvent } from "@/lib/audit";


export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Owner accounts are strictly exempt from attendance
    if (user.role === "OWNER") {
      return NextResponse.json(
        { error: "Owner accounts are strictly exempt from employee attendance and cannot record punch events." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      branchId: targetBranchId,
      action, // "PUNCH_IN" or "PUNCH_OUT"
      latitude,
      longitude,
      accuracyMeters,
      locationTimestamp,
      challengeToken,
      wifiSsid,
      wifiBssid,
      deviceDetails,
      notes,
      isSimulated = false,
      simulationScenario,
    } = body;

    if (!action || !["PUNCH_IN", "PUNCH_OUT"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be PUNCH_IN or PUNCH_OUT." },
        { status: 400 }
      );
    }

    // 1. Fetch trusted employee profile and assigned branch
    let employee = await prisma.employee.findFirst({
      where: user.employeeId ? { id: user.employeeId } : { userId: user.id },
      include: {
        branch: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!employee) {
      const defaultBranch = await prisma.branch.findFirst({ where: { active: true } });
      if (defaultBranch) {
        employee = await prisma.employee.create({
          data: {
            userId: user.id,
            branchId: defaultBranch.id,
            employeeCode: `MC-${user.role.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
            designation: `${user.role} Operations`,
            joinedDate: new Date(),
          },
          include: {
            branch: true,
            user: { select: { name: true, email: true } },
          },
        });
      }
    }

    if (!employee || !employee.active) {
      return NextResponse.json(
        { error: "No active employee profile is associated with this account." },
        { status: 403 }
      );
    }

    // Resolve target workplace branch
    const requestedBranchParam = targetBranchId || req.cookies.get("mc_selected_outlet")?.value;
    let branch = employee.branch;

    if (requestedBranchParam && requestedBranchParam !== "ALL") {
      const foundBranch = await prisma.branch.findFirst({
        where: {
          active: true,
          OR: [{ id: requestedBranchParam }, { code: requestedBranchParam.toUpperCase() }],
        },
      });

      if (foundBranch) {
        if (user.role === "EMPLOYEE" && employee.branchId && employee.branchId !== foundBranch.id && employee.branch.code !== foundBranch.code) {
          return NextResponse.json(
            { error: `Forbidden: Employees may only record attendance at their assigned boutique (${employee.branch.name}).` },
            { status: 403 }
          );
        }
        if (user.role === "BRANCH_MANAGER" && user.branchId && user.branchId !== foundBranch.id && user.branchCode !== foundBranch.code) {
          return NextResponse.json(
            { error: `Forbidden: As Branch Manager, you may only record attendance at your assigned boutique (${employee.branch.name}).` },
            { status: 403 }
          );
        }
        branch = foundBranch;
      }
    }

    if (!branch || !branch.active) {
      return NextResponse.json(
        { error: "Workplace boutique is inactive or not found." },
        { status: 400 }
      );
    }

    // 2. Check open attendance session constraints
    const existingOpenSession = await prisma.attendanceSession.findFirst({
      where: {
        employeeId: employee.id,
        status: "OPEN",
      },
      orderBy: { punchInTime: "desc" },
    });

    if (action === "PUNCH_IN" && existingOpenSession) {
      return NextResponse.json(
        {
          error: "An attendance session is already open. You must punch out before starting a new session.",
          existingSessionId: existingOpenSession.id,
          punchInTime: existingOpenSession.punchInTime,
        },
        { status: 409 }
      );
    }

    if (action === "PUNCH_OUT" && !existingOpenSession) {
      return NextResponse.json(
        { error: "No active attendance session found to punch out. Please punch in first." },
        { status: 400 }
      );
    }

    // 3. Evaluate GPS Geofence
    const geofenceResult = evaluateAttendanceGeofence({
      deviceLat: latitude,
      deviceLon: longitude,
      accuracyMeters,
      locationTimestamp,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
      geofenceRadiusMeters: branch.geofenceRadiusMeters,
      maxAcceptableAccuracyMeters: branch.maxGpsAccuracyMeters,
      geofenceType: (branch.geofenceType as any) || "CIRCLE",
      polygonPointsJson: branch.geofencePolygonJson,
      maxLocationAgeSeconds: branch.maxLocationAgeSeconds || 60,
    });

    // 4. Evaluate Workplace Wi-Fi Verification
    const wifiResult = await evaluateWorkplaceWifi({
      policy: branch.wifiVerificationPolicy,
      branchSsid: branch.wifiSsid,
      branchBssid: branch.wifiBssid,
      branchSecretKey: branch.wifiSecretKey,
      clientSsid: wifiSsid,
      clientBssid: wifiBssid,
      challengeToken,
      branchId: branch.id,
      employeeId: employee.id,
      isSimulated: Boolean(isSimulated),
      requireBssidVerification: branch.requireBssidVerification ?? false,
      secondaryBssids: branch.secondaryBssids,
    });

    // 5. Evaluate GPS and Wi-Fi independently
    const policy = branch.wifiVerificationPolicy; // "GPS_AND_WIFI" | "GPS_ONLY" | "WIFI_ONLY" | "GPS_OR_WIFI"

    let gpsStatus: "Verified" | "Outside Geofence" | "Accuracy Insufficient" = "Verified";
    let gpsError: string | null = null;
    if (!geofenceResult.isWithinGeofence) {
      if (geofenceResult.status === "POOR_ACCURACY") {
        gpsStatus = "Accuracy Insufficient";
        gpsError = "Location Accuracy Insufficient — GPS accuracy is insufficient to determine whether the device is inside the boundary.";
      } else {
        gpsStatus = "Outside Geofence";
        gpsError = geofenceResult.description;
      }
    }

    let wifiStatus: "Verified" | "Not Verified" | "Unavailable" = "Verified";
    let wifiError: string | null = null;
    if (!wifiResult.isWifiVerified) {
      if (wifiResult.status === "DISCONNECTED_WIFI") {
        wifiStatus = "Unavailable";
      } else {
        wifiStatus = "Not Verified";
      }
      wifiError = "Wi-Fi Not Verified — You are not connected to the authorized workplace Wi-Fi network.";
    }

    let isVerificationSuccess = false;
    const failureReasons: string[] = [];

    if (policy === "GPS_AND_WIFI") {
      if (gpsError) failureReasons.push(gpsError);
      if (wifiError) failureReasons.push(wifiError);
      isVerificationSuccess = !gpsError && !wifiError;
    } else if (policy === "GPS_ONLY") {
      if (gpsError) failureReasons.push(gpsError);
      isVerificationSuccess = !gpsError;
    } else if (policy === "WIFI_ONLY") {
      if (wifiError) failureReasons.push(wifiError);
      isVerificationSuccess = !wifiError;
    } else if (policy === "GPS_OR_WIFI") {
      if (gpsError && wifiError) {
        failureReasons.push(gpsError);
        failureReasons.push(wifiError);
        isVerificationSuccess = false;
      } else {
        isVerificationSuccess = true;
      }
    }

    // If verification failed, reject with clear actionable reasons
    if (!isVerificationSuccess) {
      const combinedReason = failureReasons.join(" \n");

      // Log failed attempt audit
      await recordAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: `ATTENDANCE_${action}_REJECTED`,
        entityType: "ATTENDANCE",
        branchId: branch.id,
        metadata: {
          action,
          failureReason: combinedReason,
          failureReasons,
          gpsStatus,
          wifiStatus,
          distanceMeters: geofenceResult.distanceMeters,
          accuracyMeters,
          wifiSsid,
          policy,
        },
      });

      return NextResponse.json(
        {
          error: combinedReason || "Attendance verification checks failed.",
          errors: {
            gps: gpsError,
            wifi: wifiError,
          },
          statuses: {
            gpsLocation: gpsStatus,
            workplaceWifi: wifiStatus,
            overallAttendance: "Rejected",
          },
          failureReasons,
          diagnostic: {
            action,
            gps: geofenceResult,
            wifi: wifiResult,
            policy,
            branchCoordinates: {
              latitude: branch.latitude,
              longitude: branch.longitude,
              geofenceRadiusMeters: branch.geofenceRadiusMeters,
              maxGpsAccuracyMeters: branch.maxGpsAccuracyMeters,
            },
          },
        },
        { status: 422 }
      );
    }

    const serverNow = new Date();

    // 6. Execute atomic database transaction
    const result = await prisma.$transaction(async (tx) => {
      let session;
      const status = isVerificationSuccess ? "VERIFIED" : "FLAGGED";

      if (action === "PUNCH_IN") {
        // Atomic concurrency check: Re-verify inside transaction to prevent race conditions
        const inTxOpenSession = await tx.attendanceSession.findFirst({
          where: {
            employeeId: employee.id,
            status: "OPEN",
          },
        });
        if (inTxOpenSession) {
          throw new Error("CONFLICT_CONCURRENT_SESSION: An attendance session is already open.");
        }

        session = await tx.attendanceSession.create({
          data: {
            employeeId: employee.id,
            branchId: branch.id,
            punchInTime: serverNow,
            status: "OPEN",
            inLatitude: latitude || null,
            inLongitude: longitude || null,
            inAccuracyMeters: accuracyMeters || null,
            inDistanceMeters: geofenceResult.distanceMeters >= 0 ? geofenceResult.distanceMeters : null,
            inGpsVerified: geofenceResult.isWithinGeofence,
            inGeofenceType: branch.geofenceType || "CIRCLE",
            inWifiSsid: wifiSsid || branch.wifiSsid,
            inWifiBssid: wifiBssid || null,
            inWifiVerified: wifiResult.isWifiVerified,
            inVerificationMethod: policy,
            deviceDetails: deviceDetails || "Browser / Mobile Web App",
            notes: notes || null,
            isSimulated: Boolean(isSimulated),
          },
        });

        // Also record AttendanceEvent for backward compatibility
        await tx.attendanceEvent.create({
          data: {
            employeeId: employee.id,
            branchId: branch.id,
            eventType: "CHECK_IN",
            timestamp: serverNow,
            latitude: latitude || null,
            longitude: longitude || null,
            distanceFromBranchMeters: geofenceResult.distanceMeters >= 0 ? geofenceResult.distanceMeters : null,
            isWithinGeofence: geofenceResult.isWithinGeofence,
            accuracyMeters: accuracyMeters || null,
            status: isVerificationSuccess ? "VERIFIED" : "PENDING_EXCEPTION",
            isSimulated: Boolean(isSimulated),
            simulationScenario: simulationScenario || null,
            notes: notes || `Punched in via ${policy}. ${wifiResult.message}`,
          },
        });
      } else {
        // PUNCH_OUT
        // Atomic check: Ensure the session is still OPEN
        const inTxSession = await tx.attendanceSession.findFirst({
          where: {
            id: existingOpenSession!.id,
            status: "OPEN",
          },
        });
        if (!inTxSession) {
          throw new Error("CONFLICT_ALREADY_CLOSED: This attendance session has already been closed.");
        }

        const punchInMs = new Date(inTxSession.punchInTime).getTime();
        const durationMinutes = Math.max(0, Math.round((serverNow.getTime() - punchInMs) / 60000));

        session = await tx.attendanceSession.update({
          where: { id: inTxSession.id },
          data: {
            punchOutTime: serverNow,
            durationMinutes,
            status: isVerificationSuccess ? "COMPLETED" : "FLAGGED",
            outLatitude: latitude || null,
            outLongitude: longitude || null,
            outAccuracyMeters: accuracyMeters || null,
            outDistanceMeters: geofenceResult.distanceMeters >= 0 ? geofenceResult.distanceMeters : null,
            outGpsVerified: geofenceResult.isWithinGeofence,
            outGeofenceType: branch.geofenceType || "CIRCLE",
            outWifiSsid: wifiSsid || branch.wifiSsid,
            outWifiBssid: wifiBssid || null,
            outWifiVerified: wifiResult.isWifiVerified,
          },
        });

        // Record AttendanceEvent checkout
        await tx.attendanceEvent.create({
          data: {
            employeeId: employee.id,
            branchId: branch.id,
            eventType: "CHECK_OUT",
            timestamp: serverNow,
            latitude: latitude || null,
            longitude: longitude || null,
            distanceFromBranchMeters: geofenceResult.distanceMeters >= 0 ? geofenceResult.distanceMeters : null,
            isWithinGeofence: geofenceResult.isWithinGeofence,
            accuracyMeters: accuracyMeters || null,
            status: isVerificationSuccess ? "VERIFIED" : "FLAGGED",
            isSimulated: Boolean(isSimulated),
            simulationScenario: simulationScenario || null,
            notes: `Punched out. Shift duration: ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m.`,
          },
        });
      }

      return session;
    });

    // 7. Record immutable audit event
    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: `ATTENDANCE_${action}`,
      entityType: "ATTENDANCE",
      entityId: result.id,
      branchId: branch.id,
      metadata: {
        action,
        sessionId: result.id,
        distanceMeters: geofenceResult.distanceMeters,
        accuracyMeters,
        isWithinGeofence: geofenceResult.isWithinGeofence,
        wifiVerified: wifiResult.isWifiVerified,
        wifiSsid: wifiSsid || branch.wifiSsid,
        policy,
        isSimulated,
      },
    });

    return NextResponse.json({
      success: true,
      action,
      session: result,
      diagnostic: {
        gps: geofenceResult,
        wifi: wifiResult,
        policy,
      },
    });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    if (error instanceof Error && error.message.startsWith("CONFLICT_CONCURRENT_SESSION")) {
      return NextResponse.json(
        { error: "An attendance session is already open. You must punch out before starting a new session." },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message.startsWith("CONFLICT_ALREADY_CLOSED")) {
      return NextResponse.json(
        { error: "This attendance session has already been closed." },
        { status: 409 }
      );
    }
    console.error("Attendance punch error:", error);
    return NextResponse.json({ error: "Failed to record attendance punch." }, { status: 500 });
  }
}

