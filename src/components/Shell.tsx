"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <main className={`safe-top flex-1 px-4 ${isAuthPage ? "pb-6" : "pb-28"} pt-3 sm:px-6`}>
        {children}
      </main>
      {!isAuthPage && <BottomNav />}
    </div>
  );
}
