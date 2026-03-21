import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "iec_pres_auth";
// SHA-256 of credentials — never store plaintext
const VALID_TOKEN = "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/presentation")) {
    if (pathname === "/presentation/login") return NextResponse.next();

    const token = request.cookies.get(COOKIE)?.value;
    if (token !== VALID_TOKEN) {
      const loginUrl = new URL("/presentation/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/presentation/:path*"],
};
