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
  Legend,
} from "recharts";
import { ShieldCheck, PackageX } from "lucide-react";

interface HealthMetric {
  category: string;
  label: string;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

interface InventoryHealthChartProps {
  data: HealthMetric[];
  loading?: boolean;
}

export function InventoryHealthChart({ data, loading }: InventoryHealthChartProps) {
  if (loading) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center bg-cream-muted/30 rounded-xl border border-cream-border animate-pulse">
        <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2 animate-bounce" />
        <p className="text-xs text-neutralMuted font-serif">Checking stock health thresholds...</p>
      </div>
    );
  }

  const hasData = data && data.length > 0 && data.some((d) => d.inStock > 0 || d.lowStock > 0 || d.outOfStock > 0);

  if (!hasData) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center bg-cream/40 rounded-xl border border-dashed border-cream-border text-center p-6">
        <PackageX className="w-10 h-10 text-rose-500 mb-2" />
        <h4 className="font-serif font-bold text-sm text-plum">No Inventory Status Data</h4>
        <p className="text-xs text-neutralMuted max-w-sm mt-1">
          No stock movements or catalog items registered for this atelier.
        </p>
      </div>
    );
  }

  const totalInStock = data.reduce((acc, d) => acc + d.inStock, 0);
  const totalLow = data.reduce((acc, d) => acc + d.lowStock, 0);
  const totalOut = data.reduce((acc, d) => acc + d.outOfStock, 0);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cream-border mb-3 gap-2">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
            Stock Replenishment & Risk
          </span>
          <h3 className="font-serif font-bold text-base text-plum">
            Inventory Health & SKU Availability
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
            {totalInStock} Healthy
          </span>
          <span className="flex items-center gap-1.5 text-amber-800 font-semibold">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            {totalLow} Low
          </span>
          <span className="flex items-center gap-1.5 text-rose-800 font-semibold">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" />
            {totalOut} Out
          </span>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE1" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#8C7E74"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "#E2D9CC" }}
              angle={-20}
              textAnchor="end"
              height={45}
            />
            <YAxis
              stroke="#8C7E74"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-plum text-cream p-3 rounded-lg shadow-luxury border border-gold-400/30 text-xs">
                      <p className="font-serif font-bold text-gold-300 mb-1">{label}</p>
                      <p className="flex justify-between gap-4 text-emerald-300">
                        <span>Optimal Stock:</span>
                        <span className="font-bold">{payload[0]?.value || 0} SKUs</span>
                      </p>
                      <p className="flex justify-between gap-4 text-amber-300 mt-0.5">
                        <span>Low Stock Threshold:</span>
                        <span className="font-bold">{payload[1]?.value || 0} SKUs</span>
                      </p>
                      <p className="flex justify-between gap-4 text-rose-300 mt-0.5">
                        <span>Out of Stock (Zero):</span>
                        <span className="font-bold">{payload[2]?.value || 0} SKUs</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 8, fontSize: 11 }} />
            <Bar dataKey="inStock" name="In Stock" stackId="a" fill="#059669" />
            <Bar dataKey="lowStock" name="Low Stock" stackId="a" fill="#D97706" />
            <Bar dataKey="outOfStock" name="Out of Stock" stackId="a" fill="#E11D48" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
