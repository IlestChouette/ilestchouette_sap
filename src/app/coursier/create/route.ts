import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // le front envoie : firstName, lastName, email, phone
    const { email, firstName, lastName, phone } = body;

    if (!email || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: "Champs manquants" },
        { status: 400 }
      );
    }

    // 🔹 insertion dans la table que lit l'opérateur
    const { error } = await supabaseAdmin
      .from("courier_signups")
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          status: "pending",              // important : l'opérateur filtrera dessus
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error("Erreur insert courier_signups:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Demande coursier enregistrée.",
    });
  } catch (e: any) {
    console.error("Erreur /coursier/create:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}