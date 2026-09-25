import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRES_COOKIE = "iec_pres_auth";
const ADMIN_COOKIE = "iec_admin_auth";
const GESTION_COOKIE = "iec_gestion_auth";

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

  // ── Protection /gestion ───────────────────────────────
  // Même pattern que /admin : login intégré dans la page,
  // vérification du cookie via /api/gestion/auth côté client.
  // Le middleware ne redirige pas pour éviter les boucles.

  return NextResponse.next();
}

export const config = {
  matcher: ["/presentation/:path*", "/gestion/:path*"],
};
