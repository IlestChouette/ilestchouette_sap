import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, first_name, last_name, phone } = body;

    if (!email) {
      return NextResponse.json({ error: "email manquant" }, { status: 400 });
    }

    // 1) on génère un mot de passe simple au départ
    const tempPassword = Math.random().toString(36).slice(2, 10) + "Aa1!";

    // 2) on crée l'utilisateur auth
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // pas besoin d'email de validation
      user_metadata: {
        role: "courier",
        first_name,
        last_name,
        phone,
      },
    });

    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 400 });
    }

    // 3) on peut aussi pré-créer une ligne dans "profiles" si tu veux
    await supabaseAdmin.from("profiles").insert([
      {
        user_id: userData.user?.id,
        role: "courier",
        first_name,
        last_name,
        phone,
      },
    ]);

    return NextResponse.json({
      ok: true,
      password: tempPassword, // pour que l'opérateur puisse le donner au coursier
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}