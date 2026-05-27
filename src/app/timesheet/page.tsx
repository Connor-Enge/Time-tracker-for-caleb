"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Card, PageHeader } from "@/components/PageHeader";
import { ShiftRow } from "@/components/ShiftRow";
import { dayKey, formatHours, formatMoney, shiftHours } from "@/lib/time";

export default function TimesheetPage() {
  const { user, shifts, addManualShift } = useApp();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    start: "09:00",
    end: "17:00",
    breakMinutes: 0,
    job: "",
    notes: "",
  });
  const [err, setErr] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, typeof shifts> = {};
    for (const s of shifts) (map[dayKey(s.clockIn)] ??= []).push(s);
    return Object.entries(map)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([k, v]) => [k, v.sort((a, b) => (a.clockIn < b.clockIn ? -1 : 1))] as const);
  }, [shifts]);

  const totalHours = shifts.reduce((acc, s) => acc + shiftHours(s), 0);
  const totalPay = totalHours * (user?.settings.hourlyRate || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const ci = new Date(`${form.date}T${form.start}`);
      const co = new Date(`${form.date}T${form.end}`);
      if (co < ci) co.setDate(co.getDate() + 1);
      await addManualShift({
        clockIn: ci.toISOString(),
        clockOut: co.toISOString(),
        breakMinutes: Math.max(0, Number(form.breakMinutes) || 0),
        job: form.job || undefined,
        notes: form.notes || undefined,
      });
      setAdding(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Timesheet"
        subtitle={`${formatHours(totalHours)} · ${formatMoney(totalPay, user?.settings.currency)}`}
        right={
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
          >
            <Plus size={16} /> Add
          </button>
        }
      />

      {adding && (
        <Card>
          <form onSubmit={submit} className="space-y-2">
            <label className="block text-sm">
              <span className="text-slate-500">Date</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label>
                <span className="text-slate-500">Start</span>
                <input
                  type="time"
                  required
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label>
                <span className="text-slate-500">End</span>
                <input
                  type="time"
                  required
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label>
                <span className="text-slate-500">Break (min)</span>
                <input
                  type="number"
                  min={0}
                  value={form.breakMinutes}
                  onChange={(e) => setForm({ ...form, breakMinutes: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label>
                <span className="text-slate-500">Job</span>
                <input
                  value={form.job}
                  onChange={(e) => setForm({ ...form, job: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
            <input
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            {err && <p className="text-sm text-rose-500">{err}</p>}
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-600 py-2 text-sm font-medium text-white"
            >
              Save shift
            </button>
          </form>
        </Card>
      )}

      {grouped.length === 0 && (
        <Card>
          <p className="text-center text-sm text-slate-500">
            No shifts yet. Clock in from the home tab or add one manually.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {grouped.map(([k, list]) => {
          const dayHours = list.reduce((acc, s) => acc + shiftHours(s), 0);
          return (
            <section key={k} className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs uppercase tracking-wider text-slate-500">
                <span>{format(new Date(k), "EEE, MMM d, yyyy")}</span>
                <span className="tabular-nums">{formatHours(dayHours)}</span>
              </div>
              <div className="space-y-2">
                {list.map((s) => (
                  <ShiftRow key={s.id} shift={s} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
