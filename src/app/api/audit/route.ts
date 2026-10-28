import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Audit logs strictly require OWNER, BRANCH_MANAGER, or AUDITOR role (EMPLOYEE forbidden)
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER, ROLES.AUDITOR]);
    const { searchParams } = new URL(req.url);

    const requestedBranchId = searchParams.get("branchId") || req.cookies.get("mc_selected_outlet")?.value;
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const whereClause: Record<string, unknown> = {};

    if (user.role === ROLES.BRANCH_MANAGER) {
      whereClause.branchId = user.branchId || "NONE";
    } else if (requestedBranchId && requestedBranchId !== "ALL") {
      const foundBranch = await prisma.branch.findFirst({
        where: {
          OR: [{ id: requestedBranchId }, { code: requestedBranchId.toUpperCase() }],
        },
      });
      whereClause.branchId = foundBranch ? foundBranch.id : requestedBranchId;
    }

    if (entityType && entityType !== "ALL") {
      whereClause.entityType = entityType;
    }

    if (action && action !== "ALL") {
      whereClause.action = action;
    }

    const auditEvents = await prisma.auditEvent.findMany({
      where: whereClause,
      include: {
        actor: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({ auditEvents });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Audit GET error:", error);
    return NextResponse.json({ error: "Failed to fetch audit events." }, { status: 500 });
  }
}

