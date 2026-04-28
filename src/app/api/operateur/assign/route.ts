import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // ── Vérification du token Supabase ────────────────────────────
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user?.email) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // ── Vérification que l'utilisateur est opérateur ──────────────
    const { data: operatorData } = await supabaseAdmin
      .from("operators")
      .select("email")
      .eq("email", user.email)
      .maybeSingle();

    if (!operatorData) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { order_id, courier_email, scheduled_at, assigned_at } = await req.json();

    if (!order_id || !courier_email) {
      return NextResponse.json({ error: "order_id et courier_email requis" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .insert([{ order_id, courier_email, scheduled_at: scheduled_at ?? null, assigned_at, status: "assigned" }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assignment: data }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
