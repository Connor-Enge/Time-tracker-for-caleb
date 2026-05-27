import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tt_session";

const PUBLIC_PAGE_PATHS = ["/login", "/signup"];
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/auth/signup"];

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
  const isPublicPage = PUBLIC_PAGE_PATHS.includes(pathname);

  if (isPublicApi || (!isApi && isPublicPage)) {
    if (!isApi && (await isAuthenticated(req))) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!(await isAuthenticated(req))) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg).*)"],
};
