import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    let branchId = searchParams.get("branchId");
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (user.role === ROLES.BRANCH_MANAGER) {
      branchId = user.branchId || null;
    }

    const whereClause: Record<string, unknown> = {};

    if (branchId && branchId !== "ALL") {
      whereClause.branchId = branchId;
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
    console.error("Audit GET error:", error);
    return NextResponse.json({ error: "Failed to fetch audit events." }, { status: 500 });
  }
}
