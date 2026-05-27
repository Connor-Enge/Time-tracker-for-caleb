import {
  addDays,
  differenceInMinutes,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { OvertimeRule, PayPeriodType, Settings, Shift } from "./types";

export function shiftDurationMinutes(s: Shift, now = new Date()): number {
  if (!s.clockIn) return 0;
  const start = new Date(s.clockIn);
  const end = s.clockOut ? new Date(s.clockOut) : now;
  return Math.max(0, differenceInMinutes(end, start) - (s.breakMinutes || 0));
}

export function shiftHours(s: Shift, now = new Date()): number {
  return shiftDurationMinutes(s, now) / 60;
}

export function formatHours(hours: number): string {
  const sign = hours < 0 ? "-" : "";
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  if (m === 60) return `${sign}${h + 1}h 0m`;
  return `${sign}${h}h ${m}m`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `$${(amount || 0).toFixed(2)}`;
  }
}

export function dayKey(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "yyyy-MM-dd");
}

export function groupShiftsByDay(shifts: Shift[]): Record<string, Shift[]> {
  const map: Record<string, Shift[]> = {};
  for (const s of shifts) {
    const key = dayKey(s.clockIn);
    (map[key] ??= []).push(s);
  }
  return map;
}

export type WeekTotals = {
  weekStart: Date;
  weekEnd: Date;
  hours: number;
  regular: number;
  overtime: number;
  pay: number;
};

export function getWeekRange(date: Date, weekStartsOn: 0 | 1) {
  return {
    start: startOfWeek(date, { weekStartsOn }),
    end: endOfWeek(date, { weekStartsOn }),
  };
}

export function computeWeekTotals(
  shifts: Shift[],
  weekStart: Date,
  settings: Settings,
  now = new Date(),
): WeekTotals {
  const weekStartDay = startOfDay(weekStart);
  const weekEndDay = addDays(weekStartDay, 7);
  const inWeek = shifts.filter((s) => {
    const t = new Date(s.clockIn).getTime();
    return t >= weekStartDay.getTime() && t < weekEndDay.getTime();
  });

  const byDay: Record<string, number> = {};
  for (const s of inWeek) {
    const k = dayKey(s.clockIn);
    byDay[k] = (byDay[k] || 0) + shiftHours(s, now);
  }

  let regular = 0;
  let overtime = 0;

  if (settings.overtimeRule === "daily8" || settings.overtimeRule === "both") {
    for (const k of Object.keys(byDay)) {
      const h = byDay[k];
      const reg = Math.min(8, h);
      const ot = Math.max(0, h - 8);
      regular += reg;
      overtime += ot;
    }
  } else {
    for (const k of Object.keys(byDay)) regular += byDay[k];
  }

  if (settings.overtimeRule === "weekly40" || settings.overtimeRule === "both") {
    if (regular > 40) {
      overtime += regular - 40;
      regular = 40;
    }
  }

  const pay = regular * settings.hourlyRate + overtime * settings.hourlyRate * settings.overtimeMultiplier;
  return {
    weekStart: weekStartDay,
    weekEnd: addDays(weekEndDay, -1),
    hours: regular + overtime,
    regular,
    overtime,
    pay,
  };
}

export function getPayPeriodRange(
  date: Date,
  type: PayPeriodType,
  anchorIso: string,
  weekStartsOn: 0 | 1,
): { start: Date; end: Date } {
  const anchor = startOfDay(parseISO(anchorIso));
  const target = startOfDay(date);

  if (type === "weekly") {
    const start = startOfWeek(target, { weekStartsOn });
    return { start, end: addDays(start, 6) };
  }
  if (type === "biweekly") {
    const diffDays = Math.floor((target.getTime() - anchor.getTime()) / 86_400_000);
    const offset = ((diffDays % 14) + 14) % 14;
    const start = addDays(target, -offset);
    return { start, end: addDays(start, 13) };
  }
  if (type === "semimonthly") {
    const y = target.getFullYear();
    const m = target.getMonth();
    const d = target.getDate();
    if (d <= 15) return { start: new Date(y, m, 1), end: new Date(y, m, 15) };
    return { start: new Date(y, m, 16), end: new Date(y, m + 1, 0) };
  }
  const y = target.getFullYear();
  const m = target.getMonth();
  return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
}

export function computePeriodTotals(
  shifts: Shift[],
  start: Date,
  end: Date,
  settings: Settings,
  now = new Date(),
) {
  const periodEnd = addDays(startOfDay(end), 1);
  let regular = 0;
  let overtime = 0;
  let totalHours = 0;

  let cursor = startOfDay(start);
  while (cursor < periodEnd) {
    const { start: ws } = getWeekRange(cursor, settings.weekStartsOn);
    const wt = computeWeekTotals(shifts, ws, settings, now);
    const weekEndExclusive = addDays(wt.weekStart, 7);

    const clipStart = cursor;
    const clipEnd = weekEndExclusive < periodEnd ? weekEndExclusive : periodEnd;

    const inSegment = shifts.filter((s) => {
      const t = new Date(s.clockIn).getTime();
      return t >= clipStart.getTime() && t < clipEnd.getTime();
    });
    const segHours = inSegment.reduce((acc, s) => acc + shiftHours(s, now), 0);
    totalHours += segHours;

    const weekHours = wt.regular + wt.overtime;
    if (weekHours > 0) {
      const ratio = segHours / weekHours;
      regular += wt.regular * ratio;
      overtime += wt.overtime * ratio;
    }
    cursor = clipEnd;
  }

  const gross = regular * settings.hourlyRate + overtime * settings.hourlyRate * settings.overtimeMultiplier;
  const tax = gross * ((settings.taxWithholdingPercent || 0) / 100);
  const net = gross - tax;

  return { totalHours, regular, overtime, gross, tax, net };
}

export function describeOvertimeRule(rule: OvertimeRule): string {
  switch (rule) {
    case "none":
      return "No overtime";
    case "daily8":
      return "Daily (>8h/day)";
    case "weekly40":
      return "Weekly (>40h/week)";
    case "both":
      return "Daily + Weekly";
  }
}

export function describePayPeriod(t: PayPeriodType): string {
  switch (t) {
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Bi-weekly";
    case "semimonthly":
      return "Semi-monthly";
    case "monthly":
      return "Monthly";
  }
}
