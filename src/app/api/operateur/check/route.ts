import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ isOperator: false }, { status: 200 });
    }

    // On vérifie dans la table "operators"
    const { data, error } = await supabaseAdmin
      .from("operators")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Erreur check operator:", error);
      return NextResponse.json({ isOperator: false }, { status: 200 });
    }

    return NextResponse.json({ isOperator: !!data }, { status: 200 });
  } catch (e) {
    console.error("Exception check operator:", e);
    return NextResponse.json({ isOperator: false }, { status: 200 });
  }
}