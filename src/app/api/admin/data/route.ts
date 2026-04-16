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

  const [ordRes, assRes, courRes, merRes, authUsersRes, oldCustRes] = await Promise.all([
    supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("assignments").select("*").order("assigned_at", { ascending: false }),
    supabaseAdmin.from("couriers").select("*"),
    supabaseAdmin.from("merchants").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from("customers").select("*"),
  ]);

  // Map email → nom depuis la table couriers (pour les coursiers sans metadata)
  const courierByEmail = new Map((courRes.data ?? []).map((c: any) => [
    c.email,
    [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
  ]));
  const courierEmails = new Set(courierByEmail.keys());

  // Clients depuis auth.users (inscrits via app)
  const authEmails = new Set<string>();
  const fromAuth = (authUsersRes.data?.users ?? []).map((u) => {
    authEmails.add(u.email ?? "");
    // Priorité : metadata > table couriers (pour ceux créés manuellement)
    const full_name =
      u.user_metadata?.full_name ||
      courierByEmail.get(u.email ?? "") ||
      null;
    return {
      id: u.id,
      email: u.email ?? "",
      full_name,
      phone: u.user_metadata?.phone ?? u.phone ?? null,
      preferred_language: u.user_metadata?.preferred_language ?? null,
      created_at: u.created_at,
      is_courier: courierEmails.has(u.email ?? ""),
      source: "app" as const,
    };
  });

  // Anciens clients manuels (table customers) — dédupliqués si déjà dans auth
  const fromManual = (oldCustRes.data ?? [])
    .filter((c: any) => !c.email || !authEmails.has(c.email))
    .map((c: any) => ({
      id: c.id,
      email: c.email ?? "",
      full_name: [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
      phone: c.phone ?? null,
      preferred_language: null,
      created_at: c.created_at,
      is_courier: false,
      source: "manual" as const,
    }));

  const customers = [...fromAuth, ...fromManual].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({
    orders: ordRes.data ?? [],
    assignments: assRes.data ?? [],
    couriers: courRes.data ?? [],
    customers,
    merchants: merRes.data ?? [],
  });
}
