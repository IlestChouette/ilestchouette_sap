// Route sécurisée pour la création de compte coursier
// Remplace l'appel direct à /api/couriers/create avec NEXT_PUBLIC_OPERATOR_API_KEY
// → vérifie la session Supabase + appartenance à la table operators
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";
import { Resend } from "resend";
import { randomBytes } from "crypto";

const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || "Il est chouette <allo@ilestchouette.fr>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

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

    // ── Vérification opérateur ────────────────────────────────────
    const { data: operatorData } = await supabaseAdmin
      .from("operators")
      .select("email")
      .eq("email", user.email)
      .maybeSingle();

    if (!operatorData) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    const { email, first_name, last_name, phone } = body as {
      email: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };

    if (!email) {
      return NextResponse.json({ error: "Email manquant" }, { status: 400 });
    }

    // ── Générer un mot de passe provisoire cryptographiquement sûr ──
    const password = randomBytes(6).toString("base64url").slice(0, 10);

    // ── Créer l'utilisateur Supabase Auth ──────────────────────────
    const { data: userData, error: authCreateErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "courier", first_name, last_name, phone },
      });

    if (authCreateErr || !userData?.user) {
      return NextResponse.json(
        { error: authCreateErr?.message || "Erreur création utilisateur" },
        { status: 500 },
      );
    }

    // ── Enregistrer dans la table couriers ─────────────────────────
    const { error: insertErr } = await supabaseAdmin
      .from("couriers")
      .insert({ email, first_name: first_name ?? null, last_name: last_name ?? null, phone: phone ?? null });

    if (insertErr) {
      return NextResponse.json(
        { error: "Coursier créé dans Auth mais pas dans la table couriers" },
        { status: 500 },
      );
    }

    // ── Envoyer l'email de bienvenue ───────────────────────────────
    if (resend) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ilestchouette.fr";
      const prenom = first_name || "";
      const nom = last_name || "";
      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: "Bienvenue chez Il est chouette – accès espace coursier",
        html: `
          <p>Bonjour ${prenom || nom ? `${prenom} ${nom}`.trim() : ""},</p>
          <p>Ta candidature a été acceptée, bienvenue dans l'équipe <b>Il est chouette</b> 🦉.</p>
          <p>Voici tes accès :</p>
          <ul>
            <li><b>Lien :</b> <a href="${baseUrl}/coursier">${baseUrl}/coursier</a></li>
            <li><b>Email :</b> ${email}</li>
            <li><b>Mot de passe provisoire :</b> ${password}</li>
          </ul>
          <p>Pense à modifier ton mot de passe après ta première connexion.</p>
          <p>À très bientôt,<br /><b>L'équipe Il est chouette</b></p>
        `,
      });
    }

    return NextResponse.json({ password });
  } catch (e: any) {
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}
