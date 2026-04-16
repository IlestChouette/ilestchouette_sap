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

  const [ordRes, assRes, courRes, merRes, authUsersRes, profilesRes] = await Promise.all([
    supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("assignments").select("*").order("assigned_at", { ascending: false }),
    supabaseAdmin.from("couriers").select("*"),
    supabaseAdmin.from("merchants").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from("profiles").select("id"),
  ]);

  // Exclure les coursiers SAUF s'ils ont aussi un profil client (inscrits via app client)
  const courierEmails = new Set((courRes.data ?? []).map((c: any) => c.email));
  const profileIds = new Set((profilesRes.data ?? []).map((p: any) => p.id));
  const customers = (authUsersRes.data?.users ?? [])
    .filter((u) => !courierEmails.has(u.email) || profileIds.has(u.id))
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: u.user_metadata?.full_name ?? null,
      phone: u.user_metadata?.phone ?? u.phone ?? null,
      preferred_language: u.user_metadata?.preferred_language ?? null,
      created_at: u.created_at,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({
    orders: ordRes.data ?? [],
    assignments: assRes.data ?? [],
    couriers: courRes.data ?? [],
    customers,
    merchants: merRes.data ?? [],
  });
}
