"use client";

import { useEffect, useState } from "react";
import { supabase } from "../_lib/supabaseClient";

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
};

type Availability = {
  id: string;
  courier_email: string;
  start: string;
  end: string;
  created_at?: string;
};

export default function CourierPage() {
  // ====== "auth" très simple : on tape l'email et on se connecte ======
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState(""); // juste pour garder ton champ
  const [err, setErr] = useState("");

  // ====== data ======
  const [assignments, setAssignments] = useState<
    (Assignment & { order?: Order })[]
  >([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [isAddingAvail, setIsAddingAvail] = useState(false);
  const [availStart, setAvailStart] = useState("");
  const [availEnd, setAvailEnd] = useState("");

  // états de clôture
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [finishPayment, setFinishPayment] = useState<"cash" | "card" | "">("");
  const [finishCode, setFinishCode] = useState("");
  const [finishErr, setFinishErr] = useState("");

  // 65% pour le coursier
  const totalBrutGagne = assignments
    .filter(
      (a) => a.order && (a.status === "acceptee" || a.status === "terminee")
    )
    .reduce((sum, a) => sum + a.order!.price_total * 0.65, 0);

  /* ================= LOGIN ================= */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!email) {
      setErr("Saisis un email");
      return;
    }
    // ici on ne vérifie pas de mot de passe, on stocke juste l'email
    setMeEmail(email.toLowerCase());
  }

  /* ================= CHARGER DONNÉES ================= */
  useEffect(() => {
    if (!meEmail) return;

    // fonction pour charger missions + commandes
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

    // temps réel sur assignments pour ce coursier
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
          // on recharge
          loadAssignments();
        }
      )
      .subscribe();

    // temps réel sur dispos
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

  /* ================= AJOUT DISPO ================= */
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

  /* ================= CLOTURER LIVRAISON ================= */
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

    const { error } = await supabase
      .from("assignments")
      .update({
        status: "terminee",
        completed_at: new Date().toISOString(),
        payment_method: finishPayment,
        validated_with_code: !!finishCode,
      })
      .eq("id", a.id);

    if (error) {
      setFinishErr(error.message);
      return;
    }

    await supabase.from("events").insert({
      type: "delivery_completed",
      courier_email: meEmail,
      assignment_id: a.id,
      order_id: a.order_id,
      payment_method: finishPayment,
      needs_invoice: true,
    });

    setFinishingId(null);
    setFinishPayment("");
    setFinishCode("");
    setFinishErr("");
  }

  /* ================= UI CONNEXION ================= */
  if (!meEmail) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white shadow rounded p-6 space-y-4"
        >
          <h1 className="text-xl font-semibold text-center">Espace coursier</h1>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="mot de passe (pas utilisé)"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
          />
          {err ? <p className="text-red-600 text-sm">{err}</p> : null}
          <button
            type="submit"
            className="w-full bg-black text-white rounded py-2"
          >
            Se connecter
          </button>
        </form>
      </main>
    );
  }

  /* ================= UI PRINCIPALE ================= */
  return (
    <main className="min-h-screen bg-gray-100 pb-20">
      {/* header */}
      <header className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Connecté</p>
          <p className="text-sm font-semibold break-all">{meEmail}</p>
        </div>
        <button
          className="text-xs text-red-500"
          onClick={() => {
            setMeEmail(null);
          }}
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
                              await supabase
                                .from("assignments")
                                .update({
                                  status: "acceptee",
                                  accepted_at: new Date().toISOString(),
                                })
                                .eq("id", a.id);
                              await supabase.from("events").insert({
                                type: "courier_accept",
                                courier_email: meEmail,
                                assignment_id: a.id,
                              });
                            }}
                            className="bg-black text-white text-sm rounded px-3 py-1"
                          >
                            Accepter la mission
                          </button>
                          <button
                            onClick={async () => {
                              await supabase
                                .from("assignments")
                                .update({
                                  status: "refusee",
                                  refused_at: new Date().toISOString(),
                                })
                                .eq("id", a.id);
                              await supabase.from("events").insert({
                                type: "courier_refuse",
                                courier_email: meEmail,
                                assignment_id: a.id,
                              });
                            }}
                            className="bg-gray-200 text-gray-800 text-sm rounded px-3 py-1"
                          >
                            Refuser
                          </button>
                        </div>
                      )}

                      {/* étape 2 : mission acceptée */}
                      {a.status === "acceptee" && (
                        <div className="mt-3 space-y-3">
                          <button
                            className="bg-black text-white text-sm rounded px-3 py-1"
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
                              className="bg-green-100 text-green-800 text-xs rounded px-3 py-1"
                              onClick={() => {
                                setFinishingId(a.id);
                                setFinishPayment("");
                                setFinishCode("");
                                setFinishErr("");
                              }}
                            >
                              Marquer comme livré
                            </button>
                          ) : (
                            <div className="border rounded p-2 bg-gray-50 space-y-2">
                              <p className="text-xs font-semibold">
                                Clôturer la livraison
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setFinishPayment("cash")}
                                  className={
                                    "text-xs px-2 py-1 rounded border " +
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
                                    "text-xs px-2 py-1 rounded border " +
                                    (finishPayment === "card"
                                      ? "bg-black text-white"
                                      : "")
                                  }
                                >
                                  CB
                                </button>
                              </div>
                              <input
                                value={finishCode}
                                onChange={(e) => setFinishCode(e.target.value)}
                                className="border rounded px-2 py-1 w-full text-xs"
                                placeholder="Code client (si demandé)"
                              />
                              {finishErr ? (
                                <p className="text-xs text-red-600">
                                  {finishErr}
                                </p>
                              ) : null}
                              <div className="flex gap-2">
                                <button
                                  className="bg-green-600 text-white text-xs rounded px-3 py-1"
                                  onClick={() => finishDelivery(a)}
                                >
                                  Valider la livraison
                                </button>
                                <button
                                  className="text-xs text-gray-500"
                                  onClick={() => {
                                    setFinishingId(null);
                                    setFinishErr("");
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
            className="bg-black text-white rounded py-1 text-sm w-full disabled:opacity-60"
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