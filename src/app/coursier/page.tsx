"use client";

import { useEffect, useState } from "react";
import { auth, db, messaging } from "@/app/_lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";

type AssignmentStatus =
  | "assigned"
  | "en_attente"
  | "acceptee"
  | "refusee"
  | "terminee";

type Assignment = {
  id: string;
  order_id: string;
  courier_id: string;
  assigned_at?: any;
  status?: AssignmentStatus;
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
  created_at?: any;
  validation_code?: string;
};

type Availability = {
  id: string;
  start: any;
  end: any;
};

export default function CourierPage() {
  // connexion
  const [me, setMe] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  // data temps réel
  const [assignments, setAssignments] = useState<
    (Assignment & { order?: Order })[]
  >([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [isAddingAvail, setIsAddingAvail] = useState(false);
  const [availStart, setAvailStart] = useState("");
  const [availEnd, setAvailEnd] = useState("");

  // états pour la clôture de mission
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [finishPayment, setFinishPayment] = useState<"cash" | "card" | "">("");
  const [finishCode, setFinishCode] = useState("");
  const [finishErr, setFinishErr] = useState("");

  // 👉 le coursier touche 65% des commandes acceptées ou terminées
  const totalBrutGagne = assignments
    .filter(
      (a) => a.order && (a.status === "acceptee" || a.status === "terminee")
    )
    .reduce((sum, a) => sum + a.order!.price_total * 0.65, 0);

  /* =============== LOGIN =============== */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      setMe(userCred.user);
    } catch (e: any) {
      setErr(e.message || "Erreur de connexion");
    }
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) setMe(u);
    });
    return () => unsub();
  }, []);

  /* =============== TEMPS RÉEL =============== */
  useEffect(() => {
    if (!me?.email) return;

    // missions
    const qAssign = query(
      collection(db, "assignments"),
      where("courier_id", "==", me.email),
      orderBy("assigned_at", "desc")
    );
    const unsubAssign = onSnapshot(qAssign, async (snap) => {
      const rows: (Assignment & { order?: Order })[] = [];

      for (const d of snap.docs) {
        const a = { id: d.id, ...(d.data() as any) } as Assignment;
        let orderData: Order | undefined;
        if (a.order_id) {
          const oRef = doc(db, "orders", a.order_id);
          const oSnap = await getDoc(oRef);
          if (oSnap.exists()) {
            orderData = { id: oSnap.id, ...(oSnap.data() as any) } as Order;
          }
        }
        rows.push({ ...a, order: orderData });
      }

      setAssignments(rows);
    });

    // dispos
    const qAvail = query(
      collection(db, "availabilities"),
      where("courier_id", "==", me.email),
      orderBy("start", "desc")
    );
    const unsubAvail = onSnapshot(qAvail, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Availability[];
      setAvailabilities(rows);
    });

    return () => {
      unsubAssign();
      unsubAvail();
    };
  }, [me]);

  /* =============== AJOUT DISPO =============== */
  async function addAvailability() {
    if (!me?.email) return;
    if (!availStart || !availEnd) return;
    setIsAddingAvail(true);
    try {
      await addDoc(collection(db, "availabilities"), {
        courier_id: me.email,
        start: new Date(availStart),
        end: new Date(availEnd),
        created_at: serverTimestamp(),
      });
      setAvailStart("");
      setAvailEnd("");
    } finally {
      setIsAddingAvail(false);
    }
  }

  /* =============== NOTIFS FCM (optionnel) =============== */
  useEffect(() => {
    if (!messaging || !me?.email) return;

    (async () => {
      try {
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
        });
        if (token) {
          await addDoc(collection(db, "device_tokens"), {
            courier_id: me.email,
            token,
            created_at: serverTimestamp(),
          });
        }
      } catch (e) {
        console.warn("FCM token error", e);
      }
    })();

    const unsub = onMessage(messaging, (payload) => {
      console.log("notif reçue:", payload);
      alert(payload.notification?.title || "Nouvelle mission");
    });

    return () => unsub();
  }, [me]);

  /* =============== CLOTURER LIVRAISON =============== */
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

    try {
      await updateDoc(doc(db, "assignments", a.id), {
        status: "terminee",
        completed_at: serverTimestamp(),
        payment_method: finishPayment,
        validated_with_code: !!finishCode,
      });

      await addDoc(collection(db, "events"), {
        type: "delivery_completed",
        courier_id: me?.email,
        assignment_id: a.id,
        order_id: a.order_id,
        payment_method: finishPayment,
        needs_invoice: true,
        at: serverTimestamp(),
      });

      setFinishingId(null);
      setFinishPayment("");
      setFinishCode("");
      setFinishErr("");
    } catch (e: any) {
      setFinishErr(e.message || "Impossible d’enregistrer la livraison.");
    }
  }

  /* =============== UI CONNEXION =============== */
  if (!me) {
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
            placeholder="mot de passe"
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

  /* =============== UI PRINCIPALE =============== */
  return (
    <main className="min-h-screen bg-gray-100 pb-20">
      {/* header */}
      <header className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Connecté</p>
          <p className="text-sm font-semibold break-all">{me.email}</p>
        </div>
        <button
          className="text-xs text-red-500"
          onClick={async () => {
            await auth.signOut();
            setMe(null);
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
          <p className="text-2xl font-bold mt-1">{totalBrutGagne.toFixed(2)} €</p>
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
          <p className="text-sm text-gray-500">Aucune mission pour le moment.</p>
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
                              await updateDoc(doc(db, "assignments", a.id), {
                                status: "acceptee",
                                accepted_at: serverTimestamp(),
                              });
                              await addDoc(collection(db, "events"), {
                                type: "courier_accept",
                                courier_id: me.email,
                                assignment_id: a.id,
                                at: serverTimestamp(),
                              });
                            }}
                            className="bg-black text-white text-sm rounded px-3 py-1"
                          >
                            Accepter la mission
                          </button>
                          <button
                            onClick={async () => {
                              await updateDoc(doc(db, "assignments", a.id), {
                                status: "refusee",
                                refused_at: serverTimestamp(),
                              });
                              await addDoc(collection(db, "events"), {
                                type: "courier_refuse",
                                courier_id: me.email,
                                assignment_id: a.id,
                                at: serverTimestamp(),
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
                            onClick={async () => {
                              const pickup = encodeURIComponent(
                                a.order!.pickup_address || ""
                              );
                              const dropoff = encodeURIComponent(
                                a.order!.dropoff_address || ""
                              );
                              const url = `https://www.google.com/maps/dir/?api=1&origin=${pickup}&destination=${dropoff}&travelmode=driving`;
                              window.open(url, "_blank");

                              try {
                                await addDoc(collection(db, "events"), {
                                  type: "courier_open_route",
                                  courier_id: me.email,
                                  assignment_id: a.id,
                                  at: serverTimestamp(),
                                });
                              } catch (e) {
                                console.warn("event log failed", e);
                              }
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
                {a.start?.toDate
                  ? a.start.toDate().toLocaleString()
                  : new Date(a.start).toLocaleString()}{" "}
                →{" "}
                {a.end?.toDate
                  ? a.end.toDate().toLocaleString()
                  : new Date(a.end).toLocaleString()}
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