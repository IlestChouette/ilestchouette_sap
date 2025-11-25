"use client";


import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { supabase } from "../_lib/supabaseClient";

/* ===================== Services ===================== */
type ServiceDef = {
  id: string;
  label: string;
  base: number;
  type: "flat" | "hour";
};

console.log("VERSION OPÉRATEUR 15-11-2025");

const SERVICES: ServiceDef[] = [
  { id: "supermarket", label: "Courses supermarché (8€)", base: 8, type: "flat" },
  { id: "meds", label: "Médicaments (6€)", base: 6, type: "flat" },
  { id: "food", label: "Nourriture (6€)", base: 6, type: "flat" },
  { id: "keys", label: "Clés / objets (6€)", base: 6, type: "flat" },
  { id: "shopping", label: "Achats boutique (8€)", base: 8, type: "flat" },
  { id: "concierge", label: "Conciergerie (12€)", base: 12, type: "flat" },
  { id: "express", label: "Express (12€)", base: 12, type: "flat" },
  { id: "eco", label: "Éco (7€)", base: 7, type: "flat" },
  { id: "it", label: "Dépannage informatique (50€/h)", base: 50, type: "hour" },
  { id: "assist", label: "Accompagnement (20€/h)", base: 20, type: "hour" },
  { id: "bricolage", label: "Bricolage (50€/h)", base: 50, type: "hour" },
  { id: "other", label: "Autre (0€)", base: 0, type: "flat" },
];

const getService = (id: string) => SERVICES.find((s) => s.id === id);

/* ============== Hook Google prêt ============== */
function useGoogleLoaded() {
  return typeof window !== "undefined" && !!(window as any).google?.maps?.places;
}

/* ============== Input avec autocomplete Google ============== */
type AutoProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onPlace?: (p: google.maps.places.PlaceResult) => void;
};

function AutocompleteInput({ value, onChange, placeholder, onPlace }: AutoProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const googleReady = useGoogleLoaded();

  useEffect(() => {
    if (!googleReady || !inputRef.current) return;
    const ac = new (window as any).google.maps.places.Autocomplete(
      inputRef.current!,
      {
        fields: ["formatted_address", "name", "geometry", "place_id"],
        componentRestrictions: { country: ["fr"] },
      },
    );
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const addr = place?.formatted_address || place?.name || "";
      if (addr) onChange(addr);
      onPlace?.(place);
    });
  }, [googleReady, onChange, onPlace]);

  return (
    <input
      ref={inputRef}
      className="border rounded p-2 w-full"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
    />
  );
}

/* =================== Types =================== */
type Customer = {
  id: string;
  phone: string;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
  zipcode?: string | null;
  city?: string | null;
  preferences?: string | null;
};

type Order = {
  id: string;
  service_type: string;
  pickup_address: string;
  pickup_place_name?: string | null;
  dropoff_address: string;
  access_info?: string | null;
  notes?: string | null;
  distance_km: number;
  price_total: number;
  status: string;
  created_at?: string;
  express?: boolean;
  validation_code?: string | null;
  wants_invoice?: boolean | null;
  payment_method?: string | null;
};

type ServiceLine = {
  id: string;
  serviceType: string;
  pickup: string;
  pickupName: string;
  notes: string;
  distanceKm: number;
  price: number;
};

const newLine = (): ServiceLine => ({
  id: Math.random().toString(36).slice(2, 9),
  serviceType: "supermarket",
  pickup: "",
  pickupName: "",
  notes: "",
  distanceKm: 0,
  price: 0,
});

/* ============= Helper pour nettoyer les adresses ============= */
function cleanAddress(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .trim();
}

export default function OperatorDashboard() {
  /* ---- opérateur connecté ---- */
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [isOperator, setIsOperator] = useState<boolean | null>(null);

  // ---- CLIENT ----
  const [phone, setPhone] = useState("");
  const [phoneSuggestions, setPhoneSuggestions] = useState<Customer[]>([]);
  const [info, setInfo] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [city, setCity] = useState("");
  const [preferences, setPreferences] = useState("");

  // ---- COMMANDES ----
  const [lines, setLines] = useState<ServiceLine[]>([newLine()]);
  const [dropoff, setDropoff] = useState("");

  const [accessInfo, setAccessInfo] = useState("");
  const [express, setExpress] = useState(false);
  const [expressNote, setExpressNote] =
    useState("⚡ Livraison express, traiter en priorité.");
  const [validationCode, setValidationCode] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  // ---- PLANIFIER ----
  const [scheduledAt, setScheduledAt] = useState("");
  const [availableCouriers, setAvailableCouriers] = useState<
    { courier_id: string; name?: string | null }[]
  >([]);
  const [selectedCourierId, setSelectedCourierId] = useState("");

  /* ---- demandes de coursiers ---- */
  const [signups, setSignups] = useState<any[]>([]);
  const [signupMsg, setSignupMsg] = useState("");

  /* ============================================================
   * 1. RÉCUPÉRER L’UTILISATEUR + VÉRIFIER S’IL EST OPÉRATEUR
   * ========================================================== */
  useEffect(() => {
    (async () => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.warn("Erreur getSession:", sessionError.message);
        }

        const session = sessionData?.session ?? null;

        if (!session) {
          setMeEmail(null);
          setIsOperator(false);
          return;
        }

        const email = session.user?.email ?? null;
        setMeEmail(email);

        if (!email) {
          setIsOperator(false);
          return;
        }

        const res = await fetch("/api/operateur/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (!res.ok) {
          console.warn("Erreur /api/operateur/check:", res.status);
          setIsOperator(false);
          return;
        }

        const json = await res.json();
        setIsOperator(json.isOperator === true);
      } catch (e) {
        console.error("Erreur dans useEffect opérateur:", e);
        setIsOperator(false);
      }
    })();
  }, []);

  /* ============================================================
   * 2. SI OPÉRATEUR → CHARGER LES DEMANDES DE COURSIERS
   * ========================================================== */
  useEffect(() => {
    if (isOperator !== true) return;

    (async () => {
      const { data, error } = await supabase
        .from("courier_signups")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement signups:", error.message);
        setSignupMsg("Erreur chargement demandes : " + error.message);
      } else {
        setSignups(data || []);
      }
    })();
  }, [isOperator]);

  /* =================== LOGOUT =================== */
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/operateur/login";
  }

  /* =================== VALIDER / REFUSER COURSIER =================== */
  async function updateSignupStatus(s: any, status: "approved" | "rejected") {
    setSignupMsg("");

    const { error } = await supabase
      .from("courier_signups")
      .update({ status })
      .eq("id", s.id);

    if (error) {
      setSignupMsg("Erreur: " + error.message);
      return;
    }

    if (status === "approved") {
      const res = await fetch("/api/couriers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: s.email,
          first_name: s.first_name,
          last_name: s.last_name,
          phone: s.phone,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSignupMsg(
          "Coursier validé dans la table, mais création du compte KO: " +
            json.error,
        );
      } else {
        setSignupMsg(
          `Coursier validé ✅ mot de passe provisoire : ${json.password}`,
        );
      }
    } else {
      setSignupMsg("Demande refusée ❌");
    }

    setSignups((prev) => prev.map((x) => (x.id === s.id ? { ...x, status } : x)));
  }

  /* =================== AUTOCOMPLETE TÉLÉPHONE =================== */
  useEffect(() => {
    if (phone.trim().length < 3) {
      setPhoneSuggestions([]);
      return;
    }
    let stopped = false;
    (async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .ilike("phone", `${phone}%`)
        .limit(5);

      if (!stopped) {
        if (error) {
          console.warn(error);
        } else {
          setPhoneSuggestions((data as Customer[]) || []);
        }
      }
    })();
    return () => {
      stopped = true;
    };
  }, [phone]);

  function fillCustomerFromSuggestion(c: Customer) {
    setCustomer(c);
    setPhone(c.phone);
    setFirstName(c.first_name || "");
    setLastName(c.last_name || "");
    setAddress(c.address || "");
    setZipcode(c.zipcode || "");
    setCity(c.city || "");
    setPreferences(c.preferences || "");
    const drop = [c.address, c.zipcode, c.city].filter(Boolean).join(" ");
    if (drop) setDropoff(drop);
    setPhoneSuggestions([]);
    setInfo("Client chargé ✅");
    loadOrders(c.id);
  }

  /* =================== PRIX & DISTANCE (par ligne) =================== */
  function priceFor(serviceType: string, km: number) {
    const s = getService(serviceType);
    if (!s) return 0;
    if (s.type === "hour") return s.base;
    const extra = Math.max(0, km - 1) * 1; // à partir du 2e km : +1€/km
    return Math.round((s.base + extra) * 100) / 100;
  }

  async function computeDistanceForLine(line: ServiceLine, drop: string) {
    const originRaw = line.pickup;
    const destRaw = drop;

    if (!originRaw || !destRaw) return;

    const g = (window as any).google;
    if (!g?.maps?.DistanceMatrixService) return;

    const origin = cleanAddress(originRaw);
    const destination = cleanAddress(destRaw);
    if (!origin || !destination) return;

    try {
      const svc = new g.maps.DistanceMatrixService();
      const res: google.maps.DistanceMatrixResponse = await new Promise(
        (resolve, reject) => {
          svc.getDistanceMatrix(
            {
              origins: [origin],
              destinations: [destination],
              travelMode: g.maps.TravelMode.DRIVING,
              unitSystem: g.maps.UnitSystem.METRIC,
            },
            (response: any, status: any) => {
              if (status === "OK") resolve(response);
              else reject(status);
            },
          );
        },
      );

      const meters = res.rows?.[0]?.elements?.[0]?.distance?.value ?? 0;
      const km = Math.round((meters / 1000) * 100) / 100;
      const newPrice = priceFor(line.serviceType, km);

      setLines((prev) =>
        prev.map((l) =>
          l.id === line.id ? { ...l, distanceKm: km, price: newPrice } : l,
        ),
      );
    } catch (err) {
      console.error("Erreur DistanceMatrix:", err);
    }
  }

  /* recalcul des distances si le dropoff change */
  useEffect(() => {
    if (!dropoff) return;
    lines.forEach((l) => {
      if (l.pickup) computeDistanceForLine(l, dropoff);
    });
  }, [dropoff, lines]);

  /* =================== SUPABASE : CLIENTS =================== */

  async function searchCustomer() {
    if (!phone) {
      setInfo("Saisis un numéro.");
      return;
    }
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error || !data) {
      setCustomer(null);
      setInfo("Client introuvable. Complète le formulaire et crée-le.");
      setOrders([]);
      return;
    }
    fillCustomerFromSuggestion(data as Customer);
  }

  async function createOrUpdateCustomer() {
    if (!phone) {
      setInfo("Saisis d’abord le téléphone.");
      return;
    }

    if (customer) {
      const { error } = await supabase
        .from("customers")
        .update({
          phone,
          first_name: firstName || null,
          last_name: lastName || null,
          address: address || null,
          zipcode: zipcode || null,
          city: city || null,
          preferences: preferences || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customer.id);

      if (error) {
        setInfo("Erreur mise à jour client : " + error.message);
      } else {
        setInfo("Client mis à jour ✅");
      }
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert([
          {
            phone,
            first_name: firstName || null,
            last_name: lastName || null,
            address: address || null,
            zipcode: zipcode || null,
            city: city || null,
            preferences: preferences || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        setInfo("Erreur création client : " + error.message);
      } else {
        setCustomer(data as Customer);
        setInfo("Client créé ✅");
      }
    }

    const drop = [address, zipcode, city].filter(Boolean).join(" ");
    if (drop) setDropoff(drop);
  }

  async function loadOrders(customerId: string) {
    console.log("▶️ loadOrders pour customer", customerId);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    console.log("⬅️ résultat loadOrders :", { data, error });

    if (error) {
      console.warn(error);
      setOrders([]);
      return;
    }

    const ordersRaw = (data as Order[]) || [];

    if (ordersRaw.length === 0) {
      setOrders([]);
      return;
    }

    // 🔹 récupérer les modes de règlement depuis assignments
    const orderIds = ordersRaw.map((o) => o.id);
    const { data: payRows, error: payErr } = await supabase
      .from("assignments")
      .select("order_id, payment_method")
      .in("order_id", orderIds);

    let paymentMap: Record<string, string | null> = {};
    if (!payErr && payRows) {
      (payRows as any[]).forEach((row) => {
        if (!paymentMap[row.order_id]) {
          paymentMap[row.order_id] = row.payment_method ?? null;
        }
      });
    }

    const ordersWithPayment = ordersRaw.map((o) => ({
      ...o,
      payment_method: paymentMap[o.id] ?? null,
    }));

    setOrders(ordersWithPayment);
  }

  /* ====== trouver les livreurs disponibles (email comme id) ====== */
  async function findAvailableCouriers() {
    if (!scheduledAt) {
      setInfo("Choisis d’abord une date/heure.");
      return;
    }

    const target = new Date(scheduledAt).getTime();
    if (Number.isNaN(target)) {
      setInfo("Date/horaire invalide.");
      return;
    }

    const targetIso = new Date(scheduledAt).toISOString();

    /* 1) On récupère les dispos qui couvrent cet horaire */
    const { data: availData, error: availErr } = await supabase
      .from("availabilities")
      .select("courier_email, start, end");

    if (availErr) {
      console.error("Erreur chargement livreurs :", availErr);
      setInfo("Erreur chargement livreurs : " + availErr.message);
      return;
    }

    const matchingAvail = (availData || []).filter((a: any) => {
      const startTs = new Date(a.start).getTime();
      const endTs = new Date(a.end).getTime();
      return startTs <= target && endTs >= target;
    });

    if (matchingAvail.length === 0) {
      setAvailableCouriers([]);
      setInfo("Aucun livreur disponible pour cet horaire.");
      return;
    }

    const candidateEmails = Array.from(
      new Set(
        matchingAvail
          .map((a: any) => (a.courier_email || "").trim())
          .filter((e: string) => e.length > 0),
      ),
    );

    if (candidateEmails.length === 0) {
      setAvailableCouriers([]);
      setInfo("Aucun livreur disponible pour cet horaire.");
      return;
    }

    /* 2) On récupère les missions déjà assignées à cet horaire */
    const { data: busyRows, error: busyErr } = await supabase
      .from("assignments")
      .select("courier_email, status, scheduled_at")
      .in("courier_email", candidateEmails)
      .eq("scheduled_at", targetIso)
      .in("status", ["assigned", "en_attente", "acceptee"]); // missions non terminées

    if (busyErr) {
      console.error("Erreur chargement assignments :", busyErr);
    }

    const busySet = new Set(
      (busyRows || [])
        .map((r: any) => (r.courier_email || "").trim())
        .filter((e: string) => e.length > 0),
    );

    const finalList = candidateEmails
      .filter((email) => !busySet.has(email))
      .map((email) => ({
        courier_id: email,
        name: email,
      }));

    setAvailableCouriers(finalList);

    if (finalList.length === 0) {
      setInfo("Aucun livreur disponible pour cet horaire.");
    } else {
      setInfo(`${finalList.length} livreur(s) disponible(s) trouvés ✅`);
    }
  }

  /* 🔹 choisir un livreur depuis la liste */
  function handlePickCourier(id: string) {
    setSelectedCourierId(id);
    setInfo(`Livreur sélectionné : ${id}`);
  }

  /* =================== TOTAL À FACTURER ===================
   * Règle : service le plus cher + total des kilomètres
   * (1er km inclus) + éventuel supplément express
   * ======================================================= */
  const totalToBill = (() => {
    if (lines.length === 0) return 0;

    let maxBase = 0;
    let totalKm = 0;
    let hasKm = false;

    for (const l of lines) {
      const svc = getService(l.serviceType);
      if (!svc) continue;

      if (svc.base > maxBase) {
        maxBase = svc.base;
      }

      if (typeof l.distanceKm === "number" && !Number.isNaN(l.distanceKm)) {
        totalKm += l.distanceKm;
        if (l.distanceKm > 0) hasKm = true;
      }
    }

    let distancePrice = 0;
    if (hasKm) {
      const payableKm = Math.max(0, totalKm - 1);
      distancePrice = payableKm * 1; // 1€/km
    }

    const expressExtra = express ? 12 : 0;

    const total = maxBase + distancePrice + expressExtra;
    return Math.round(total * 100) / 100;
  })();

  function generateCode() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setValidationCode(code);
  }

  /* ============================================================
   * 3. CRÉATION DES COMMANDES + ASSIGNATION COURSIER
   * ========================================================== */
  async function createOrders() {
    console.log(">>> createOrders() appelée", {
      customer,
      dropoff,
      lines,
      selectedCourierId,
      scheduledAt,
    });

    if (!customer) {
      setInfo("Sélectionne/crée d’abord un client.");
      console.log("❌ createOrders : pas de customer");
      return;
    }
    if (!dropoff) {
      setInfo("Saisis l’adresse de livraison.");
      console.log("❌ createOrders : pas de dropoff");
      return;
    }

    const scheduled_at = scheduledAt ? new Date(scheduledAt).toISOString() : null;

    for (const l of lines) {
      const payload: any = {
        customer_id: customer.id,
        created_by: meEmail || null,
        service_type: l.serviceType,
        pickup_address: l.pickup,
        pickup_place_name: l.pickupName || null,
        dropoff_address: dropoff,
        access_info: accessInfo || null,
        notes: express ? `${expressNote} ${l.notes || ""}`.trim() : l.notes || null,
        distance_km: Number(l.distanceKm) || 0,
        price_total: Number(l.price) || 0,
        express,
        status: selectedCourierId ? "assigned" : "pending",
        scheduled_at,
        created_at: new Date().toISOString(),
      };

      if (validationCode) {
        payload.validation_code = validationCode;
      }

      console.log("▶️ insertion dans orders avec payload :", payload);

      const { data: insertedOrder, error: orderErr } = await supabase
        .from("orders")
        .insert([payload])
        .select()
        .single();

      console.log("⬅️ résultat insertion orders :", { insertedOrder, orderErr });

      if (orderErr) {
        console.error("Erreur création commande :", orderErr);
        setInfo("Erreur création commande : " + orderErr.message);
        continue;
      }

      if (selectedCourierId && insertedOrder) {
        const { error: assignErr } = await supabase.from("assignments").insert([
          {
            order_id: insertedOrder.id,
            courier_email: selectedCourierId,
            scheduled_at,
            assigned_at: new Date().toISOString(),
            status: "assigned",
          },
        ]);
        console.log("⬅️ résultat insertion assignment :", { assignErr });
        if (assignErr) console.warn("assign error", assignErr);
      }

      const { error: eventErr } = await supabase.from("events").insert([
        {
          type: "order_created",
          order_id: insertedOrder?.id,
          by_email: meEmail,
          at: new Date().toISOString(),
        },
      ]);
      if (eventErr) {
        console.warn("Erreur insertion event order_created :", eventErr);
      }
    }

    setInfo("Commande(s) créée(s) ✅");
    setLines([newLine()]);
    setAccessInfo("");
    setScheduledAt("");
    setSelectedCourierId("");
    setValidationCode("");

    if (customer?.id) {
      await loadOrders(customer.id);
    }
  }

  /* =================== RENDER =================== */
  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GMAPS_API_KEY}&libraries=places&language=fr`}
        strategy="afterInteractive"
      />

      <main className="max-w-3xl mx-auto p-6 font-sans space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Espace opérateur</h1>
            <p className="text-sm text-gray-600">Connecté : {meEmail ?? "—"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded cursor-pointer"
          >
            Se déconnecter
          </button>
        </header>

        {isOperator === null ? (
          <p>Chargement…</p>
        ) : !meEmail ? (
          <div className="p-4 border rounded bg-yellow-50 text-yellow-800 space-y-2">
            <p>Tu n’es pas connecté.</p>
            <Link
              href="/operateur/login"
              className="inline-block bg-black text-white px-3 py-1 rounded text-sm cursor-pointer"
            >
              Aller à la page de connexion
            </Link>
          </div>
        ) : isOperator === false ? (
          <p className="p-4 border rounded bg-red-50 text-red-700">
            Tu es connecté avec <b>{meEmail}</b> mais ton email n’est pas dans la table{" "}
            <b>operators</b>.
          </p>
        ) : (
          <>
            {/* DEMANDES DE COURSIERS */}
            <section className="p-4 border rounded space-y-3">
              <h2 className="font-semibold text-lg">Demandes de coursiers</h2>
              {signupMsg ? <p className="text-sm">{signupMsg}</p> : null}
              {signups.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune demande reçue.</p>
              ) : (
                <ul className="space-y-2">
                  {signups.map((s) => (
                    <li
                      key={s.id}
                      className="border rounded p-2 text-sm flex items-center justify-between gap-3"
                    >
                      <div>
                        <div>
                          <b>
                            {s.first_name} {s.last_name}
                          </b>{" "}
                          — {s.email} — 📞 {s.phone}
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.created_at ? new Date(s.created_at).toLocaleString() : ""} •
                          statut : {s.status}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateSignupStatus(s, "approved")}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50 cursor-pointer"
                          disabled={s.status === "approved"}
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => updateSignupStatus(s, "rejected")}
                          className="text-xs bg-red-500 text-white px-3 py-1 rounded disabled:opacity-50 cursor-pointer"
                          disabled={s.status === "rejected"}
                        >
                          Refuser
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* RECHERCHE CLIENT */}
            <section className="p-4 border rounded">
              <h2 className="font-semibold mb-2">Recherche client par téléphone</h2>
              <div className="relative">
                <input
                  className="border rounded p-2 w-full"
                  placeholder="+336..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {phoneSuggestions.length > 0 && (
                  <ul className="absolute z-10 bg-white border rounded w-full mt-1 max-h-40 overflow-auto">
                    {phoneSuggestions.map((c) => (
                      <li
                        key={c.id}
                        className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => fillCustomerFromSuggestion(c)}
                      >
                        {c.phone} — {c.first_name} {c.last_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                className="mt-2 bg-black text-white rounded px-3 py-1 cursor-pointer"
                onClick={searchCustomer}
              >
                Rechercher
              </button>
              <p className="text-sm mt-2">{info}</p>
            </section>

            {/* FICHE CLIENT */}
            <section className="p-4 border rounded space-y-2">
              <h2 className="font-semibold">Client</h2>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="border rounded p-2"
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  className="border rounded p-2"
                  placeholder="Nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <input
                className="border rounded p-2 w-full"
                placeholder="Adresse (rue, n°...)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <input
                  className="border rounded p-2"
                  placeholder="Code postal"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                />
                <input
                  className="border rounded p-2"
                  placeholder="Ville"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <input
                className="border rounded p-2 w-full"
                placeholder="Infos complémentaires (bâtiment, appart...)"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
              />
              <button
                className="bg-black text-white rounded px-3 py-2 w-max cursor-pointer"
                onClick={createOrUpdateCustomer}
              >
                Créer / mettre à jour le client
              </button>
            </section>

            {/* NOUVELLE COMMANDE */}
            <section className="p-4 border rounded space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Nouvelle commande</h2>
                <button
                  className="text-sm border rounded px-2 py-1 cursor-pointer"
                  onClick={() => setLines((p) => [...p, newLine()])}
                >
                  + Ajouter une ligne
                </button>
              </div>

              {lines.map((l, idx) => (
                <div key={l.id} className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Ligne #{idx + 1}</p>
                    {lines.length > 1 && (
                      <button
                        className="text-xs text-red-500 cursor-pointer"
                        onClick={() =>
                          setLines((p) => p.filter((x) => x.id !== l.id))
                        }
                      >
                        supprimer
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-[240px_1fr] gap-2">
                    <select
                      className="border rounded p-2"
                      value={l.serviceType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLines((prev) =>
                          prev.map((x) =>
                            x.id === l.id ? { ...x, serviceType: val } : x,
                          ),
                        );
                        if (l.pickup && dropoff) {
                          computeDistanceForLine({ ...l, serviceType: val }, dropoff);
                        }
                      }}
                    >
                      {SERVICES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <AutocompleteInput
                      placeholder="Commerce / adresse pickup"
                      value={l.pickup}
                      onChange={(v) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.id === l.id ? { ...x, pickup: v } : x,
                          ),
                        )
                      }
                      onPlace={(p) => {
                        const full =
                          (p.name ? p.name + " — " : "") +
                          (p.formatted_address || p.name || "");
                        setLines((prev) =>
                          prev.map((x) =>
                            x.id === l.id
                              ? {
                                  ...x,
                                  pickup: full,
                                  pickupName: p.name || "",
                                }
                              : x,
                          ),
                        );
                        if (dropoff) {
                          computeDistanceForLine(
                            {
                              ...l,
                              pickup: full,
                            },
                            dropoff,
                          );
                        }
                      }}
                    />
                  </div>
                  <textarea
                    className="border rounded p-2 w-full min-h-16"
                    placeholder="Notes (ex. récupérer drive, étage, code...)"
                    value={l.notes}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.id === l.id ? { ...x, notes: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <p className="text-sm text-gray-700">
                    Distance estimée :{" "}
                    {l.distanceKm ? `${l.distanceKm} km` : "— pas encore calculé —"} •
                    Prix ligne : {l.price ? `${l.price} €` : "—"}
                  </p>
                </div>
              ))}

              <p className="text-sm text-gray-500">Adresse de livraison (dropoff)</p>
              <AutocompleteInput
                placeholder="Ex. 143 promenade des Anglais, Nice"
                value={dropoff}
                onChange={setDropoff}
              />

              <textarea
                className="border rounded p-2 w-full min-h-16"
                placeholder="Indications d’accès / infos supplémentaires (code porte, interphone, étage...)"
                value={accessInfo}
                onChange={(e) => setAccessInfo(e.target.value)}
              />

              <div className="flex items-center gap-2">
                <input
                  id="express"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={express}
                  onChange={(e) => setExpress(e.target.checked)}
                />
                <label htmlFor="express" className="text-sm">
                  Commande EXPRESS (+12€)
                </label>
              </div>
              {express && (
                <input
                  className="border rounded p-2 w-full"
                  value={expressNote}
                  onChange={(e) => setExpressNote(e.target.value)}
                />
              )}

              {/* code de validation */}
              <div className="flex gap-2 items-center">
                <input
                  className="border rounded p-2 w-28"
                  placeholder="Code"
                  value={validationCode}
                  onChange={(e) => setValidationCode(e.target.value)}
                />
                <button
                  type="button"
                  onClick={generateCode}
                  className="border rounded px-3 py-1 text-sm cursor-pointer"
                >
                  Générer un code
                </button>
                <span className="text-xs text-gray-500">
                  (à communiquer au client → le coursier le saisira)
                </span>
              </div>

              <div className="p-3 bg-gray-50 border rounded">
                <b>Total à facturer :</b>{" "}
                {totalToBill
                  ? `${totalToBill.toFixed(2)} €`
                  : "— (attend adresses/distance) —"}
              </div>
            </section>

            {/* PLANIFIER */}
            <section className="p-4 border rounded space-y-3">
              <h2 className="font-semibold">Planifier</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="datetime-local"
                  className="border rounded p-2"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <button
                  className="border rounded px-3 py-2 cursor-pointer"
                  onClick={findAvailableCouriers}
                >
                  Voir livreurs disponibles
                </button>
              </div>

              {availableCouriers.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-sm text-gray-600">Livreurs disponibles :</p>
                  <ul className="space-y-1">
                    {availableCouriers.map((c) => (
                      <li
                        key={c.courier_id}
                        className="flex items-center justify-between border rounded px-2 py-1 text-sm"
                      >
                        <span>
                          {c.name || c.courier_id}
                          {selectedCourierId === c.courier_id && (
                            <span className="ml-1 text-xs text-green-600">
                              {" "}
                              (sélectionné)
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePickCourier(c.courier_id)}
                          className="text-xs bg-black text-white rounded px-2 py-1 cursor-pointer"
                        >
                          Attribuer ce livreur
                        </button>
                      </li>
                    ))}
                  </ul>

                  {selectedCourierId && (
                    <p className="text-xs text-green-700 mt-1">
                      Livreur actuellement sélectionné : <b>{selectedCourierId}</b>
                    </p>
                  )}
                </div>
              )}

              {availableCouriers.length === 0 && scheduledAt && (
                <p className="text-xs text-gray-500">
                  Aucun livreur disponible pour cet horaire.
                </p>
              )}
            </section>

            <div className="flex justify-end">
              <button
                className="bg-black text-white rounded px-4 py-2 cursor-pointer"
                onClick={createOrders}
              >
                Créer la / les commande(s)
              </button>
            </div>

            {/* HISTORIQUE CLIENT */}
            <section className="p-4 border rounded space-y-2">
              <h2 className="font-semibold mb-2">Données client</h2>
              {orders.length > 0 ? (
                <>
                  <div className="text-sm bg-gray-50 border rounded p-3">
                    <p>
                      Commandes totales : <b>{orders.length}</b>
                    </p>
                    <p>
                      Montant total :{" "}
                      <b>
                        {orders
                          .reduce((acc, o) => acc + (o.price_total || 0), 0)
                          .toFixed(2)}{" "}
                        €
                      </b>
                    </p>
                    <p>
                      Dernière commande :{" "}
                      <b>
                        {orders[0].created_at
                          ? new Date(orders[0].created_at).toLocaleString()
                          : "—"}
                      </b>
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {orders.map((o) => (
                      <li key={o.id} className="border rounded p-2 text-sm">
                        <div>
                          <b>Type:</b> {o.service_type} — <b>Prix:</b> €
                          {o.price_total} — <b>Statut:</b> {o.status}
                        </div>

                        <div className="text-xs text-gray-700 mt-1">
                          <b>Règlement :</b>{" "}
                          {o.status !== "terminee"
                            ? "À régler"
                            : o.payment_method === "cash"
                            ? "Espèces"
                            : o.payment_method === "card"
                            ? "CB"
                            : "Non renseigné"}
                        </div>

                        <div className="truncate">
                          <b>Pickup:</b> {o.pickup_address}
                        </div>
                        <div className="truncate">
                          <b>Dropoff:</b> {o.dropoff_address}
                        </div>

                        {o.express ? (
                          <div className="text-red-500 text-xs">Express</div>
                        ) : null}

                        {o.validation_code ? (
                          <div className="text-xs text-gray-500">
                            Code validation : {o.validation_code}
                          </div>
                        ) : null}

                        {typeof o.wants_invoice === "boolean" && (
                          <div className="text-xs">
                            Facture demandée :{" "}
                            <span
                              className={
                                o.wants_invoice
                                  ? "text-green-600 font-semibold"
                                  : "text-red-600 font-semibold"
                              }
                            >
                              {o.wants_invoice ? "oui" : "non"}
                            </span>
                          </div>
                        )}

                        {o.status === "terminee" && o.wants_invoice && (
                          <div className="mt-1">
                            <Link
                              href={`/operateur/facture/${o.id}`}
                              target="_blank"
                              className="inline-block text-xs bg-black text-white rounded px-2 py-1 mt-1 cursor-pointer"
                            >
                              Voir / imprimer la facture
                            </Link>
                          </div>
                        )}

                        <div className="text-gray-500">
                          {o.created_at
                            ? new Date(o.created_at).toLocaleString()
                            : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  Aucune commande pour ce client pour le moment.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}