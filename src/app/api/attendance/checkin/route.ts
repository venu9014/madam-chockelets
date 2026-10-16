import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { evaluateAttendanceGeofence } from "@/lib/geofence";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const {
      branchId: targetBranchId,
      eventType = "CHECK_IN", // CHECK_IN or CHECK_OUT
      latitude,
      longitude,
      accuracyMeters,
      isSimulated = false,
      simulationScenario,
      notes,
    } = body;

    const branchId = targetBranchId || user.branchId;
    if (!branchId) {
      return NextResponse.json({ error: "Branch ID required for attendance check." }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found." }, { status: 404 });
    }

    // Server-side Geofence Evaluation
    const geofenceResult = evaluateAttendanceGeofence({
      deviceLat: latitude,
      deviceLon: longitude,
      accuracyMeters,
      branchLat: branch.latitude,
      branchLon: branch.longitude,
      geofenceRadiusMeters: branch.geofenceRadiusMeters,
    });

    let employeeId = user.employeeId;
    if (!employeeId) {
      // Find employee record
      const emp = await prisma.employee.findFirst({
        where: { userId: user.id },
      });
      employeeId = emp?.id || null;
    }

    if (!employeeId) {
      return NextResponse.json({ error: "No employee record associated with this account." }, { status: 400 });
    }

    let status = "VERIFIED";
    if (geofenceResult.requiresException) {
      status = "PENDING_EXCEPTION";
    }

    const attendanceEvent = await prisma.$transaction(async (tx) => {
      const event = await tx.attendanceEvent.create({
        data: {
          employeeId: employeeId!,
          branchId: branch.id,
          eventType,
          latitude: latitude || null,
          longitude: longitude || null,
          distanceFromBranchMeters: geofenceResult.distanceMeters >= 0 ? geofenceResult.distanceMeters : null,
          isWithinGeofence: geofenceResult.isWithinGeofence,
          accuracyMeters: accuracyMeters || null,
          status,
          isSimulated: Boolean(isSimulated),
          simulationScenario: simulationScenario || (isSimulated ? "SIMULATED_ATTENDANCE" : null),
          notes: notes || geofenceResult.description,
        },
      });

      // If outside geofence, create AttendanceException automatically
      if (status === "PENDING_EXCEPTION") {
        await tx.attendanceException.create({
          data: {
            attendanceEventId: event.id,
            employeeId: employeeId!,
            branchId: branch.id,
            reason: notes || `Outside geofence (${geofenceResult.distanceMeters}m). Exception review required.`,
            status: "PENDING",
          },
        });

        // Notify branch manager
        await tx.notification.create({
          data: {
            branchId: branch.id,
            title: "Attendance Exception Flagged",
            message: `${user.name} checked in outside geofence (${geofenceResult.distanceMeters}m away). Reason: ${notes || "Unspecified"}`,
            category: "ATTENDANCE",
            type: "WARNING",
            linkUrl: `/dashboard/attendance`,
          },
        });
      }

      return event;
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: `ATTENDANCE_${eventType}`,
      entityType: "ATTENDANCE",
      entityId: attendanceEvent.id,
      branchId: branch.id,
      metadata: {
        eventType,
        isWithinGeofence: geofenceResult.isWithinGeofence,
        distanceMeters: geofenceResult.distanceMeters,
        status,
        isSimulated,
      },
    });

    return NextResponse.json({
      success: true,
      attendanceEvent,
      geofence: geofenceResult,
    });
  } catch (error) {
    console.error("Attendance checkin error:", error);
    return NextResponse.json({ error: "Failed to process attendance." }, { status: 500 });
  }
}
