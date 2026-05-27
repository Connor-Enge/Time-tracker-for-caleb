"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Shield, ShieldCheck, UserX } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Card, PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { ClientUser } from "@/lib/types";
import { formatMoney } from "@/lib/time";

export default function AdminPage() {
  const { user } = useApp();
  const [users, setUsers] = useState<ClientUser[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .listUsers()
      .then((r) => setUsers(r.users))
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
    setUsers((list) => list?.map((x) => (x.id === u.id ? updated : x)) || null);
  }

  async function toggleActive(u: ClientUser) {
    if (u.id === user!.id) return;
    const { user: updated } = await api.updateUser(u.id, { active: !u.active });
    setUsers((list) => list?.map((x) => (x.id === u.id ? updated : x)) || null);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Team" subtitle="Manage employees and view their hours" />
      {err && <Card>{err}</Card>}
      {!users && !err && <Card>Loading…</Card>}
      {users && users.length === 0 && <Card>No employees yet.</Card>}
      <div className="space-y-2">
        {users?.map((u) => (
          <Card key={u.id} className="!p-0">
            <div className="flex items-center justify-between p-3">
              <Link href={`/admin/${u.id}`} className="flex flex-1 items-center gap-3">
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
                    {u.email} · {formatMoney(u.settings.hourlyRate, u.settings.currency)}/hr
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </Link>
            </div>
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
    </div>
  );
}
