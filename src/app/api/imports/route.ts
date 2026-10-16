import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import Papa from "papaparse";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();

    const {
      csvData,
      jobType = "SALES_IMPORT", // SALES_IMPORT or PHYSICAL_STOCK_IMPORT
      isDryRun = true,
      branchId: targetBranchId,
      fileName = "import_data.csv",
    } = body;

    if (!csvData || typeof csvData !== "string") {
      return NextResponse.json({ error: "CSV text data is required." }, { status: 400 });
    }

    const branchId = targetBranchId || user.branchId;
    if (!branchId) {
      return NextResponse.json({ error: "Branch ID must be specified for import." }, { status: 400 });
    }

    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== branchId) {
      return NextResponse.json({ error: "Unauthorized for another branch." }, { status: 403 });
    }

    // Parse CSV
    const parsed = Papa.parse(csvData.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    if (parsed.errors && parsed.errors.length > 0) {
      return NextResponse.json({
        error: "CSV parsing failed.",
        details: parsed.errors.map((e) => `Line ${e.row}: ${e.message}`),
      }, { status: 400 });
    }

    const rows = parsed.data as Record<string, string>[];
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV contains no data rows." }, { status: 400 });
    }

    // Cache products for verification
    const products = await prisma.product.findMany();
    const productBySku = new Map(products.map((p) => [p.sku.toUpperCase(), p]));

    const validationErrors: Array<{ row: number; error: string; raw: Record<string, string> }> = [];
    const validRows: Array<{
      productId: string;
      sku: string;
      quantity: number;
      unitCost: number;
      referenceNumber: string;
      notes: string;
    }> = [];

    // Formula injection guard helper
    const sanitizeCell = (val: string) => {
      if (typeof val === "string" && (val.startsWith("=") || val.startsWith("+") || val.startsWith("-") || val.startsWith("@"))) {
        return `'${val}`;
      }
      return val;
    };

    rows.forEach((r, idx) => {
      const rowNum = idx + 2; // Accounting for 1-indexed header line
      const rawSku = (r.sku || r.product_sku || "").trim().toUpperCase();
      const rawQty = (r.quantity || r.qty || "").trim();
      const rawRef = sanitizeCell((r.reference || r.invoice || r.ref || `IMP-${Date.now()}-${idx}`).trim());
      const rawNotes = sanitizeCell((r.notes || r.reason || "Imported batch entry").trim());

      if (!rawSku) {
        validationErrors.push({ row: rowNum, error: "Missing SKU", raw: r });
        return;
      }

      const prod = productBySku.get(rawSku);
      if (!prod) {
        validationErrors.push({ row: rowNum, error: `SKU '${rawSku}' not found in active product catalogue`, raw: r });
        return;
      }

      const qty = parseInt(rawQty, 10);
      if (isNaN(qty) || qty <= 0) {
        validationErrors.push({ row: rowNum, error: `Invalid quantity '${rawQty}'. Must be a positive integer`, raw: r });
        return;
      }

      validRows.push({
        productId: prod.id,
        sku: prod.sku,
        quantity: qty,
        unitCost: prod.costPrice,
        referenceNumber: rawRef,
        notes: rawNotes,
      });
    });

    // If dry run, return summary and preview without database write
    if (isDryRun) {
      return NextResponse.json({
        isDryRun: true,
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: validationErrors.length,
        previewRows: validRows.slice(0, 10),
        validationErrors,
        canProceed: validationErrors.length === 0,
      });
    }

    // Execute import in transaction
    const importJob = await prisma.$transaction(async (tx) => {
      const job = await tx.importJob.create({
        data: {
          jobType,
          fileName: sanitizeCell(fileName),
          fileSize: csvData.length,
          status: validationErrors.length > 0 && validRows.length === 0 ? "FAILED" : "COMPLETED",
          totalRows: rows.length,
          successfulRows: validRows.length,
          failedRows: validationErrors.length,
          initiatedById: user.id,
          completedAt: new Date(),
        },
      });

      // Record any errors
      for (const err of validationErrors) {
        await tx.importRowError.create({
          data: {
            importJobId: job.id,
            rowNumber: err.row,
            rawDataJson: JSON.stringify(err.raw),
            errorMessage: err.error,
          },
        });
      }

      // Create movements for valid rows
      for (const item of validRows) {
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            branchId,
            movementType: jobType === "SALES_IMPORT" ? "SALE" : "ADJUSTMENT",
            quantity: jobType === "SALES_IMPORT" ? -Math.abs(item.quantity) : item.quantity,
            unitCost: item.unitCost,
            referenceNumber: item.referenceNumber,
            notes: `[CSV IMPORT] ${item.notes}`,
            actorId: user.id,
          },
        });
      }

      return job;
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CSV_IMPORT_EXECUTED",
      entityType: "SYSTEM",
      entityId: importJob.id,
      branchId,
      metadata: {
        jobType,
        totalRows: rows.length,
        successfulRows: validRows.length,
        failedRows: validationErrors.length,
      },
    });

    return NextResponse.json({
      success: true,
      importJob,
      summary: {
        totalRows: rows.length,
        successfulRows: validRows.length,
        failedRows: validationErrors.length,
      },
      validationErrors,
    });
  } catch (error) {
    console.error("CSV Import error:", error);
    return NextResponse.json({ error: "Failed to process CSV import." }, { status: 500 });
  }
}
