import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import {
  isValidBakeryCategory,
  BAKERY_CATEGORIES,
} from "@/lib/bakery-categories";
import { recordAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    if (error?.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message?.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to fetch product." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id]
 * Update product details with strict category enforcement
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();

    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const {
      name,
      category,
      description,
      unitOfMeasure,
      costPrice,
      sellingPrice,
      minStockThreshold,
      imageUrl,
      active,
    } = body;

    // Validate category if updating category
    let normalizedCategory: string | undefined = undefined;
    if (category) {
      normalizedCategory = category.trim().toUpperCase();
      if (!isValidBakeryCategory(normalizedCategory)) {
        return NextResponse.json(
          {
            error: `Invalid product category '${category}'. Only approved product categories are permitted.`,
            allowedCategories: BAKERY_CATEGORIES.map((c) => ({
              id: c.id,
              label: c.label,
            })),
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(normalizedCategory ? { category: normalizedCategory } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(unitOfMeasure ? { unitOfMeasure: unitOfMeasure.toUpperCase() } : {}),
        ...(costPrice != null ? { costPrice: parseFloat(costPrice) } : {}),
        ...(sellingPrice != null ? { sellingPrice: parseFloat(sellingPrice) } : {}),
        ...(minStockThreshold != null
          ? { minStockThreshold: parseInt(minStockThreshold, 10) }
          : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl?.trim() || null } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "BAKERY_PRODUCT_UPDATED",
      entityType: "PRODUCT",
      entityId: updated.id,
      metadata: {
        sku: updated.sku,
        name: updated.name,
        category: updated.category,
        costPrice: updated.costPrice,
        sellingPrice: updated.sellingPrice,
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    if (error?.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message?.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Product PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update product." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Soft delete product to protect ledger and transfer history integrity
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth([ROLES.OWNER]);
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // Soft delete to preserve historical inventory movement references
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { active: false },
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "BAKERY_PRODUCT_DEACTIVATED",
      entityType: "PRODUCT",
      entityId: updated.id,
      metadata: { sku: updated.sku, name: updated.name },
    });

    return NextResponse.json({ success: true, message: "Product deactivated." });
  } catch (error: any) {
    if (error?.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message?.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Product DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate product." },
      { status: 500 }
    );
  }
}
