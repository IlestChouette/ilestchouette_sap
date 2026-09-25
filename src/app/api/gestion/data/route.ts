import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

const GESTION_COOKIE = "iec_gestion_auth";

async function verifyGestion() {
  const jar = await cookies();
  const token = jar.get(GESTION_COOKIE)?.value;
  const validToken = process.env.GESTION_COOKIE_TOKEN;
  return validToken && token === validToken;
}

export async function GET() {
  if (!(await verifyGestion())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const [ordRes, assRes, courRes, merRes] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id,service_type,pickup_address,dropoff_address,price_total,status,created_at,express,distance_km,customer_id")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("assignments")
        .select("id,order_id,courier_email,status,assigned_at,payment_method")
        .order("assigned_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("couriers").select("id,email,first_name,last_name,blocked"),
      supabaseAdmin
        .from("merchants")
        .select("id,name,email,address,active,created_at")
        .order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      orders: ordRes.data ?? [],
      assignments: assRes.data ?? [],
      couriers: courRes.data ?? [],
      merchants: merRes.data ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: "Erreur Supabase", detail: String(e) }, { status: 500 });
  }
}
