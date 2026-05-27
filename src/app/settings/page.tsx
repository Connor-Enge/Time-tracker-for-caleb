"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, LogOut, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { useToast } from "@/components/Toast";
import { Card, PageHeader } from "@/components/PageHeader";
import { LoadGate } from "@/components/LoadGate";
import { OvertimeRule, PayPeriodType, Settings } from "@/lib/types";
import { describeOvertimeRule, describePayPeriod } from "@/lib/time";
import { api } from "@/lib/api";

const otRules: OvertimeRule[] = ["none", "daily8", "weekly40", "both"];
const payPeriods: PayPeriodType[] = ["weekly", "biweekly", "semimonthly", "monthly"];

export default function SettingsPage() {
  return (
    <LoadGate>
      <SettingsContent />
    </LoadGate>
  );
}

function SettingsContent() {
  const { user, updateSettings, logout } = useApp();
  const toast = useToast();
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

  useEffect(() => {
    if (user) setForm({ ...user.settings, name: user.name });
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Settings" subtitle={user.email} />

      <Section title="Profile">
        <form onSubmit={submit} className="space-y-3 text-sm">
          <Field label="Full name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </Field>
          <SaveButton saving={saving} />
        </form>
      </Section>

      <Section title="Pay & overtime">
        <form onSubmit={submit} className="space-y-3 text-sm">
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
                onChange={(e) =>
                  setForm({ ...form, payPeriodType: e.target.value as PayPeriodType })
                }
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
          <SaveButton saving={saving} />
        </form>
      </Section>

      <Section title="Security">
        <ChangePassword />
      </Section>

      <Section title="Account">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm">
              Signed in as <span className="font-medium">{user.email}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Role: <span className="font-medium">{user.role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium dark:border-slate-700"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>
      {children}
    </Card>
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

function SaveButton({ saving }: { saving: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="w-full rounded-xl bg-brand-600 py-3 text-sm font-medium text-white disabled:opacity-60"
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await api.changePassword({ currentPassword: current, newPassword: next });
      toast.success("Password updated");
      setCurrent("");
      setNext("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 text-sm">
      <Field label="Current password">
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 pr-9 dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
            aria-label={show ? "Hide passwords" : "Show passwords"}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>
      <Field label="New password (min 8 chars)">
        <input
          type={show ? "text" : "password"}
          required
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
      </Field>
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        <ShieldCheck size={15} /> {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
