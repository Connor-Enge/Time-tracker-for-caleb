"use client";

import { useMemo } from "react";
import { format, startOfDay } from "date-fns";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ClockCard } from "@/components/ClockCard";
import { HoursChart } from "@/components/HoursChart";
import { Card, PageHeader } from "@/components/PageHeader";
import { SkeletonCard } from "@/components/Skeleton";
import {
  computePeriodTotals,
  computeWeekTotals,
  dayKey,
  formatHours,
  formatMoney,
  getPayPeriodRange,
  getWeekRange,
  shiftHours,
} from "@/lib/time";

export default function Home() {
  const { user, ready, shifts, scheduled } = useApp();

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = dayKey(today);
  const todayHours = useMemo(
    () =>
      shifts
        .filter((s) => dayKey(s.clockIn) === todayKey)
        .reduce((acc, s) => acc + shiftHours(s), 0),
    [shifts, todayKey],
  );

  const weekRange = useMemo(
    () => (user ? getWeekRange(today, user.settings.weekStartsOn) : null),
    [today, user],
  );
  const weekTotals = useMemo(
    () => (user && weekRange ? computeWeekTotals(shifts, weekRange.start, user.settings) : null),
    [shifts, user, weekRange],
  );

  const periodTotals = useMemo(() => {
    if (!user) return null;
    const range = getPayPeriodRange(
      today,
      user.settings.payPeriodType,
      user.settings.payPeriodAnchor,
      user.settings.weekStartsOn,
    );
    return { range, totals: computePeriodTotals(shifts, range.start, range.end, user.settings) };
  }, [shifts, user, today]);

  const nextScheduled = useMemo(() => {
    return scheduled
      .filter((s) => s.date >= todayKey)
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  }, [scheduled, todayKey]);

  if (!ready) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonCard lines={1} />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>
      </div>
    );
  }
  if (!user) return null;

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Good night";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`${greet}, ${user.name?.split(" ")[0] || "there"}`}
        subtitle={format(new Date(), "EEEE, MMMM d")}
      />
      <ClockCard />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">Today</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{formatHours(todayHours)}</div>
          <div className="mt-1 text-sm text-slate-500">
            {formatMoney(todayHours * user.settings.hourlyRate, user.settings.currency)}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">This week</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatHours(weekTotals?.hours || 0)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {formatMoney(weekTotals?.pay || 0, user.settings.currency)}
          </div>
        </Card>
      </div>

      {weekRange && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-slate-500">Week at a glance</div>
            <Link href="/calendar" className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400">
              Calendar <ArrowRight size={12} />
            </Link>
          </div>
          <HoursChart shifts={shifts} start={weekRange.start} days={7} />
          {weekTotals && weekTotals.overtime > 0 && (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Overtime this week: {formatHours(weekTotals.overtime)}
            </div>
          )}
        </Card>
      )}

      {periodTotals && (
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">Current pay period</div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-2xl font-semibold tabular-nums">
              {formatHours(periodTotals.totals.totalHours)}
            </div>
            <div className="text-sm text-slate-500">
              {formatMoney(periodTotals.totals.gross, user.settings.currency)} gross
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {format(periodTotals.range.start, "MMM d")} – {format(periodTotals.range.end, "MMM d")}
          </div>
        </Card>
      )}

      {nextScheduled && (
        <Link href="/calendar" className="block">
          <Card className="flex items-center gap-3 border-brand-100 bg-brand-50/50 dark:border-brand-900/40 dark:bg-brand-950/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              <CalendarClock size={18} />
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-slate-500">Next scheduled</div>
              <div className="text-sm font-semibold">
                {format(new Date(nextScheduled.date + "T00:00"), "EEE, MMM d")} ·{" "}
                {nextScheduled.startTime}–{nextScheduled.endTime}
              </div>
              {nextScheduled.job && (
                <div className="text-xs text-slate-500">{nextScheduled.job}</div>
              )}
            </div>
            <ArrowRight size={16} className="text-slate-400" />
          </Card>
        </Link>
      )}
    </div>
  );
}
