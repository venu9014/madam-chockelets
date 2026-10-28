/**
 * Analytics and Data Visualization Aggregation Engine for MADAM CHOCOLATE
 *
 * Implements business metrics for:
 * - Sales and revenue time-series aggregation
 * - Category performance valuation & product distribution
 * - Inventory stock level and health tracking
 * - Workforce attendance trends (on-time, late, flagged, total hours)
 * - Timezone-aware date range parsing for Asia/Kolkata (UTC+5:30)
 */

import { BAKERY_CATEGORIES } from "./bakery-categories";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
  rangeKey: string;
  label: string;
}

/**
 * Resolves standard date range string into precise start and end Date objects in IST.
 */
export function resolveDateRange(rangeKey = "30d", customStart?: string | null, customEnd?: string | null): DateRangeBounds {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  // Helper to get midnight IST as a UTC date
  const getMidnightIst = (dateInIst: Date): Date => {
    const y = dateInIst.getUTCFullYear();
    const m = dateInIst.getUTCMonth();
    const d = dateInIst.getUTCDate();
    // UTC time of 00:00:00 IST is 18:30:00 UTC of previous day
    return new Date(Date.UTC(y, m, d) - IST_OFFSET_MS);
  };

  const getEndOfDayIst = (dateInIst: Date): Date => {
    const y = dateInIst.getUTCFullYear();
    const m = dateInIst.getUTCMonth();
    const d = dateInIst.getUTCDate();
    return new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - IST_OFFSET_MS);
  };

  if (rangeKey === "custom" && customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    return {
      startDate: isNaN(start.getTime()) ? new Date(now.getTime() - 30 * 86400000) : start,
      endDate: isNaN(end.getTime()) ? now : end,
      rangeKey: "custom",
      label: `${customStart} - ${customEnd}`,
    };
  }

  if (rangeKey === "today") {
    return {
      startDate: getMidnightIst(istNow),
      endDate: getEndOfDayIst(istNow),
      rangeKey: "today",
      label: "Today",
    };
  }

  if (rangeKey === "yesterday") {
    const yesterdayIst = new Date(istNow.getTime() - 86400000);
    return {
      startDate: getMidnightIst(yesterdayIst),
      endDate: getEndOfDayIst(yesterdayIst),
      rangeKey: "yesterday",
      label: "Yesterday",
    };
  }

  if (rangeKey === "7d") {
    const sevenDaysAgoIst = new Date(istNow.getTime() - 6 * 86400000);
    return {
      startDate: getMidnightIst(sevenDaysAgoIst),
      endDate: getEndOfDayIst(istNow),
      rangeKey: "7d",
      label: "Last 7 Days",
    };
  }

  if (rangeKey === "this_month") {
    const monthStartIst = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1));
    return {
      startDate: getMidnightIst(monthStartIst),
      endDate: getEndOfDayIst(istNow),
      rangeKey: "this_month",
      label: "This Month",
    };
  }

  // Default: 30d
  const thirtyDaysAgoIst = new Date(istNow.getTime() - 29 * 86400000);
  return {
    startDate: getMidnightIst(thirtyDaysAgoIst),
    endDate: getEndOfDayIst(istNow),
    rangeKey: "30d",
    label: "Last 30 Days",
  };
}

export interface DailySalesPoint {
  date: string;       // YYYY-MM-DD
  label: string;      // "22 Oct"
  revenue: number;    // In ₹
  unitsSold: number;  // Items
  transactions: number;
}

/**
 * Aggregates actual recorded SALE movements into daily time-series points.
 */
export function aggregateSalesTimeSeries(
  movements: Array<{
    effectiveDate: Date;
    quantity: number;
    unitCost: number;
    product: { sellingPrice: number; costPrice: number };
  }>,
  dateBounds: DateRangeBounds
): DailySalesPoint[] {
  // Generate daily buckets across the date range
  const buckets: Record<string, DailySalesPoint> = {};

  const current = new Date(dateBounds.startDate);
  const end = new Date(dateBounds.endDate);

  while (current <= end) {
    const istTime = new Date(current.getTime() + IST_OFFSET_MS);
    const dateStr = istTime.toISOString().slice(0, 10);
    const day = istTime.getUTCDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = monthNames[istTime.getUTCMonth()];

    if (!buckets[dateStr]) {
      buckets[dateStr] = {
        date: dateStr,
        label: `${day} ${monthStr}`,
        revenue: 0,
        unitsSold: 0,
        transactions: 0,
      };
    }
    current.setDate(current.getDate() + 1);
  }

  // Populate from movements
  for (const m of movements) {
    const mIst = new Date(new Date(m.effectiveDate).getTime() + IST_OFFSET_MS);
    const dateKey = mIst.toISOString().slice(0, 10);

    if (buckets[dateKey]) {
      const units = Math.abs(m.quantity);
      const price = m.product.sellingPrice || m.unitCost || 0;
      buckets[dateKey].unitsSold += units;
      buckets[dateKey].revenue += units * price;
      buckets[dateKey].transactions += 1;
    }
  }

  return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
}

export interface CategoryMetric {
  category: string;
  label: string;
  color: string;
  revenue: number;
  unitsSold: number;
  stockUnits: number;
  valuation: number;
  sharePercent: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  CAKES_PASTRIES: "#8B1E3F",
  CHOCOLATES_TRUFFLES: "#4A1525",
  COOKIES_BISCUITS: "#C6A45B",
  CUPCAKES_MUFFINS: "#A0522D",
  BREADS_BUNS: "#D27D2D",
  DONUTS: "#9B4F96",
  BROWNIES_BARS: "#3D2314",
  PUFFS_SAVOURIES: "#D97706",
  INGREDIENTS_PACKAGING: "#475569",
};

/**
 * Computes performance & valuation per bakery product category.
 */
export function aggregateCategoryMetrics(
  products: Array<{
    id: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
  }>,
  stockMap: Record<string, number>,
  salesMovements: Array<{
    productId: string;
    quantity: number;
  }>
): CategoryMetric[] {
  const salesMap: Record<string, { units: number; revenue: number }> = {};

  for (const s of salesMovements) {
    if (!salesMap[s.productId]) {
      salesMap[s.productId] = { units: 0, revenue: 0 };
    }
    const units = Math.abs(s.quantity);
    salesMap[s.productId].units += units;
  }

  const categoryAggs: Record<string, { revenue: number; unitsSold: number; stockUnits: number; valuation: number }> = {};

  for (const p of products) {
    const cat = p.category || "OTHER";
    if (!categoryAggs[cat]) {
      categoryAggs[cat] = { revenue: 0, unitsSold: 0, stockUnits: 0, valuation: 0 };
    }

    const currentStock = Math.max(0, stockMap[p.id] || 0);
    const sold = salesMap[p.id]?.units || 0;
    const rev = sold * (p.sellingPrice || p.costPrice);

    categoryAggs[cat].stockUnits += currentStock;
    categoryAggs[cat].valuation += currentStock * p.costPrice;
    categoryAggs[cat].unitsSold += sold;
    categoryAggs[cat].revenue += rev;
  }

  const totalValuation = Object.values(categoryAggs).reduce((acc, c) => acc + c.valuation, 0);

  return Object.entries(categoryAggs).map(([cat, data]) => {
    const meta = BAKERY_CATEGORIES.find((b) => b.id === cat);
    const label = meta?.label || cat.replace(/_/g, " ");
    const color = CATEGORY_COLORS[cat] || "#A0522D";
    const sharePercent = totalValuation > 0 ? Number(((data.valuation / totalValuation) * 100).toFixed(1)) : 0;

    return {
      category: cat,
      label,
      color,
      revenue: Math.round(data.revenue),
      unitsSold: data.unitsSold,
      stockUnits: data.stockUnits,
      valuation: Math.round(data.valuation),
      sharePercent,
    };
  }).sort((a, b) => b.valuation - a.valuation);
}

export interface InventoryHealthMetric {
  category: string;
  label: string;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export function aggregateInventoryHealth(
  products: Array<{
    id: string;
    category: string;
    minStockThreshold: number;
  }>,
  stockMap: Record<string, number>
): InventoryHealthMetric[] {
  const aggs: Record<string, { inStock: number; lowStock: number; outOfStock: number }> = {};

  for (const p of products) {
    const cat = p.category || "OTHER";
    if (!aggs[cat]) {
      aggs[cat] = { inStock: 0, lowStock: 0, outOfStock: 0 };
    }
    const current = stockMap[p.id] || 0;
    if (current <= 0) {
      aggs[cat].outOfStock += 1;
    } else if (current <= p.minStockThreshold) {
      aggs[cat].lowStock += 1;
    } else {
      aggs[cat].inStock += 1;
    }
  }

  return Object.entries(aggs).map(([cat, counts]) => {
    const meta = BAKERY_CATEGORIES.find((b) => b.id === cat);
    return {
      category: cat,
      label: meta?.label || cat.replace(/_/g, " "),
      ...counts,
    };
  });
}

export interface DailyAttendanceTrendPoint {
  date: string;
  label: string;
  verified: number;
  late: number;
  flagged: number;
  totalHours: number;
}

export function aggregateAttendanceTrends(
  sessions: Array<{
    punchInTime: Date;
    durationMinutes?: number | null;
    status: string;
  }>,
  dateBounds: DateRangeBounds
): DailyAttendanceTrendPoint[] {
  const buckets: Record<string, DailyAttendanceTrendPoint> = {};

  const current = new Date(dateBounds.startDate);
  const end = new Date(dateBounds.endDate);

  while (current <= end) {
    const istTime = new Date(current.getTime() + IST_OFFSET_MS);
    const dateStr = istTime.toISOString().slice(0, 10);
    const day = istTime.getUTCDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = monthNames[istTime.getUTCMonth()];

    if (!buckets[dateStr]) {
      buckets[dateStr] = {
        date: dateStr,
        label: `${day} ${monthStr}`,
        verified: 0,
        late: 0,
        flagged: 0,
        totalHours: 0,
      };
    }
    current.setDate(current.getDate() + 1);
  }

  for (const s of sessions) {
    const inDate = new Date(s.punchInTime);
    const istIn = new Date(inDate.getTime() + IST_OFFSET_MS);
    const dateKey = istIn.toISOString().slice(0, 10);

    if (buckets[dateKey]) {
      const hour = istIn.getUTCHours();
      const min = istIn.getUTCMinutes();
      const totalInMins = hour * 60 + min;

      // Late if morning punch-in is after 09:15 AM IST (555 minutes)
      const isLate = totalInMins > 555 && totalInMins < 660;

      if (s.status === "COMPLETED" || s.status === "VERIFIED" || s.status === "OPEN") {
        if (isLate) {
          buckets[dateKey].late += 1;
        } else {
          buckets[dateKey].verified += 1;
        }
      } else if (s.status === "FLAGGED") {
        buckets[dateKey].flagged += 1;
      }

      const durHours = (s.durationMinutes || 0) / 60;
      buckets[dateKey].totalHours = Number((buckets[dateKey].totalHours + durHours).toFixed(1));
    }
  }

  return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
}
