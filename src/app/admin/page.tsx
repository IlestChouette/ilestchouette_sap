"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../_lib/supabaseClient";
import type { HeatPoint } from "./AdminMap";

const AdminMap = dynamic(() => import("./AdminMap"), { ssr: false });

/* ─── Auth ─────────────────────────────────────────── */
// Credentials stored server-side only (env vars) — never in client code

/* ─── Types ─────────────────────────────────────────── */
type Order = {
  id: string;
  service_type: string;
  pickup_address: string;
  dropoff_address: string;
  price_total: number;
  status: string;
  created_at: string;
  express: boolean | null;
  distance_km: number | null;
  dropoff_lat: number | null;
  dropoff_lon: number | null;
  pickup_lat: number | null;
  pickup_lon: number | null;
  customer_id: string | null;
};

type Assignment = {
  id: string;
  order_id: string;
  courier_email: string;
  status: string;
  assigned_at: string | null;
  payment_method: string | null;
};

type Courier = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  blocked: boolean | null;
};

type Customer = {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  zipcode: string | null;
  city: string | null;
  preferences: string | null;
  created_at: string;
};

/* ─── Constantes ─────────────────────────────────────── */
const SERVICES: Record<string, string> = {
  supermarket: "Supermarché",
  meds: "Médicaments",
  food: "Nourriture",
  keys: "Clés/Objets",
  shopping: "Achats",
  concierge: "Conciergerie",
  express: "Express",
  eco: "Éco",
  it: "Informatique",
  assist: "Accompagnement",
  bricolage: "Bricolage",
  voiturier: "Voiturier",
  other: "Autre",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#eab308",
  assigned: "#3b82f6",
  acceptee: "#6366f1",
  en_route: "#8b5cf6",
  terminee: "#22c55e",
  annulee: "#9ca3af",
  refusee: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  assigned: "Assignée",
  acceptee: "Acceptée",
  en_route: "En route",
  terminee: "Terminée",
  annulee: "Annulée",
  refusee: "Refusée",
};

const CHART_COLORS = [
  "#1B5E9B", "#f97316", "#22c55e", "#8b5cf6",
  "#eab308", "#ef4444", "#06b6d4", "#ec4899",
  "#84cc16", "#f59e0b", "#6366f1", "#14b8a6",
];

function fmtEuro(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}
function fmtMonth(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}
function nowMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function isoMonth(iso: string) {
  return iso.slice(0, 7);
}

/* ─── KPI Card ───────────────────────────────────────── */
function KpiCard({
  label,
  value,
  sub,
  color = "blue",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "blue" | "green" | "orange" | "purple";
}) {
  const bg = {
    blue: "from-blue-600 to-blue-800",
    green: "from-emerald-500 to-emerald-700",
    orange: "from-orange-500 to-orange-700",
    purple: "from-violet-600 to-violet-800",
  }[color];
  return (
    <div className={`bg-gradient-to-br ${bg} rounded-2xl p-5 text-white shadow-lg`}>
      <p className="text-sm opacity-80 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Section wrapper ────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-5">{title}</h2>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════ */
export default function AdminPage() {
  /* ─── Auth ─── */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState("");

  // Vérification via cookie httpOnly (sécurisé, non bypassable via console)
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => { if (r.ok) setAuthed(true); })
      .catch(() => {});
  }, []);

  async function handleLogin() {
    setAuthErr("");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (res.ok) {
        setAuthed(true);
      } else {
        setAuthErr("Email ou mot de passe incorrect.");
      }
    } catch {
      setAuthErr("Erreur de connexion.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/check", { method: "DELETE" });
    setAuthed(false);
  }

  /* ─── Data ─── */
  const [orders, setOrders] = useState<Order[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
  const [merchantProducts, setMerchantProducts] = useState<Record<string, any[]>>({});

  async function loadMerchantProducts(merchantId: string) {
    if (merchantProducts[merchantId]) { setExpandedMerchant(merchantId); return; }
    const { data } = await supabase.from("merchant_products").select("*").eq("merchant_id", merchantId).order("category");
    setMerchantProducts((prev) => ({ ...prev, [merchantId]: data ?? [] }));
    setExpandedMerchant(merchantId);
  }

  /* ─── Client modal ─── */
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);

  /* ─── Cancel modal ─── */
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  /* ─── Comptabilité ─── */
  const [edlMissions, setEdlMissions] = useState<{ montant_ht: number; date_paiement: string | null; paye: boolean }[]>([]);
  const [compta, setCompta] = useState<{ recetes: Record<string, string>[]; depenses: Record<string, string>[] } | null>(null);
  const [comptaTab, setComptaTab] = useState<"resume" | "recetes" | "depenses">("resume");
  const [comptaLoading, setComptaLoading] = useState(false);
  const [comptaYear, setComptaYear] = useState(new Date().getFullYear().toString());

  async function loadCompta() {
    setComptaLoading(true);
    try {
      const [res, { data: edl }] = await Promise.all([
        fetch("/api/sheets"),
        supabase.from("edl_missions").select("montant_ht, date_paiement, paye").eq("paye", true),
      ]);
      const data = await res.json();
      setCompta(data);
      setEdlMissions(edl ?? []);
    } catch (e) {
      console.error(e);
    }
    setComptaLoading(false);
  }

  /* ─── Filters ─── */
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCourier, setFilterCourier] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

  /* ─── Fetch data ─── */
  useEffect(() => {
    if (!authed) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/data");
        if (res.ok) {
          const d = await res.json();
          setOrders(d.orders ?? []);
          setAssignments(d.assignments ?? []);
          setCouriers(d.couriers ?? []);
          setCustomers(d.customers ?? []);
          setMerchants(d.merchants ?? []);
        }
      } catch (e) {
        console.error("Erreur chargement admin:", e);
      }
      setLoading(false);
    }

    load();

    // Temps réel
    const ch = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [authed]);

  /* ─── Cancel order ─── */
  async function confirmCancelOrder() {
    if (!cancelOrderId) return;
    const reason = cancelReason.trim() || "admin";
    await supabase.from("orders").update({ status: "annulee", cancellation_reason: reason }).eq("id", cancelOrderId);
    // Annuler aussi les assignments actifs pour que la mission disparaisse de l'app coursier
    await supabase.from("assignments").update({ status: "annulee" }).eq("order_id", cancelOrderId).in("status", ["assigned", "acceptee"]);
    setOrders((prev) => prev.map((o) => o.id === cancelOrderId ? { ...o, status: "annulee" } : o));
    setCancelOrderId(null);
    setCancelReason("");
  }

  /* ─── Block/unblock courier ─── */
  async function toggleBlockCourier(courier: Courier) {
    const newBlocked = !courier.blocked;
    await supabase.from("couriers").update({ blocked: newBlocked }).eq("id", courier.id);
    setCouriers((prev) => prev.map((c) => c.id === courier.id ? { ...c, blocked: newBlocked } : c));
  }

  /* ─── Computed ─── */
  const currentMonth = nowMonth();

  // Exercice fiscal courant : démarre en mai
  const fiscalYearStart = useMemo(() => {
    const now = new Date();
    const fyStartYear = now.getMonth() + 1 >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    return new Date(fyStartYear, 4, 1); // 1er mai
  }, []);

  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "terminee"),
    [orders],
  );

  const caTotalAll = useMemo(
    () => completedOrders.reduce((s, o) => s + (o.price_total ?? 0), 0),
    [completedOrders],
  );

  const ordersThisMonth = useMemo(
    () => orders.filter((o) => isoMonth(o.created_at) === currentMonth),
    [orders, currentMonth],
  );

  const completedThisMonth = useMemo(
    () => completedOrders.filter((o) => isoMonth(o.created_at) === currentMonth),
    [completedOrders, currentMonth],
  );

  const caThisMonth = useMemo(
    () => completedThisMonth.reduce((s, o) => s + (o.price_total ?? 0), 0),
    [completedThisMonth],
  );

  const caThisFiscalYear = useMemo(
    () =>
      completedOrders
        .filter((o) => new Date(o.created_at) >= fiscalYearStart)
        .reduce((s, o) => s + (o.price_total ?? 0), 0),
    [completedOrders, fiscalYearStart],
  );

  const fiscalYearLabel = useMemo(() => {
    const y = fiscalYearStart.getFullYear();
    return `Mai ${y} – Avr ${y + 1}`;
  }, [fiscalYearStart]);

  /* CA par mois (12 derniers mois) */
  const caByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = 0;
    }
    completedOrders.forEach((o) => {
      const m = isoMonth(o.created_at);
      if (m in map) map[m] = (map[m] ?? 0) + (o.price_total ?? 0);
    });
    return Object.entries(map).map(([month, ca]) => ({
      month: fmtMonth(month + "-01"),
      ca: Math.round(ca * 100) / 100,
    }));
  }, [completedOrders]);

  /* CA annuel par exercice fiscal (mai → avril) */
  const caByYear = useMemo(() => {
    const map: Record<string, number> = {};
    completedOrders.forEach((o) => {
      const d = new Date(o.created_at);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-12
      // Si mois < 5 (jan-avr), on appartient à l'exercice de l'année précédente
      const fyStart = m >= 5 ? y : y - 1;
      const key = `${fyStart}-${String(fyStart + 1).slice(-2)}`;
      map[key] = (map[key] ?? 0) + (o.price_total ?? 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, ca]) => ({ year, ca: Math.round(ca * 100) / 100 }));
  }, [completedOrders]);

  /* Commandes par service */
  const byService = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      const svc = SERVICES[o.service_type] ?? o.service_type;
      map[svc] = (map[svc] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [orders]);

  /* Répartition statuts */
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => { map[o.status] = (map[o.status] ?? 0) + 1; });
    return Object.entries(map).map(([status, value]) => ({
      name: STATUS_LABELS[status] ?? status,
      value,
      color: STATUS_COLORS[status] ?? "#9ca3af",
    }));
  }, [orders]);

  /* Paiements coursiers */
  const courierStats = useMemo(() => {
    const courierMap: Record<string, {
      email: string;
      name: string;
      totalMissions: number;
      totalCA: number;
      monthMissions: number;
      monthCA: number;
    }> = {};

    const assignmentOrderMap = Object.fromEntries(
      assignments.map((a) => [a.order_id, a])
    );

    orders.forEach((o) => {
      if (o.status !== "terminee") return;
      const asgn = assignmentOrderMap[o.id];
      if (!asgn) return;
      const email = asgn.courier_email;
      const courier = couriers.find((c) => c.email === email);
      const name = courier
        ? `${courier.first_name ?? ""} ${courier.last_name ?? ""}`.trim() || email
        : email;
      const ca = o.price_total ?? 0;
      const isThisMonth = isoMonth(o.created_at) === currentMonth;

      if (!courierMap[email]) {
        courierMap[email] = { email, name, totalMissions: 0, totalCA: 0, monthMissions: 0, monthCA: 0 };
      }
      courierMap[email].totalMissions++;
      courierMap[email].totalCA += ca;
      if (isThisMonth) {
        courierMap[email].monthMissions++;
        courierMap[email].monthCA += ca;
      }
    });

    return Object.values(courierMap).sort((a, b) => b.totalCA - a.totalCA);
  }, [orders, assignments, couriers, currentMonth]);

  /* Points heatmap */
  const heatPoints = useMemo<HeatPoint[]>(() => {
    const pts: HeatPoint[] = [];
    orders.forEach((o) => {
      if (o.dropoff_lat && o.dropoff_lon)
        pts.push({ lat: o.dropoff_lat, lon: o.dropoff_lon });
      if (o.pickup_lat && o.pickup_lon)
        pts.push({ lat: o.pickup_lat, lon: o.pickup_lon });
    });
    return pts;
  }, [orders]);

  /* Tableau commandes filtré */
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterMonth && isoMonth(o.created_at) !== filterMonth) return false;
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterCourier) {
        const asgn = assignments.find((a) => a.order_id === o.id);
        if (!asgn || asgn.courier_email !== filterCourier) return false;
      }
      if (orderSearch) {
        const q = orderSearch.toLowerCase();
        if (
          !o.pickup_address.toLowerCase().includes(q) &&
          !o.dropoff_address.toLowerCase().includes(q) &&
          !(SERVICES[o.service_type] ?? o.service_type).toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [orders, assignments, filterMonth, filterStatus, filterCourier, orderSearch]);

  /* ─────────────────────────────────────────────────────
     RENDER : écran de login
  ──────────────────────────────────────────────────── */
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <img src="/logo_carre.svg" alt="Il est chouette" className="w-16 h-16 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
            <p className="text-sm text-gray-500 mt-1">Il est Chouette</p>
          </div>
          <input
            className="border border-gray-200 rounded-xl p-3 w-full mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email admin"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <input
            className="border border-gray-200 rounded-xl p-3 w-full mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {authErr && <p className="text-red-500 text-xs mb-3">{authErr}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition"
          >
            Accéder
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────
     RENDER : dashboard
  ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦉</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard Admin</h1>
            <p className="text-xs text-gray-400">Il est Chouette · Temps réel</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://analytics.google.com/analytics/web/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-medium transition"
          >
            📊 Google Analytics
          </a>
          <Link
            href="/operateur"
            className="text-sm text-blue-600 hover:underline"
          >
            Interface opérateur
          </Link>
          <button
            onClick={() => { sessionStorage.removeItem("admin_authed"); setAuthed(false); }}
            className="text-sm text-gray-500 hover:text-red-500 transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-lg">
          Chargement des données…
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard
              label="CA Total"
              value={fmtEuro(caTotalAll)}
              sub="toutes commandes terminées"
              color="blue"
            />
            <KpiCard
              label="CA ce mois"
              value={fmtEuro(caThisMonth)}
              sub={completedThisMonth.length + " commandes"}
              color="green"
            />
            <KpiCard
              label="CA exercice fiscal"
              value={fmtEuro(caThisFiscalYear)}
              sub={fiscalYearLabel}
              color="purple"
            />
            <KpiCard
              label="Commandes totales"
              value={String(orders.length)}
              sub={ordersThisMonth.length + " ce mois"}
              color="orange"
            />
            <KpiCard
              label="Clients"
              value={String(customers.length)}
              sub="inscrits"
              color="purple"
            />
            <KpiCard
              label="Coursiers"
              value={String(couriers.length)}
              sub="enregistrés"
              color="blue"
            />
            <KpiCard
              label="Taux complétion"
              value={
                orders.length > 0
                  ? Math.round((completedOrders.length / orders.length) * 100) + "%"
                  : "—"
              }
              sub={completedOrders.length + " terminées"}
              color="green"
            />
          </div>

          {/* ── CA mensuel ── */}
          <Section title="Chiffre d'affaires — 12 derniers mois">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={caByMonth} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B5E9B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1B5E9B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v + " €"} />
                <Tooltip formatter={(v) => fmtEuro(Number(v))} />
                <Area
                  type="monotone"
                  dataKey="ca"
                  name="CA"
                  stroke="#1B5E9B"
                  strokeWidth={2}
                  fill="url(#gradCA)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Section>

          {/* ── Facturation annuelle + services ── */}
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Facturation par exercice fiscal (mai → avril)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={caByYear} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v + " €"} />
                  <Tooltip formatter={(v) => fmtEuro(Number(v))} />
                  <Bar dataKey="ca" name="CA" fill="#1B5E9B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>

            <Section title="Commandes par service">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={byService}
                  layout="vertical"
                  margin={{ top: 5, right: 20, bottom: 5, left: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={65} />
                  <Tooltip />
                  <Bar dataKey="count" name="Commandes" radius={[0, 6, 6, 0]}>
                    {byService.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>

          {/* ── Statuts ── */}
          <Section title="Répartition des statuts">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ResponsiveContainer width={260} height={220}>
                <PieChart>
                  <Pie
                    data={byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {byStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3">
                {byStatus.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ background: s.color }}
                    />
                    <span className="text-gray-700">{s.name}</span>
                    <span className="font-semibold text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Statut coursiers ── */}
          <Section title="Coursiers">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {couriers.map((c) => {
                const activeMission = assignments.find(
                  (a) => a.courier_email === c.email && a.status === "acceptee"
                );
                const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email;
                const isBlocked = !!c.blocked;
                const isOnMission = !!activeMission;
                const statusLabel = isBlocked ? "Bloqué" : isOnMission ? "En mission" : "Disponible";
                const statusColor = isBlocked
                  ? "bg-red-100 text-red-700"
                  : isOnMission
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700";
                const dot = isBlocked ? "🔴" : isOnMission ? "🟡" : "🟢";

                return (
                  <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.email}</p>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${statusColor}`}>
                        {dot} {statusLabel}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleBlockCourier(c)}
                      className={`ml-3 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                        isBlocked
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-red-500 hover:bg-red-600 text-white"
                      }`}
                    >
                      {isBlocked ? "Débloquer" : "Bloquer"}
                    </button>
                  </div>
                );
              })}
              {couriers.length === 0 && (
                <p className="text-sm text-gray-400 col-span-3 py-4 text-center">Aucun coursier inscrit.</p>
              )}
            </div>
          </Section>

          {/* ── Paiements coursiers ── */}
          <Section title={`Paiements coursiers — ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`}>
            <p className="text-xs text-gray-400 mb-4">Le coursier reçoit 65% du prix de chaque commande terminée.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="pb-3 pr-4">Coursier</th>
                    <th className="pb-3 pr-4 text-right">Missions ce mois</th>
                    <th className="pb-3 pr-4 text-right">CA brut ce mois</th>
                    <th className="pb-3 pr-4 text-right font-bold text-emerald-600">À verser ce mois</th>
                    <th className="pb-3 pr-4 text-right">Missions totales</th>
                    <th className="pb-3 text-right">CA brut total</th>
                  </tr>
                </thead>
                <tbody>
                  {courierStats.map((c) => (
                    <tr key={c.email} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-700">{c.monthMissions}</td>
                      <td className="py-3 pr-4 text-right text-gray-700">{fmtEuro(c.monthCA)}</td>
                      <td className="py-3 pr-4 text-right font-bold text-emerald-600">
                        {fmtEuro(c.monthCA * 0.65)}
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-500">{c.totalMissions}</td>
                      <td className="py-3 text-right text-gray-500">{fmtEuro(c.totalCA)}</td>
                    </tr>
                  ))}
                  {courierStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Aucune mission terminée ce mois.
                      </td>
                    </tr>
                  )}
                  {courierStats.length > 0 && (
                    <tr className="bg-blue-50 font-semibold">
                      <td className="py-3 pr-4 text-blue-900">Total</td>
                      <td className="py-3 pr-4 text-right text-blue-900">
                        {courierStats.reduce((s, c) => s + c.monthMissions, 0)}
                      </td>
                      <td className="py-3 pr-4 text-right text-blue-900">
                        {fmtEuro(courierStats.reduce((s, c) => s + c.monthCA, 0))}
                      </td>
                      <td className="py-3 pr-4 text-right text-emerald-700">
                        {fmtEuro(courierStats.reduce((s, c) => s + c.monthCA * 0.65, 0))}
                      </td>
                      <td className="py-3 pr-4 text-right text-blue-900">
                        {courierStats.reduce((s, c) => s + c.totalMissions, 0)}
                      </td>
                      <td className="py-3 text-right text-blue-900">
                        {fmtEuro(courierStats.reduce((s, c) => s + c.totalCA, 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Heatmap ── */}
          <Section title="Zones d'activité — Heatmap livraisons">
            {heatPoints.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="font-medium">Pas encore de coordonnées GPS enregistrées.</p>
                <p className="text-sm mt-1">La carte se remplira automatiquement avec les nouvelles commandes.</p>
              </div>
            ) : (
              <AdminMap points={heatPoints} />
            )}
          </Section>

          {/* ── Tableau commandes ── */}
          <Section title="Toutes les commandes">
            {/* Filtres */}
            <div className="flex flex-wrap gap-3 mb-5">
              <input
                type="month"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Tous statuts</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filterCourier}
                onChange={(e) => setFilterCourier(e.target.value)}
              >
                <option value="">Tous coursiers</option>
                {couriers.map((c) => (
                  <option key={c.email} value={c.email}>
                    {c.first_name} {c.last_name} ({c.email})
                  </option>
                ))}
              </select>
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Rechercher adresse, service…"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
              {(filterMonth || filterStatus || filterCourier || orderSearch) && (
                <button
                  className="text-sm text-gray-400 hover:text-gray-700 px-2"
                  onClick={() => { setFilterMonth(""); setFilterStatus(""); setFilterCourier(""); setOrderSearch(""); }}
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400 mb-3">
              {filteredOrders.length} commande{filteredOrders.length !== 1 ? "s" : ""}
              {filteredOrders.length !== orders.length && ` sur ${orders.length}`}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Service</th>
                    <th className="pb-3 pr-4">Pickup</th>
                    <th className="pb-3 pr-4">Dropoff</th>
                    <th className="pb-3 pr-4">Coursier</th>
                    <th className="pb-3 pr-4">Statut</th>
                    <th className="pb-3 pr-4 text-right">Prix</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice(0, 100).map((o) => {
                    const asgn = assignments.find((a) => a.order_id === o.id);
                    const courier = asgn
                      ? couriers.find((c) => c.email === asgn.courier_email)
                      : null;
                    const statusConf = STATUS_LABELS[o.status] ?? o.status;
                    const statusColor = STATUS_COLORS[o.status] ?? "#9ca3af";
                    return (
                      <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "short", year: "2-digit",
                          })}
                        </td>
                        <td className="py-3 pr-4 text-gray-800 font-medium">
                          {SERVICES[o.service_type] ?? o.service_type}
                          {o.express && <span className="ml-1 text-red-500 text-xs">⚡</span>}
                        </td>
                        <td className="py-3 pr-4 text-gray-600 max-w-40 truncate">{o.pickup_address}</td>
                        <td className="py-3 pr-4 text-gray-600 max-w-40 truncate">{o.dropoff_address}</td>
                        <td className="py-3 pr-4 text-gray-600">
                          {courier
                            ? `${courier.first_name ?? ""} ${courier.last_name ?? ""}`.trim()
                            : asgn?.courier_email ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: statusColor + "22",
                              color: statusColor,
                            }}
                          >
                            {statusConf}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                          {fmtEuro(o.price_total)}
                        </td>
                        <td className="py-3 text-right">
                          {o.status !== "annulee" && o.status !== "livree" && (
                            <button
                              onClick={() => { setCancelOrderId(o.id); setCancelReason(""); }}
                              className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                            >
                              Annuler
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-400">
                        Aucune commande trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filteredOrders.length > 100 && (
                <p className="text-xs text-center text-gray-400 mt-3">
                  Affichage des 100 premières commandes sur {filteredOrders.length}.
                </p>
              )}
            </div>
          </Section>

          {/* ── Liste clients ── */}
          <Section title={`Clients (${customers.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="pb-3 pr-4">Nom</th>
                    <th className="pb-3 pr-4">Téléphone</th>
                    <th className="pb-3 pr-4">Ville</th>
                    <th className="pb-3 pr-4 text-right">Commandes</th>
                    <th className="pb-3 text-right">CA total</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const cOrders = orders.filter((o) => o.customer_id === c.id);
                    const cCA = cOrders
                      .filter((o) => o.status === "terminee")
                      .reduce((s, o) => s + (o.price_total ?? 0), 0);
                    const name =
                      [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition"
                        onClick={() => setSelectedClient(c)}
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium text-blue-700 hover:underline">{name}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(c.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{c.phone}</td>
                        <td className="py-3 pr-4 text-gray-500">
                          {[c.city, c.zipcode].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="py-3 pr-4 text-right text-gray-700">{cOrders.length}</td>
                        <td className="py-3 text-right font-semibold text-gray-900">
                          {fmtEuro(cCA)}
                        </td>
                      </tr>
                    );
                  })}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        Aucun client enregistré.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Factures ── */}
          <Section title="Factures demandées">
            <p className="text-xs text-gray-400 mb-4">
              Commandes pour lesquelles le client a demandé une facture.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Service</th>
                    <th className="pb-3 pr-4">Client</th>
                    <th className="pb-3 pr-4">Pickup</th>
                    <th className="pb-3 pr-4">Dropoff</th>
                    <th className="pb-3 pr-4">Statut</th>
                    <th className="pb-3 pr-4 text-right">Montant</th>
                    <th className="pb-3 text-center">Facture</th>
                  </tr>
                </thead>
                <tbody>
                  {orders
                    .filter((o) => (o as any).wants_invoice)
                    .map((o) => {
                      const cust = customers.find((c) => c.id === o.customer_id);
                      const custName = cust
                        ? [cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.phone
                        : "—";
                      const statusColor = STATUS_COLORS[o.status] ?? "#9ca3af";
                      return (
                        <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                            {new Date(o.created_at).toLocaleDateString("fr-FR", {
                              day: "2-digit", month: "short", year: "2-digit",
                            })}
                          </td>
                          <td className="py-3 pr-4 font-medium text-gray-800">
                            {SERVICES[o.service_type] ?? o.service_type}
                          </td>
                          <td className="py-3 pr-4 text-gray-700">{custName}</td>
                          <td className="py-3 pr-4 text-gray-500 max-w-36 truncate">
                            {o.pickup_address}
                          </td>
                          <td className="py-3 pr-4 text-gray-500 max-w-36 truncate">
                            {o.dropoff_address}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: statusColor + "22", color: statusColor }}
                            >
                              {STATUS_LABELS[o.status] ?? o.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right font-bold text-gray-900">
                            {fmtEuro(o.price_total)}
                          </td>
                          <td className="py-3 text-center">
                            <a
                              href={`/operateur/facture/${o.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 font-medium transition"
                            >
                              🧾 Voir
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  {orders.filter((o) => (o as any).wants_invoice).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Aucune facture demandée pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Commerçants ── */}
          <Section title={`Commerçants (${merchants.length})`}>
            <div className="space-y-3">
              {merchants.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Aucune demande pour l&apos;instant.</p>
              )}
              {merchants.map((m) => (
                <div key={m.id} className="bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{m.name}</span>
                      <span className="text-xs text-gray-400">{m.category}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        m.status === "active" ? "bg-green-100 text-green-700" :
                        m.status === "rejected" ? "bg-red-100 text-red-500" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {m.status === "active" ? "✓ Actif" : m.status === "rejected" ? "✕ Refusé" : "⏳ En attente"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{m.address}</p>
                    <p className="text-xs text-gray-400">{m.email} {m.phone ? `· ${m.phone}` : ""} {m.siret ? `· SIRET: ${m.siret}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => expandedMerchant === m.id ? setExpandedMerchant(null) : loadMerchantProducts(m.id)}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold px-3 py-1.5 rounded-lg transition">
                      🛍️ {expandedMerchant === m.id ? "Masquer" : "Produits"}
                    </button>
                    {m.phone && (
                      <a href={`https://wa.me/${m.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${m.name}, votre inscription sur Il est chouette a été validée ! Voici vos accès : ilestchouette.fr/commercant/dashboard`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg transition">
                        📱 WA
                      </a>
                    )}
                    {m.status !== "active" && (
                      <button onClick={async () => {
                        await supabase.from("merchants").update({ status: "active" }).eq("id", m.id);
                        setMerchants((prev) => prev.map((x) => x.id === m.id ? { ...x, status: "active" } : x));
                      }} className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1.5 rounded-lg transition">
                        Valider
                      </button>
                    )}
                    {m.status !== "rejected" && (
                      <button onClick={async () => {
                        await supabase.from("merchants").update({ status: "rejected" }).eq("id", m.id);
                        setMerchants((prev) => prev.map((x) => x.id === m.id ? { ...x, status: "rejected" } : x));
                      }} className="text-xs border border-red-200 text-red-500 hover:bg-red-50 font-semibold px-3 py-1.5 rounded-lg transition">
                        Refuser
                      </button>
                    )}
                  </div>
                </div>{/* fin flex row */}
                {/* Panneau produits dépliable */}
                {expandedMerchant === m.id && (
                  <div className="mt-2 border-t border-gray-200 pt-3">
                    {(merchantProducts[m.id] ?? []).length === 0 ? (
                      <p className="text-sm text-amber-600 font-medium text-center py-3">
                        ⚠️ Aucun produit ajouté pour l&apos;instant — relancer le commerçant
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {(merchantProducts[m.id] ?? []).map((p: any) => (
                          <div key={p.id} className={`text-xs rounded-lg px-3 py-2 border ${p.available ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60"}`}>
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-semibold text-gray-800">{p.name}</span>
                              <span className="font-bold text-orange-600 shrink-0">{p.price?.toFixed(2)} €</span>
                            </div>
                            <div className="text-gray-400 mt-0.5">{p.category} {!p.available && "· Indisponible"}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2 text-right">
                      {(merchantProducts[m.id] ?? []).length} produit(s) · <a href={`/commercant/dashboard`} target="_blank" className="text-blue-500 underline">Accès dashboard commerçant</a>
                    </p>
                  </div>
                )}
                </div>
              ))}
            </div>
          </Section>

          {/* ── Comptabilité ── */}
          <Section title="Comptabilité">
            {(() => {
              // Données plateforme pour l'année sélectionnée
              const platformRevenue = orders
                .filter((o) => o.status === "terminee" && o.created_at.startsWith(comptaYear))
                .reduce((s, o) => s + (o.price_total ?? 0), 0);

              const manualRevenue = (compta?.recetes ?? [])
                .filter((r) => (r["Date"] ?? "").includes(comptaYear.slice(2)))
                .reduce((s, r) => s + (parseFloat(r["Montant"] ?? "0") || 0), 0);

              const edlRevenue = edlMissions
                .filter((m) => m.date_paiement?.startsWith(comptaYear))
                .reduce((s, m) => s + m.montant_ht, 0);

              const totalRevenue = platformRevenue + manualRevenue + edlRevenue;

              const totalDepenses = (compta?.depenses ?? [])
                .filter((d) => (d["Date"] ?? "").includes(comptaYear.slice(2)))
                .reduce((s, d) => {
                  const raw = (d["Montant TTC (€)"] ?? "").replace(/[€\s]/g, "").replace(",", ".");
                  return s + (parseFloat(raw) || 0);
                }, 0);

              const benefice = totalRevenue - totalDepenses;

              return (
                <div>
                  {/* Barre d'outils */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex gap-2">
                      {["2024", "2025", "2026"].map((y) => (
                        <button key={y} onClick={() => setComptaYear(y)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${comptaYear === y ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                          {y}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={loadCompta}
                        className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition">
                        {comptaLoading ? "Chargement..." : "🔄 Actualiser"}
                      </button>
                      <button onClick={() => window.open(`/admin/bilan/${comptaYear}`, "_blank")}
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition">
                        📄 Générer bilan PDF
                      </button>
                      <button onClick={() => window.open("/admin/edl", "_blank")}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition">
                        🏠 France EDL
                      </button>
                    </div>
                  </div>

                  {/* Résumé chiffres */}
                  <div id="compta-print" className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-50 rounded-2xl p-4 text-center">
                        <p className="text-xs text-green-600 font-semibold uppercase mb-1">Recettes plateforme</p>
                        <p className="text-2xl font-bold text-green-700">{fmtEuro(platformRevenue)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-2xl p-4 text-center">
                        <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Recettes manuelles</p>
                        <p className="text-2xl font-bold text-blue-700">{fmtEuro(manualRevenue)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-2xl p-4 text-center">
                        <p className="text-xs text-purple-600 font-semibold uppercase mb-1">EDL payées</p>
                        <p className="text-2xl font-bold text-purple-700">{fmtEuro(edlRevenue)}</p>
                      </div>
                      <div className="bg-red-50 rounded-2xl p-4 text-center">
                        <p className="text-xs text-red-600 font-semibold uppercase mb-1">Dépenses</p>
                        <p className="text-2xl font-bold text-red-700">{fmtEuro(totalDepenses)}</p>
                      </div>
                      <div className={`rounded-2xl p-4 text-center ${benefice >= 0 ? "bg-orange-50" : "bg-red-100"}`}>
                        <p className={`text-xs font-semibold uppercase mb-1 ${benefice >= 0 ? "text-orange-600" : "text-red-600"}`}>Bénéfice net</p>
                        <p className={`text-2xl font-bold ${benefice >= 0 ? "text-orange-700" : "text-red-700"}`}>{fmtEuro(benefice)}</p>
                      </div>
                    </div>

                    {/* Onglets */}
                    <div className="flex gap-2 mb-4">
                      {(["resume", "recetes", "depenses"] as const).map((t) => (
                        <button key={t} onClick={() => setComptaTab(t)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${comptaTab === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                          {t === "resume" ? "Résumé" : t === "recetes" ? "Recettes manuelles" : "Dépenses"}
                        </button>
                      ))}
                    </div>

                    {/* Résumé par catégorie */}
                    {comptaTab === "resume" && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-3">Recettes manuelles par service</h3>
                          {compta == null ? (
                            <button onClick={loadCompta} className="text-sm text-orange-500 underline">Charger les données Google Sheet</button>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(
                                (compta.recetes ?? [])
                                  .filter((r) => (r["Date"] ?? "").includes(comptaYear.slice(2)))
                                  .reduce((acc, r) => {
                                    const cat = r["Service réalisé"] ?? "Autre";
                                    acc[cat] = (acc[cat] ?? 0) + (parseFloat(r["Montant"] ?? "0") || 0);
                                    return acc;
                                  }, {} as Record<string, number>)
                              ).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                                <div key={cat} className="flex justify-between items-center py-2 border-b border-gray-50">
                                  <span className="text-sm text-gray-700">{cat}</span>
                                  <span className="text-sm font-semibold text-gray-900">{fmtEuro(amt)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-3">Dépenses par catégorie</h3>
                          {compta == null ? (
                            <button onClick={loadCompta} className="text-sm text-orange-500 underline">Charger les données Google Sheet</button>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(
                                (compta.depenses ?? [])
                                  .filter((d) => (d["Date"] ?? "").includes(comptaYear.slice(2)))
                                  .reduce((acc, d) => {
                                    const cat = d["Description / Nature de l'achat"] ?? "Autre";
                                    const raw = (d["Montant TTC (€)"] ?? "").replace(/[€\s]/g, "").replace(",", ".");
                                    acc[cat] = (acc[cat] ?? 0) + (parseFloat(raw) || 0);
                                    return acc;
                                  }, {} as Record<string, number>)
                              ).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                                <div key={cat} className="flex justify-between items-center py-2 border-b border-gray-50">
                                  <span className="text-sm text-gray-700">{cat}</span>
                                  <span className="text-sm font-semibold text-red-600">{fmtEuro(amt)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Table recettes manuelles */}
                    {comptaTab === "recetes" && (
                      <div className="overflow-x-auto">
                        {compta == null ? (
                          <button onClick={loadCompta} className="text-sm text-orange-500 underline">Charger les données Google Sheet</button>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                                <th className="pb-3 pr-4">Date</th>
                                <th className="pb-3 pr-4">Client</th>
                                <th className="pb-3 pr-4">Service</th>
                                <th className="pb-3 pr-4">Paiement</th>
                                <th className="pb-3 pr-4">Facture</th>
                                <th className="pb-3 text-right">Montant</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(compta.recetes ?? []).filter((r) => (r["Date"] ?? "").includes(comptaYear.slice(2))).map((r, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                  <td className="py-2 pr-4 text-gray-500">{r["Date"]}</td>
                                  <td className="py-2 pr-4 text-gray-800">{r["Client"]}</td>
                                  <td className="py-2 pr-4 text-gray-600">{r["Service réalisé"]}</td>
                                  <td className="py-2 pr-4 text-gray-600">{r["Mode de paiement"]}</td>
                                  <td className="py-2 pr-4 text-gray-500 text-xs">{r["N° de facture "]}</td>
                                  <td className="py-2 text-right font-semibold text-green-700">{fmtEuro(parseFloat(r["Montant"] ?? "0") || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* Table dépenses */}
                    {comptaTab === "depenses" && (
                      <div className="overflow-x-auto">
                        {compta == null ? (
                          <button onClick={loadCompta} className="text-sm text-orange-500 underline">Charger les données Google Sheet</button>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                                <th className="pb-3 pr-4">Date</th>
                                <th className="pb-3 pr-4">Fournisseur</th>
                                <th className="pb-3 pr-4">Nature</th>
                                <th className="pb-3 pr-4">TVA</th>
                                <th className="pb-3 pr-4">HT</th>
                                <th className="pb-3 text-right">TTC</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(compta.depenses ?? []).filter((d) => (d["Date"] ?? "").includes(comptaYear.slice(2))).map((d, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                  <td className="py-2 pr-4 text-gray-500">{d["Date"]}</td>
                                  <td className="py-2 pr-4 text-gray-800">{d["Fournisseur"]}</td>
                                  <td className="py-2 pr-4 text-gray-600">{d["Description / Nature de l'achat"]}</td>
                                  <td className="py-2 pr-4 text-gray-500">{d["Column 6"]}</td>
                                  <td className="py-2 pr-4 text-gray-500">{d["Column 7"]}</td>
                                  <td className="py-2 text-right font-semibold text-red-600">{d["Montant TTC (€)"]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </Section>

          <p className="text-center text-xs text-gray-300 pb-6">
            Il est Chouette · Dashboard Admin · Données en temps réel
          </p>

          {/* ── Modal annulation ── */}
          {cancelOrderId && (
            <div
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
              onClick={() => setCancelOrderId(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-lg font-bold text-gray-900 mb-1">Annuler la commande</h2>
                <p className="text-sm text-gray-500 mb-5">Choisissez ou saisissez une raison d&apos;annulation.</p>

                {/* Raisons rapides */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Aucun coursier disponible", "Client injoignable", "Commande en double", "Problème de paiement", "Demande du client", "Test"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setCancelReason(r)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${cancelReason === r ? "bg-red-500 text-white border-red-500" : "border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Champ libre */}
                <input
                  type="text"
                  placeholder="Autre raison..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-300 mb-5"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelOrderId(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
                  >
                    Retour
                  </button>
                  <button
                    onClick={confirmCancelOrder}
                    disabled={!cancelReason.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Confirmer l&apos;annulation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal client ── */}
          {selectedClient && (
            <div
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedClient(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header modal */}
                <div className="flex items-start justify-between p-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {[selectedClient.first_name, selectedClient.last_name]
                        .filter(Boolean)
                        .join(" ") || "Client sans nom"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">{selectedClient.phone}</p>
                  </div>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                  >
                    &times;
                  </button>
                </div>

                {/* Infos client */}
                <div className="p-6 grid grid-cols-2 gap-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Adresse</p>
                    <p className="text-sm text-gray-800">
                      {[selectedClient.address, selectedClient.zipcode, selectedClient.city]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Client depuis</p>
                    <p className="text-sm text-gray-800">
                      {new Date(selectedClient.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                  {selectedClient.preferences && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes / Préférences</p>
                      <p className="text-sm text-gray-800 bg-yellow-50 rounded-lg p-3">
                        {selectedClient.preferences}
                      </p>
                    </div>
                  )}
                </div>

                {/* Commandes du client */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    Historique des commandes (
                    {orders.filter((o) => o.customer_id === selectedClient.id).length})
                  </h3>
                  {(() => {
                    const clientOrders = orders.filter((o) => o.customer_id === selectedClient.id);
                    const clientCA = clientOrders
                      .filter((o) => o.status === "terminee")
                      .reduce((s, o) => s + (o.price_total ?? 0), 0);
                    return (
                      <>
                        <div className="flex gap-4 mb-4">
                          <div className="bg-blue-50 rounded-xl p-3 flex-1 text-center">
                            <p className="text-2xl font-bold text-blue-700">{clientOrders.length}</p>
                            <p className="text-xs text-blue-500">Commandes</p>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-3 flex-1 text-center">
                            <p className="text-2xl font-bold text-emerald-700">{fmtEuro(clientCA)}</p>
                            <p className="text-xs text-emerald-500">CA total</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {clientOrders.map((o) => {
                            const statusColor = STATUS_COLORS[o.status] ?? "#9ca3af";
                            const asgn = assignments.find((a) => a.order_id === o.id);
                            const courier = asgn
                              ? couriers.find((c) => c.email === asgn.courier_email)
                              : null;
                            return (
                              <div
                                key={o.id}
                                className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                      style={{ background: statusColor + "22", color: statusColor }}
                                    >
                                      {STATUS_LABELS[o.status] ?? o.status}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {new Date(o.created_at).toLocaleDateString("fr-FR")}
                                    </span>
                                  </div>
                                  <span className="font-bold text-gray-900">
                                    {fmtEuro(o.price_total)}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-800">
                                  {SERVICES[o.service_type] ?? o.service_type}
                                  {o.express && <span className="ml-1 text-red-500 text-xs">⚡ Express</span>}
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-1">
                                  {o.pickup_address} → {o.dropoff_address}
                                </p>
                                {courier && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Coursier : {courier.first_name} {courier.last_name}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                          {clientOrders.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-6">
                              Aucune commande pour ce client.
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
