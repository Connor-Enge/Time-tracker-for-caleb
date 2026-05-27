import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dbScheduledToClient } from "@/lib/transform";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const targetUserParam = url.searchParams.get("userId");
  const targetUserId = me.role === "admin" && targetUserParam ? targetUserParam : me.id;

  const rows = await db
    .select()
    .from(schema.scheduledShifts)
    .where(eq(schema.scheduledShifts.userId, targetUserId))
    .orderBy(schema.scheduledShifts.date);
  return NextResponse.json({ scheduled: rows.map(dbScheduledToClient) });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.date !== "string" || typeof body.startTime !== "string" || typeof body.endTime !== "string") {
    return NextResponse.json({ error: "date, startTime, endTime required" }, { status: 400 });
  }
  const targetUserId = me.role === "admin" && typeof body.userId === "string" ? body.userId : me.id;

  const [created] = await db
    .insert(schema.scheduledShifts)
    .values({
      userId: targetUserId,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      job: body.job || null,
      notes: body.notes || null,
    })
    .returning();
  return NextResponse.json({ scheduled: dbScheduledToClient(created) });
}
