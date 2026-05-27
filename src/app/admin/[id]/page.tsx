"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Card, PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { ClientUser, ScheduledShift, Shift } from "@/lib/types";
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
import { useApp } from "@/components/AppProvider";

export default function AdminUserPage() {
  const params = useParams<{ id: string }>();
  const { user: me } = useApp();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledShift[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .getUser(params.id)
      .then((r) => {
        setUser(r.user);
        setShifts(r.shifts);
        setScheduled(r.scheduled);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [params.id]);

  const weekTotals = useMemo(() => {
    if (!user) return null;
    const { start } = getWeekRange(new Date(), user.settings.weekStartsOn);
    return computeWeekTotals(shifts, start, user.settings);
  }, [shifts, user]);

  const periodTotals = useMemo(() => {
    if (!user) return null;
    const range = getPayPeriodRange(
      new Date(),
      user.settings.payPeriodType,
      user.settings.payPeriodAnchor,
      user.settings.weekStartsOn,
    );
    return { range, totals: computePeriodTotals(shifts, range.start, range.end, user.settings) };
  }, [shifts, user]);

  const recent = useMemo(() => {
    return [...shifts]
      .sort((a, b) => (a.clockIn < b.clockIn ? 1 : -1))
      .slice(0, 25);
  }, [shifts]);

  const upcoming = useMemo(() => {
    const todayKey = dayKey(new Date());
    return scheduled.filter((s) => s.date >= todayKey).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [scheduled]);

  if (me?.role !== "admin") return <Card>Access denied.</Card>;
  if (err) return <Card>{err}</Card>;
  if (!user) return <Card>Loading…</Card>;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin"
        className="-mt-1 mb-1 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft size={16} /> Back to team
      </Link>
      <PageHeader
        title={user.name || user.email}
        subtitle={`${user.email} · ${user.role} · ${formatMoney(user.settings.hourlyRate, user.settings.currency)}/hr`}
      />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">This week</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatHours(weekTotals?.hours || 0)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {formatMoney(weekTotals?.pay || 0, user.settings.currency)}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">Current pay period</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatHours(periodTotals?.totals.totalHours || 0)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {formatMoney(periodTotals?.totals.gross || 0, user.settings.currency)} gross
          </div>
        </Card>
      </div>

      {upcoming.length > 0 && (
        <Card>
          <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Upcoming scheduled</div>
          <div className="space-y-1.5">
            {upcoming.slice(0, 5).map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span>{format(new Date(s.date + "T00:00"), "EEE, MMM d")}</span>
                <span className="tabular-nums text-slate-500">
                  {s.startTime}–{s.endTime}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Recent shifts</div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No shifts recorded.</p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <div>
                  <div>{format(new Date(s.clockIn), "EEE, MMM d")}</div>
                  <div className="text-xs text-slate-500">
                    {format(new Date(s.clockIn), "h:mm a")} –{" "}
                    {s.clockOut ? format(new Date(s.clockOut), "h:mm a") : "running"}
                    {s.breakMinutes ? ` · ${s.breakMinutes}m break` : ""}
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div>{formatHours(shiftHours(s))}</div>
                  <div className="text-xs text-slate-500">
                    {formatMoney(shiftHours(s) * user.settings.hourlyRate, user.settings.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
