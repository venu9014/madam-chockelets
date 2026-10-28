import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Owner accounts are strictly exempt from attendance operations
    if (user.role === ROLES.OWNER) {
      return NextResponse.json(
        { error: "Owner accounts are strictly exempt from attendance exception management." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const requestedBranchId = searchParams.get("branchId") || req.cookies.get("mc_selected_outlet")?.value;
    const status = searchParams.get("status");

    const whereClause: Record<string, unknown> = {};

    if (user.role === ROLES.EMPLOYEE) {
      let empId = user.employeeId;
      if (!empId) {
        const emp = await prisma.employee.findFirst({ where: { userId: user.id } });
        empId = emp?.id || null;
      }
      whereClause.employeeId = empId || "NONE";
    } else if (user.role === ROLES.BRANCH_MANAGER) {
      whereClause.branchId = user.branchId || "NONE";
    } else if (requestedBranchId && requestedBranchId !== "ALL") {
      const foundBranch = await prisma.branch.findFirst({
        where: {
          OR: [{ id: requestedBranchId }, { code: requestedBranchId.toUpperCase() }],
        },
      });
      whereClause.branchId = foundBranch ? foundBranch.id : requestedBranchId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
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

    const exceptions = await prisma.attendanceException.findMany({
      where: whereClause,
      include: {
        branch: { select: { name: true, code: true } },
        employee: {
          include: {
            user: { select: { name: true, email: true, avatarUrl: true } },
          },
        },
        attendanceEvent: true,
        reviewer: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ exceptions });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Attendance exceptions GET error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance exceptions." }, { status: 500 });
  }
}


export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.BRANCH_MANAGER]);
    const body = await req.json();
    const { exceptionId, status, reviewerNotes } = body;

    if (!exceptionId || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Valid exceptionId and status required." }, { status: 400 });
    }

    const exception = await prisma.attendanceException.findUnique({
      where: { id: exceptionId },
      include: { employee: { include: { user: true } }, branch: true },
    });

    if (!exception) {
      return NextResponse.json({ error: "Exception record not found." }, { status: 404 });
    }

    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== exception.branchId) {
      return NextResponse.json({ error: "Unauthorized for another branch exception." }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const exc = await tx.attendanceException.update({
        where: { id: exceptionId },
        data: {
          status,
          reviewerId: user.id,
          reviewerNotes: reviewerNotes || null,
          resolvedAt: new Date(),
        },
      });

      // Update underlying event status
      await tx.attendanceEvent.update({
        where: { id: exception.attendanceEventId },
        data: {
          status: status === "APPROVED" ? "VERIFIED" : "REJECTED",
        },
      });

      // Notify employee
      await tx.notification.create({
        data: {
          userId: exception.employee.userId,
          branchId: exception.branchId,
          title: `Attendance Exception ${status}`,
          message: `Your check-in exception was ${status.toLowerCase()} by ${user.name}.${
            reviewerNotes ? ` Note: "${reviewerNotes}"` : ""
          }`,
          category: "ATTENDANCE",
          type: status === "APPROVED" ? "SUCCESS" : "URGENT",
          linkUrl: `/dashboard/attendance`,
        },
      });

      return exc;
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: `ATTENDANCE_EXCEPTION_${status}`,
      entityType: "ATTENDANCE",
      entityId: exceptionId,
      branchId: exception.branchId,
      metadata: { status, reviewerNotes },
    });

    return NextResponse.json({ success: true, exception: updated });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Attendance exception review error:", error);
    return NextResponse.json({ error: "Failed to update exception." }, { status: 500 });
  }
}

