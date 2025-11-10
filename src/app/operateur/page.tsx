"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { supabase } from "../_lib/supabaseClient";

/* ===================== Services ===================== */
type ServiceDef = {
  id: string;
  label: string;
  base: number;
  type: "flat" | "hour";
};
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
  { id: "diy", label: "Bricolage (50€/h)", base: 50, type: "hour" },
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
    const ac = new (window as any).google.maps.places.Autocomplete(inputRef.current!, {
      fields: ["formatted_address", "name", "geometry", "place_id"],
      componentRestrictions: { country: ["fr"] },
    });
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

export default function OperatorDashboard() {
  /* ---- opérateur connecté ---- */
  const [meEmail, setMeEmail] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMeEmail(data.user?.email ?? null);
    })();
  }, []);

  /* ---- demandes de coursiers ---- */
  const [signups, setSignups] = useState<any[]>([]);
  const [signupMsg, setSignupMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("courier_signups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement signups:", error.message);
      } else {
        setSignups(data || []);
      }
    })();
  }, []);

  // ⬇⬇⬇ MODIFIÉ ICI
  async function updateSignupStatus(s: any, status: "approved" | "rejected") {
    setSignupMsg("");

    // 1) on met à jour la table
    const { error } = await supabase
      .from("courier_signups")
      .update({ status })
      .eq("id", s.id);

    if (error) {
      setSignupMsg("Erreur: " + error.message);
      return;
    }

    // 2) si on approuve -> appel de la route API pour créer le compte Auth
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
        setSignupMsg("Coursier validé dans la table, mais création du compte KO: " + json.error);
      } else {
        setSignupMsg(
          `Coursier validé ✅ mot de passe provisoire : ${json.password}`
        );
      }
    } else {
      setSignupMsg("Demande refusée ❌");
    }

    // 3) refresh local
    setSignups((prev) => prev.map((x) => (x.id === s.id ? { ...x, status } : x)));
  }
  // ⬆⬆⬆ FIN MODIF

  /* ---- CLIENT ---- */
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

  /* ---- COMMANDES ---- */
  const [lines, setLines] = useState<ServiceLine[]>([newLine()]);
  const [dropoff, setDropoff] = useState("");
  const [accessInfo, setAccessInfo] = useState("");
  const [express, setExpress] = useState(false);
  const [expressNote, setExpressNote] = useState(
    "⚡ Livraison express, traiter en priorité."
  );
  const [validationCode, setValidationCode] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  /* ---- PLANIFIER ---- */
  const [scheduledAt, setScheduledAt] = useState("");
  const [availableCouriers, setAvailableCouriers] = useState<
    { courier_id: string; name?: string | null }[]
  >([]);
  const [selectedCourierId, setSelectedCourierId] = useState("");

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

  /* =================== PRIX & DISTANCE =================== */
  function priceFor(serviceType: string, km: number) {
    const s = getService(serviceType);
    if (!s) return 0;
    if (s.type === "hour") return s.base;
    const extra = Math.max(0, km - 1) * 1;
    return Math.round((s.base + extra) * 100) / 100;
  }

  async function computeDistanceForLine(line: ServiceLine, drop: string) {
    if (!line.pickup || !drop) return;
    const g = (window as any).google;
    if (!g?.maps?.DistanceMatrixService) return;
    const svc = new g.maps.DistanceMatrixService();
    const res: google.maps.DistanceMatrixResponse = await new Promise(
      (resolve, reject) => {
        svc.getDistanceMatrix(
          {
            origins: [line.pickup],
            destinations: [drop],
            travelMode: g.maps.TravelMode.DRIVING,
            unitSystem: g.maps.UnitSystem.METRIC,
          },
          (response: any, status: any) => {
            if (status === "OK") resolve(response);
            else reject(status);
          }
        );
      }
    );
    const meters = res.rows?.[0]?.elements?.[0]?.distance?.value ?? 0;
    const km = Math.round((meters / 1000) * 100) / 100;
    const newPrice = priceFor(line.serviceType, km);
    setLines((prev) =>
      prev.map((l) => (l.id === line.id ? { ...l, distanceKm: km, price: newPrice } : l))
    );
  }

  useEffect(() => {
    if (!dropoff) return;
    lines.forEach((l) => {
      if (l.pickup) computeDistanceForLine(l, dropoff);
    });
  }, [dropoff, lines]);

  /* =================== SUPABASE ACTIONS =================== */

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
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(error);
      setOrders([]);
    } else {
      setOrders((data as Order[]) || []);
    }
  }

  async function findAvailableCouriers() {
    if (!scheduledAt) {
      setInfo("Choisis d’abord une date/heure.");
      return;
    }
    const atIso = new Date(scheduledAt).toISOString();

    const { data, error } = await supabase
      .from("availabilities")
      .select("*")
      .lte("start", atIso)
      .gte("end", atIso);

    if (error) {
      setInfo("Erreur chargement livreurs : " + error.message);
      return;
    }

    const list = (data || []).map((a: any) => ({
      courier_id: a.courier_id as string,
      name: a.courier_name || null,
    }));
    setAvailableCouriers(list);
    setInfo(`${list.length} livreur(s) disponible(s) trouvés ✅`);
  }

  const totalToBill = (() => {
    if (lines.length === 0) return 0;
    const prices = lines.map((l) => l.price || 0);
    const maxLine = Math.max(...prices);
    const sumOther = prices.reduce((acc, p) => acc + p, 0) - maxLine;
    const expressExtra = express ? 12 : 0;
    return Math.round((maxLine + sumOther + expressExtra) * 100) / 100;
  })();

  function generateCode() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setValidationCode(code);
  }

  async function createOrders() {
    if (!customer) {
      setInfo("Sélectionne/crée d’abord un client.");
      return;
    }
    if (!dropoff) {
      setInfo("Saisis l’adresse de livraison.");
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

      const { data: insertedOrder, error: orderErr } = await supabase
        .from("orders")
        .insert([payload])
        .select()
        .single();

      if (orderErr) {
        setInfo("Erreur création commande : " + orderErr.message);
        continue;
      }

      if (selectedCourierId && insertedOrder) {
        const { error: assignErr } = await supabase.from("assignments").insert([
          {
            order_id: insertedOrder.id,
            courier_id: selectedCourierId,
            scheduled_at,
            assigned_at: new Date().toISOString(),
            status: "assigned",
          },
        ]);
        if (assignErr) console.warn("assign error", assignErr);
      }

      await supabase.from("events").insert([
        {
          type: "order_created",
          order_id: insertedOrder?.id,
          by_email: meEmail,
          at: new Date().toISOString(),
        },
      ]);
    }

    setInfo("Commande(s) créée(s) ✅");
    setLines([newLine()]);
    setAccessInfo("");
    setScheduledAt("");
    setSelectedCourierId("");
    setValidationCode("");
    await loadOrders(customer.id);
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GMAPS_API_KEY}&libraries=places&language=fr`}
        strategy="afterInteractive"
      />

      <main className="max-w-3xl mx-auto p-6 font-sans space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Espace opérateur</h1>
          <p className="text-sm text-gray-600">Connecté : {meEmail ?? "—"}</p>
        </header>

        {/* demandes coursiers */}
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
                      {s.created_at ? new Date(s.created_at).toLocaleString() : ""} • statut :{" "}
                      {s.status}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateSignupStatus(s, "approved")}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
                      disabled={s.status === "approved"}
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => updateSignupStatus(s, "rejected")}
                      className="text-xs bg-red-500 text-white px-3 py-1 rounded disabled:opacity-50"
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

        {/* le reste de ta page (client, commande, planifier, historique) je laisse tel quel */}
        {/* ... (tout ce que tu avais déjà) ... */}
      </main>
    </>
  );
}