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
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    // Exclure les API routes admin
    if (pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
      const token = request.cookies.get(ADMIN_COOKIE)?.value;
      const validToken = process.env.ADMIN_COOKIE_TOKEN;
      if (!validToken || token !== validToken) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/presentation/:path*", "/admin/:path*"],
};
