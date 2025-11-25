import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../_lib/supabaseAdmin";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || "Il est chouette <no-reply@example.com>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, first_name, last_name, phone } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email manquant" },
        { status: 400 }
      );
    }

    // 1) générer un mot de passe provisoire
    const password =
      Math.random().toString(36).slice(2, 6) +
      Math.random().toString(36).slice(2, 6);

    // 2) créer l'utilisateur auth Supabase
    const { data: userData, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "courier",
          first_name,
          last_name,
          phone,
        },
      });

    if (authErr || !userData?.user) {
      console.error("Erreur création user coursier :", authErr);
      return NextResponse.json(
        { error: authErr?.message || "Erreur création utilisateur" },
        { status: 500 }
      );
    }

    // 3) Option : insérer dans table "couriers" (si tu l'utilises)
    try {
      await supabaseAdmin.from("couriers").insert({
        auth_user_id: userData.user.id,
        email,
        first_name,
        last_name,
        phone,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Insertion couriers échouée (facultatif) :", e);
    }

    // 4) Envoyer l'email de bienvenue avec le mot de passe
    if (!resend) {
      console.warn("RESEND_API_KEY manquant : mail de bienvenue non envoyé.");
    } else {
      const prenom = first_name || "";
      const nom = last_name || "";

      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: "Bienvenue chez Il est chouette – accès espace coursier",
        html: `
          <p>Bonjour ${prenom || nom ? `${prenom} ${nom}`.trim() : ""},</p>
          <p>
            Ta candidature a été acceptée, bienvenue dans l'équipe 
            <b>Il est chouette</b> 🦉.
          </p>
          <p>Voici tes accès à ton espace coursier :</p>
          <ul>
            <li><b>Adresse de connexion :</b> <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://ilestchouette.fr"}/coursier">${process.env.NEXT_PUBLIC_BASE_URL || "https://ilestchouette.fr"}/coursier</a></li>
            <li><b>Email :</b> ${email}</li>
            <li><b>Mot de passe provisoire :</b> ${password}</li>
          </ul>
          <p>
            Une fois connecté, pense à modifier ton mot de passe dans la rubrique 
            <i>"Mon mot de passe"</i> de ton espace personnel.
          </p>
          <p>
            Merci de faire partie de la communauté Il est chouette. Ensemble, 
            nous agissons pour améliorer le quotidien des personnes que nous livrons.
          </p>
          <p>
            À très bientôt sur la route,<br/>
            <b>Chef d’équipe – Il est chouette</b>
          </p>
        `,
      });
    }

    // 5) Réponse pour l'espace opérateur
    return NextResponse.json({ password });
  } catch (e: any) {
    console.error("Erreur API /api/couriers/create :", e);
    return NextResponse.json(
      { error: "Erreur interne serveur" },
      { status: 500 }
    );
  }
}