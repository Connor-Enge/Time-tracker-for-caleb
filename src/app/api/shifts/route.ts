import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dbShiftToClient } from "@/lib/transform";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserParam = url.searchParams.get("userId");
  const targetUserId = me.role === "admin" && targetUserParam ? targetUserParam : me.id;

  const rows = await db
    .select()
    .from(schema.shifts)
    .where(eq(schema.shifts.userId, targetUserId))
    .orderBy(schema.shifts.clockIn);

  return NextResponse.json({ shifts: rows.map(dbShiftToClient) });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.clockIn !== "string") {
    return NextResponse.json({ error: "clockIn required" }, { status: 400 });
  }
  const targetUserId = me.role === "admin" && typeof body.userId === "string" ? body.userId : me.id;

  const start = new Date(body.clockIn);
  const end = body.clockOut ? new Date(body.clockOut) : null;
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid clockIn" }, { status: 400 });
  }
  if (end && Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid clockOut" }, { status: 400 });
  }

  const [created] = await db
    .insert(schema.shifts)
    .values({
      userId: targetUserId,
      clockIn: start,
      clockOut: end,
      breakMinutes: Math.max(0, Number(body.breakMinutes) || 0),
      notes: body.notes || null,
      job: body.job || null,
    })
    .returning();

  return NextResponse.json({ shift: dbShiftToClient(created) });
}
