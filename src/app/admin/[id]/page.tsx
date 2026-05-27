"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Check, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, PageHeader } from "@/components/PageHeader";
import { SkeletonCard } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { ShiftRow } from "@/components/ShiftRow";
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
} from "@/lib/time";
import { downloadCSV, shiftsToCSV } from "@/lib/csv";
import { useApp } from "@/components/AppProvider";

export default function AdminUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user: me } = useApp();
  const toast = useToast();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRate, setEditingRate] = useState(false);
  const [rate, setRate] = useState<number>(0);
  const [savingRate, setSavingRate] = useState(false);
  const [addingShift, setAddingShift] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    start: "09:00",
    end: "17:00",
    breakMinutes: 0,
    job: "",
    notes: "",
  });

  useEffect(() => {
    setLoading(true);
    api
      .getUser(params.id)
      .then((r) => {
        setUser(r.user);
        setShifts(r.shifts);
        setScheduled(r.scheduled);
        setRate(r.user.settings.hourlyRate);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [params.id, toast]);

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

  const recent = useMemo(
    () => [...shifts].sort((a, b) => (a.clockIn < b.clockIn ? 1 : -1)).slice(0, 50),
    [shifts],
  );

  const upcoming = useMemo(() => {
    const today = dayKey(new Date());
    return scheduled
      .filter((s) => s.date >= today)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [scheduled]);

  if (me?.role !== "admin") return <Card>Access denied.</Card>;
  if (loading)
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard lines={5} />
      </div>
    );
  if (!user) return <Card>Not found.</Card>;

  async function saveRate() {
    if (!user) return;
    setSavingRate(true);
    try {
      const { user: updated } = await api.updateUser(user.id, { hourlyRate: Math.max(0, rate) });
      setUser(updated);
      setEditingRate(false);
      toast.success("Rate updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingRate(false);
    }
  }

  async function deleteUser() {
    if (!user) return;
    if (!confirm(`Permanently delete ${user.email} and all their shifts? This can't be undone.`))
      return;
    try {
      await api.deleteUser(user.id);
      toast.success("Employee deleted");
      router.push("/admin");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  function exportCSV() {
    if (!user) return;
    const rows = shiftsToCSV(shifts, user.settings.hourlyRate, user.name || user.email);
    downloadCSV(`${(user.name || user.email).replace(/\W+/g, "_")}-shifts.csv`, rows);
  }

  async function submitNewShift(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      const ci = new Date(`${shiftForm.date}T${shiftForm.start}`);
      const co = new Date(`${shiftForm.date}T${shiftForm.end}`);
      if (co < ci) co.setDate(co.getDate() + 1);
      const { shift } = await api.createShift({
        userId: user.id,
        clockIn: ci.toISOString(),
        clockOut: co.toISOString(),
        breakMinutes: Math.max(0, Number(shiftForm.breakMinutes) || 0),
        job: shiftForm.job || undefined,
        notes: shiftForm.notes || undefined,
      });
      setShifts((xs) => [...xs, shift]);
      setAddingShift(false);
      toast.success("Shift added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="-mt-1 mb-1 inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Back to team
      </Link>
      <PageHeader
        title={user.name || user.email}
        subtitle={`${user.email} · ${user.role}`}
        right={
          <button
            onClick={exportCSV}
            disabled={shifts.length === 0}
            className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
            aria-label="Export CSV"
          >
            <Download size={16} />
          </button>
        }
      />

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Hourly rate</div>
            {editingRate ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-base dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  onClick={saveRate}
                  disabled={savingRate}
                  className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
                >
                  <Check size={14} /> Save
                </button>
                <button
                  onClick={() => {
                    setEditingRate(false);
                    setRate(user.settings.hourlyRate);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <div className="text-xl font-semibold">
                  {formatMoney(user.settings.hourlyRate, user.settings.currency)}/hr
                </div>
                <button
                  onClick={() => setEditingRate(true)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Edit rate"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

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
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-slate-500">Shifts</div>
          <button
            onClick={() => setAddingShift((v) => !v)}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white"
          >
            <Plus size={14} /> Add shift
          </button>
        </div>
        {addingShift && (
          <form onSubmit={submitNewShift} className="mb-3 space-y-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
            <label className="block">
              <span className="text-slate-500">Date</span>
              <input
                type="date"
                required
                value={shiftForm.date}
                onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="text-slate-500">Start</span>
                <input
                  type="time"
                  required
                  value={shiftForm.start}
                  onChange={(e) => setShiftForm({ ...shiftForm, start: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label>
                <span className="text-slate-500">End</span>
                <input
                  type="time"
                  required
                  value={shiftForm.end}
                  onChange={(e) => setShiftForm({ ...shiftForm, end: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="text-slate-500">Break (min)</span>
                <input
                  type="number"
                  min={0}
                  value={shiftForm.breakMinutes}
                  onChange={(e) => setShiftForm({ ...shiftForm, breakMinutes: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label>
                <span className="text-slate-500">Job</span>
                <input
                  value={shiftForm.job}
                  onChange={(e) => setShiftForm({ ...shiftForm, job: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
            <input
              placeholder="Notes"
              value={shiftForm.notes}
              onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            <button type="submit" className="w-full rounded-xl bg-brand-600 py-2 text-sm font-medium text-white">
              Save shift
            </button>
          </form>
        )}
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No shifts recorded.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((s) => (
              <ShiftRow
                key={s.id}
                shift={s}
                hourlyRate={user.settings.hourlyRate}
                currency={user.settings.currency}
                onUpdated={(updated) =>
                  setShifts((xs) => xs.map((x) => (x.id === updated.id ? updated : x)))
                }
                onDeleted={(id) => setShifts((xs) => xs.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        )}
      </Card>

      {me?.id !== user.id && (
        <Card>
          <div className="text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">Danger zone</div>
          <p className="mt-2 text-sm text-slate-500">
            Deleting this employee removes their account and all of their recorded shifts permanently.
          </p>
          <button
            onClick={deleteUser}
            className="mt-3 flex items-center gap-2 rounded-xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 dark:border-rose-900/60"
          >
            <Trash2 size={15} /> Delete employee
          </button>
        </Card>
      )}
    </div>
  );
}
