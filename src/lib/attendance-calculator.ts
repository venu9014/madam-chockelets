/**
 * Attendance & Shift Analytics Calculator for MADAM CHOCOLATE
 *
 * Provides business-rule compliant calculations for:
 * - Standard 8-hour atelier shifts (480 minutes)
 * - 15-minute grace period on shift starts (09:00 AM standard start -> late after 09:15 AM IST)
 * - Lateness minutes calculation
 * - Overtime hours calculation (duration > 480 mins)
 * - Early departure calculation (< 450 mins on full shift)
 * - Missed check-out detection (open sessions from prior days)
 * - Multi-session break aggregation
 */

export interface ShiftEvaluation {
  shiftType: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";
  scheduledStart: string;
  isLate: boolean;
  minutesLate: number;
  isOvertime: boolean;
  overtimeMinutes: number;
  isEarlyDeparture: boolean;
  isMissedCheckout: boolean;
  effectiveDurationMinutes: number;
  statusLabel: string;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/**
 * Returns hours and minutes in IST (Asia/Kolkata).
 */
export function getIstTimeComponents(date: Date): { hour: number; minute: number; dateStr: string } {
  const istTime = new Date(date.getTime() + IST_OFFSET_MS);
  const hour = istTime.getUTCHours();
  const minute = istTime.getUTCMinutes();
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istTime.getUTCDate()).padStart(2, "0");
  return { hour, minute, dateStr: `${year}-${month}-${day}` };
}

/**
 * Evaluates an attendance session against standard bakery operational shift rules.
 * Standard Morning Shift: 09:00 AM IST scheduled start.
 * Grace period: 15 minutes (late if punched in at or after 09:16 AM).
 * Standard shift length: 480 minutes (8 hours).
 */
export function evaluateShiftAttendance(params: {
  punchInTime: Date | string;
  punchOutTime?: Date | string | null;
  durationMinutes?: number | null;
  status: string;
  scheduledStartHour?: number; // defaults to 9 (09:00 AM)
  scheduledStartMinute?: number; // defaults to 0
  gracePeriodMinutes?: number; // defaults to 15
}): ShiftEvaluation {
  const inDate = new Date(params.punchInTime);
  const outDate = params.punchOutTime ? new Date(params.punchOutTime) : null;
  const startHour = params.scheduledStartHour ?? 9;
  const startMin = params.scheduledStartMinute ?? 0;
  const graceMins = params.gracePeriodMinutes ?? 15;

  const istIn = getIstTimeComponents(inDate);

  // 1. Determine shift classification
  let shiftType: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" = "MORNING";
  if (istIn.hour >= 14) {
    shiftType = "EVENING";
  } else if (istIn.hour >= 11) {
    shiftType = "AFTERNOON";
  } else if (istIn.hour < 6) {
    shiftType = "NIGHT";
  }

  // 2. Check for lateness (applicable primarily to morning opening shifts)
  const punchInTotalMins = istIn.hour * 60 + istIn.minute;
  const scheduledStartTotalMins = startHour * 60 + startMin;
  const cutoffMins = scheduledStartTotalMins + graceMins;

  let isLate = false;
  let minutesLate = 0;

  if (shiftType === "MORNING" && punchInTotalMins > cutoffMins) {
    isLate = true;
    minutesLate = punchInTotalMins - scheduledStartTotalMins;
  }

  // 3. Compute duration
  let duration = params.durationMinutes || 0;
  if (!params.durationMinutes) {
    if (outDate) {
      duration = Math.max(0, Math.round((outDate.getTime() - inDate.getTime()) / 60000));
    } else if (params.status === "OPEN") {
      duration = Math.max(0, Math.round((Date.now() - inDate.getTime()) / 60000));
    }
  }

  // 4. Overtime & Early Departure
  const isOvertime = duration > 480;
  const overtimeMinutes = isOvertime ? duration - 480 : 0;
  const isEarlyDeparture = Boolean(outDate && duration > 0 && duration < 450);

  // 5. Missed check-out detection (open session from a prior calendar day)
  const todayIst = getIstTimeComponents(new Date());
  const isMissedCheckout = Boolean(params.status === "OPEN" && istIn.dateStr < todayIst.dateStr);

  // 6. Descriptive Status Label
  let statusLabel = "On Time";
  if (isMissedCheckout) {
    statusLabel = "Missed Check-Out";
  } else if (params.status === "FLAGGED") {
    statusLabel = "Boundary Warning";
  } else if (isLate) {
    statusLabel = `Late Arrival (+${minutesLate}m)`;
  } else if (isOvertime) {
    statusLabel = `Overtime (+${Math.round(overtimeMinutes / 60 * 10) / 10}h)`;
  } else if (isEarlyDeparture) {
    statusLabel = "Early Departure";
  } else if (params.status === "OPEN") {
    statusLabel = "Shift In Progress";
  } else {
    statusLabel = "Completed On Time";
  }

  const scheduledStartFormatted = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")} IST`;

  return {
    shiftType,
    scheduledStart: scheduledStartFormatted,
    isLate,
    minutesLate,
    isOvertime,
    overtimeMinutes,
    isEarlyDeparture,
    isMissedCheckout,
    effectiveDurationMinutes: duration,
    statusLabel,
  };
}

/**
 * Aggregates daily sessions into total day summary (handling breaks and multiple sessions).
 */
export function aggregateDailyAttendance(sessions: Array<{
  id: string;
  punchInTime: Date | string;
  punchOutTime?: Date | string | null;
  durationMinutes?: number | null;
  status: string;
}>): {
  sessionCount: number;
  totalDurationMinutes: number;
  totalOvertimeMinutes: number;
  hasOpenSession: boolean;
  hasMissedCheckout: boolean;
  isLateToday: boolean;
  formattedTotalHours: string;
} {
  let totalMins = 0;
  let hasOpen = false;
  let hasMissed = false;
  let isLate = false;

  const todayIst = getIstTimeComponents(new Date());

  sessions.forEach((s) => {
    const evaluation = evaluateShiftAttendance({
      punchInTime: s.punchInTime,
      punchOutTime: s.punchOutTime,
      durationMinutes: s.durationMinutes,
      status: s.status,
    });

    totalMins += evaluation.effectiveDurationMinutes;
    if (s.status === "OPEN") {
      hasOpen = true;
    }
    if (evaluation.isMissedCheckout) {
      hasMissed = true;
    }
    const sIst = getIstTimeComponents(new Date(s.punchInTime));
    if (sIst.dateStr === todayIst.dateStr && evaluation.isLate) {
      isLate = true;
    }
  });

  const totalOvertime = totalMins > 480 ? totalMins - 480 : 0;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  return {
    sessionCount: sessions.length,
    totalDurationMinutes: totalMins,
    totalOvertimeMinutes: totalOvertime,
    hasOpenSession: hasOpen,
    hasMissedCheckout: hasMissed,
    isLateToday: isLate,
    formattedTotalHours: `${hrs}h ${mins}m`,
  };
}
