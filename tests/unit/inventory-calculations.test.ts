import { describe, it, expect } from "vitest";
import {
  calculateNetMovementQuantity,
  calculateExpectedStock,
  calculateQuantityVariance,
  calculateVarianceValue,
  calculateAbsoluteExposure,
  evaluateStockStatus,
  calculateCompliancePercentage,
} from "../../src/lib/inventory-calculator";

describe("Inventory Calculator Unit Tests", () => {
  describe("Movement Sign Rules & Multipliers", () => {
    it("should treat purchases and receipts as positive stock additions", () => {
      expect(calculateNetMovementQuantity("PURCHASE", 50)).toBe(50);
      expect(calculateNetMovementQuantity("TRANSFER_IN", 20)).toBe(20);
      expect(calculateNetMovementQuantity("RETURN", 5)).toBe(5);
    });

    it("should treat sales, transfers-out, and wastage as negative stock deductions", () => {
      expect(calculateNetMovementQuantity("SALE", 15)).toBe(-15);
      expect(calculateNetMovementQuantity("TRANSFER_OUT", 10)).toBe(-10);
      expect(calculateNetMovementQuantity("WASTAGE", 4)).toBe(-4);
      expect(calculateNetMovementQuantity("DAMAGED", 2)).toBe(-2);
      expect(calculateNetMovementQuantity("COMPLIMENTARY", 3)).toBe(-3);
    });

    it("should preserve signed quantities for manual adjustments", () => {
      expect(calculateNetMovementQuantity("ADJUSTMENT", -6)).toBe(-6);
      expect(calculateNetMovementQuantity("ADJUSTMENT", 8)).toBe(8);
    });
  });

  describe("Expected Closing Stock Calculation", () => {
    it("should accurately sum movements to derive expected stock balance", () => {
      const movements = [
        { movementType: "OPENING_STOCK", quantity: 100, unitCost: 160 },
        { movementType: "PURCHASE", quantity: 50, unitCost: 160 },
        { movementType: "SALE", quantity: 30, unitCost: 160 },
        { movementType: "TRANSFER_OUT", quantity: 15, unitCost: 160 },
        { movementType: "WASTAGE", quantity: 5, unitCost: 160 },
      ];

      // 100 + 50 - 30 - 15 - 5 = 100 units
      expect(calculateExpectedStock(movements)).toBe(100);
    });
  });

  describe("Quantity Variance & Financial Valuation", () => {
    it("should compute physical quantity minus expected quantity", () => {
      // Physical count is 42, expected is 48 -> variance is -6
      expect(calculateQuantityVariance(42, 48)).toBe(-6);

      // Physical count is 56, expected is 50 -> variance is +6
      expect(calculateQuantityVariance(56, 50)).toBe(6);
    });

    it("should compute variance financial valuation correctly", () => {
      // 6 missing units @ ₹160 unit cost = -₹960.00
      expect(calculateVarianceValue(-6, 160.0)).toBe(-960.0);

      // Absolute risk exposure should be positive ₹960.00
      expect(calculateAbsoluteExposure(-6, 160.0)).toBe(960.0);
    });
  });

  describe("Stock Health & Threshold Status", () => {
    it("should detect negative stock anomalies", () => {
      const status = evaluateStockStatus(-3, 10);
      expect(status.isNegativeStock).toBe(true);
      expect(status.statusLabel).toBe("NEGATIVE_ANOMALY");
    });

    it("should detect critical out of stock", () => {
      const status = evaluateStockStatus(0, 10);
      expect(status.isLowStock).toBe(true);
      expect(status.statusLabel).toBe("CRITICAL_OUT_OF_STOCK");
    });

    it("should detect low stock below threshold", () => {
      const status = evaluateStockStatus(8, 15);
      expect(status.isLowStock).toBe(true);
      expect(status.statusLabel).toBe("LOW_STOCK");
    });

    it("should detect healthy stock", () => {
      const status = evaluateStockStatus(40, 15);
      expect(status.isLowStock).toBe(false);
      expect(status.statusLabel).toBe("HEALTHY");
    });
  });

  describe("SOP Compliance Calculation", () => {
    it("should compute compliance percentage excluding cancelled tasks", () => {
      // 95 approved out of 105 total, with 5 cancelled -> 95 / (105 - 5) * 100 = 95%
      expect(calculateCompliancePercentage(95, 105, 5)).toBe(95.0);
    });

    it("should handle zero eligible tasks gracefully", () => {
      expect(calculateCompliancePercentage(0, 0, 0)).toBe(100);
    });
  });
});
