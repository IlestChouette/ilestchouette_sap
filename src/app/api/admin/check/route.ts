import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "iec_admin_auth";

export async function GET() {
  try {
    const jar = await cookies();
    const token = jar.get(ADMIN_COOKIE)?.value;
    const adminToken = process.env.ADMIN_COOKIE_TOKEN;

    if (!adminToken || token !== adminToken) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
