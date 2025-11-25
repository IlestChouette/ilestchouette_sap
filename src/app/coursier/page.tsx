"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../_lib/supabaseClient";

/* ================= TYPES ================= */

type AssignmentStatus =
  | "assigned"
  | "en_attente"
  | "acceptee"
  | "refusee"
  | "terminee";

type Assignment = {
  id: string;
  order_id: string;
  courier_email: string;
  assigned_at?: string | null;
  status?: AssignmentStatus | null;
  payment_method?: string | null;
  validated_with_code?: boolean | null;
};

type Order = {
  id: string;
  pickup_address: string;
  pickup_place_name?: string | null;
  dropoff_address: string;
  access_info?: string | null;
  notes?: string | null;
  price_total: number;
  express?: boolean;
  created_at?: string | null;
  validation_code?: string | null;
  status?: string | null;
  wants_invoice?: boolean | null;
};

type Availability = {
  id: string;
  courier_email: string;
  start: string;
  end: string;
  created_at?: string;
};

/* ================= COMPOSANT PRINCIPAL ================= */

export default function CourierPage() {
  /* ---------- SESSION SUPABASE / LOGIN VRAI ---------- */
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // onglet : login ou inscription
  const [mode, setMode] = useState<"login" | "signup">("login");

  // LOGIN
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // SIGNUP (candidature)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signupMsg, setSignupMsg] = useState("");
  const [signupErr, setSignupErr] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  /* ---------- ESPACE COURSier : DONNÉES ---------- */
  const [assignments, setAssignments] = useState<
    (Assignment & { order?: Order })[]
  >([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [isAddingAvail, setIsAddingAvail] = useState(false);
  const [availStart, setAvailStart] = useState("");
  const [availEnd, setAvailEnd] = useState("");

  /* ---- état pour clôturer une mission ---- */
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [finishPayment, setFinishPayment] = useState<
    "cash" | "card" | "to_pay" | ""
  >("");
  const [finishCode, setFinishCode] = useState("");
  const [finishErr, setFinishErr] = useState("");
  const [finishWantsInvoice, setFinishWantsInvoice] = useState<
    "yes" | "no" | ""
  >("");

  /* ---- changement de mot de passe ---- */
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  /* ---- calcul total gagné ---- */
  const totalBrutGagne = assignments
    .filter(
      (a) => a.order && (a.status === "acceptee" || a.status === "terminee")
    )
    .reduce((sum, a) => sum + a.order!.price_total * 0.65, 0);

  /* ---- gains par mois (AAAA-MM) ---- */
  const gainsParMois = (() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      if (!a.order || a.status !== "terminee") continue;
      const dateStr = a.order.created_at || "";
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const montant = a.order.price_total * 0.65;
      map.set(key, (map.get(key) || 0) + montant);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([mois, montant]) => ({ mois, montant }));
  })();

  /* ============== CHARGER SESSION (AU CHARGEMENT) ============== */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Erreur getSession côté coursier :", error);
        setLoadingSession(false);
        setMeEmail(null);
        return;
      }

      const session = data.session;
      if (session?.user?.email) {
        setMeEmail(session.user.email);
      } else {
        setMeEmail(null);
      }
      setLoadingSession(false);
    })();
  }, []);

  /* ============== LOGIN SUPABASE ============== */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr("");
    setLoginLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPass,
    });

    setLoginLoading(false);

    if (error) {
      console.error("Erreur login coursier :", error);
      setLoginErr(error.message || "Email ou mot de passe incorrect.");
      return;
    }

    // connexion OK
    setLoginErr("");
    setLoginPass("");
    const { data } = await supabase.auth.getUser();
    setMeEmail(data.user?.email ?? null);
  }

  /* ============== CANDIDATURE COURSier (NOUVELLE VERSION) ============== */
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupErr("");
    setSignupMsg("");
    setSignupLoading(true);

    if (!firstName || !lastName || !signupEmail || !phone) {
      setSignupErr("Merci de remplir tous les champs.");
      setSignupLoading(false);
      return;
    }

    // Données communes BDD + email
    const payload = {
      first_name: firstName,
      last_name: lastName,
      email: signupEmail.trim(),
      phone: phone.trim(),
      status: "pending" as const,
    };

    // 1) Insert dans courier_signups
    const { error } = await supabase.from("courier_signups").insert(payload);

    if (error) {
      console.error("Erreur inscription coursier :", error);
      setSignupErr("Erreur : " + error.message);
      setSignupLoading(false);
      return;
    }

   // 2) Envoi des emails (candidat + équipe) via route API
try {
  const res = await fetch("/api/email/courier-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName,
      lastName,
      email: signupEmail.trim(),
      phone: phone.trim(),
    }),
  });

  // optionnel : petit log si tu veux vérifier
  if (!res.ok) {
    console.error("Erreur HTTP route courier-signup :", await res.json());
  }
} catch (err) {
  console.error("Erreur lors de l'envoi des emails de candidature :", err);
  // on ne bloque pas l'utilisateur si l'email échoue
}

    setSignupLoading(false);

    setSignupMsg(
      "Merci de vouloir faire partie de la communauté Il est chouette. Nous allons te contacter bientôt par téléphone ou par mail pour un entretien."
    );
    setFirstName("");
    setLastName("");
    setSignupEmail("");
    setPhone("");
  }

  /* ============== CHARGER MISSIONS + DISPOS ============== */
  useEffect(() => {
    if (!meEmail) return;

    const loadAssignments = async () => {
      const { data: assigns, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("courier_email", meEmail)
        .order("assigned_at", { ascending: false });

      if (error) {
        console.error("assignments error", error);
        return;
      }

      const rows: (Assignment & { order?: Order })[] = [];
      for (const a of assigns || []) {
        let orderData: Order | undefined;
        if (a.order_id) {
          const { data: order, error: orderErr } = await supabase
            .from("orders")
            .select("*")
            .eq("id", a.order_id)
            .maybeSingle();
          if (!orderErr && order) {
            orderData = order as Order;
          }
        }
        rows.push({ ...(a as any), order: orderData });
      }
      setAssignments(rows);
    };

    const loadAvailabilities = async () => {
      const { data, error } = await supabase
        .from("availabilities")
        .select("*")
        .eq("courier_email", meEmail)
        .order("start", { ascending: false });
      if (!error && data) {
        setAvailabilities(data as any);
      }
    };

    loadAssignments();
    loadAvailabilities();

    /* temps réel sur assignments */
    const channel = supabase
      .channel("assignments-stream")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assignments",
          filter: `courier_email=eq.${meEmail}`,
        },
        () => {
          loadAssignments();
        }
      )
      .subscribe();

    /* temps réel sur dispos */
    const channelAvail = supabase
      .channel("availabilities-stream")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "availabilities",
          filter: `courier_email=eq.${meEmail}`,
        },
        () => {
          loadAvailabilities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channelAvail);
    };
  }, [meEmail]);

  /* ============== AJOUT DISPONIBILITÉ ============== */
  async function addAvailability() {
    if (!meEmail) return;
    if (!availStart || !availEnd) return;
    setIsAddingAvail(true);

    const { error } = await supabase.from("availabilities").insert({
      courier_email: meEmail,
      start: new Date(availStart).toISOString(),
      end: new Date(availEnd).toISOString(),
    });

    setIsAddingAvail(false);
    if (!error) {
      setAvailStart("");
      setAvailEnd("");
      const { data } = await supabase
        .from("availabilities")
        .select("*")
        .eq("courier_email", meEmail)
        .order("start", { ascending: false });
      setAvailabilities((data || []) as any);
    }
  }

  /* ============== CLOTURER LIVRAISON ============== */
  async function finishDelivery(a: Assignment & { order?: Order }) {
    setFinishErr("");

    if (!finishPayment) {
      setFinishErr("Choisis le mode de paiement.");
      return;
    }

    if (a.order?.validation_code && a.order.validation_code !== finishCode) {
      setFinishErr("Le code client ne correspond pas.");
      return;
    }

    if (finishWantsInvoice === "") {
      setFinishErr("Indique si le client souhaite une facture.");
      return;
    }
    const wantsInvoiceBool = finishWantsInvoice === "yes";

    /* 1) update assignment */
    const { error } = await supabase
      .from("assignments")
      .update({
        status: "terminee",
        payment_method: finishPayment,
        validated_with_code: !!finishCode,
      })
      .eq("id", a.id);

    if (error) {
      console.error("Erreur update assignments.terminee", error);
      setFinishErr(error.message);
      return;
    }

    /* 2) update order (status + wants_invoice) */
    if (a.order_id) {
      const { error: orderErr } = await supabase
        .from("orders")
        .update({
          status: "terminee",
          wants_invoice: wantsInvoiceBool,
        })
        .eq("id", a.order_id);

      if (orderErr) {
        console.error("Erreur update orders.terminee", orderErr);
        setFinishErr(
          "Livraison terminée mais erreur mise à jour commande : " +
            orderErr.message
        );
      }
    }

    /* 2bis) mise à jour UI locale */
    setAssignments((prev) =>
      prev.map((item) =>
        item.id === a.id
          ? {
              ...item,
              status: "terminee",
              order: item.order
                ? {
                    ...item.order,
                    status: "terminee",
                    wants_invoice: wantsInvoiceBool,
                  }
                : item.order,
            }
          : item
      )
    );

    /* 3) event pour l’opérateur */
    await supabase.from("events").insert({
      type: "delivery_completed",
      courier_email: meEmail,
      assignment_id: a.id,
      order_id: a.order_id,
      payment_method: finishPayment,
      needs_invoice: wantsInvoiceBool,
    });

    setFinishingId(null);
    setFinishPayment("");
    setFinishCode("");
    setFinishErr("");
    setFinishWantsInvoice("");
  }

  /* ============== CHANGER MOT DE PASSE ============== */
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    setPwdErr(null);

    if (!newPass || newPass.length < 6) {
      setPwdErr("Le nouveau mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (newPass !== newPass2) {
      setPwdErr("Les deux mots de passe ne correspondent pas.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      console.error("Erreur update password:", error);
      setPwdErr("Erreur : " + error.message);
      return;
    }

    setPwdMsg("Mot de passe mis à jour ✅");
    setNewPass("");
    setNewPass2("");
    setShowPasswordForm(false);
  }

  /* ============== LOGOUT ============== */
  async function handleLogout() {
    await supabase.auth.signOut();
    setMeEmail(null);
  }

  /* ============== UI : ÉTAT CHARGEMENT ============== */
  if (loadingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Chargement…</p>
      </main>
    );
  }

  /* ============== UI : PAS CONNECTÉ → LOGIN + CANDIDATURE ============== */
  if (!meEmail) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white shadow rounded p-6 space-y-4">
          <h1 className="text-xl font-semibold text-center mb-2">
            Espace coursier Il est chouette 🦉
          </h1>

          {/* Onglets */}
          <div className="flex border-b text-sm">
            <button
              className={
                "flex-1 py-2 text-center cursor-pointer " +
                (mode === "login"
                  ? "border-b-2 border-black font-semibold"
                  : "text-gray-500")
              }
              onClick={() => setMode("login")}
            >
              Je suis déjà coursier
            </button>
            <button
              className={
                "flex-1 py-2 text-center cursor-pointer " +
                (mode === "signup"
                  ? "border-b-2 border-black font-semibold"
                  : "text-gray-500")
              }
              onClick={() => setMode("signup")}
            >
              Je veux devenir coursier
            </button>
          </div>

          {mode === "login" ? (
            /* --------- FORMULAIRE LOGIN --------- */
            <form onSubmit={handleLogin} className="space-y-3 mt-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Email
                </label>
                <input
                  className="border rounded px-3 py-2 w-full text-sm"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="ton.email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Mot de passe
                </label>
                <input
                  className="border rounded px-3 py-2 w-full text-sm"
                  type="password"
                  autoComplete="current-password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="********"
                />
              </div>
              {loginErr && (
                <p className="text-xs text-red-600">{loginErr}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-black text-white rounded py-2 text-sm disabled:opacity-60 cursor-pointer"
              >
                {loginLoading ? "Connexion..." : "Se connecter"}
              </button>
              <p className="text-[11px] text-gray-500 mt-1 text-center">
                Le mot de passe t&apos;a été envoyé lorsque ton profil a été
                validé par l&apos;équipe Il est chouette.
              </p>
            </form>
          ) : (
            /* --------- FORMULAIRE INSCRIPTION --------- */
            <form onSubmit={handleSignup} className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Prénom
                  </label>
                  <input
                    className="border rounded px-3 py-2 w-full text-sm"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Nom
                  </label>
                  <input
                    className="border rounded px-3 py-2 w-full text-sm"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Email
                </label>
                <input
                  className="border rounded px-3 py-2 w-full text-sm"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="ton.email@example.com"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Téléphone
                </label>
                <input
                  className="border rounded px-3 py-2 w-full text-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33..."
                />
              </div>

              {signupErr && (
                <p className="text-xs text-red-600">{signupErr}</p>
              )}
              {signupMsg && (
                <p className="text-xs text-green-700">{signupMsg}</p>
              )}

              <button
                type="submit"
                disabled={signupLoading}
                className="w-full bg-black text-white rounded py-2 text-sm disabled:opacity-60 cursor-pointer"
              >
                {signupLoading ? "Envoi..." : "Envoyer ma candidature"}
              </button>

              <p className="text-[11px] text-gray-500 mt-1 text-center">
                Merci de vouloir faire partie de la communauté chouette 🎉 Nous
                agissons pour améliorer le quotidien du monde. Nous te
                contacterons bientôt par téléphone ou par mail pour un
                entretien.
              </p>
            </form>
          )}
        </div>
      </main>
    );
  }

  /* ============== UI PRINCIPALE : COURSier CONNECTÉ ============== */
  return (
    <main className="min-h-screen bg-gray-100 pb-20 text-slate-900 bg-white">
      {/* header */}
      <header className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Connecté</p>
          <p className="text-sm font-semibold break-all">{meEmail}</p>
        </div>
        <button
          className="text-xs text-red-500 cursor-pointer"
          onClick={handleLogout}
        >
          Déconnexion
        </button>
      </header>

      {/* total brut gagné */}
      <section className="px-4 mt-4">
        <div className="bg-white rounded-lg p-4">
          <p className="text-xs text-gray-500 tracking-wide">
            TOTAL BRUT GAGNÉ
          </p>
          <p className="text-2xl font-bold mt-1">
            {totalBrutGagne.toFixed(2)} €
          </p>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            Montant que tu as généré sur tes livraisons (65 % du prix client).
            La plateforme Il est chouette retient 35 % de frais de service
            (dont 10 % pour la partie opérateur).
          </p>
        </div>
      </section>

      {/* gains par mois */}
      <section className="px-4 mt-4">
        <div className="bg-white rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-2">Mes gains par mois</h2>
          {gainsParMois.length === 0 ? (
            <p className="text-xs text-gray-500">
              Tu n&apos;as pas encore de missions terminées.
            </p>
          ) : (
            <ul className="text-xs space-y-1">
              {gainsParMois.map((g) => (
                <li key={g.mois} className="flex justify-between">
                  <span>{g.mois}</span>
                  <span className="font-semibold">
                    {g.montant.toFixed(2)} €
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* MON MOT DE PASSE (version propre) */}
      <section className="px-4 mt-4">
        <div className="bg-white rounded-lg p-4 space-y-2">
          <h2 className="text-sm font-semibold">Mon mot de passe</h2>

          {pwdMsg && <p className="text-xs text-green-600">{pwdMsg}</p>}
          {pwdErr && <p className="text-xs text-red-600">{pwdErr}</p>}

          {!showPasswordForm ? (
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="text-xs border rounded px-3 py-1 cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              Modifier mon mot de passe
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-2">
              <input
                type="password"
                className="border rounded px-2 py-1 w-full text-sm"
                placeholder="Nouveau mot de passe"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <input
                type="password"
                className="border rounded px-2 py-1 w-full text-sm"
                placeholder="Confirmer le mot de passe"
                value={newPass2}
                onChange={(e) => setNewPass2(e.target.value)}
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-black text-white text-xs rounded px-3 py-1 cursor-pointer"
                >
                  Mettre à jour mon mot de passe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPwdErr(null);
                    setNewPass("");
                    setNewPass2("");
                  }}
                  className="text-xs text-gray-500 cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* missions */}
      <section className="px-4 mt-4">
        <h2 className="text-sm font-semibold mb-2">Missions assignées</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune mission pour le moment.
          </p>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => {
              const isFinishing = finishingId === a.id;
              return (
                <div key={a.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500">
                      Mission #{a.id.slice(0, 6)}
                    </p>
                    <span
                      className={
                        "text-xs px-2 py-1 rounded capitalize " +
                        (a.status === "terminee"
                          ? "bg-green-100 text-green-700"
                          : a.status === "acceptee"
                          ? "bg-blue-100 text-blue-700"
                          : a.status === "refusee"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700")
                      }
                    >
                      {a.status || "assignée"}
                    </span>
                  </div>

                  {a.order ? (
                    <>
                      <p className="text-sm">
                        <b>Pickup :</b>{" "}
                        {a.order.pickup_place_name
                          ? `${a.order.pickup_place_name} – ${a.order.pickup_address}`
                          : a.order.pickup_address}
                      </p>
                      <p className="text-sm">
                        <b>Livrer :</b> {a.order.dropoff_address}
                      </p>
                      {a.order.access_info ? (
                        <p className="text-xs text-gray-500 mt-1">
                          {a.order.access_info}
                        </p>
                      ) : null}
                      {a.order.notes ? (
                        <p className="text-xs text-gray-500 mt-1">
                          Note opérateur : {a.order.notes}
                        </p>
                      ) : null}
                      <p className="text-sm mt-1">
                        <b>Prix client :</b>{" "}
                        {a.order.price_total.toFixed(2)} € •{" "}
                        <b>Pour toi :</b>{" "}
                        {(a.order.price_total * 0.65).toFixed(2)} €
                      </p>

                      {/* étape 1 : accepter / refuser */}
                      {(a.status === "en_attente" ||
                        a.status === "assigned" ||
                        !a.status) && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from("assignments")
                                .update({
                                  status: "acceptee",
                                })
                                .eq("id", a.id);

                              if (error) {
                                console.error(
                                  "Erreur update assignments.acceptee",
                                  error
                                );
                                alert(
                                  "Erreur pour accepter la mission : " +
                                    error.message
                                );
                                return;
                              }

                              if (a.order_id) {
                                await supabase
                                  .from("orders")
                                  .update({
                                    status: "acceptee",
                                  })
                                  .eq("id", a.order_id);
                              }

                              setAssignments((prev) =>
                                prev.map((item) =>
                                  item.id === a.id
                                    ? {
                                        ...item,
                                        status: "acceptee",
                                        order: item.order
                                          ? {
                                              ...item.order,
                                              status: "acceptee",
                                            }
                                          : item.order,
                                      }
                                    : item
                                )
                              );

                              await supabase.from("events").insert({
                                type: "courier_accept",
                                courier_email: meEmail,
                                assignment_id: a.id,
                                order_id: a.order_id,
                              });
                            }}
                            className="bg-black text-white text-sm rounded px-3 py-1 cursor-pointer"
                          >
                            Accepter la mission
                          </button>
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from("assignments")
                                .update({
                                  status: "refusee",
                                })
                                .eq("id", a.id);

                              if (error) {
                                console.error(
                                  "Erreur update assignments.refusee",
                                  error
                                );
                                alert(
                                  "Erreur pour refuser la mission : " +
                                    error.message
                                );
                                return;
                              }

                              if (a.order_id) {
                                await supabase
                                  .from("orders")
                                  .update({
                                    status: "refusee",
                                  })
                                  .eq("id", a.order_id);
                              }

                              setAssignments((prev) =>
                                prev.map((item) =>
                                  item.id === a.id
                                    ? {
                                        ...item,
                                        status: "refusee",
                                        order: item.order
                                          ? {
                                              ...item.order,
                                              status: "refusee",
                                            }
                                          : item.order,
                                      }
                                    : item
                                )
                              );

                              await supabase.from("events").insert({
                                type: "courier_refuse",
                                courier_email: meEmail,
                                assignment_id: a.id,
                                order_id: a.order_id,
                              });
                            }}
                            className="bg-gray-200 text-gray-800 text-sm rounded px-3 py-1 cursor-pointer"
                          >
                            Refuser
                          </button>
                        </div>
                      )}

                      {/* étape 2 : mission acceptée */}
                      {a.status === "acceptee" && (
                        <div className="mt-3 space-y-3">
                          <button
                            className="bg-black text-white text-sm rounded px-3 py-1 cursor-pointer"
                            onClick={() => {
                              const pickup = encodeURIComponent(
                                a.order!.pickup_address || ""
                              );
                              const dropoff = encodeURIComponent(
                                a.order!.dropoff_address || ""
                              );
                              const url = `https://www.google.com/maps/dir/?api=1&origin=${pickup}&destination=${dropoff}&travelmode=driving`;
                              window.open(url, "_blank");

                              supabase.from("events").insert({
                                type: "courier_open_route",
                                courier_email: meEmail,
                                assignment_id: a.id,
                              });
                            }}
                          >
                            Ouvrir itinéraire
                          </button>

                          {!isFinishing ? (
                            <button
                              className="bg-green-100 text-green-800 text-xs rounded px-3 py-1 cursor-pointer"
                              onClick={() => {
                                setFinishingId(a.id);
                                setFinishPayment("");
                                setFinishCode("");
                                setFinishErr("");
                                setFinishWantsInvoice("");
                              }}
                            >
                              Marquer comme livré
                            </button>
                          ) : (
                            <div className="border rounded p-2 bg-gray-50 space-y-2">
                              <p className="text-xs font-semibold">
                                Clôturer la livraison
                              </p>

                              {/* mode de paiement */}
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setFinishPayment("cash")}
                                  className={
                                    "text-xs px-2 py-1 rounded border cursor-pointer " +
                                    (finishPayment === "cash"
                                      ? "bg-black text-white"
                                      : "")
                                  }
                                >
                                  Espèces
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFinishPayment("card")}
                                  className={
                                    "text-xs px-2 py-1 rounded border cursor-pointer " +
                                    (finishPayment === "card"
                                      ? "bg-black text-white"
                                      : "")
                                  }
                                >
                                  CB
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFinishPayment("to_pay")}
                                  className={
                                    "text-xs px-2 py-1 rounded border cursor-pointer " +
                                    (finishPayment === "to_pay"
                                      ? "bg-black text-white"
                                      : "")
                                  }
                                >
                                  À régler
                                </button>
                              </div>

                              {/* code client */}
                              <input
                                value={finishCode}
                                onChange={(e) => setFinishCode(e.target.value)}
                                className="border rounded px-2 py-1 w-full text-xs"
                                placeholder="Code client (si demandé)"
                              />

                              {/* facture oui/non */}
                              <div className="space-y-1">
                                <p className="text-xs">
                                  Le client souhaite une facture ?
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFinishWantsInvoice("yes")
                                    }
                                    className={
                                      "text-xs px-2 py-1 rounded border cursor-pointer " +
                                      (finishWantsInvoice === "yes"
                                        ? "bg-black text-white"
                                        : "")
                                    }
                                  >
                                    Oui
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFinishWantsInvoice("no")
                                    }
                                    className={
                                      "text-xs px-2 py-1 rounded border cursor-pointer " +
                                      (finishWantsInvoice === "no"
                                        ? "bg-black text-white"
                                        : "")
                                    }
                                  >
                                    Non
                                  </button>
                                </div>
                              </div>

                              {finishErr ? (
                                <p className="text-xs text-red-600">
                                  {finishErr}
                                </p>
                              ) : null}

                              <div className="flex gap-2">
                                <button
                                  className="bg-green-600 text-white text-xs rounded px-3 py-1 cursor-pointer"
                                  onClick={() => finishDelivery(a)}
                                >
                                  Valider la livraison
                                </button>
                                <button
                                  className="text-xs text-gray-500 cursor-pointer"
                                  onClick={() => {
                                    setFinishingId(null);
                                    setFinishErr("");
                                    setFinishPayment("");
                                    setFinishCode("");
                                    setFinishWantsInvoice("");
                                  }}
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {a.status === "terminee" && (
                        <p className="text-xs text-green-700 mt-2">
                          Livraison clôturée.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Commande introuvable (order_id: {a.order_id})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* disponibilités */}
      <section className="px-4 mt-6 mb-12">
        <h2 className="text-sm font-semibold mb-2">Mes disponibilités</h2>

        <div className="bg-white rounded-lg p-3 space-y-2 mb-3">
          <label className="text-xs text-gray-500">Début</label>
          <input
            type="datetime-local"
            className="border rounded px-2 py-1 w-full"
            value={availStart}
            onChange={(e) => setAvailStart(e.target.value)}
          />
          <label className="text-xs text-gray-500">Fin</label>
          <input
            type="datetime-local"
            className="border rounded px-2 py-1 w-full"
            value={availEnd}
            onChange={(e) => setAvailEnd(e.target.value)}
          />
          <button
            disabled={isAddingAvail}
            onClick={addAvailability}
            className="bg-black text-white rounded py-1 text-sm w-full disabled:opacity-60 cursor-pointer"
          >
            {isAddingAvail ? "Enregistrement..." : "Ajouter ma dispo"}
          </button>
        </div>

        {availabilities.length > 0 ? (
          <ul className="space-y-2">
            {availabilities.map((a) => (
              <li key={a.id} className="text-xs bg-white rounded p-2">
                {new Date(a.start).toLocaleString()} →{" "}
                {new Date(a.end).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">
            Aucune dispo. Ajoute un créneau pour que l’opérateur te voie.
          </p>
        )}
      </section>
    </main>
  );
}