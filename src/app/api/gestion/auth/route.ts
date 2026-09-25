import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GESTION_COOKIE = "iec_gestion_auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const validUsername = process.env.GESTION_USERNAME;
    const validPassword = process.env.GESTION_PASSWORD;
    const token = process.env.GESTION_COOKIE_TOKEN;

    if (!validUsername || !validPassword || !token) {
      return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 500 });
    }

    if (username !== validUsername || password !== validPassword) {
      return NextResponse.json({ ok: false, error: "Identifiants incorrects" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(GESTION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8h
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  const jar = await cookies();
  const token = jar.get(GESTION_COOKIE)?.value;
  const validToken = process.env.GESTION_COOKIE_TOKEN;
  if (!validToken || token !== validToken) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(GESTION_COOKIE);
  return res;
}
