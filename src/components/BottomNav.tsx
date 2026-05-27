"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Clock, DollarSign, ListChecks, Settings, Users } from "lucide-react";
import { useApp } from "./AppProvider";

const baseItems = [
  { href: "/", label: "Clock", icon: Clock },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/timesheet", label: "Shifts", icon: ListChecks },
  { href: "/pay", label: "Pay", icon: DollarSign },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useApp();
  const items = [
    ...baseItems,
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Team", icon: Users }] : []),
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname?.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                active
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
