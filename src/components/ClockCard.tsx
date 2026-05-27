"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Coffee, Pause, Play, X } from "lucide-react";
import { useApp } from "./AppProvider";
import { formatDuration, formatHours, formatMoney } from "@/lib/time";
import { Card } from "./PageHeader";

export function ClockCard() {
  const { activeShift, user, clockIn, clockOut, cancelActive, addBreak } = useApp();
  const [now, setNow] = useState(() => Date.now());
  const [job, setJob] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const running = !!activeShift;
  const start = running ? new Date(activeShift!.clockIn).getTime() : 0;
  const breakMs = running ? (activeShift!.breakMinutes || 0) * 60_000 : 0;
  const elapsedMs = running ? Math.max(0, now - start - breakMs) : 0;
  const elapsedHours = elapsedMs / 3_600_000;
  const pay = elapsedHours * (user?.settings.hourlyRate || 0);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col items-center text-center">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {running ? "On the clock" : "Ready to clock in"}
      </div>
      <div className="mt-2 font-mono text-5xl font-semibold tabular-nums">
        {running ? formatDuration(elapsedMs) : "00:00:00"}
      </div>
      <div className="mt-1 text-sm text-slate-500">
        {running ? (
          <>
            Started {new Date(activeShift!.clockIn).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            {activeShift!.breakMinutes ? ` · ${activeShift!.breakMinutes}m break` : ""}
          </>
        ) : (
          <>Hourly: {formatMoney(user?.settings.hourlyRate || 0, user?.settings.currency)}/hr</>
        )}
      </div>

      {running && (
        <div className="mt-3 flex gap-4 text-sm">
          <div className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            {formatHours(elapsedHours)}
          </div>
          <div className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
            {formatMoney(pay, user?.settings.currency)}
          </div>
        </div>
      )}

      {!running && (
        <input
          value={job}
          onChange={(e) => setJob(e.target.value)}
          placeholder="Job / project (optional)"
          className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950"
        />
      )}

      <div className="mt-4 flex w-full gap-2">
        {!running ? (
          <button
            disabled={busy}
            onClick={() => run(() => clockIn({ job: job || undefined }))}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:opacity-60"
          >
            <Play size={18} /> Clock In
          </button>
        ) : (
          <>
            <button
              disabled={busy}
              onClick={() => run(clockOut)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 py-4 text-base font-semibold text-white shadow-lg shadow-rose-600/20 transition active:scale-[0.98] disabled:opacity-60"
            >
              <Pause size={18} /> Clock Out
            </button>
          </>
        )}
      </div>

      {running && (
        <div className="mt-3 grid w-full grid-cols-3 gap-2 text-sm">
          <button
            disabled={busy}
            onClick={() => run(() => addBreak(15))}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 dark:border-slate-700"
          >
            <Coffee size={14} /> +15m
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => addBreak(30))}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 dark:border-slate-700"
          >
            <Coffee size={14} /> +30m
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("Cancel this shift? It will not be saved.")) run(cancelActive);
            }}
            className="flex items-center justify-center gap-1 rounded-xl border border-rose-300 py-2 text-rose-600 dark:border-rose-900/60"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      )}

      {running && elapsedHours >= 12 && (
        <div
          className={`mt-3 flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm ${
            elapsedHours >= 16
              ? "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              : "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          }`}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {elapsedHours >= 16
              ? "You've been clocked in for over 16 hours. Did you forget to clock out?"
              : "Long shift — over 12 hours on the clock."}
          </span>
        </div>
      )}

      {err && <p className="mt-3 text-sm text-rose-500">{err}</p>}
    </Card>
  );
}
