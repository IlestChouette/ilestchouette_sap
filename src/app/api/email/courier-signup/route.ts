// src/app/api/email/courier-signup/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("❌ RESEND_API_KEY manquant");
      return NextResponse.json(
        {
          ok: false,
          step: "env",
          error: "RESEND_API_KEY manquant côté serveur.",
        },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);

    const fromEmail = process.env.EMAIL_FROM ?? "allo@ilestchouette.fr";

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [body.to ?? "allo@ilestchouette.fr"],
      subject: "Nouvelle candidature coursier",
      html: `<p>Nouvelle candidature coursier : ${body.first_name} ${body.last_name} – ${body.email}</p>`,
    });

    if (error) {
      console.error("❌ Erreur Resend :", error);
      return NextResponse.json(
        { ok: false, step: "resend", error },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Erreur HTTP route courier-signup :", err);
    return NextResponse.json(
      { ok: false, step: "handler", error: String(err?.message ?? err) },
      { status: 500 },
    );
  }
}