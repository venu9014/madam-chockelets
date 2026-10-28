import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    const requestedBranchId = searchParams.get("branchId") || req.cookies.get("mc_selected_outlet")?.value;
    const status = searchParams.get("status");
    const assignedOnly = searchParams.get("assignedOnly") === "true";

    const whereClause: Record<string, unknown> = {};

    // Strict role-based isolation
    if (user.role === ROLES.EMPLOYEE) {
      // Ordinary employee strictly sees only tasks assigned to them or to role EMPLOYEE at their branch
      let empId = user.employeeId;
      if (!empId) {
        const emp = await prisma.employee.findFirst({ where: { userId: user.id } });
        empId = emp?.id || null;
      }
      const bId = user.branchId;
      if (empId) {
        whereClause.OR = [
          { assignedEmployeeId: empId },
          ...(bId ? [{ assignedRole: "EMPLOYEE", branchId: bId }] : []),
        ];
      } else {
        whereClause.assignedEmployeeId = "NONE";
      }
    } else if (user.role === ROLES.BRANCH_MANAGER) {
      // Branch Manager strictly isolated to their assigned branch
      whereClause.branchId = user.branchId || "NONE";
      if (assignedOnly && user.employeeId) {
        whereClause.assignedEmployeeId = user.employeeId;
      }
    } else {
      // OWNER and AUDITOR
      if (requestedBranchId && requestedBranchId !== "ALL") {
        const foundBranch = await prisma.branch.findFirst({
          where: {
            OR: [{ id: requestedBranchId }, { code: requestedBranchId.toUpperCase() }],
          },
        });
        if (foundBranch) {
          whereClause.branchId = foundBranch.id;
        } else {
          whereClause.branchId = requestedBranchId;
        }
      }
      if (assignedOnly && user.employeeId) {
        whereClause.assignedEmployeeId = user.employeeId;
      }
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
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
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
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
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Tasks POST error:", error);
    return NextResponse.json({ error: "Failed to create task." }, { status: 500 });
  }
}

