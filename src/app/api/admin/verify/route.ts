import { NextResponse } from "next/server";
import { createHash } from "crypto";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const validEmail = process.env.ADMIN_EMAIL;
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!validEmail || !validPasswordHash) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const inputHash = createHash("sha256").update(String(password)).digest("hex");

    if (
      String(email).trim().toLowerCase() === validEmail.toLowerCase() &&
      inputHash === validPasswordHash
    ) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
