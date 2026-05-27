import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isValidEmail, setSessionCookie, verifyPassword } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error:
            "Server is missing DATABASE_URL. Add it to your Vercel project (Production) and redeploy.",
          code: "db_url_missing",
        },
        { status: 503 },
      );
    }
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { error: "Server is missing JWT_SECRET.", code: "jwt_secret_missing" },
        { status: 503 },
      );
    }

    const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    const user = rows[0];
    if (!user || !user.active) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await setSessionCookie({ sub: user.id, email: user.email, role: user.role as "admin" | "employee" });
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
