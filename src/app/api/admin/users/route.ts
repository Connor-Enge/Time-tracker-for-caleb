import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dbUserToClient } from "@/lib/transform";

export const runtime = "nodejs";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.select().from(schema.users).orderBy(schema.users.createdAt);
  return NextResponse.json({ users: rows.map(dbUserToClient) });
}
