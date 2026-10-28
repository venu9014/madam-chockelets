import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse, hashPassword } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/employees
 * Fetches employees filtered by branch authorization and query parameters.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const branchFilter = searchParams.get("branchId");
    const roleFilter = searchParams.get("role");
    const statusFilter = searchParams.get("status");

    let whereClause: any = {};

    // 1. Role-based scoping
    if (user.role === ROLES.EMPLOYEE) {
      if (user.branchId) {
        whereClause.branchId = user.branchId;
      } else {
        whereClause.userId = user.id;
      }
    } else if (user.role === ROLES.BRANCH_MANAGER) {
      if (user.branchId) {
        whereClause.branchId = user.branchId;
      }
    } else if (branchFilter && branchFilter !== "ALL") {
      whereClause.OR = [
        { branchId: branchFilter },
        { branch: { code: branchFilter.toUpperCase() } },
      ];
    }

    if (roleFilter && roleFilter !== "ALL") {
      whereClause.user = { ...(whereClause.user || {}), role: roleFilter };
    }

    if (statusFilter && statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE") {
        whereClause.active = true;
        whereClause.employmentStatus = "ACTIVE";
      } else if (statusFilter === "INACTIVE") {
        whereClause.OR = [
          { active: false },
          { employmentStatus: { in: ["RESIGNED", "TERMINATED", "INACTIVE"] } },
        ];
      }
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            avatarUrl: true,
            active: true,
          },
        },
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            wifiSsid: true,
            active: true,
          },
        },
      },
      orderBy: [
        { branch: { name: "asc" } },
        { employeeCode: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      employees: employees.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        designation: e.designation,
        joinedDate: e.joinedDate,
        emergencyContact: e.emergencyContact,
        active: e.active,
        employmentStatus: e.employmentStatus,
        user: e.user,
        branch: e.branch,
      })),
      totalCount: employees.length,
    });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("GET /api/employees error:", error);
    return NextResponse.json({ error: "Failed to fetch employees." }, { status: 500 });
  }
}

/**
 * POST /api/employees
 * Creates a new employee and assigns them to an authorized branch.
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();

    const {
      name,
      email,
      password,
      role = ROLES.EMPLOYEE,
      branchId,
      branchCode,
      designation = "Confectionery Artisan",
      employeeCode,
      phone,
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    // Resolve target branch
    let targetBranchId = branchId;
    if (!targetBranchId && branchCode) {
      const b = await prisma.branch.findUnique({
        where: { code: branchCode.toUpperCase() },
      });
      if (b) targetBranchId = b.id;
    }

    // Role check: Branch Manager can only create employees in their branch
    if (caller.role === ROLES.BRANCH_MANAGER && caller.branchId) {
      targetBranchId = caller.branchId;
    }

    if (!targetBranchId) {
      return NextResponse.json(
        { error: "A valid branch assignment is required." },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { id: targetBranchId },
    });
    if (!branch) {
      return NextResponse.json(
        { error: "Assigned branch does not exist." },
        { status: 404 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Auto-generate employee code if not provided
    let finalCode = employeeCode;
    if (!finalCode) {
      const count = await prisma.employee.count({
        where: { branchId: branch.id },
      });
      finalCode = `MC-${branch.code}-${String(count + 1).padStart(3, "0")}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: cleanEmail,
          passwordHash,
          role,
          phone: phone || null,
          active: true,
          isDemoUser: true,
        },
      });

      const newEmp = await tx.employee.create({
        data: {
          userId: newUser.id,
          branchId: branch.id,
          employeeCode: finalCode,
          designation,
          joinedDate: new Date(),
          active: true,
          employmentStatus: "ACTIVE",
        },
        include: {
          user: true,
          branch: true,
        },
      });

      return newEmp;
    });

    await recordAuditEvent({
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: "EMPLOYEE_CREATED",
      entityType: "EMPLOYEE",
      entityId: result.id,
      branchId: branch.id,
      metadata: {
        employeeCode: result.employeeCode,
        employeeName: result.user.name,
        assignedBranch: branch.name,
      },
    });

    return NextResponse.json({
      success: true,
      employee: result,
    });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("POST /api/employees error:", error);
    return NextResponse.json(
      { error: "Failed to create employee profile." },
      { status: 500 }
    );
  }
}
