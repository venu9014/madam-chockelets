import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    let branchId = searchParams.get("branchId");
    const status = searchParams.get("status");
    const assignedOnly = searchParams.get("assignedOnly") === "true";

    // Branch manager branch isolation
    if (user.role === ROLES.BRANCH_MANAGER) {
      branchId = user.branchId || null;
    }

    const whereClause: Record<string, unknown> = {};

    if (branchId && branchId !== "ALL") {
      whereClause.branchId = branchId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    // Employees view their own tasks or branch tasks assigned to their role
    if (user.role === ROLES.EMPLOYEE || assignedOnly) {
      if (user.employeeId) {
        whereClause.OR = [
          { assignedEmployeeId: user.employeeId },
          { assignedRole: "EMPLOYEE", branchId: user.branchId },
        ];
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        branch: { select: { id: true, code: true, name: true } },
        sopVersion: {
          select: {
            id: true,
            title: true,
            instructions: true,
            frequency: true,
            deadlineTime: true,
            checklistItems: {
              orderBy: { sequence: "asc" },
            },
          },
        },
        assignedEmployee: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        submissions: {
          include: {
            submittedBy: { select: { name: true, email: true } },
            answers: true,
            reviews: {
              include: {
                reviewer: { select: { name: true, role: true } },
              },
            },
            evidence: true,
          },
          orderBy: { submittedAt: "desc" },
        },
      },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();

    const { sopVersionId, branchId, assignedEmployeeId, title, dueDate, dueTime, priority } = body;

    if (!sopVersionId || !branchId || !dueDate) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Branch manager permission check
    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== branchId) {
      return NextResponse.json({ error: "Cannot create tasks for another branch." }, { status: 403 });
    }

    const task = await prisma.task.create({
      data: {
        sopVersionId,
        branchId,
        assignedEmployeeId: assignedEmployeeId || null,
        title,
        dueDate: new Date(dueDate),
        dueTime: dueTime || "10:00",
        priority: priority || "MEDIUM",
        status: "PENDING",
      },
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "TASK_CREATED",
      entityType: "TASK",
      entityId: task.id,
      branchId: task.branchId,
      metadata: { title: task.title, dueDate: task.dueDate },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json({ error: "Failed to create task." }, { status: 500 });
  }
}
