import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER, ROLES.AUDITOR]);
    const { searchParams } = new URL(req.url);

    const requestedBranchId = searchParams.get("branchId") || req.cookies.get("mc_selected_outlet")?.value;
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

    const adjustments = await prisma.stockAdjustmentRequest.findMany({
      where: whereClause,
      include: {
        product: { select: { sku: true, name: true, unitOfMeasure: true } },
        branch: { select: { code: true, name: true } },
        requestedBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        discrepancy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ adjustments });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Adjustments GET error:", error);
    return NextResponse.json({ error: "Failed to fetch adjustment requests." }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();

    const { discrepancyId, branchId, productId, proposedQuantity, reason } = body;

    if (!branchId || !productId || proposedQuantity == null || !reason) {
      return NextResponse.json({ error: "Missing required adjustment parameters." }, { status: 400 });
    }

    let resolvedBranchId = branchId;
    const foundBranch = await prisma.branch.findFirst({
      where: { OR: [{ id: branchId }, { code: branchId.toUpperCase() }] },
    });
    if (foundBranch) {
      resolvedBranchId = foundBranch.id;
    }

    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== resolvedBranchId) {
      return NextResponse.json({ error: "Unauthorized for this branch." }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const unitCost = product.costPrice;
    const adjustmentValue = Number((proposedQuantity * unitCost).toFixed(2));
    const requestNumber = `ADJ-${Date.now().toString().slice(-8)}`;

    const adjustment = await prisma.$transaction(async (tx) => {
      const adj = await tx.stockAdjustmentRequest.create({
        data: {
          requestNumber,
          discrepancyId: discrepancyId || null,
          branchId: resolvedBranchId,
          productId,
          proposedQuantity,
          unitCost,
          adjustmentValue,
          reason,
          status: "PENDING",
          requestedById: user.id,
        },
      });

      if (discrepancyId) {
        await tx.reconciliationDiscrepancy.update({
          where: { id: discrepancyId },
          data: { status: "ADJUSTMENT_REQUESTED" },
        });
      }

      // Notify owner of pending adjustment approval
      await tx.notification.create({
        data: {
          branchId: resolvedBranchId,
          title: "Stock Adjustment Pending Approval",
          message: `Request #${requestNumber} for ${proposedQuantity} units of ${product.name} (Value: ₹${adjustmentValue}) requires approval.`,
          category: "INVENTORY",
          type: "WARNING",
          linkUrl: "/dashboard/reconciliation",
        },
      });

      return adj;
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "STOCK_ADJUSTMENT_REQUESTED",
      entityType: "INVENTORY",
      entityId: adjustment.id,
      branchId: resolvedBranchId,
      metadata: { requestNumber, proposedQuantity, adjustmentValue, reason },
    });

    return NextResponse.json({ success: true, adjustment });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Adjustments POST error:", error);
    return NextResponse.json({ error: "Failed to request adjustment." }, { status: 500 });
  }
}


// Approve or Reject Stock Adjustment Request (Owner Only!)
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER]); // Strict Owner Approval
    const body = await req.json();

    const { adjustmentId, status, approvalNotes } = body;

    if (!adjustmentId || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Valid adjustmentId and approval status required." }, { status: 400 });
    }

    const adjustment = await prisma.stockAdjustmentRequest.findUnique({
      where: { id: adjustmentId },
      include: { product: true, branch: true, discrepancy: true },
    });

    if (!adjustment) {
      return NextResponse.json({ error: "Adjustment request not found." }, { status: 404 });
    }

    if (adjustment.status !== "PENDING") {
      return NextResponse.json({ error: "Adjustment has already been finalized." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let movementId: string | null = null;

      // If approved, create the ledger movement!
      if (status === "APPROVED") {
        const movement = await tx.inventoryMovement.create({
          data: {
            productId: adjustment.productId,
            branchId: adjustment.branchId,
            movementType: "ADJUSTMENT",
            quantity: adjustment.proposedQuantity,
            unitCost: adjustment.unitCost,
            referenceNumber: adjustment.requestNumber,
            notes: `Authorized inventory adjustment: ${adjustment.reason}. Approved by ${user.name}`,
            actorId: user.id,
          },
        });
        movementId = movement.id;

        // Resolve discrepancy if linked
        if (adjustment.discrepancyId) {
          await tx.reconciliationDiscrepancy.update({
            where: { id: adjustment.discrepancyId },
            data: {
              status: "RESOLVED",
              resolvedById: user.id,
              resolvedAt: new Date(),
              investigationNotes: `${adjustment.discrepancy?.investigationNotes || ""}\n[RESOLVED]: Adjustment #${adjustment.requestNumber} approved and posted to ledger.`,
            },
          });
        }
      }

      const updated = await tx.stockAdjustmentRequest.update({
        where: { id: adjustmentId },
        data: {
          status,
          approvedById: user.id,
          approvalNotes: approvalNotes || null,
          approvedAt: new Date(),
          movementId,
        },
      });

      // Notify the requester
      await tx.notification.create({
        data: {
          userId: adjustment.requestedById,
          branchId: adjustment.branchId,
          title: `Stock Adjustment #${adjustment.requestNumber} ${status}`,
          message: `Your adjustment request was ${status.toLowerCase()} by ${user.name}.${
            approvalNotes ? ` Notes: "${approvalNotes}"` : ""
          }`,
          category: "INVENTORY",
          type: status === "APPROVED" ? "SUCCESS" : "URGENT",
          linkUrl: "/dashboard/reconciliation",
        },
      });

      return updated;
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: `STOCK_ADJUSTMENT_${status}`,
      entityType: "INVENTORY",
      entityId: adjustmentId,
      branchId: adjustment.branchId,
      metadata: { status, approvalNotes, quantity: adjustment.proposedQuantity },
    });

    return NextResponse.json({ success: true, adjustment: result });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Adjustments PUT error:", error);
    return NextResponse.json({ error: "Failed to process adjustment approval." }, { status: 500 });
  }
}

