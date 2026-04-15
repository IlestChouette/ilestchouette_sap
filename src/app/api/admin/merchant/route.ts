import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

const ADMIN_COOKIE = "iec_admin_auth";

async function verifyAdmin() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  const adminToken = process.env.ADMIN_COOKIE_TOKEN;
  return adminToken && token === adminToken;
}

export async function PATCH(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id, status } = await req.json();
  if (!id || !status) {
    return NextResponse.json({ error: "id et status requis" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({ status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
