import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { calculateCompliancePercentage, evaluateStockStatus } from "@/lib/inventory-calculator";
import { ROLES } from "@/lib/constants";
import {
  resolveDateRange,
  aggregateSalesTimeSeries,
  aggregateCategoryMetrics,
  aggregateInventoryHealth,
  aggregateAttendanceTrends,
} from "@/lib/analytics-calculator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    // Filter params
    let branchFilter = searchParams.get("branchId");
    const dateRange = searchParams.get("range") || "30d"; // today, yesterday, 7d, 30d, this_month, custom
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    // Server-side branch isolation: Branch Managers & Employees can ONLY view their assigned branch
    if (user.role === ROLES.BRANCH_MANAGER || user.role === ROLES.EMPLOYEE) {
      if (!user.branchId) {
        return NextResponse.json({ error: "No branch assigned to this account." }, { status: 403 });
      }
      branchFilter = user.branchId;
    } else if (!branchFilter) {
      branchFilter = req.cookies.get("mc_selected_outlet")?.value || "ALL";
    }

    let targetBranchId: string | null = null;
    if (branchFilter && branchFilter !== "ALL") {
      const foundBranch = await prisma.branch.findFirst({
        where: { OR: [{ id: branchFilter }, { code: branchFilter.toUpperCase() }] },
      });
      if (foundBranch) {
        targetBranchId = foundBranch.id;
      }
    }

    const branchQuery = targetBranchId ? { id: targetBranchId } : { active: true };
    const branchRelationQuery = targetBranchId ? { branchId: targetBranchId } : {};

    // Date range bounds (Asia/Kolkata timezone compliant)
    const dateBounds = resolveDateRange(dateRange, customStart, customEnd);

    // DEDICATED EMPLOYEE WORKSPACE: Zero visualizations, zero financial ledger leaks, clean operational workflow
    if (user.role === ROLES.EMPLOYEE) {
      const employee = await prisma.employee.findFirst({
        where: user.employeeId ? { id: user.employeeId } : { userId: user.id },
        include: {
          branch: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      const userBranch = employee?.branch || (targetBranchId ? await prisma.branch.findUnique({ where: { id: targetBranchId } }) : null);

      // Active attendance session for the employee
      const activeSession = employee
        ? await prisma.attendanceSession.findFirst({
            where: { employeeId: employee.id, status: "OPEN" },
            orderBy: { punchInTime: "desc" },
          })
        : null;

      // Recent personal sessions in selected date bounds
      const personalSessions = employee
        ? await prisma.attendanceSession.findMany({
            where: {
              employeeId: employee.id,
              punchInTime: { gte: dateBounds.startDate, lte: dateBounds.endDate },
            },
            orderBy: { punchInTime: "desc" },
            take: 5,
          })
        : [];

      const personalHoursWorked = Number(
        (personalSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / 60).toFixed(1)
      );

      // Assigned operational tasks & checklists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const assignedTasks = employee
        ? await prisma.task.findMany({
            where: {
              OR: [
                { assignedEmployeeId: employee.id },
                { branchId: employee.branchId, assignedEmployeeId: null },
              ],
              dueDate: { gte: today, lt: tomorrow },
              status: { not: "CANCELLED" },
            },
            include: {
              sopVersion: {
                select: {
                  title: true,
                  versionNumber: true,
                  sop: { select: { category: true } },
                },
              },
              branch: { select: { name: true, code: true } },
            },
            orderBy: { dueDate: "asc" },
            take: 10,
          })
        : [];

      const tasksDueToday = assignedTasks.length;
      const approvedTasks = assignedTasks.filter((t) => t.status === "APPROVED").length;
      const overdueTasks = assignedTasks.filter((t) => t.status === "OVERDUE").length;
      const pendingApprovals = assignedTasks.filter((t) => t.status === "SUBMITTED").length;
      const changesRequested = assignedTasks.filter((t) => t.status === "CHANGES_REQUESTED").length;
      const compliancePercent = calculateCompliancePercentage(approvedTasks, tasksDueToday);

      return NextResponse.json({
        branches: userBranch ? [{ id: userBranch.id, code: userBranch.code, name: userBranch.name, city: userBranch.city }] : [],
        dateBounds: {
          rangeKey: dateBounds.rangeKey,
          label: dateBounds.label,
          startDate: dateBounds.startDate.toISOString(),
          endDate: dateBounds.endDate.toISOString(),
        },
        periodSummary: {
          revenue: 0,
          unitsSold: 0,
          transactions: 0,
          avgOrderValue: 0,
          hoursWorked: personalHoursWorked,
          sopCompliancePercent: compliancePercent,
        },
        salesTrend: [],
        categoryPerformance: [],
        inventoryHealth: [],
        attendanceTrends: [],
        summary: {
          activeBranches: 1,
          activeEmployees: 1,
          tasksDueToday,
          completedTasks: approvedTasks,
          overdueTasks,
          pendingApprovals,
          changesRequestedTasks: changesRequested,
          sopCompliancePercent: compliancePercent,
          pendingAttendanceExceptions: 0,
          lowStockProducts: 0,
          negativeStockProducts: 0,
          unresolvedDiscrepancies: 0,
          pendingAdjustmentApprovals: 0,
        },
        attendanceDistribution: { VERIFIED: 0, FLAGGED: 0, PENDING_EXCEPTION: 0, REJECTED: 0 },
        branchComparison: [],
        overdueQueue: assignedTasks
          .filter((t: any) => t.status === "OVERDUE")
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            dueTime: t.dueDate.toISOString(),
            branch: t.branch,
            assignedEmployee: { user: { name: employee?.user?.name || "Artisan" } },
          })),
        discrepancyQueue: [],
        lowStockAlerts: [],
        recentAuditLogs: [],
        categoryBreakdown: [],
        employeeWorkspace: {
          employeeId: employee?.id,
          employeeCode: employee?.employeeCode,
          designation: employee?.designation,
          branchName: userBranch?.name || employee?.branch?.name || "Assigned Boutique",
          branchCode: userBranch?.code || employee?.branch?.code || "WHF",
          wifiSsid: userBranch?.wifiSsid || employee?.branch?.wifiSsid || "Moto G85 5G",
          activeSession,
          recentSessions: personalSessions,
          assignedTasks: assignedTasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate.toISOString(),
            sopTitle: t.sopVersion?.title,
            sopCategory: t.sopVersion?.sop?.category,
          })),
        },
      });
    }

    // 1. Branches & Employees
    const branches = await prisma.branch.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, city: true },
    });

    const activeBranchCount = await prisma.branch.count({
      where: branchQuery,
    });

    const isOwner = user.role === ROLES.OWNER;

    const activeEmployeeCount = await prisma.employee.count({
      where: {
        active: true,
        employmentStatus: "ACTIVE",
        user: { active: true, role: { not: ROLES.OWNER } },
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

    // 3. Attendance Status Distribution & Exceptions (Completely excluded for Owner)
    const attendanceStats = isOwner
      ? []
      : await prisma.attendanceEvent.groupBy({
          by: ["status"],
          where: {
            ...branchRelationQuery,
            timestamp: { gte: dateBounds.startDate, lte: dateBounds.endDate },
            employee: {
              active: true,
              employmentStatus: "ACTIVE",
              user: { active: true, role: { not: ROLES.OWNER } },
            },
          },
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

    const pendingAttendanceExceptions = isOwner
      ? 0
      : await prisma.attendanceException.count({
          where: {
            ...branchRelationQuery,
            employee: {
              active: true,
              employmentStatus: "ACTIVE",
              user: { active: true, role: { not: ROLES.OWNER } },
            },
            status: "PENDING",
          },
        });

    // 4. Products & Inventory Analysis
    const products = await prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        minStockThreshold: true,
        costPrice: true,
        sellingPrice: true,
      },
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

    // Category Inventory Valuation Breakdown
    const categoryStats: Record<string, { count: number; totalUnits: number; totalValue: number }> = {};
    for (const p of products) {
      const current = stockMap[p.id] || 0;
      const cat = p.category || "OTHER";
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, totalUnits: 0, totalValue: 0 };
      }
      categoryStats[cat].count += 1;
      categoryStats[cat].totalUnits += Math.max(0, current);
      categoryStats[cat].totalValue += Math.max(0, current) * p.costPrice;
    }

    const categoryBreakdown = Object.entries(categoryStats)
      .map(([category, data]) => ({
        category,
        productCount: data.count,
        totalUnits: data.totalUnits,
        totalValue: Math.round(data.totalValue),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

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
        const bActiveEmployees = await prisma.employee.count({
          where: {
            branchId: b.id,
            active: true,
            employmentStatus: "ACTIVE",
            user: { active: true, role: { not: ROLES.OWNER } },
          },
        });
        const bTotalTasks = await prisma.task.count({
          where: { branchId: b.id, status: { not: "CANCELLED" } },
        });
        const bApprovedTasks = await prisma.task.count({
          where: { branchId: b.id, status: "APPROVED" },
        });
        const bOverdue = await prisma.task.count({
          where: { branchId: b.id, status: "OVERDUE" },
        });
        const bPendingExceptions = isOwner
          ? 0
          : await prisma.attendanceException.count({
              where: {
                branchId: b.id,
                status: "PENDING",
                employee: {
                  active: true,
                  employmentStatus: "ACTIVE",
                  user: { active: true, role: { not: ROLES.OWNER } },
                },
              },
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
          activeEmployees: bActiveEmployees,
          complianceRate: calculateCompliancePercentage(bApprovedTasks, bTotalTasks),
          approvedTasks: bApprovedTasks,
          overdueTasks: bOverdue,
          pendingExceptions: bPendingExceptions,
          openDiscrepancies: bDiscrepancies,
          varianceExposure: Number(bVarianceExposure.toFixed(2)),
        };
      })
    );

    // 7. Recent Action Queues (assigned to active living personnel)
    const overdueQueue = await prisma.task.findMany({
      where: {
        ...branchRelationQuery,
        status: "OVERDUE",
        OR: [
          { assignedEmployeeId: null },
          {
            assignedEmployee: {
              active: true,
              employmentStatus: "ACTIVE",
              user: { active: true },
            },
          },
        ],
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

    // 8. Real Sales Analytics in Date Range
    const salesMovements = await prisma.inventoryMovement.findMany({
      where: {
        ...branchRelationQuery,
        movementType: "SALE",
        effectiveDate: { gte: dateBounds.startDate, lte: dateBounds.endDate },
      },
      include: {
        product: { select: { sellingPrice: true, costPrice: true } },
      },
      orderBy: { effectiveDate: "asc" },
    });

    const salesTrend = aggregateSalesTimeSeries(salesMovements, dateBounds);
    const categoryPerformance = aggregateCategoryMetrics(products, stockMap, salesMovements);
    const inventoryHealth = aggregateInventoryHealth(products, stockMap);

    const periodRevenue = salesTrend.reduce((acc, pt) => acc + pt.revenue, 0);
    const periodUnitsSold = salesTrend.reduce((acc, pt) => acc + pt.unitsSold, 0);
    const periodTransactions = salesTrend.reduce((acc, pt) => acc + pt.transactions, 0);
    const periodAvgOrderValue = periodTransactions > 0 ? Math.round(periodRevenue / periodTransactions) : 0;

    // 9. Attendance Trends (Owner excluded)
    let attendanceTrends: any[] = [];
    let periodHoursWorked = 0;

    if (!isOwner) {
      const attendanceSessions = await prisma.attendanceSession.findMany({
        where: {
          ...branchRelationQuery,
          punchInTime: { gte: dateBounds.startDate, lte: dateBounds.endDate },
          employee: {
            active: true,
            employmentStatus: "ACTIVE",
            user: { active: true, role: { not: ROLES.OWNER } },
          },
        },
        select: {
          punchInTime: true,
          durationMinutes: true,
          status: true,
        },
        orderBy: { punchInTime: "asc" },
      });

      attendanceTrends = aggregateAttendanceTrends(attendanceSessions, dateBounds);
      periodHoursWorked = Number(
        (attendanceSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / 60).toFixed(1)
      );
    }

    return NextResponse.json({
      branches: branches.map((b) => ({ id: b.id, code: b.code, name: b.name, city: b.city })),
      dateBounds: {
        rangeKey: dateBounds.rangeKey,
        label: dateBounds.label,
        startDate: dateBounds.startDate.toISOString(),
        endDate: dateBounds.endDate.toISOString(),
      },
      periodSummary: {
        revenue: periodRevenue,
        unitsSold: periodUnitsSold,
        transactions: periodTransactions,
        avgOrderValue: periodAvgOrderValue,
        hoursWorked: periodHoursWorked,
        sopCompliancePercent,
      },
      salesTrend,
      categoryPerformance,
      inventoryHealth,
      attendanceTrends,
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
      branchComparison:
        user.role === ROLES.BRANCH_MANAGER
          ? branchComparison.filter((b) => b.branchId === user.branchId)
          : branchComparison,
      overdueQueue,
      discrepancyQueue,
      lowStockAlerts,
      recentAuditLogs,
      categoryBreakdown,
    });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to compute dashboard metrics." },
      { status: 500 }
    );
  }
}
