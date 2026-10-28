"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, ShoppingBag, AlertCircle } from "lucide-react";

interface SalesPoint {
  date: string;
  label: string;
  revenue: number;
  unitsSold: number;
  transactions: number;
}

interface SalesRevenueChartProps {
  data: SalesPoint[];
  loading?: boolean;
  dateRangeLabel?: string;
}

export function SalesRevenueChart({ data, loading, dateRangeLabel }: SalesRevenueChartProps) {
  if (loading) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center bg-cream-muted/30 rounded-xl border border-cream-border animate-pulse">
        <TrendingUp className="w-8 h-8 text-gold-400 mb-2 animate-bounce" />
        <p className="text-xs text-neutralMuted font-medium">Aggregating live sales ledger...</p>
      </div>
    );
  }

  const hasData = data && data.length > 0 && data.some((d) => d.revenue > 0 || d.unitsSold > 0);

  if (!hasData) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center bg-cream/40 rounded-xl border border-dashed border-cream-border text-center p-6">
        <div className="w-12 h-12 rounded-full bg-gold-50 border border-gold-200 flex items-center justify-center mb-3">
          <ShoppingBag className="w-6 h-6 text-gold-600" />
        </div>
        <h4 className="font-serif font-bold text-sm text-plum">No Recorded Sales in Selected Period</h4>
        <p className="text-xs text-neutralMuted max-w-sm mt-1">
          No POS sales transactions were found for {dateRangeLabel || "the selected date filter"}. Select a broader date range or post new daily sales reconciliations.
        </p>
      </div>
    );
  }

  const totalRevenue = data.reduce((acc, d) => acc + d.revenue, 0);
  const totalUnits = data.reduce((acc, d) => acc + d.unitsSold, 0);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-2 border-b border-cream-border mb-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-gold-700 block">
            Atelier POS Performance
          </span>
          <h3 className="font-serif font-bold text-base text-plum flex items-center gap-2">
            <span>Sales & Revenue Trajectory</span>
            <span className="text-xs font-mono font-normal text-neutralMuted">
              ({dateRangeLabel || "Selected Range"})
            </span>
          </h3>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-neutralMuted block">Total Period Sales</span>
            <span className="font-serif font-black text-base text-plum">₹{totalRevenue.toLocaleString("en-IN")}</span>
          </div>
          <div className="h-6 w-px bg-cream-border" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-neutralMuted block">Units Dispatched</span>
            <span className="font-serif font-bold text-sm text-gold-800">{totalUnits.toLocaleString("en-IN")} units</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B1E3F" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8B1E3F" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="unitsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C6A45B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#C6A45B" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE1" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#8C7E74"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#E2D9CC" }}
            />
            <YAxis
              yAxisId="left"
              stroke="#8B1E3F"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#C6A45B"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-plum text-cream p-3 rounded-lg shadow-luxury border border-gold-400/30 text-xs">
                      <p className="font-serif font-bold text-gold-300 mb-1">{label}</p>
                      <p className="flex justify-between gap-4 text-cream">
                        <span>Revenue:</span>
                        <span className="font-bold text-white">₹{Number(payload[0]?.value || 0).toLocaleString("en-IN")}</span>
                      </p>
                      <p className="flex justify-between gap-4 text-gold-200 mt-0.5">
                        <span>Units Sold:</span>
                        <span className="font-bold">{payload[1]?.value || 0} units</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="Revenue (₹)"
              stroke="#8B1E3F"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#revenueGradient)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="unitsSold"
              name="Units Sold"
              stroke="#C6A45B"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#unitsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
