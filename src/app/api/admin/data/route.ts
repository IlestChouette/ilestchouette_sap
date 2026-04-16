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

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [ordRes, assRes, courRes, custRes, merRes] = await Promise.all([
    supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("assignments").select("*").order("assigned_at", { ascending: false }),
    supabaseAdmin.from("couriers").select("*"),
    supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("merchants").select("*").order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    orders: ordRes.data ?? [],
    assignments: assRes.data ?? [],
    couriers: courRes.data ?? [],
    customers: custRes.data ?? [], // profiles table
    merchants: merRes.data ?? [],
  });
}
