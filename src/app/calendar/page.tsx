"use client";

import { CalendarView } from "@/components/CalendarView";
import { LoadGate } from "@/components/LoadGate";
import { PageHeader } from "@/components/PageHeader";

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Calendar" subtitle="Worked, scheduled, and fulfilled shifts" />
      <LoadGate>
        <CalendarView />
      </LoadGate>
    </div>
  );
}
