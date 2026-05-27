"use client";

import { useMemo, useState } from "react";
import { addDays, endOfYear, format, startOfYear, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Card, PageHeader } from "@/components/PageHeader";
import {
  computePeriodTotals,
  computeWeekTotals,
  describePayPeriod,
  formatHours,
  formatMoney,
  getPayPeriodRange,
  getWeekRange,
} from "@/lib/time";
import { downloadCSV, shiftsToCSV } from "@/lib/csv";

export default function PayPage() {
  const { user, shifts } = useApp();
  const [cursor, setCursor] = useState<Date>(new Date());

  const period = useMemo(() => {
    if (!user) return null;
    return getPayPeriodRange(
      cursor,
      user.settings.payPeriodType,
      user.settings.payPeriodAnchor,
      user.settings.weekStartsOn,
    );
  }, [cursor, user]);

  const totals = useMemo(() => {
    if (!user || !period) return null;
    return computePeriodTotals(shifts, period.start, period.end, user.settings);
  }, [shifts, user, period]);

  const weekRange = useMemo(() => {
    if (!user) return null;
    return getWeekRange(new Date(), user.settings.weekStartsOn);
  }, [user]);

  const weekTotals = useMemo(() => {
    if (!user || !weekRange) return null;
    return computeWeekTotals(shifts, weekRange.start, user.settings);
  }, [shifts, user, weekRange]);

  const ytdTotals = useMemo(() => {
    if (!user) return null;
    const now = new Date();
    return computePeriodTotals(shifts, startOfYear(now), endOfYear(now), user.settings);
  }, [shifts, user]);

  const lastMonthTotals = useMemo(() => {
    if (!user) return null;
    const lastMonth = subMonths(new Date(), 1);
    const start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    return { start, end, totals: computePeriodTotals(shifts, start, end, user.settings) };
  }, [shifts, user]);

  const periodShifts = useMemo(() => {
    if (!period) return [];
    const endExclusive = addDays(period.end, 1).getTime();
    return shifts.filter((s) => {
      const t = new Date(s.clockIn).getTime();
      return t >= period.start.getTime() && t < endExclusive;
    });
  }, [shifts, period]);

  if (!user || !period || !totals) return null;

  function step(dir: -1 | 1) {
    if (!user || !period) return;
    const next =
      user.settings.payPeriodType === "monthly"
        ? new Date(cursor.getFullYear(), cursor.getMonth() + dir, 15)
        : user.settings.payPeriodType === "semimonthly"
          ? addDays(cursor, dir * 15)
          : addDays(period.start, dir * (user.settings.payPeriodType === "biweekly" ? 14 : 7));
    setCursor(next);
  }

  function exportPeriod() {
    if (!user || !period) return;
    const rows = shiftsToCSV(periodShifts, user.settings.hourlyRate, user.name || user.email);
    const fname = `pay-${format(period.start, "yyyy-MM-dd")}_${format(period.end, "yyyy-MM-dd")}.csv`;
    downloadCSV(fname, rows);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pay"
        subtitle={`${describePayPeriod(user.settings.payPeriodType)} pay period`}
        right={
          <button
            onClick={exportPeriod}
            disabled={periodShifts.length === 0}
            className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
            aria-label="Export pay period CSV"
          >
            <Download size={16} />
          </button>
        }
      />

      <Card>
        <div className="flex items-center justify-between">
          <button
            onClick={() => step(-1)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Previous period"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              {describePayPeriod(user.settings.payPeriodType)} period
            </div>
            <div className="text-sm font-semibold">
              {format(period.start, "MMM d")} – {format(period.end, "MMM d, yyyy")}
            </div>
          </div>
          <button
            onClick={() => step(1)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Next period"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Hours" value={formatHours(totals.totalHours)} />
          <Stat label="Regular" value={formatHours(totals.regular)} />
          <Stat label="Overtime" value={formatHours(totals.overtime)} accent="amber" />
        </div>

        <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
          <Row label="Gross pay" value={formatMoney(totals.gross, user.settings.currency)} strong />
          {user.settings.taxWithholdingPercent > 0 && (
            <>
              <Row
                label={`Tax withholding (${user.settings.taxWithholdingPercent}%)`}
                value={`- ${formatMoney(totals.tax, user.settings.currency)}`}
              />
              <Row label="Net pay" value={formatMoney(totals.net, user.settings.currency)} strong />
            </>
          )}
          <Row
            label="Hourly"
            value={`${formatMoney(user.settings.hourlyRate, user.settings.currency)} · OT ${user.settings.overtimeMultiplier}×`}
          />
        </div>
      </Card>

      {weekTotals && (
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">This week</div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-2xl font-semibold tabular-nums">{formatHours(weekTotals.hours)}</div>
            <div className="text-sm text-slate-500">
              {formatMoney(weekTotals.pay, user.settings.currency)}
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {format(weekTotals.weekStart, "MMM d")} – {format(weekTotals.weekEnd, "MMM d")} · Reg{" "}
            {formatHours(weekTotals.regular)} · OT {formatHours(weekTotals.overtime)}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {lastMonthTotals && (
          <Card>
            <div className="text-xs uppercase tracking-wider text-slate-500">
              {format(lastMonthTotals.start, "MMMM")}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {formatHours(lastMonthTotals.totals.totalHours)}
            </div>
            <div className="text-sm text-slate-500">
              {formatMoney(lastMonthTotals.totals.gross, user.settings.currency)}
            </div>
          </Card>
        )}
        {ytdTotals && (
          <Card>
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Year to date · {new Date().getFullYear()}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {formatHours(ytdTotals.totalHours)}
            </div>
            <div className="text-sm text-slate-500">
              {formatMoney(ytdTotals.gross, user.settings.currency)}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "amber" }) {
  return (
    <div className={`rounded-xl bg-slate-50 p-2 dark:bg-slate-800 ${accent === "amber" ? "text-amber-700 dark:text-amber-300" : ""}`}>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
