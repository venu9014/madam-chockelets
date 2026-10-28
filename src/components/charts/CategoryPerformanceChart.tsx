"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { PieChart, Boxes } from "lucide-react";

interface CategoryMetric {
  category: string;
  label: string;
  color: string;
  revenue: number;
  unitsSold: number;
  stockUnits: number;
  valuation: number;
  sharePercent: number;
}

interface CategoryPerformanceChartProps {
  data: CategoryMetric[];
  loading?: boolean;
}

export function CategoryPerformanceChart({ data, loading }: CategoryPerformanceChartProps) {
  if (loading) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center bg-cream-muted/30 rounded-xl border border-cream-border animate-pulse">
        <PieChart className="w-8 h-8 text-gold-400 mb-2 animate-bounce" />
        <p className="text-xs text-neutralMuted font-medium">Calculating category valuation...</p>
      </div>
    );
  }

  const hasData = data && data.length > 0 && data.some((d) => d.valuation > 0 || d.revenue > 0);

  if (!hasData) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center bg-cream/40 rounded-xl border border-dashed border-cream-border text-center p-6">
        <Boxes className="w-10 h-10 text-gold-500 mb-2" />
        <h4 className="font-serif font-bold text-sm text-plum">No Category Data Available</h4>
        <p className="text-xs text-neutralMuted max-w-sm mt-1">
          No active confectionery inventory records or sales were returned for this filter.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-3">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-gold-700 block">
            Category Asset Valuation
          </span>
          <h3 className="font-serif font-bold text-base text-plum">
            Confectionery Inventory Capitalization
          </h3>
        </div>
        <span className="text-xs font-mono font-medium text-neutralMuted bg-cream px-2 py-1 rounded border border-cream-border">
          {data.length} Categories
        </span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE1" horizontal={false} />
            <XAxis
              type="number"
              stroke="#8C7E74"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#E2D9CC" }}
              tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="#4A1525"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as CategoryMetric;
                  return (
                    <div className="bg-plum text-cream p-3 rounded-lg shadow-luxury border border-gold-400/30 text-xs">
                      <p className="font-serif font-bold text-gold-300 mb-1">{item.label}</p>
                      <p className="flex justify-between gap-4 text-cream">
                        <span>Stock Valuation:</span>
                        <span className="font-bold text-white">₹{item.valuation.toLocaleString("en-IN")}</span>
                      </p>
                      <p className="flex justify-between gap-4 text-gold-200 mt-0.5">
                        <span>Physical Units:</span>
                        <span className="font-bold">{item.stockUnits.toLocaleString("en-IN")} units</span>
                      </p>
                      <p className="flex justify-between gap-4 text-gold-300 mt-0.5 pt-1 border-t border-gold-400/20">
                        <span>Portfolio Share:</span>
                        <span className="font-bold">{item.sharePercent}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="valuation" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || "#8B1E3F"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
