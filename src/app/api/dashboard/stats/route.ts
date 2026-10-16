import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateCompliancePercentage, evaluateStockStatus } from "@/lib/inventory-calculator";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    // Filter params
    let branchFilter = searchParams.get("branchId");
    const dateRange = searchParams.get("range") || "30d"; // 7d, 30d, all

    // Server-side branch isolation: Branch Managers can ONLY view their assigned branch
    if (user.role === ROLES.BRANCH_MANAGER) {
      if (!user.branchId) {
        return NextResponse.json({ error: "No branch assigned to this manager account." }, { status: 403 });
      }
      branchFilter = user.branchId;
    }

    const branchQuery = branchFilter && branchFilter !== "ALL" ? { id: branchFilter } : { active: true };
    const branchRelationQuery = branchFilter && branchFilter !== "ALL" ? { branchId: branchFilter } : {};

    // 1. Branches & Employees
    const branches = await prisma.branch.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, city: true },
    });

    const activeBranchCount = await prisma.branch.count({
      where: branchQuery,
    });

    const activeEmployeeCount = await prisma.employee.count({
      where: {
        active: true,
        ...(branchFilter && branchFilter !== "ALL" ? { branchId: branchFilter } : {}),
      },
    });

    // 2. Tasks & Compliance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksDueToday = await prisma.task.count({
      where: {
        ...branchRelationQuery,
        dueDate: { gte: today, lt: tomorrow },
      },
    });

    const totalEligibleTasks = await prisma.task.count({
      where: {
        ...branchRelationQuery,
        status: { not: "CANCELLED" },
      },
    });

    const approvedTasks = await prisma.task.count({
      where: {
        ...branchRelationQuery,
        status: "APPROVED",
      },
    });

    const overdueTasks = await prisma.task.count({
      where: {
        ...branchRelationQuery,
        status: "OVERDUE",
      },
    });

    const pendingApprovals = await prisma.task.count({
      where: {
        ...branchRelationQuery,
        status: "SUBMITTED",
      },
    });

    const changesRequestedTasks = await prisma.task.count({
      where: {
        ...branchRelationQuery,
        status: "CHANGES_REQUESTED",
      },
    });

    const sopCompliancePercent = calculateCompliancePercentage(approvedTasks, totalEligibleTasks);

    // 3. Attendance Status Distribution & Exceptions
    const attendanceStats = await prisma.attendanceEvent.groupBy({
      by: ["status"],
      where: branchRelationQuery,
      _count: { id: true },
    });

    const attendanceDistribution = {
      VERIFIED: 0,
      FLAGGED: 0,
      PENDING_EXCEPTION: 0,
      REJECTED: 0,
    };
    attendanceStats.forEach((st) => {
      if (st.status in attendanceDistribution) {
        attendanceDistribution[st.status as keyof typeof attendanceDistribution] = st._count.id;
      }
    });

    const pendingAttendanceExceptions = await prisma.attendanceException.count({
      where: {
        ...branchRelationQuery,
        status: "PENDING",
      },
    });

    // 4. Products & Inventory Analysis
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { id: true, sku: true, name: true, minStockThreshold: true, costPrice: true, category: true },
    });

    // Group movements to derive accurate live stock for each product
    const movements = await prisma.inventoryMovement.findMany({
      where: branchRelationQuery,
      select: { productId: true, quantity: true, movementType: true, branchId: true },
    });

    const stockMap: Record<string, number> = {};
    for (const mov of movements) {
      stockMap[mov.productId] = (stockMap[mov.productId] || 0) + mov.quantity;
    }

    let lowStockCount = 0;
    let negativeStockCount = 0;
    const lowStockAlerts: Array<{ sku: string; name: string; currentStock: number; threshold: number }> = [];

    for (const p of products) {
      const current = stockMap[p.id] || 0;
      const evaluation = evaluateStockStatus(current, p.minStockThreshold);
      if (evaluation.isNegativeStock) negativeStockCount++;
      if (evaluation.isLowStock) {
        lowStockCount++;
        if (lowStockAlerts.length < 5) {
          lowStockAlerts.push({
            sku: p.sku,
            name: p.name,
            currentStock: current,
            threshold: p.minStockThreshold,
          });
        }
      }
    }

    // 5. Stock Reconciliation & Discrepancies
    const unresolvedDiscrepancies = await prisma.reconciliationDiscrepancy.count({
      where: {
        ...branchRelationQuery,
        status: { in: ["DISCOVERED", "INVESTIGATING", "ADJUSTMENT_REQUESTED"] },
      },
    });

    const pendingAdjustmentApprovals = await prisma.stockAdjustmentRequest.count({
      where: {
        ...branchRelationQuery,
        status: "PENDING",
      },
    });

    // 6. Branch Comparison Metrics
    const branchComparison = await Promise.all(
      branches.map(async (b) => {
        const bTotalTasks = await prisma.task.count({
          where: { branchId: b.id, status: { not: "CANCELLED" } },
        });
        const bApprovedTasks = await prisma.task.count({
          where: { branchId: b.id, status: "APPROVED" },
        });
        const bOverdue = await prisma.task.count({
          where: { branchId: b.id, status: "OVERDUE" },
        });
        const bPendingExceptions = await prisma.attendanceException.count({
          where: { branchId: b.id, status: "PENDING" },
        });
        const bDiscrepancies = await prisma.reconciliationDiscrepancy.count({
          where: { branchId: b.id, status: { not: "RESOLVED" } },
        });

        // Calculate branch inventory variance value
        const bCountItems = await prisma.stockCountItem.findMany({
          where: { session: { branchId: b.id } },
          select: { varianceValue: true },
        });
        const bVarianceExposure = bCountItems.reduce((acc, c) => acc + Math.abs(c.varianceValue), 0);

        return {
          branchId: b.id,
          branchCode: b.code,
          name: b.name,
          city: b.city,
          complianceRate: calculateCompliancePercentage(bApprovedTasks, bTotalTasks),
          approvedTasks: bApprovedTasks,
          overdueTasks: bOverdue,
          pendingExceptions: bPendingExceptions,
          openDiscrepancies: bDiscrepancies,
          varianceExposure: Number(bVarianceExposure.toFixed(2)),
        };
      })
    );

    // 7. Recent Action Queues
    const overdueQueue = await prisma.task.findMany({
      where: {
        ...branchRelationQuery,
        status: "OVERDUE",
      },
      take: 5,
      include: {
        branch: { select: { name: true, code: true } },
        sopVersion: { select: { title: true } },
        assignedEmployee: { include: { user: { select: { name: true } } } },
      },
      orderBy: { dueDate: "desc" },
    });

    const discrepancyQueue = await prisma.reconciliationDiscrepancy.findMany({
      where: {
        ...branchRelationQuery,
        status: { not: "RESOLVED" },
      },
      take: 5,
      include: {
        product: { select: { name: true, sku: true } },
        branch: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const recentAuditLogs = await prisma.auditEvent.findMany({
      where: branchRelationQuery,
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      summary: {
        activeBranches: activeBranchCount,
        activeEmployees: activeEmployeeCount,
        tasksDueToday,
        completedTasks: approvedTasks,
        overdueTasks,
        pendingApprovals,
        changesRequestedTasks,
        sopCompliancePercent,
        pendingAttendanceExceptions,
        lowStockProducts: lowStockCount,
        negativeStockProducts: negativeStockCount,
        unresolvedDiscrepancies,
        pendingAdjustmentApprovals,
      },
      attendanceDistribution,
      branchComparison,
      overdueQueue,
      discrepancyQueue,
      lowStockAlerts,
      recentAuditLogs,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to compute dashboard metrics." },
      { status: 500 }
    );
  }
}
