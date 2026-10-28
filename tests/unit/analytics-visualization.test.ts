import { describe, it, expect } from "vitest";
import {
  resolveDateRange,
  aggregateSalesTimeSeries,
  aggregateCategoryMetrics,
  aggregateInventoryHealth,
  aggregateAttendanceTrends,
} from "../../src/lib/analytics-calculator";
import {
  evaluateShiftAttendance,
  aggregateDailyAttendance,
  getIstTimeComponents,
} from "../../src/lib/attendance-calculator";

describe("Analytics & Data Visualization Aggregators", () => {
  describe("resolveDateRange", () => {
    it("should resolve 'today' to current midnight IST to end of day IST", () => {
      const range = resolveDateRange("today");
      expect(range.rangeKey).toBe("today");
      expect(range.label).toBe("Today");
      expect(range.startDate.getTime()).toBeLessThan(range.endDate.getTime());
    });

    it("should resolve 'yesterday' to 1 day prior in IST", () => {
      const yesterday = resolveDateRange("yesterday");
      const today = resolveDateRange("today");
      expect(yesterday.rangeKey).toBe("yesterday");
      expect(yesterday.label).toBe("Yesterday");
      expect(yesterday.startDate.getTime()).toBeLessThan(today.startDate.getTime());
    });

    it("should resolve '7d' to a 7-day span", () => {
      const range = resolveDateRange("7d");
      expect(range.rangeKey).toBe("7d");
      expect(range.label).toBe("Last 7 Days");
      const diffDays = Math.round((range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(6);
    });

    it("should resolve '30d' as default range", () => {
      const range = resolveDateRange();
      expect(range.rangeKey).toBe("30d");
      expect(range.label).toBe("Last 30 Days");
    });

    it("should resolve 'this_month' starting on 1st of month", () => {
      const range = resolveDateRange("this_month");
      expect(range.rangeKey).toBe("this_month");
      expect(range.label).toBe("This Month");
      const istStart = getIstTimeComponents(range.startDate);
      expect(istStart.dateStr.endsWith("-01")).toBe(true);
    });

    it("should handle custom date range inputs", () => {
      const range = resolveDateRange("custom", "2026-10-01", "2026-10-15");
      expect(range.rangeKey).toBe("custom");
      expect(range.label).toBe("2026-10-01 - 2026-10-15");
      expect(range.startDate).toEqual(new Date("2026-10-01"));
      expect(range.endDate).toEqual(new Date("2026-10-15"));
    });
  });

  describe("aggregateSalesTimeSeries", () => {
    it("should bucket movements into daily revenue and units sold", () => {
      const bounds = {
        startDate: new Date("2026-10-20T00:00:00.000Z"),
        endDate: new Date("2026-10-22T23:59:59.999Z"),
        rangeKey: "custom",
        label: "Oct 20-22",
      };

      const movements = [
        {
          effectiveDate: new Date("2026-10-20T10:00:00.000Z"),
          quantity: -5,
          unitCost: 100,
          product: { sellingPrice: 250, costPrice: 100 },
        },
        {
          effectiveDate: new Date("2026-10-20T14:30:00.000Z"),
          quantity: -3,
          unitCost: 100,
          product: { sellingPrice: 250, costPrice: 100 },
        },
        {
          effectiveDate: new Date("2026-10-21T09:00:00.000Z"),
          quantity: -10,
          unitCost: 80,
          product: { sellingPrice: 180, costPrice: 80 },
        },
      ];

      const series = aggregateSalesTimeSeries(movements, bounds);
      expect(series.length).toBeGreaterThanOrEqual(3);

      const day20 = series.find((s) => s.date === "2026-10-20");
      expect(day20).toBeDefined();
      expect(day20?.unitsSold).toBe(8); // 5 + 3
      expect(day20?.revenue).toBe(2000); // 8 * 250
      expect(day20?.transactions).toBe(2);

      const day21 = series.find((s) => s.date === "2026-10-21");
      expect(day21).toBeDefined();
      expect(day21?.unitsSold).toBe(10);
      expect(day21?.revenue).toBe(1800); // 10 * 180
    });

    it("should handle empty movements without error by returning zero-filled date buckets", () => {
      const bounds = {
        startDate: new Date("2026-10-01T00:00:00.000Z"),
        endDate: new Date("2026-10-03T23:59:59.999Z"),
        rangeKey: "custom",
        label: "Oct 1-3",
      };

      const series = aggregateSalesTimeSeries([], bounds);
      expect(series.length).toBeGreaterThanOrEqual(3);
      series.forEach((pt) => {
        expect(pt.revenue).toBe(0);
        expect(pt.unitsSold).toBe(0);
        expect(pt.transactions).toBe(0);
      });
    });
  });

  describe("aggregateCategoryMetrics", () => {
    it("should compute category revenue, valuation and theme colors", () => {
      const products = [
        { id: "p1", category: "CAKES_PASTRIES", costPrice: 400, sellingPrice: 850 },
        { id: "p2", category: "CHOCOLATES_TRUFFLES", costPrice: 200, sellingPrice: 450 },
        { id: "p3", category: "CAKES_PASTRIES", costPrice: 300, sellingPrice: 650 },
      ];

      const stockMap = {
        p1: 10, // 10 * 400 = 4000
        p2: 25, // 25 * 200 = 5000
        p3: 5,  // 5 * 300 = 1500
      };

      const salesMovements = [
        { productId: "p1", quantity: -4 }, // 4 * 850 = 3400
        { productId: "p2", quantity: -6 }, // 6 * 450 = 2700
      ];

      const metrics = aggregateCategoryMetrics(products, stockMap, salesMovements);

      // Total valuation: (4000 + 1500) = 5500 for Cakes; 5000 for Chocolates
      expect(metrics.length).toBe(2);
      const cakes = metrics.find((m) => m.category === "CAKES_PASTRIES");
      expect(cakes).toBeDefined();
      expect(cakes?.valuation).toBe(5500);
      expect(cakes?.stockUnits).toBe(15);
      expect(cakes?.revenue).toBe(3400);
      expect(cakes?.unitsSold).toBe(4);
      expect(cakes?.color).toBe("#8B1E3F"); // signature cake berry color

      const choc = metrics.find((m) => m.category === "CHOCOLATES_TRUFFLES");
      expect(choc).toBeDefined();
      expect(choc?.valuation).toBe(5000);
      expect(choc?.revenue).toBe(2700);
      expect(choc?.color).toBe("#4A1525");
    });
  });

  describe("aggregateInventoryHealth", () => {
    it("should classify products into In Stock, Low Stock, and Out of Stock", () => {
      const products = [
        { id: "p1", category: "CAKES_PASTRIES", minStockThreshold: 5 },
        { id: "p2", category: "CAKES_PASTRIES", minStockThreshold: 10 },
        { id: "p3", category: "CAKES_PASTRIES", minStockThreshold: 8 },
      ];

      const stockMap = {
        p1: 12, // in stock (> 5)
        p2: 6,  // low stock (<= 10 and > 0)
        p3: 0,  // out of stock (<= 0)
      };

      const health = aggregateInventoryHealth(products, stockMap);
      const cakes = health.find((h) => h.category === "CAKES_PASTRIES");
      expect(cakes).toBeDefined();
      expect(cakes?.inStock).toBe(1);
      expect(cakes?.lowStock).toBe(1);
      expect(cakes?.outOfStock).toBe(1);
    });
  });

  describe("aggregateAttendanceTrends", () => {
    it("should compute daily verified, late, flagged and staff total hours", () => {
      const bounds = {
        startDate: new Date("2026-10-20T00:00:00.000Z"),
        endDate: new Date("2026-10-20T23:59:59.999Z"),
        rangeKey: "custom",
        label: "Oct 20",
      };

      // 03:25 UTC = 08:55 IST (On time)
      // 04:00 UTC = 09:30 IST (Late)
      const sessions = [
        {
          punchInTime: new Date("2026-10-20T03:25:00.000Z"),
          durationMinutes: 480,
          status: "COMPLETED",
        },
        {
          punchInTime: new Date("2026-10-20T04:00:00.000Z"),
          durationMinutes: 420,
          status: "COMPLETED",
        },
        {
          punchInTime: new Date("2026-10-20T03:30:00.000Z"),
          durationMinutes: 300,
          status: "FLAGGED",
        },
      ];

      const trends = aggregateAttendanceTrends(sessions, bounds);
      const day20 = trends.find((t) => t.date === "2026-10-20");
      expect(day20).toBeDefined();
      expect(day20?.verified).toBe(1);
      expect(day20?.late).toBe(1);
      expect(day20?.flagged).toBe(1);
      expect(day20?.totalHours).toBe(20); // (480 + 420 + 300) / 60 = 20.0 hrs
    });
  });
});

describe("Attendance & Shift Calculator", () => {
  describe("evaluateShiftAttendance", () => {
    it("should flag morning check-in after 09:15 AM IST as late", () => {
      // 09:20 AM IST = 03:50 UTC
      const evaluation = evaluateShiftAttendance({
        punchInTime: new Date("2026-10-23T03:50:00.000Z"),
        punchOutTime: new Date("2026-10-23T12:00:00.000Z"),
        status: "COMPLETED",
        scheduledStartHour: 9,
        scheduledStartMinute: 0,
        gracePeriodMinutes: 15,
      });

      expect(evaluation.shiftType).toBe("MORNING");
      expect(evaluation.isLate).toBe(true);
      expect(evaluation.minutesLate).toBe(20); // 09:20 - 09:00 = 20 mins
      expect(evaluation.statusLabel).toContain("Late Arrival (+20m)");
    });

    it("should accept morning check-in at 09:10 AM IST within grace period as on-time", () => {
      // 09:10 AM IST = 03:40 UTC
      const evaluation = evaluateShiftAttendance({
        punchInTime: new Date("2026-10-23T03:40:00.000Z"),
        punchOutTime: new Date("2026-10-23T11:40:00.000Z"),
        status: "COMPLETED",
      });

      expect(evaluation.shiftType).toBe("MORNING");
      expect(evaluation.isLate).toBe(false);
      expect(evaluation.minutesLate).toBe(0);
    });

    it("should compute overtime when duration exceeds 480 minutes (8 hours)", () => {
      const evaluation = evaluateShiftAttendance({
        punchInTime: new Date("2026-10-23T03:30:00.000Z"),
        punchOutTime: new Date("2026-10-23T12:30:00.000Z"), // 9 hours = 540 minutes
        status: "COMPLETED",
      });

      expect(evaluation.effectiveDurationMinutes).toBe(540);
      expect(evaluation.isOvertime).toBe(true);
      expect(evaluation.overtimeMinutes).toBe(60); // 1 hour overtime
      expect(evaluation.statusLabel).toContain("Overtime (+1h)");
    });

    it("should detect early departure when closed session is less than 450 minutes", () => {
      const evaluation = evaluateShiftAttendance({
        punchInTime: new Date("2026-10-23T03:30:00.000Z"),
        punchOutTime: new Date("2026-10-23T08:30:00.000Z"), // 5 hours = 300 minutes
        status: "COMPLETED",
      });

      expect(evaluation.isEarlyDeparture).toBe(true);
      expect(evaluation.statusLabel).toBe("Early Departure");
    });

    it("should detect missed check-out if session is OPEN and starts on a prior calendar day", () => {
      const yesterday = new Date(Date.now() - 28 * 60 * 60 * 1000); // 28 hours ago
      const evaluation = evaluateShiftAttendance({
        punchInTime: yesterday,
        status: "OPEN",
      });

      expect(evaluation.isMissedCheckout).toBe(true);
      expect(evaluation.statusLabel).toBe("Missed Check-Out");
    });
  });

  describe("aggregateDailyAttendance", () => {
    it("should sum multiple shifts and compute total hours and overtime", () => {
      const sessions = [
        {
          id: "s1",
          punchInTime: "2026-10-23T03:30:00.000Z", // 09:00 IST
          punchOutTime: "2026-10-23T07:30:00.000Z", // 4 hours = 240 mins
          durationMinutes: 240,
          status: "COMPLETED",
        },
        {
          id: "s2",
          punchInTime: "2026-10-23T08:30:00.000Z", // 14:00 IST
          punchOutTime: "2026-10-23T13:30:00.000Z", // 5 hours = 300 mins
          durationMinutes: 300,
          status: "COMPLETED",
        },
      ];

      const daily = aggregateDailyAttendance(sessions);
      expect(daily.sessionCount).toBe(2);
      expect(daily.totalDurationMinutes).toBe(540); // 240 + 300
      expect(daily.totalOvertimeMinutes).toBe(60); // 540 - 480
      expect(daily.formattedTotalHours).toBe("9h 0m");
      expect(daily.hasOpenSession).toBe(false);
      expect(daily.hasMissedCheckout).toBe(false);
    });
  });
});
