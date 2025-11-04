"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { auth, db } from "@/app/_lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

/* ============ services dispo ============ */
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
  { id: "shopping", label: "Achat en boutique (8€)", base: 8, type: "flat" },
  { id: "concierge", label: "Conciergerie (12€)", base: 12, type: "flat" },
  { id: "express", label: "Express (12€)", base: 12, type: "flat" },
  { id: "eco", label: "Éco (7€)", base: 7, type: "flat" },
  { id: "it", label: "Dépannage informatique (50€/h)", base: 50, type: "hour" },
  { id: "assist", label: "Accompagnement (20€/h)", base: 20, type: "hour" },
  { id: "diy", label: "Bricolage (50€/h)", base: 50, type: "hour" },
  { id: "other", label: "Autre (0€)", base: 0, type: "flat" },
];
const serviceById = (id: string) => SERVICES.find((s) => s.id === id);

/* ============ petit hook pour savoir si Google est là ============ */
function useGoogleLoaded() {
  return typeof window !== "undefined" && !!(window as any).google?.maps?.places;
}

/* ============ input avec autocomplete Google ============ */
type AutoProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onPlace?: (p: google.maps.places.PlaceResult) => void;
};
function AutocompleteInput({ value, onChange, placeholder, className, onPlace }: AutoProps) {
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

      // on passe le place complet si on veut récupérer le nom
      onPlace?.(place as any);
    });
  }, [googleReady, onChange, onPlace]);

  return (
    <input
      ref={inputRef}
      className={className || "border rounded p-2 w-full"}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
    />
  );
}

/* ============ types firestore ============ */
type Customer = {
  id: string;
  phone: string;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  extra_info?: string | null; // ex bâtiment, étage…
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
  status: "pending" | "assigned" | "picked" | "delivered" | "cancelled";
  created_at?: any;
  scheduled_at?: any;
};

/* ============ lignes de commande ============ */
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

/* ============ page ============ */
export default function OperatorDashboard() {
  /* qui est connecté */
  const [meEmail, setMeEmail] = useState<string | null>(null);

  /* recherche client */
  const [phone, setPhone] = useState("");
  const [info, setInfo] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);

  /* formulaire client */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  /* commandes */
  const [lines, setLines] = useState<ServiceLine[]>([newLine()]);
  const [dropoff, setDropoff] = useState("");
  const [accessInfo, setAccessInfo] = useState("");

  /* planning */
  const [scheduledAt, setScheduledAt] = useState("");

  /* livreurs dispo */
  const [availableCouriers, setAvailableCouriers] = useState<{ id: string; name?: string }[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState("");

  /* historique */
  const [orders, setOrders] = useState<Order[]>([]);

  /* récupérer email */
  useEffect(() => {
    setMeEmail(auth.currentUser?.email ?? null);
  }, []);

  /* quand on charge un client → pré-remplir dropoff + infos accès */
  useEffect(() => {
    if (!customer) return;
    const addrParts = [customer.address, customer.postal_code, customer.city].filter(Boolean);
    const full = addrParts.join(" ");
    // si dropoff est vide, on met l'adresse client
    setDropoff((prev) => (prev ? prev : full));
    setAccessInfo(customer.extra_info ?? "");
  }, [customer]);

  /* ====== helpers prix ====== */
  function priceFor(serviceType: string, km: number) {
    const s = serviceById(serviceType);
    if (!s) return 0;
    if (s.type === "hour") return s.base;
    const extra = Math.max(0, km - 1) * 1; // 1€/km au-delà de 1 km
    return Math.round((s.base + extra) * 100) / 100;
  }

  /* ====== calcul distance pour 1 ligne (avec try/catch) ====== */
  async function computeDistanceForLine(line: ServiceLine) {
    // si pas d'adresse pickup ou pas de dropoff → rien
    if (!line.pickup || !dropoff) return;

    const g = (window as any).google;
    if (!g?.maps?.DistanceMatrixService) return;

    try {
      const svc = new g.maps.DistanceMatrixService();
      const res: google.maps.DistanceMatrixResponse = await new Promise((resolve, reject) => {
        svc.getDistanceMatrix(
          {
            origins: [line.pickup],
            destinations: [dropoff],
            travelMode: g.maps.TravelMode.DRIVING,
            unitSystem: g.maps.UnitSystem.METRIC,
          },
          (response: any, status: string) => {
            if (status === "OK") resolve(response);
            else reject(new Error(status));
          }
        );
      });

      const meters = res.rows?.[0]?.elements?.[0]?.distance?.value ?? 0;
      const km = Math.round((meters / 1000) * 100) / 100;
      const newPrice = priceFor(line.serviceType, km);

      setLines((prev) =>
        prev.map((l) => (l.id === line.id ? { ...l, distanceKm: km, price: newPrice } : l))
      );
    } catch (err) {
      // ici on ne montre pas un gros panneau, on log juste
      console.warn(
        "Impossible de calculer la distance (clé Google pas autorisée sur Distance Matrix ?)",
        err
      );
    }
  }

  /* recalcul quand dropoff change */
  useEffect(() => {
    lines.forEach((l) => {
      void computeDistanceForLine(l);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropoff]);

  /* recalcul quand on change une ligne (adresse ou service) */
  useEffect(() => {
    lines.forEach((l) => {
      void computeDistanceForLine(l);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines.map((l) => ({ id: l.id, pickup: l.pickup, service: l.serviceType })))]);

  /* total = prix de la ligne la plus chère + 1€/km pour la distance totale du parcours */
  const totalToBill = (() => {
    if (lines.length === 0) return 0;
    const maxLine = Math.max(...lines.map((l) => l.price || 0));
    const totalKm = lines.reduce((sum, l) => sum + (l.distanceKm || 0), 0);
    const extraKm = Math.max(0, totalKm - 1); // même logique
    return Math.round((maxLine + extraKm * 1) * 100) / 100;
  })();

  /* ========= firestore actions ========= */

  // chercher client
  async function searchCustomer() {
    if (!phone) return setInfo("Saisis un numéro.");
    setInfo("Recherche…");
    const qCust = query(collection(db, "customers"), where("phone", "==", phone), limit(1));
    const snap = await getDocs(qCust);
    if (snap.empty) {
      setCustomer(null);
      setInfo("Client introuvable. Complète le formulaire et crée-le.");
      setOrders([]);
      return;
    }
    const d = snap.docs[0];
    const c = { id: d.id, ...(d.data() as any) } as Customer;
    setCustomer(c);
    setInfo("Client trouvé ✅");
    await loadOrders(c.id);
  }

  // créer / maj client
  async function createOrUpdateCustomer() {
    if (!phone) return setInfo("Saisis d’abord le téléphone.");

    if (customer) {
      // mise à jour
      await addDoc(collection(db, "customers_updates"), {
        customer_id: customer.id,
        phone,
        first_name: firstName || customer.first_name || null,
        last_name: lastName || customer.last_name || null,
        address: address || customer.address || null,
        postal_code: postalCode || customer.postal_code || null,
        city: city || customer.city || null,
        extra_info: extraInfo || customer.extra_info || null,
        updated_at: serverTimestamp(),
      });
      setInfo("Client mis à jour ✅");
      return;
    }

    // création
    const ref = await addDoc(collection(db, "customers"), {
      phone,
      first_name: firstName || null,
      last_name: lastName || null,
      address: address || null,
      postal_code: postalCode || null,
      city: city || null,
      extra_info: extraInfo || null,
      created_at: serverTimestamp(),
    });

    const newCustomer: Customer = {
      id: ref.id,
      phone,
      first_name: firstName || null,
      last_name: lastName || null,
      address: address || null,
      postal_code: postalCode || null,
      city: city || null,
      extra_info: extraInfo || null,
    };
    setCustomer(newCustomer);
    setInfo("Client créé ✅");
    setFirstName("");
    setLastName("");
    setAddress("");
    setPostalCode("");
    setCity("");
    setExtraInfo("");
    await loadOrders(ref.id);
  }

  // charger commandes
  async function loadOrders(customerId: string) {
    const qOrders = query(
      collection(db, "orders"),
      where("customer_id", "==", customerId),
      orderBy("created_at", "desc")
    );
    const snap = await getDocs(qOrders);
    const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Order[];
    setOrders(data);
  }

  // dispo livreurs
  async function findAvailableCouriers() {
    if (!scheduledAt) {
      setInfo("Choisis d’abord une date / heure.");
      return;
    }
    const at = new Date(scheduledAt);
    const qAvail = query(collection(db, "availabilities"), where("start", "<=", at));
    const snap = await getDocs(qAvail);
    const candidates = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((a) => {
        const endVal = a.end?.toDate ? a.end.toDate() : new Date(a.end);
        return endVal && endVal >= at;
      });

    const results: { id: string; name?: string }[] = [];
    for (const a of candidates) {
      const courierId = a.courier_id as string;
      if (!courierId) continue;
      const cRef = doc(db, "couriers", courierId);
      const cSnap = await getDoc(cRef);
      const cData = cSnap.exists() ? (cSnap.data() as any) : null;
      results.push({ id: courierId, name: cData?.displayName || cData?.name || courierId });
    }
    setAvailableCouriers(results);
    setInfo(`${results.length} livreur(s) dispo ✅`);
  }

  // créer commandes (1 doc par ligne)
  async function createOrders() {
    if (!customer) return setInfo("Sélectionne / crée un client d’abord.");
    if (!dropoff) return setInfo("Adresse de livraison obligatoire.");
    const sched = scheduledAt ? new Date(scheduledAt) : null;

    for (const l of lines) {
      const orderPayload = {
        customer_id: customer.id,
        created_by: auth.currentUser?.uid || null,
        service_type: l.serviceType,
        pickup_address: l.pickup,
        pickup_place_name: l.pickupName || null,
        dropoff_address: dropoff,
        access_info: accessInfo || null,
        notes: l.notes || null,
        distance_km: l.distanceKm || 0,
        price_total: l.price || 0,
        status: selectedCourierId ? "assigned" : "pending",
        scheduled_at: sched,
        created_at: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(db, "orders"), orderPayload);

      if (selectedCourierId) {
        await addDoc(collection(db, "assignments"), {
          order_id: orderRef.id,
          courier_id: selectedCourierId,
          scheduled_at: sched,
          assigned_at: serverTimestamp(),
          status: "assigned",
        });
      }
    }

    setInfo(`Commande${lines.length > 1 ? "s" : ""} créée${lines.length > 1 ? "s" : ""} ✅`);
    setLines([newLine()]);
    setSelectedCourierId("");
    if (customer?.id) await loadOrders(customer.id);
  }

  /* ======== UI ======== */
  return (
    <>
      {/* Google Maps (Places + Distance Matrix) */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GMAPS_API_KEY}&libraries=places&language=fr`}
        strategy="afterInteractive"
      />

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Espace opérateur</h1>
          <p className="text-sm text-gray-600">Connecté : {meEmail ?? "—"}</p>
        </header>

        {/* recherche client */}
        <section className="p-4 border rounded space-y-2">
          <h2 className="font-semibold">Recherche client par téléphone</h2>
          <div className="flex gap-2">
            <input
              className="border rounded p-2 flex-1"
              placeholder="+336..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button className="bg-black text-white px-4 rounded" onClick={searchCustomer}>
              Rechercher
            </button>
          </div>
          <p className="text-sm">{info}</p>
        </section>

        {/* client */}
        <section className="p-4 border rounded space-y-2">
          <h2 className="font-semibold">Client</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="border rounded p-2"
              placeholder="Prénom"
              value={customer?.first_name ?? firstName}
              onChange={(e) =>
                customer ? setCustomer({ ...customer, first_name: e.target.value }) : setFirstName(e.target.value)
              }
            />
            <input
              className="border rounded p-2"
              placeholder="Nom"
              value={customer?.last_name ?? lastName}
              onChange={(e) =>
                customer ? setCustomer({ ...customer, last_name: e.target.value }) : setLastName(e.target.value)
              }
            />
          </div>
          <input
            className="border rounded p-2 w-full"
            placeholder="Adresse"
            value={customer?.address ?? address}
            onChange={(e) =>
              customer ? setCustomer({ ...customer, address: e.target.value }) : setAddress(e.target.value)
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="border rounded p-2"
              placeholder="Code postal"
              value={customer?.postal_code ?? postalCode}
              onChange={(e) =>
                customer ? setCustomer({ ...customer, postal_code: e.target.value }) : setPostalCode(e.target.value)
              }
            />
            <input
              className="border rounded p-2"
              placeholder="Ville"
              value={customer?.city ?? city}
              onChange={(e) =>
                customer ? setCustomer({ ...customer, city: e.target.value }) : setCity(e.target.value)
              }
            />
          </div>
          <input
            className="border rounded p-2 w-full"
            placeholder="Infos complémentaires (bâtiment, étage, digicode...)"
            value={customer?.extra_info ?? extraInfo}
            onChange={(e) =>
              customer ? setCustomer({ ...customer, extra_info: e.target.value }) : setExtraInfo(e.target.value)
            }
          />
          <button
            className="bg-black text-white px-4 py-2 rounded w-max"
            onClick={createOrUpdateCustomer}
          >
            Créer / mettre à jour le client
          </button>
        </section>

        {/* nouvelle commande (lignes) */}
        <section className="p-4 border rounded space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Nouvelle commande</h2>
            <button
              className="text-sm border px-3 py-1 rounded"
              onClick={() => setLines((prev) => [...prev, newLine()])}
            >
              + Ajouter une ligne
            </button>
          </div>

          {lines.map((l, idx) => (
            <div key={l.id} className="border rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Ligne #{idx + 1}</p>
                {lines.length > 1 && (
                  <button
                    className="text-red-600 text-sm"
                    onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}
                  >
                    supprimer
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-2">
                <select
                  className="border rounded p-2"
                  value={l.serviceType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, serviceType: val } : x)));
                    void computeDistanceForLine({ ...l, serviceType: val });
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
                  onChange={(v) => setLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, pickup: v } : x)))}
                  onPlace={(p) => {
                    const full =
                      (p.name ? p.name + " — " : "") + (p.formatted_address ?? "");
                    setLines((prev) =>
                      prev.map((x) =>
                        x.id === l.id
                          ? {
                              ...x,
                              pickup: full,
                              pickupName: p.name || "",
                            }
                          : x
                      )
                    );
                    void computeDistanceForLine({
                      ...l,
                      pickup: full,
                    });
                  }}
                />
              </div>

              <textarea
                className="border rounded p-2 w-full min-h-16"
                placeholder="Notes (ex. récupérer drive, étage, code...)"
                value={l.notes}
                onChange={(e) =>
                  setLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, notes: e.target.value } : x)))
                }
              />

              <p className="text-sm text-gray-700">
                Distance estimée :{" "}
                {l.distanceKm ? `${l.distanceKm} km` : "— pas encore calculé —"} • Prix ligne :{" "}
                {l.price ? `${l.price} €` : "—"}
              </p>
            </div>
          ))}

          <div>
            <label className="block text-sm text-gray-600 mb-1">Adresse de livraison (dropoff)</label>
            <AutocompleteInput
              placeholder="Adresse client"
              value={dropoff}
              onChange={setDropoff}
              onPlace={(p) => setDropoff(p.formatted_address || p.name || "")}
            />
          </div>

          <textarea
            className="border rounded p-2 w-full min-h-16"
            placeholder="Indications d’accès / infos supplémentaires"
            value={accessInfo}
            onChange={(e) => setAccessInfo(e.target.value)}
          />

          <div className="p-3 bg-gray-50 border rounded">
            <b>Total à facturer :</b>{" "}
            {totalToBill ? `${totalToBill.toFixed(2)} €` : "—"}
          </div>
        </section>

        {/* planifier */}
        <section className="p-4 border rounded space-y-2">
          <h2 className="font-semibold">Planifier</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="datetime-local"
              className="border rounded p-2"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <button className="border rounded px-3 py-2" onClick={findAvailableCouriers}>
              Voir livreurs disponibles
            </button>
            {availableCouriers.length > 0 && (
              <select
                className="border rounded p-2"
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
              >
                <option value="">— Livreur —</option>
                {availableCouriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}
                  </option>
                ))}
              </select>
            )}
          </div>
        </section>

        {/* bouton final */}
        <section className="p-4 border rounded">
          <button className="bg-black text-white px-4 py-2 rounded" onClick={createOrders}>
            Créer la / les commande(s)
          </button>
        </section>

        {/* historique */}
        <section className="p-4 border rounded space-y-2">
          <h2 className="font-semibold">Commandes du client</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune commande.</p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="border rounded p-2 text-sm">
                  <div>
                    <b>Type:</b> {o.service_type} — <b>Prix:</b> €{o.price_total} —{" "}
                    <b>Statut:</b> {o.status}
                  </div>
                  <div className="truncate">
                    <b>Pickup:</b> {o.pickup_address}
                  </div>
                  <div className="truncate">
                    <b>Dropoff:</b> {o.dropoff_address}
                  </div>
                  <div className="text-gray-500">
                    {o.created_at?.toDate ? o.created_at.toDate().toLocaleString() : ""}
                    {o.scheduled_at?.toDate
                      ? ` • Planifiée: ${o.scheduled_at.toDate().toLocaleString()}`
                      : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}