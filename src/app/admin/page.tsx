"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, Shield, ShieldCheck, UserX } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Card, PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { ClientUser } from "@/lib/types";
import { describePayPeriod, formatHours, formatMoney } from "@/lib/time";

type Summary = Awaited<ReturnType<typeof api.adminSummary>>;

export default function AdminPage() {
  const { user } = useApp();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminSummary()
      .then(setSummary)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, []);

  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <Card>
        <p className="text-sm text-slate-500">You don&apos;t have access to this page.</p>
      </Card>
    );
  }

  async function toggleRole(u: ClientUser) {
    if (u.id === user!.id) return;
    if (!confirm(`Change ${u.email} to ${u.role === "admin" ? "employee" : "admin"}?`)) return;
    const next = u.role === "admin" ? "employee" : "admin";
    const { user: updated } = await api.updateUser(u.id, { role: next });
    setSummary((s) =>
      s
        ? {
            ...s,
            rows: s.rows.map((r) => (r.user.id === u.id ? { ...r, user: updated } : r)),
          }
        : s,
    );
  }

  async function toggleActive(u: ClientUser) {
    if (u.id === user!.id) return;
    const { user: updated } = await api.updateUser(u.id, { active: !u.active });
    setSummary((s) =>
      s
        ? {
            ...s,
            rows: s.rows.map((r) => (r.user.id === u.id ? { ...r, user: updated } : r)),
          }
        : s,
    );
  }

  const currency = user.settings.currency;
  const periodLabel = summary?.rows[0]?.period;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Team" subtitle="Payroll summary across all employees" />
      {err && <Card>{err}</Card>}
      {!summary && !err && <Card>Loading…</Card>}

      {summary && (
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            {describePayPeriod(user.settings.payPeriodType)} period
            {periodLabel && (
              <>
                {" · "}
                {format(new Date(periodLabel.start), "MMM d")} –{" "}
                {format(new Date(periodLabel.end), "MMM d")}
              </>
            )}
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-3xl font-semibold tabular-nums">
              {formatMoney(summary.grand.gross, currency)}
            </div>
            <div className="text-right text-sm text-slate-500">
              <div>{formatHours(summary.grand.hours)} total</div>
              {summary.grand.overtime > 0 && (
                <div className="text-amber-700 dark:text-amber-300">
                  {formatHours(summary.grand.overtime)} OT
                </div>
              )}
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {summary.rows.filter((r) => r.user.active).length} active ·{" "}
            {summary.rows.length} total
          </div>
        </Card>
      )}

      {summary && (
        <div className="space-y-2">
          {summary.rows.length === 0 && <Card>No employees yet.</Card>}
          {summary.rows.map(({ user: u, period, week }) => (
            <Card key={u.id} className="!p-0">
              <Link href={`/admin/${u.id}`} className="flex items-center gap-3 p-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    u.active
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-800"
                  }`}
                >
                  {(u.name || u.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate text-sm font-semibold">
                    {u.name || u.email}
                    {u.role === "admin" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        Admin
                      </span>
                    )}
                    {!u.active && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-600 dark:bg-slate-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {formatMoney(u.settings.hourlyRate, u.settings.currency)}/hr · Week{" "}
                    {formatHours(week.totals.hours)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {formatHours(period.totals.totalHours)}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {formatMoney(period.totals.gross, u.settings.currency)}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </Link>
              {u.id !== user.id && (
                <div className="flex border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => toggleRole(u)}
                    className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {u.role === "admin" ? <Shield size={14} /> : <ShieldCheck size={14} />}
                    {u.role === "admin" ? "Demote" : "Promote"}
                  </button>
                  <button
                    onClick={() => toggleActive(u)}
                    className="flex flex-1 items-center justify-center gap-1.5 border-l border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <UserX size={14} />
                    {u.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
