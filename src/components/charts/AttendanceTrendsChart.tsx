"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { UserCheck, Clock, AlertTriangle } from "lucide-react";

interface AttendancePoint {
  date: string;
  label: string;
  verified: number;
  late: number;
  flagged: number;
  totalHours: number;
}

interface AttendanceTrendsChartProps {
  data: AttendancePoint[];
  loading?: boolean;
  dateRangeLabel?: string;
}

export function AttendanceTrendsChart({ data, loading, dateRangeLabel }: AttendanceTrendsChartProps) {
  if (loading) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center bg-cream-muted/30 rounded-xl border border-cream-border animate-pulse">
        <UserCheck className="w-8 h-8 text-emerald-500 mb-2 animate-bounce" />
        <p className="text-xs text-neutralMuted font-serif">Aggregating workforce presence telemetry...</p>
      </div>
    );
  }

  const hasData = data && data.length > 0 && data.some((d) => d.verified > 0 || d.late > 0 || d.flagged > 0 || d.totalHours > 0);

  if (!hasData) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center bg-cream/40 rounded-xl border border-dashed border-cream-border text-center p-6">
        <Clock className="w-10 h-10 text-emerald-600 mb-2" />
        <h4 className="font-serif font-bold text-sm text-plum">No Attendance Records in Selected Range</h4>
        <p className="text-xs text-neutralMuted max-w-sm mt-1">
          No employee shift punches were recorded for {dateRangeLabel || "this period"}.
        </p>
      </div>
    );
  }

  const totalVerified = data.reduce((acc, d) => acc + d.verified, 0);
  const totalLate = data.reduce((acc, d) => acc + d.late, 0);
  const totalFlagged = data.reduce((acc, d) => acc + d.flagged, 0);
  const totalHours = data.reduce((acc, d) => acc + d.totalHours, 0);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cream-border mb-3 gap-2">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">
            Workforce Presence & Time Tracking
          </span>
          <h3 className="font-serif font-bold text-base text-plum flex items-center gap-2">
            <span>Staff Punctuality & Working Hours</span>
            <span className="text-xs font-mono font-normal text-neutralMuted">
              ({dateRangeLabel || "Selected Range"})
            </span>
          </h3>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-neutralMuted block">Staff Hours</span>
            <span className="font-serif font-black text-base text-plum">{Math.round(totalHours)} hrs</span>
          </div>
          <div className="h-6 w-px bg-cream-border" />
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              {totalVerified} On-Time
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {totalLate} Late
            </span>
            {totalFlagged > 0 && (
              <span className="flex items-center gap-1 text-violet-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-violet-600" />
                {totalFlagged} Flagged
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
              stroke="#8C7E74"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#C6A45B"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}h`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-plum text-cream p-3 rounded-lg shadow-luxury border border-gold-400/30 text-xs">
                      <p className="font-serif font-bold text-gold-300 mb-1">{label}</p>
                      <p className="flex justify-between gap-4 text-emerald-300">
                        <span>On-Time Verified:</span>
                        <span className="font-bold">{payload[0]?.value || 0}</span>
                      </p>
                      <p className="flex justify-between gap-4 text-amber-300 mt-0.5">
                        <span>Late Arrivals:</span>
                        <span className="font-bold">{payload[1]?.value || 0}</span>
                      </p>
                      {Number(payload[2]?.value || 0) > 0 && (
                        <p className="flex justify-between gap-4 text-violet-300 mt-0.5">
                          <span>Flagged (Radius/Wi-Fi):</span>
                          <span className="font-bold">{payload[2]?.value || 0}</span>
                        </p>
                      )}
                      <p className="flex justify-between gap-4 text-gold-200 mt-1 pt-1 border-t border-gold-400/20">
                        <span>Logged Staff Hours:</span>
                        <span className="font-bold">{payload[3]?.value || 0}h</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 8, fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="verified" name="On Time" stackId="a" fill="#059669" />
            <Bar yAxisId="left" dataKey="late" name="Late Arrival" stackId="a" fill="#D97706" />
            <Bar yAxisId="left" dataKey="flagged" name="Flagged" stackId="a" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalHours"
              name="Hours Worked"
              stroke="#C6A45B"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#C6A45B" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
