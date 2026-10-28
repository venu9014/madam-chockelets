import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { evaluateShiftAttendance, aggregateDailyAttendance } from "@/lib/attendance-calculator";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Owner accounts are strictly exempt from attendance tracking
    if (user.role === "OWNER") {
      return NextResponse.json({
        isExempt: true,
        role: "OWNER",
        message: "Executive Owner accounts are strictly exempt from employee attendance tracking.",
        employee: null,
        branch: null,
        activeSession: null,
        todaySummary: { sessionCount: 0, totalMinutesWorked: 0, lastPunchTime: null, formattedTotalHours: "0h 0m", overtimeMinutes: 0 },
      });
    }

    // Fetch employee profile with assigned branch
    let employee = await prisma.employee.findFirst({
      where: user.employeeId ? { id: user.employeeId } : { userId: user.id },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        branch: true,
      },
    });

    // Auto-provision profile if operational user lacks employee record
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
            user: { select: { name: true, email: true, avatarUrl: true } },
            branch: true,
          },
        });
      }
    }

    if (!employee) {
      return NextResponse.json(
        { error: "No active employee profile linked to this account." },
        { status: 404 }
      );
    }

    // Resolve active workplace branch from request query or cookie
    const { searchParams } = new URL(req.url);
    const requestedBranchParam = searchParams.get("branchId") || req.cookies.get("mc_selected_outlet")?.value;

    let targetBranch = employee.branch;
    if (requestedBranchParam && requestedBranchParam !== "ALL") {
      const foundBranch = await prisma.branch.findFirst({
        where: {
          active: true,
          OR: [{ id: requestedBranchParam }, { code: requestedBranchParam.toUpperCase() }],
        },
      });

      if (foundBranch) {
        // Enforce RBAC: Branch Managers can only select their assigned branch
        if (user.role === ROLES.BRANCH_MANAGER && user.branchId && user.branchId !== foundBranch.id && user.branchCode !== foundBranch.code) {
          targetBranch = employee.branch;
        } else {
          targetBranch = foundBranch;
        }
      }
    }

    // Find currently OPEN attendance session for this employee at target workplace
    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        employeeId: employee.id,
        branchId: targetBranch.id,
        status: "OPEN",
      },
      orderBy: { punchInTime: "desc" },
    });

    // Compute today's punches & duration summary at this workplace
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySessions = await prisma.attendanceSession.findMany({
      where: {
        employeeId: employee.id,
        branchId: targetBranch.id,
        punchInTime: { gte: startOfToday },
      },
      orderBy: { punchInTime: "desc" },
    });

    const dailyAgg = aggregateDailyAttendance(todaySessions);

    let activeSessionEvaluation = null;
    if (activeSession) {
      activeSessionEvaluation = evaluateShiftAttendance({
        punchInTime: activeSession.punchInTime,
        status: activeSession.status,
      });
    }

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: employee.user.name,
        email: employee.user.email,
        employeeCode: employee.employeeCode,
        designation: employee.designation,
        avatarUrl: employee.user.avatarUrl,
        role: user.role,
      },
      branch: {
        id: targetBranch.id,
        code: targetBranch.code,
        name: targetBranch.name,
        address: targetBranch.address,
        latitude: targetBranch.latitude,
        longitude: targetBranch.longitude,
        geofenceType: targetBranch.geofenceType,
        geofenceRadiusMeters: targetBranch.geofenceRadiusMeters,
        geofencePolygonJson: targetBranch.geofencePolygonJson,
        maxGpsAccuracyMeters: targetBranch.maxGpsAccuracyMeters,
        maxLocationAgeSeconds: targetBranch.maxLocationAgeSeconds,
        wifiVerificationPolicy: targetBranch.wifiVerificationPolicy,
        wifiSsid: targetBranch.wifiSsid,
        wifiBssid: targetBranch.wifiBssid,
        requireBssidVerification: targetBranch.requireBssidVerification,
        secondaryBssids: targetBranch.secondaryBssids,
        active: targetBranch.active,
        updatedAt: targetBranch.updatedAt,
      },
      activeSession: activeSession
        ? {
            id: activeSession.id,
            punchInTime: activeSession.punchInTime,
            status: activeSession.status,
            inDistanceMeters: activeSession.inDistanceMeters,
            inAccuracyMeters: activeSession.inAccuracyMeters,
            inGpsVerified: activeSession.inGpsVerified,
            inWifiSsid: activeSession.inWifiSsid,
            inWifiVerified: activeSession.inWifiVerified,
            inVerificationMethod: activeSession.inVerificationMethod,
            elapsedSeconds: Math.max(0, Math.round((Date.now() - new Date(activeSession.punchInTime).getTime()) / 1000)),
            shiftEvaluation: activeSessionEvaluation,
          }
        : null,
      todaySummary: {
        sessionCount: dailyAgg.sessionCount,
        totalMinutesWorked: dailyAgg.totalDurationMinutes,
        formattedTotalHours: dailyAgg.formattedTotalHours,
        totalOvertimeMinutes: dailyAgg.totalOvertimeMinutes,
        isLateToday: dailyAgg.isLateToday,
        hasMissedCheckout: dailyAgg.hasMissedCheckout || Boolean(activeSessionEvaluation?.isMissedCheckout),
        lastPunchTime: todaySessions[0]?.punchOutTime || todaySessions[0]?.punchInTime || null,
        scheduledShift: "09:00 AM - 06:00 PM IST (8h 00m Standard)",
      },
    });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Attendance session fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance session details." },
      { status: 500 }
    );
  }
}
