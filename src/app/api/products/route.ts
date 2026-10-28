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
 * GET /api/products
 * Retrieve active bakery products with optional search and category filters
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: any = { active: true };

    if (category && category !== "ALL") {
      where.category = category.trim().toUpperCase();
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term } },
        { sku: { contains: term } },
        { description: { contains: term } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      products,
      categories: BAKERY_CATEGORIES,
      totalCount: products.length,
    });
  } catch (error: any) {
    if (error?.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message?.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Products GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve products." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new bakery product (Restricted to OWNER and BRANCH_MANAGER)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();

    const {
      sku,
      name,
      category,
      description,
      unitOfMeasure = "PIECE",
      costPrice,
      sellingPrice,
      minStockThreshold = 10,
      imageUrl,
    } = body;

    // 1. Mandatory field validation
    if (!sku || !name || !category || costPrice == null || sellingPrice == null) {
      return NextResponse.json(
        { error: "Missing required fields: sku, name, category, costPrice, sellingPrice." },
        { status: 400 }
      );
    }

    // 2. Strict Category Validation
    const normalizedCategory = category.trim().toUpperCase();
    if (!isValidBakeryCategory(normalizedCategory)) {
      return NextResponse.json(
        {
          error: `Invalid product category '${category}'. Madam Chockelets exclusively manages approved confectionery categories.`,
          allowedCategories: BAKERY_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
        },
        { status: 400 }
      );
    }

    // 3. Unique SKU check
    const existing = await prisma.product.findUnique({
      where: { sku: sku.trim().toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A product with SKU '${sku}' already exists.` },
        { status: 409 }
      );
    }

    // 4. Create product
    const product = await prisma.product.create({
      data: {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category: normalizedCategory,
        description: description?.trim() || "",
        unitOfMeasure: unitOfMeasure.toUpperCase(),
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        minStockThreshold: parseInt(minStockThreshold, 10) || 10,
        imageUrl: imageUrl?.trim() || null,
        active: true,
      },
    });

    // 5. Audit trail
    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "BAKERY_PRODUCT_CREATED",
      entityType: "PRODUCT",
      entityId: product.id,
      metadata: {
        sku: product.sku,
        name: product.name,
        category: product.category,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
      },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    if (error?.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message?.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Product POST error:", error);
    return NextResponse.json(
      { error: "Failed to create product." },
      { status: 500 }
    );
  }
}
