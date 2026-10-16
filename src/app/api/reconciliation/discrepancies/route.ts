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

    const discrepancies = await prisma.reconciliationDiscrepancy.findMany({
      where: whereClause,
      include: {
        branch: { select: { id: true, code: true, name: true } },
        product: { select: { id: true, sku: true, name: true, category: true, unitOfMeasure: true, costPrice: true, sellingPrice: true, imageUrl: true } },
        countItem: {
          include: {
            session: { select: { sessionNumber: true, countDate: true } },
          },
        },
        adjustmentRequest: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ discrepancies });
  } catch (error) {
    console.error("Discrepancies GET error:", error);
    return NextResponse.json({ error: "Failed to fetch discrepancies." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();

    const { discrepancyId, rootCause, investigationNotes, status } = body;

    if (!discrepancyId) {
      return NextResponse.json({ error: "Discrepancy ID is required." }, { status: 400 });
    }

    const disc = await prisma.reconciliationDiscrepancy.findUnique({
      where: { id: discrepancyId },
    });

    if (!disc) {
      return NextResponse.json({ error: "Discrepancy not found." }, { status: 404 });
    }

    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== disc.branchId) {
      return NextResponse.json({ error: "Unauthorized for this branch's discrepancies." }, { status: 403 });
    }

    const updated = await prisma.reconciliationDiscrepancy.update({
      where: { id: discrepancyId },
      data: {
        rootCause: rootCause !== undefined ? rootCause : disc.rootCause,
        investigationNotes: investigationNotes !== undefined ? investigationNotes : disc.investigationNotes,
        status: status || disc.status,
      },
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "DISCREPANCY_INVESTIGATION_UPDATED",
      entityType: "DISCREPANCY",
      entityId: discrepancyId,
      branchId: disc.branchId,
      metadata: { rootCause, status },
    });

    return NextResponse.json({ success: true, discrepancy: updated });
  } catch (error) {
    console.error("Discrepancies PUT error:", error);
    return NextResponse.json({ error: "Failed to update discrepancy notes." }, { status: 500 });
  }
}
