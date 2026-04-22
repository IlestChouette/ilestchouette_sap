import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
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
