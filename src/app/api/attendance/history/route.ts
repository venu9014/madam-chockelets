import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { evaluateShiftAttendance } from "@/lib/attendance-calculator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Owner accounts are strictly exempt from attendance tracking
    if (user.role === ROLES.OWNER) {
      return NextResponse.json(
        { error: "Owner accounts are strictly exempt from staff attendance workflows." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const requestedBranchId = searchParams.get("branchId") || req.cookies.get("mc_selected_outlet")?.value;
    const requestedEmployeeId = searchParams.get("employeeId");

    const whereClause: Record<string, unknown> = {};

    // 1. Strict Role-Based Access Isolation
    if (user.role === ROLES.EMPLOYEE) {
      // Ordinary employees can strictly ONLY view their own attendance records
      let empId = user.employeeId;
      if (!empId) {
        const emp = await prisma.employee.findFirst({ where: { userId: user.id } });
        empId = emp?.id || null;
      }
      whereClause.employeeId = empId || "NONE";
    } else if (user.role === ROLES.BRANCH_MANAGER) {
      // Branch Managers are strictly isolated to their assigned branch
      const managerBranchId = user.branchId || "NONE";
      whereClause.branchId = managerBranchId;

      if (requestedEmployeeId && requestedEmployeeId !== "ALL") {
        const emp = await prisma.employee.findUnique({
          where: { id: requestedEmployeeId },
          select: { branchId: true },
        });
        if (emp && emp.branchId === managerBranchId) {
          whereClause.employeeId = requestedEmployeeId;
        } else {
          whereClause.employeeId = "NONE";
        }
      }
    } else {
      // AUDITOR has global compliance oversight
      if (requestedBranchId && requestedBranchId !== "ALL") {
        const foundBranch = await prisma.branch.findFirst({
          where: {
            OR: [{ id: requestedBranchId }, { code: requestedBranchId.toUpperCase() }],
          },
        });
        whereClause.branchId = foundBranch ? foundBranch.id : requestedBranchId;
      }
      if (requestedEmployeeId && requestedEmployeeId !== "ALL") {
        whereClause.employeeId = requestedEmployeeId;
      }
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.punchInTime = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const includeFormer = searchParams.get("includeFormer") === "true";
    if (!includeFormer) {
      whereClause.employee = {
        active: true,
        employmentStatus: "ACTIVE",
        user: { active: true, role: { not: ROLES.OWNER } },
      };
    } else {
      whereClause.employee = {
        user: { role: { not: ROLES.OWNER } },
      };
    }

    const [total, rawSessions] = await Promise.all([
      prisma.attendanceSession.count({ where: whereClause }),
      prisma.attendanceSession.findMany({
        where: whereClause,
        include: {
          employee: {
            include: {
              user: { select: { name: true, email: true, avatarUrl: true } },
            },
          },
          branch: { select: { id: true, code: true, name: true } },
        },
        orderBy: { punchInTime: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    let totalDurationMins = 0;
    let lateCount = 0;
    let overtimeTotalMins = 0;
    let verifiedCount = 0;
    let flaggedCount = 0;

    const enrichedSessions = rawSessions.map((session) => {
      const evaluation = evaluateShiftAttendance({
        punchInTime: session.punchInTime,
        punchOutTime: session.punchOutTime,
        durationMinutes: session.durationMinutes,
        status: session.status,
      });

      totalDurationMins += evaluation.effectiveDurationMinutes;
      if (evaluation.isLate) lateCount += 1;
      if (evaluation.isOvertime) overtimeTotalMins += evaluation.overtimeMinutes;
      if (session.status === "COMPLETED" || session.status === "VERIFIED") verifiedCount += 1;
      if (session.status === "FLAGGED") flaggedCount += 1;

      return {
        ...session,
        shiftEvaluation: evaluation,
      };
    });

    const totalHours = Number((totalDurationMins / 60).toFixed(1));
    const overtimeHours = Number((overtimeTotalMins / 60).toFixed(1));

    return NextResponse.json({
      sessions: enrichedSessions,
      summary: {
        totalSessions: total,
        totalHours,
        overtimeHours,
        lateCount,
        verifiedCount,
        flaggedCount,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Attendance history error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance history." }, { status: 500 });
  }
}
