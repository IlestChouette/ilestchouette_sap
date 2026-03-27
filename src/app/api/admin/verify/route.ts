import { NextResponse } from "next/server";
import { createHash } from "crypto";

const ADMIN_COOKIE = "iec_admin_auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const validEmail = process.env.ADMIN_EMAIL;
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const adminToken = process.env.ADMIN_COOKIE_TOKEN;

    if (!validEmail || !validPasswordHash || !adminToken) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const inputHash = createHash("sha256").update(String(password)).digest("hex");

    if (
      String(email).trim().toLowerCase() === validEmail.toLowerCase() &&
      inputHash === validPasswordHash
    ) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set(ADMIN_COOKIE, adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 8, // 8 heures
        path: "/",
      });
      return res;
    }

    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
