"use client";

import { TriangleAlert } from "lucide-react";
import { useApp } from "./AppProvider";
import { Card } from "./PageHeader";
import { SkeletonCard } from "./Skeleton";

export function LoadGate({
  children,
  skeleton,
}: {
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  const { ready, user, loadError, refresh } = useApp();

  if (!ready) {
    return (
      <>{skeleton ?? (
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}</>
    );
  }

  if (loadError) {
    return (
      <Card className="border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30">
        <div className="flex items-start gap-2">
          <TriangleAlert size={18} className="mt-0.5 text-rose-600" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-rose-900 dark:text-rose-100">
              Couldn&apos;t load your data
            </div>
            <p className="mt-1 text-sm text-rose-800/90 dark:text-rose-200/90">{loadError}</p>
            <p className="mt-2 text-xs text-rose-800/70 dark:text-rose-200/70">
              If this is a new install, the database schema may not be applied yet. Run
              <code className="mx-1 rounded bg-rose-100 px-1 py-0.5 dark:bg-rose-900/40">npm run db:push</code>
              locally, or paste <code className="rounded bg-rose-100 px-1 py-0.5 dark:bg-rose-900/40">db/init.sql</code> into the Neon SQL editor.
            </p>
            <button
              onClick={refresh}
              className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 dark:border-rose-800 dark:text-rose-200"
            >
              Retry
            </button>
          </div>
        </div>
      </Card>
    );
  }

  if (!user) {
    return <>{skeleton ?? <SkeletonCard />}</>;
  }

  return <>{children}</>;
}
