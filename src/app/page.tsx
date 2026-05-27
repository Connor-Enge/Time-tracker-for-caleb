"use client";

import { useMemo } from "react";
import { startOfDay } from "date-fns";
import { useApp } from "@/components/AppProvider";
import { ClockCard } from "@/components/ClockCard";
import { Card, PageHeader } from "@/components/PageHeader";
import {
  computeWeekTotals,
  dayKey,
  formatHours,
  formatMoney,
  getWeekRange,
  shiftHours,
} from "@/lib/time";

export default function Home() {
  const { user, ready, shifts } = useApp();

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = dayKey(today);
  const todayHours = useMemo(
    () =>
      shifts
        .filter((s) => dayKey(s.clockIn) === todayKey)
        .reduce((acc, s) => acc + shiftHours(s), 0),
    [shifts, todayKey],
  );

  const weekTotals = useMemo(() => {
    if (!user) return null;
    const { start } = getWeekRange(today, user.settings.weekStartsOn);
    return computeWeekTotals(shifts, start, user.settings);
  }, [shifts, user, today]);

  if (!ready) {
    return <div className="py-16 text-center text-slate-500">Loading…</div>;
  }
  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Hi, ${user.name?.split(" ")[0] || "there"}`}
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      />
      <ClockCard />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">Today</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{formatHours(todayHours)}</div>
          <div className="mt-1 text-sm text-slate-500">
            {formatMoney(todayHours * user.settings.hourlyRate, user.settings.currency)} earned
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">This week</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatHours(weekTotals?.hours || 0)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {formatMoney(weekTotals?.pay || 0, user.settings.currency)} gross
          </div>
        </Card>
      </div>

      {weekTotals && weekTotals.overtime > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Overtime this week: {formatHours(weekTotals.overtime)}
          </div>
        </Card>
      )}
    </div>
  );
}
