"use client";

import { addDays, format } from "date-fns";
import { Shift } from "@/lib/types";
import { dayKey, formatHours, shiftHours } from "@/lib/time";

export function HoursChart({
  shifts,
  start,
  days,
  scheduledHoursByDay,
}: {
  shifts: Shift[];
  start: Date;
  days: number;
  scheduledHoursByDay?: Record<string, number>;
}) {
  const buckets: { date: Date; key: string; hours: number; scheduled: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const k = dayKey(d);
    buckets.push({ date: d, key: k, hours: 0, scheduled: scheduledHoursByDay?.[k] || 0 });
  }
  for (const s of shifts) {
    const k = dayKey(s.clockIn);
    const b = buckets.find((x) => x.key === k);
    if (b) b.hours += shiftHours(s);
  }
  const max = Math.max(8, ...buckets.map((b) => Math.max(b.hours, b.scheduled)));
  const today = dayKey(new Date());

  return (
    <div className="flex items-end gap-1.5">
      {buckets.map((b) => {
        const pct = (b.hours / max) * 100;
        const schedPct = (b.scheduled / max) * 100;
        const isToday = b.key === today;
        return (
          <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
            <div className="relative flex h-24 w-full items-end justify-center">
              {b.scheduled > 0 && b.hours === 0 && (
                <div
                  className="absolute inset-x-0 bottom-0 rounded-md border border-dashed border-amber-400/70 bg-amber-100/40 dark:bg-amber-900/20"
                  style={{ height: `${Math.max(4, schedPct)}%` }}
                />
              )}
              <div
                className={`relative w-full rounded-md transition-all ${
                  isToday
                    ? "bg-brand-500"
                    : b.hours > 0
                      ? "bg-emerald-500"
                      : "bg-slate-200 dark:bg-slate-800"
                }`}
                style={{ height: `${Math.max(b.hours > 0 ? 6 : 3, pct)}%` }}
                title={`${format(b.date, "EEE")}: ${formatHours(b.hours)}`}
              />
            </div>
            <div className={`text-[10px] ${isToday ? "font-semibold text-brand-600 dark:text-brand-400" : "text-slate-500"}`}>
              {format(b.date, "EEEEE")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
