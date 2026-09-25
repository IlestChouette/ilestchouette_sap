import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRES_COOKIE = "iec_pres_auth";
const ADMIN_COOKIE = "iec_admin_auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Protection /presentation ──────────────────────────
  if (pathname.startsWith("/presentation")) {
    if (pathname === "/presentation/login") return NextResponse.next();

    const token = request.cookies.get(PRES_COOKIE)?.value;
    const validToken = process.env.PRESENTATION_COOKIE_TOKEN;
    if (!validToken || token !== validToken) {
      const loginUrl = new URL("/presentation/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Protection /admin ─────────────────────────────────
  // La page /admin contient son propre formulaire de login,
  // le cookie est vérifié via /api/admin/check côté client.
  // Pas de redirection middleware pour éviter les 404.

  return NextResponse.next();
}

export const config = {
  matcher: ["/presentation/:path*"],
};
