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

export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { assignmentId, orderId } = await req.json();
  if (!assignmentId || !orderId) {
    return NextResponse.json({ error: "assignmentId et orderId requis" }, { status: 400 });
  }

  // Annuler l'assignment
  const { error: aErr } = await supabaseAdmin
    .from("assignments")
    .update({ status: "annulee" })
    .eq("id", assignmentId);

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  // Remettre la commande en pending pour qu'elle soit réassignable
  const { error: oErr } = await supabaseAdmin
    .from("orders")
    .update({ status: "pending" })
    .eq("id", orderId);

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
