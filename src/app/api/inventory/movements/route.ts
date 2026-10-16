import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ROLES, INVENTORY_MOVEMENT_TYPES, MOVEMENT_SIGN_MULTIPLIER } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    let branchId = searchParams.get("branchId");
    const productId = searchParams.get("productId");
    const movementType = searchParams.get("movementType");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (user.role === ROLES.BRANCH_MANAGER) {
      branchId = user.branchId || null;
    }

    const whereClause: Record<string, unknown> = {};

    if (branchId && branchId !== "ALL") {
      whereClause.branchId = branchId;
    }

    if (productId && productId !== "ALL") {
      whereClause.productId = productId;
    }

    if (movementType && movementType !== "ALL") {
      whereClause.movementType = movementType;
    }

    const movements = await prisma.inventoryMovement.findMany({
      where: whereClause,
      include: {
        product: { select: { id: true, name: true, sku: true, unitOfMeasure: true, costPrice: true, sellingPrice: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { effectiveDate: "desc" },
      take: Math.min(limit, 200),
    });

    return NextResponse.json({ movements });
  } catch (error) {
    console.error("Movements GET error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory movements." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();

    const { productId, branchId, movementType, quantity, referenceNumber, notes, effectiveDate } = body;

    if (!productId || !branchId || !movementType || quantity == null) {
      return NextResponse.json({ error: "Missing required movement fields." }, { status: 400 });
    }

    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== branchId) {
      return NextResponse.json({ error: "Unauthorized for another branch." }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // Apply movement sign multiplier
    const multiplier = MOVEMENT_SIGN_MULTIPLIER[movementType] ?? 1;
    const signedQuantity = movementType === "ADJUSTMENT" ? parseInt(quantity, 10) : Math.abs(parseInt(quantity, 10)) * multiplier;

    const movement = await prisma.inventoryMovement.create({
      data: {
        productId,
        branchId,
        movementType,
        quantity: signedQuantity,
        unitCost: product.costPrice,
        referenceNumber: referenceNumber || `MANUAL-${Date.now().toString().slice(-6)}`,
        notes: notes || null,
        actorId: user.id,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      },
      include: {
        product: true,
        branch: true,
      },
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: `STOCK_${movementType}`,
      entityType: "INVENTORY",
      entityId: movement.id,
      branchId,
      metadata: {
        productSku: product.sku,
        quantity: signedQuantity,
        referenceNumber: movement.referenceNumber,
      },
    });

    return NextResponse.json({ success: true, movement });
  } catch (error) {
    console.error("Movements POST error:", error);
    return NextResponse.json({ error: "Failed to record stock movement." }, { status: 500 });
  }
}
