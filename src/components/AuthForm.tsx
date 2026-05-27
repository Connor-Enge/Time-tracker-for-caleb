"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";
import { api } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await api.signup({ email, password, name });
      } else {
        await api.login({ email, password });
      }
      router.replace(next);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
          <Clock size={24} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "signup"
            ? "Start tracking your hours and pay."
            : "Sign in to track your shifts."}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {mode === "signup" && (
          <label className="block text-sm">
            <span className="text-slate-500">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
        )}
        <label className="block text-sm">
          <span className="text-slate-500">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-500">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        {err && <p className="text-sm text-rose-500">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-600">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-brand-600">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
