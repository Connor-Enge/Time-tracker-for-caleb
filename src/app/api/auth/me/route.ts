import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dbUserToClient } from "@/lib/transform";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await db
    .select()
    .from(schema.shifts)
    .where(and(eq(schema.shifts.userId, user.id), isNull(schema.shifts.clockOut)))
    .orderBy(schema.shifts.clockIn)
    .limit(1);

  return NextResponse.json({
    user: dbUserToClient(user),
    activeShift: active[0]
      ? {
          id: active[0].id,
          clockIn: active[0].clockIn.toISOString(),
          clockOut: null,
          breakMinutes: active[0].breakMinutes,
          notes: active[0].notes ?? undefined,
          job: active[0].job ?? undefined,
        }
      : null,
  });
}
