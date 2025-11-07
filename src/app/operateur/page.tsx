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
  startAt,
  endAt,
} from "firebase/firestore";

/* ===================== Services ===================== */
type ServiceDef = { id: string; label: string; base: number; type: "flat" | "hour" };
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

/* =================== Types Firestore =================== */
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
  status: "pending" | "assigned" | "picked" | "delivered" | "cancelled";
  created_at?: any;
  scheduled_at?: any;
  day?: string | null;
  time_slot?: string | null;
  express?: boolean;
  validation_code?: string | null;
};

/* ============== Lignes de service (multi-commandes) ============== */
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

/* =================== PAGE =================== */
export default function OperatorDashboard() {
  /* ---- état auth ---- */
  const [meEmail, setMeEmail] = useState<string | null>(null);
  useEffect(() => {
    setMeEmail(auth.currentUser?.email ?? null);
  }, []);

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
  const [expressNote, setExpressNote] = useState("⚡ Livraison express, traiter en priorité.");
  const [validationCode, setValidationCode] = useState(""); // <- NOUVEAU
  const [orders, setOrders] = useState<Order[]>([]);

  /* ---- PLANIFIER ---- */
  const [scheduledAt, setScheduledAt] = useState("");
  const [availableCouriers, setAvailableCouriers] = useState<{ id: string; name?: string }[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState("");

  /* =================== AUTOCOMPLETE TÉLÉPHONE =================== */
  useEffect(() => {
    if (phone.trim().length < 3) {
      setPhoneSuggestions([]);
      return;
    }
    let isCancelled = false;
    (async () => {
      const col = collection(db, "customers");
      const qCust = query(
        col,
        orderBy("phone"),
        startAt(phone),
        endAt(phone + "\uf8ff"),
        limit(5)
      );
      const snap = await getDocs(qCust);
      if (isCancelled) return;
      const results = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Customer[];
      setPhoneSuggestions(results);
    })();
    return () => {
      isCancelled = true;
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
    const res: google.maps.DistanceMatrixResponse = await new Promise((resolve, reject) => {
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
    });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropoff]);

  /* =================== FIRESTORE ACTIONS =================== */

  async function searchCustomer() {
    if (!phone) return setInfo("Saisis un numéro.");
    const qCust = query(collection(db, "customers"), where("phone", "==", phone), limit(1));
    const snap = await getDocs(qCust);
    if (snap.empty) {
      setCustomer(null);
      setInfo("Client introuvable. Complète le formulaire et crée-le.");
      setOrders([]);
      return;
    }
    const d = snap.docs[0];
    fillCustomerFromSuggestion({ id: d.id, ...(d.data() as any) } as Customer);
  }

  async function createOrUpdateCustomer() {
    if (!phone) return setInfo("Saisis d’abord le téléphone.");
    if (customer) {
      await addDoc(collection(db, "customers_updates"), {
        customer_id: customer.id,
        phone,
        first_name: firstName || null,
        last_name: lastName || null,
        address: address || null,
        zipcode: zipcode || null,
        city: city || null,
        preferences: preferences || null,
        updated_at: serverTimestamp(),
      });
      setInfo("Client mis à jour ✅");
    } else {
      const ref = await addDoc(collection(db, "customers"), {
        phone,
        first_name: firstName || null,
        last_name: lastName || null,
        address: address || null,
        zipcode: zipcode || null,
        city: city || null,
        preferences: preferences || null,
        created_at: serverTimestamp(),
      });
      const c: Customer = {
        id: ref.id,
        phone,
        first_name: firstName || null,
        last_name: lastName || null,
        address: address || null,
        zipcode: zipcode || null,
        city: city || null,
        preferences: preferences || null,
      };
      setCustomer(c);
      setInfo("Client créé ✅");
    }
    const drop = [address, zipcode, city].filter(Boolean).join(" ");
    if (drop) setDropoff(drop);
  }

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

  async function findAvailableCouriers() {
    if (!scheduledAt) {
      setInfo("Choisis d’abord une date/heure.");
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
    setInfo(`${results.length} livreur(s) disponible(s) trouvés ✅`);
  }

  // total = ligne la plus chère + les autres + 12 si express
  const totalToBill = (() => {
    if (lines.length === 0) return 0;
    const prices = lines.map((l) => l.price || 0);
    const maxLine = Math.max(...prices);
    const sumOther = prices.reduce((acc, p) => acc + p, 0) - maxLine;
    const expressExtra = express ? 12 : 0;
    return Math.round((maxLine + sumOther + expressExtra) * 100) / 100;
  })();

  // génère un code à 4 chiffres
  function generateCode() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setValidationCode(code);
  }

  async function createOrders() {
    if (!customer) return setInfo("Sélectionne/crée d’abord un client.");
    if (!dropoff) return setInfo("Saisis l’adresse de livraison.");
    const scheduled_at = scheduledAt ? new Date(scheduledAt) : null;

    for (const l of lines) {
      const payload: any = {
        customer_id: customer.id,
        created_by: auth.currentUser?.uid || null,
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
        created_at: serverTimestamp(),
      };

      if (validationCode) {
        // on met le même code sur toutes les commandes de ce lot
        payload.validation_code = validationCode;
      }

      const orderRef = await addDoc(collection(db, "orders"), payload);

      if (selectedCourierId) {
        await addDoc(collection(db, "assignments"), {
          order_id: orderRef.id,
          courier_id: selectedCourierId,
          scheduled_at,
          assigned_at: serverTimestamp(),
          status: "assigned",
        });
      }
    }

    setInfo("Commande(s) créée(s) ✅");
    setLines([newLine()]);
    setAccessInfo("");
    setScheduledAt("");
    setSelectedCourierId("");
    setValidationCode("");
    if (customer?.id) await loadOrders(customer.id);
  }

  /* =================== UI =================== */
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

        {/* Recherche client */}
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
            className="mt-2 bg-black text-white rounded px-3 py-1"
            onClick={searchCustomer}
          >
            Rechercher
          </button>
          <p className="text-sm mt-2">{info}</p>
        </section>

        {/* Fiche client */}
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
            className="bg-black text-white rounded px-3 py-2 w-max"
            onClick={createOrUpdateCustomer}
          >
            Créer / mettre à jour le client
          </button>
        </section>

        {/* Nouvelle commande */}
        <section className="p-4 border rounded space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Nouvelle commande</h2>
            <button
              className="text-sm border rounded px-2 py-1"
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
                    className="text-xs text-red-500"
                    onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))}
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
                      prev.map((x) => (x.id === l.id ? { ...x, serviceType: val } : x))
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
                    setLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, pickup: v } : x)))
                  }
                  onPlace={(p) => {
                    const full =
                      (p.name ? p.name + " — " : "") + (p.formatted_address || p.name || "");
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
                    if (dropoff) {
                      computeDistanceForLine(
                        {
                          ...l,
                          pickup: full,
                        },
                        dropoff
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
                    prev.map((x) => (x.id === l.id ? { ...x, notes: e.target.value } : x))
                  )
                }
              />
              <p className="text-sm text-gray-700">
                Distance estimée :{" "}
                {l.distanceKm ? `${l.distanceKm} km` : "— pas encore calculé —"} • Prix ligne :{" "}
                {l.price ? `${l.price} €` : "—"}
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
              className="border rounded px-3 py-1 text-sm"
            >
              Générer un code
            </button>
            <span className="text-xs text-gray-500">
              (à communiquer au client → le coursier le saisira)
            </span>
          </div>

          <div className="p-3 bg-gray-50 border rounded">
            <b>Total à facturer :</b>{" "}
            {totalToBill ? `${totalToBill.toFixed(2)} €` : "— (attend adresses/distance) —"}
          </div>
        </section>

        {/* Planifier */}
        <section className="p-4 border rounded space-y-3">
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
          </div>
          {availableCouriers.length > 0 && (
            <select
              className="border rounded p-2 w-full max-w-sm"
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
            >
              <option value="">— choisir un livreur —</option>
              {availableCouriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
          )}
        </section>

        {/* bouton séparé */}
        <div className="flex justify-end">
          <button
            className="bg-black text-white rounded px-4 py-2"
            onClick={createOrders}
          >
            Créer la / les commande(s)
          </button>
        </div>

        {/* Statistiques + historique client */}
        <section className="p-4 border rounded space-y-2">
          <h2 className="font-semibold mb-2">Données client</h2>
          {orders.length > 0 ? (
            <>
              {/* stats calculées ici */}
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
                    {orders[0].created_at?.toDate
                      ? orders[0].created_at.toDate().toLocaleString()
                      : "—"}
                  </b>
                </p>
              </div>
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
                    {o.express ? <div className="text-red-500 text-xs">Express</div> : null}
                    {o.validation_code ? (
                      <div className="text-xs text-gray-500">
                        Code validation : {o.validation_code}
                      </div>
                    ) : null}
                    <div className="text-gray-500">
                      {o.created_at?.toDate ? o.created_at.toDate().toLocaleString() : ""}
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
      </main>
    </>
  );
}