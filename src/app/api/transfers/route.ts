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
    if (user.role === ROLES.BRANCH_MANAGER) {
      branchId = user.branchId || null;
    }

    const whereClause: Record<string, unknown> = {};
    if (branchId && branchId !== "ALL") {
      whereClause.OR = [{ sourceBranchId: branchId }, { targetBranchId: branchId }];
    }

    const transfers = await prisma.stockTransfer.findMany({
      where: whereClause,
      include: {
        sourceBranch: { select: { id: true, code: true, name: true } },
        targetBranch: { select: { id: true, code: true, name: true } },
        initiatedBy: { select: { name: true, email: true } },
        receivedBy: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, costPrice: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ transfers });
  } catch (error) {
    console.error("Transfers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch stock transfers." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();

    const { sourceBranchId, targetBranchId, items, notes } = body;

    if (!sourceBranchId || !targetBranchId || !items || !items.length) {
      return NextResponse.json({ error: "Source, target, and at least one item required." }, { status: 400 });
    }

    if (sourceBranchId === targetBranchId) {
      return NextResponse.json({ error: "Source and target branch cannot be the same." }, { status: 400 });
    }

    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== sourceBranchId) {
      return NextResponse.json({ error: "Managers can only dispatch transfers from their assigned branch." }, { status: 403 });
    }

    const transferNumber = `TR-${Date.now().toString().slice(-8)}`;

    const transfer = await prisma.$transaction(async (tx) => {
      const tr = await tx.stockTransfer.create({
        data: {
          transferNumber,
          sourceBranchId,
          targetBranchId,
          status: "IN_TRANSIT",
          notes: notes || null,
          initiatedById: user.id,
          initiatedAt: new Date(),
        },
      });

      for (const item of items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod) continue;

        await tx.stockTransferItem.create({
          data: {
            stockTransferId: tr.id,
            productId: item.productId,
            quantity: item.quantity,
            unitCost: prod.costPrice,
          },
        });

        // Deduct from source branch ledger immediately
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            branchId: sourceBranchId,
            movementType: "TRANSFER_OUT",
            quantity: -Math.abs(item.quantity),
            unitCost: prod.costPrice,
            referenceNumber: transferNumber,
            transferId: tr.id,
            notes: `Dispatched to target branch. Transfer #${transferNumber}`,
            actorId: user.id,
          },
        });
      }

      // Notify target branch
      await tx.notification.create({
        data: {
          branchId: targetBranchId,
          title: "Inbound Stock Transfer Dispatched",
          message: `Transfer #${transferNumber} with ${items.length} product(s) is in transit to your branch.`,
          category: "INVENTORY",
          type: "INFO",
          linkUrl: "/dashboard/inventory",
        },
      });

      return tr;
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "STOCK_TRANSFER_INITIATED",
      entityType: "INVENTORY",
      entityId: transfer.id,
      branchId: sourceBranchId,
      metadata: { transferNumber, targetBranchId, itemsCount: items.length },
    });

    return NextResponse.json({ success: true, transfer });
  } catch (error) {
    console.error("Transfers POST error:", error);
    return NextResponse.json({ error: "Failed to create transfer." }, { status: 500 });
  }
}

// Confirm Receipt of Transfer
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();
    const { transferId, status } = body;

    if (!transferId || status !== "RECEIVED") {
      return NextResponse.json({ error: "Invalid transfer receipt update." }, { status: 400 });
    }

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true, sourceBranch: true, targetBranch: true },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
    }

    if (transfer.status === "RECEIVED") {
      return NextResponse.json({ error: "Transfer is already received." }, { status: 400 });
    }

    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== transfer.targetBranchId) {
      return NextResponse.json({ error: "Only the destination branch manager can receive this transfer." }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const tr = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: "RECEIVED",
          receivedById: user.id,
          receivedAt: new Date(),
        },
      });

      // Add to target branch ledger
      for (const item of transfer.items) {
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            branchId: transfer.targetBranchId,
            movementType: "TRANSFER_IN",
            quantity: Math.abs(item.quantity),
            unitCost: item.unitCost,
            referenceNumber: transfer.transferNumber,
            transferId: tr.id,
            notes: `Received from ${transfer.sourceBranch.name}. Transfer #${transfer.transferNumber}`,
            actorId: user.id,
          },
        });
      }

      return tr;
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "STOCK_TRANSFER_RECEIVED",
      entityType: "INVENTORY",
      entityId: transfer.id,
      branchId: transfer.targetBranchId,
      metadata: { transferNumber: transfer.transferNumber },
    });

    return NextResponse.json({ success: true, transfer: updated });
  } catch (error) {
    console.error("Transfers PUT error:", error);
    return NextResponse.json({ error: "Failed to confirm transfer receipt." }, { status: 500 });
  }
}
