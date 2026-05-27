"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Card, PageHeader } from "@/components/PageHeader";
import { OvertimeRule, PayPeriodType, Settings } from "@/lib/types";
import { describeOvertimeRule, describePayPeriod } from "@/lib/time";

const otRules: OvertimeRule[] = ["none", "daily8", "weekly40", "both"];
const payPeriods: PayPeriodType[] = ["weekly", "biweekly", "semimonthly", "monthly"];

export default function SettingsPage() {
  const { user, updateSettings, logout } = useApp();
  const [form, setForm] = useState<Settings & { name: string }>({
    name: "",
    employeeName: "",
    hourlyRate: 20,
    overtimeMultiplier: 1.5,
    overtimeRule: "weekly40",
    payPeriodType: "biweekly",
    payPeriodAnchor: new Date().toISOString().slice(0, 10),
    weekStartsOn: 0,
    taxWithholdingPercent: 0,
    currency: "USD",
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) setForm({ ...user.settings, name: user.name });
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      await updateSettings(form);
      setSavedMsg("Saved");
      setTimeout(() => setSavedMsg(null), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Settings" subtitle={user.email} />

      <Card>
        <form onSubmit={submit} className="space-y-3 text-sm">
          <Field label="Full name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Hourly rate">
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </Field>
            <Field label="OT multiplier">
              <input
                type="number"
                step="0.1"
                min={1}
                value={form.overtimeMultiplier}
                onChange={(e) => setForm({ ...form, overtimeMultiplier: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </Field>
          </div>
          <Field label="Overtime rule">
            <select
              value={form.overtimeRule}
              onChange={(e) => setForm({ ...form, overtimeRule: e.target.value as OvertimeRule })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              {otRules.map((r) => (
                <option key={r} value={r}>
                  {describeOvertimeRule(r)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Pay period">
              <select
                value={form.payPeriodType}
                onChange={(e) => setForm({ ...form, payPeriodType: e.target.value as PayPeriodType })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                {payPeriods.map((p) => (
                  <option key={p} value={p}>
                    {describePayPeriod(p)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Period anchor">
              <input
                type="date"
                value={form.payPeriodAnchor}
                onChange={(e) => setForm({ ...form, payPeriodAnchor: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Week starts">
              <select
                value={form.weekStartsOn}
                onChange={(e) =>
                  setForm({ ...form, weekStartsOn: Number(e.target.value) === 1 ? 1 : 0 })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
              </select>
            </Field>
            <Field label="Currency">
              <input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </Field>
          </div>
          <Field label="Tax withholding (%)">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.taxWithholdingPercent}
              onChange={(e) => setForm({ ...form, taxWithholdingPercent: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </Field>

          {err && <p className="text-sm text-rose-500">{err}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : savedMsg || "Save settings"}
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Account</div>
            <div className="text-sm">
              Signed in as <span className="font-medium">{user.email}</span> ({user.role})
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium dark:border-slate-700"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
