import { MOVEMENT_SIGN_MULTIPLIER } from "./constants";

export interface MovementRecord {
  movementType: string;
  quantity: number;
  unitCost: number;
}

/**
 * Calculates net quantity impact of a movement based on its business movement type.
 * e.g., SALE of 5 units has an impact of -5 units.
 * ADJUSTMENT of -2 units has an impact of -2 units.
 */
export function calculateNetMovementQuantity(movementType: string, quantity: number): number {
  const multiplier = MOVEMENT_SIGN_MULTIPLIER[movementType] ?? 0;
  // If the movement is an ADJUSTMENT, quantity is already signed.
  if (movementType === "ADJUSTMENT") {
    return quantity;
  }
  // For positive-specified quantities (e.g. 10 wasted), apply multiplier (-1 * 10 = -10)
  return Math.abs(quantity) * multiplier;
}

/**
 * Calculates expected closing stock from an array of inventory movements.
 * Expected Closing Stock = Sum of all (net quantity movements)
 */
export function calculateExpectedStock(movements: MovementRecord[]): number {
  return movements.reduce((acc, mov) => {
    return acc + calculateNetMovementQuantity(mov.movementType, mov.quantity);
  }, 0);
}

/**
 * Calculates variance quantity: Physical Counted Quantity minus Expected Stock Quantity.
 * A negative variance means physical stock is LOWER than expected (possible shrinkage/unrecorded wastage).
 * A positive variance means physical stock is HIGHER than expected (possible unrecorded receipt).
 */
export function calculateQuantityVariance(countedQty: number, expectedQty: number): number {
  return countedQty - expectedQty;
}

/**
 * Calculates financial variance valuation:
 * Variance Value = Quantity Variance * Unit Cost (in INR ₹)
 */
export function calculateVarianceValue(varianceQty: number, unitCost: number): number {
  return Number((varianceQty * unitCost).toFixed(2));
}

/**
 * Calculates absolute financial risk exposure: |Variance Value|
 */
export function calculateAbsoluteExposure(varianceQty: number, unitCost: number): number {
  return Number((Math.abs(varianceQty) * unitCost).toFixed(2));
}

/**
 * Evaluates stock health metrics
 */
export function evaluateStockStatus(currentStock: number, minThreshold: number): {
  isLowStock: boolean;
  isNegativeStock: boolean;
  statusLabel: "HEALTHY" | "LOW_STOCK" | "CRITICAL_OUT_OF_STOCK" | "NEGATIVE_ANOMALY";
} {
  if (currentStock < 0) {
    return {
      isLowStock: true,
      isNegativeStock: true,
      statusLabel: "NEGATIVE_ANOMALY",
    };
  }
  if (currentStock === 0) {
    return {
      isLowStock: true,
      isNegativeStock: false,
      statusLabel: "CRITICAL_OUT_OF_STOCK",
    };
  }
  if (currentStock <= minThreshold) {
    return {
      isLowStock: true,
      isNegativeStock: false,
      statusLabel: "LOW_STOCK",
    };
  }
  return {
    isLowStock: false,
    isNegativeStock: false,
    statusLabel: "HEALTHY",
  };
}

/**
 * Calculates compliance rate percentage:
 * Approved Tasks / (Total Assigned Tasks - Cancelled Tasks) * 100
 */
export function calculateCompliancePercentage(
  approvedTasks: number,
  totalTasks: number,
  cancelledTasks: number = 0
): number {
  const eligibleDenominator = totalTasks - cancelledTasks;
  if (eligibleDenominator <= 0) return 100;
  const rate = (approvedTasks / eligibleDenominator) * 100;
  return Number(Math.min(100, Math.max(0, rate)).toFixed(1));
}
