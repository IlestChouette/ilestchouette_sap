"use client";

import { useEffect, useState, useMemo } from "react";

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

type Merchant = {
  id: string;
  name: string;
  email: string;
  address: string | null;
  active: boolean | null;
  created_at: string;
};

type Tab = "dashboard" | "commandes" | "coursiers" | "commercants";

const STATUS_FR: Record<string, string> = {
  pending: "En attente",
  assigned: "Assignée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  assigned: "#3b82f6",
  in_progress: "#8b5cf6",
  completed: "#10b981",
  cancelled: "#ef4444",
};

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

function fmt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Login ─────────────────────────────────────────── */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/gestion/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.ok) {
        onLogin();
      } else {
        setError(data.error ?? "Identifiants incorrects");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 16,
        padding: "48px 40px",
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: 14,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            marginBottom: 16,
          }}>
            🐦
          </div>
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0 }}>
            Plateforme de Gestion
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "6px 0 0" }}>
            Il est chouette — accès restreint
          </p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 14px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#f1f5f9",
                fontSize: 14,
                outline: "none",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "#6366f1"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#334155"; }}
            />
          </div>

          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 14px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#f1f5f9",
                fontSize: 14,
                outline: "none",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "#6366f1"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#334155"; }}
            />
          </div>

          {error && (
            <div style={{
              background: "#450a0a",
              border: "1px solid #ef4444",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#fca5a5",
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "#4338ca80" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────── */
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: 12,
      padding: "20px 24px",
      flex: 1,
      minWidth: 160,
    }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ─── Badge ─────────────────────────────────────────── */
function Badge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#94a3b8";
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      background: color + "22",
      color,
      border: `1px solid ${color}44`,
    }}>
      {STATUS_FR[status] ?? status}
    </span>
  );
}

/* ─── Dashboard ─────────────────────────────────────── */
function Dashboard({ orders, assignments, couriers }: { orders: Order[]; assignments: Assignment[]; couriers: Courier[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
  const activeAssign = assignments.filter(a => a.status === "in_progress" || a.status === "assigned");
  const completedTotal = orders.filter(o => o.status === "completed");
  const revenue = completedTotal.reduce((s, o) => s + (o.price_total ?? 0), 0);
  const activeCouriers = couriers.filter(c => !c.blocked);

  const byStatus = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {})
  );

  const recent = orders.slice(0, 8);

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Commandes aujourd'hui" value={todayOrders.length} color="#6366f1" />
        <StatCard label="En cours" value={activeAssign.length} color="#f59e0b" />
        <StatCard label="Terminées (total)" value={completedTotal.length} color="#10b981" />
        <StatCard label="Chiffre d'affaires" value={`${revenue.toFixed(2)} €`} color="#8b5cf6" />
        <StatCard label="Coursiers actifs" value={activeCouriers.length} color="#3b82f6" />
      </div>

      {/* Répartition statuts */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>Répartition des statuts</div>
          {byStatus.map(([status, count]) => (
            <div key={status} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[status] ?? "#94a3b8" }} />
                <span style={{ color: "#cbd5e1", fontSize: 13 }}>{STATUS_FR[status] ?? status}</span>
              </div>
              <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Dernières commandes */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "20px 24px", flex: 2, minWidth: 340 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>Dernières commandes</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Service", "Statut", "Prix", "Date"].map(h => (
                  <th key={h} style={{ color: "#64748b", textAlign: "left", paddingBottom: 8, fontWeight: 600, paddingRight: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(o => (
                <tr key={o.id} style={{ borderTop: "1px solid #1e293b" }}>
                  <td style={{ padding: "7px 12px 7px 0", color: "#cbd5e1" }}>{SERVICES[o.service_type] ?? o.service_type}</td>
                  <td style={{ padding: "7px 12px 7px 0" }}><Badge status={o.status} /></td>
                  <td style={{ padding: "7px 12px 7px 0", color: "#10b981" }}>{o.price_total?.toFixed(2)} €</td>
                  <td style={{ padding: "7px 0 7px 0", color: "#64748b" }}>{fmt(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Commandes ─────────────────────────────────────── */
function Commandes({ orders, assignments }: { orders: Order[]; assignments: Assignment[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const assignMap = useMemo(() => {
    const m = new Map<string, Assignment>();
    assignments.forEach(a => m.set(a.order_id, a));
    return m;
  }, [assignments]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = filterStatus === "all" || o.status === filterStatus;
      const q = search.toLowerCase();
      const matchSearch = !q || o.pickup_address?.toLowerCase().includes(q) || o.dropoff_address?.toLowerCase().includes(q) || o.service_type?.toLowerCase().includes(q) || o.id.includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, search, filterStatus]);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Rechercher une commande…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200,
            padding: "8px 14px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#f1f5f9",
            fontSize: 13,
            outline: "none",
          }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: "8px 14px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#f1f5f9",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_FR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              {["#", "Service", "Statut", "Coursier", "Paiement", "Prix", "Distance", "Date"].map(h => (
                <th key={h} style={{ color: "#64748b", textAlign: "left", padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const a = assignMap.get(o.id);
              return (
                <tr key={o.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "9px 12px", color: "#64748b", fontFamily: "monospace", fontSize: 11 }}>{o.id.slice(0, 8)}…</td>
                  <td style={{ padding: "9px 12px", color: "#cbd5e1" }}>{SERVICES[o.service_type] ?? o.service_type}</td>
                  <td style={{ padding: "9px 12px" }}><Badge status={o.status} /></td>
                  <td style={{ padding: "9px 12px", color: "#94a3b8" }}>{a?.courier_email ?? "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#94a3b8" }}>{a?.payment_method ?? "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#10b981", fontWeight: 600 }}>{o.price_total?.toFixed(2)} €</td>
                  <td style={{ padding: "9px 12px", color: "#94a3b8" }}>{o.distance_km ? `${o.distance_km.toFixed(1)} km` : "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#64748b", whiteSpace: "nowrap" }}>{fmt(o.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#64748b", padding: "40px 0", fontSize: 13 }}>Aucune commande trouvée</div>
        )}
      </div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 12 }}>{filtered.length} commande(s)</div>
    </div>
  );
}

/* ─── Coursiers ─────────────────────────────────────── */
function Coursiers({ couriers, assignments }: { couriers: Courier[]; assignments: Assignment[] }) {
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const m = new Map<string, { done: number; inProgress: number }>();
    assignments.forEach(a => {
      const e = a.courier_email;
      if (!m.has(e)) m.set(e, { done: 0, inProgress: 0 });
      const s = m.get(e)!;
      if (a.status === "completed") s.done++;
      if (a.status === "in_progress" || a.status === "assigned") s.inProgress++;
    });
    return m;
  }, [assignments]);

  const filtered = couriers.filter(c => {
    const q = search.toLowerCase();
    return !q || c.email.toLowerCase().includes(q) || (c.first_name + " " + c.last_name).toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Rechercher un coursier…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", maxWidth: 360, boxSizing: "border-box",
            padding: "8px 14px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#f1f5f9",
            fontSize: 13,
            outline: "none",
          }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {filtered.map(c => {
          const s = stats.get(c.email) ?? { done: 0, inProgress: 0 };
          return (
            <div key={c.id} style={{
              background: "#1e293b",
              border: `1px solid ${c.blocked ? "#ef444433" : "#334155"}`,
              borderRadius: 12,
              padding: "18px 20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: c.blocked ? "#374151" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 14,
                }}>
                  {(c.first_name?.[0] ?? c.email[0]).toUpperCase()}
                </div>
                {c.blocked && (
                  <span style={{ fontSize: 11, color: "#ef4444", background: "#450a0a", padding: "2px 8px", borderRadius: 999, border: "1px solid #ef444444" }}>
                    Bloqué
                  </span>
                )}
              </div>
              <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>
                {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
              </div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{c.email}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Terminées</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981" }}>{s.done}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>En cours</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>{s.inProgress}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#64748b", padding: "40px 0", fontSize: 13 }}>Aucun coursier trouvé</div>
      )}
    </div>
  );
}

/* ─── Commerçants ────────────────────────────────────── */
function Commercants({ merchants }: { merchants: Merchant[] }) {
  const [search, setSearch] = useState("");

  const filtered = merchants.filter(m => {
    const q = search.toLowerCase();
    return !q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Rechercher un commerçant…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", maxWidth: 360, boxSizing: "border-box",
            padding: "8px 14px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#f1f5f9",
            fontSize: 13,
            outline: "none",
          }}
        />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              {["Nom", "Email", "Adresse", "Statut", "Créé le"].map(h => (
                <th key={h} style={{ color: "#64748b", textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "9px 12px", color: "#f1f5f9", fontWeight: 600 }}>{m.name}</td>
                <td style={{ padding: "9px 12px", color: "#94a3b8" }}>{m.email}</td>
                <td style={{ padding: "9px 12px", color: "#64748b" }}>{m.address ?? "—"}</td>
                <td style={{ padding: "9px 12px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: m.active ? "#10b98122" : "#ef444422",
                    color: m.active ? "#10b981" : "#ef4444",
                    border: `1px solid ${m.active ? "#10b98144" : "#ef444444"}`,
                  }}>
                    {m.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td style={{ padding: "9px 12px", color: "#64748b" }}>{fmt(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#64748b", padding: "40px 0", fontSize: 13 }}>Aucun commerçant trouvé</div>
        )}
      </div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────── */
export default function GestionPage() {
  const [auth, setAuth] = useState<"loading" | "ok" | "login">("loading");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [data, setData] = useState<{ orders: Order[]; assignments: Assignment[]; couriers: Courier[]; merchants: Merchant[] } | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    fetch("/api/gestion/auth")
      .then(r => r.json())
      .then(d => setAuth(d.ok ? "ok" : "login"))
      .catch(() => setAuth("login"));
  }, []);

  useEffect(() => {
    if (auth !== "ok" || data) return;
    setDataLoading(true);
    fetch("/api/gestion/data")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [auth, data]);

  async function logout() {
    await fetch("/api/gestion/auth", { method: "DELETE" });
    setData(null);
    setAuth("login");
  }

  if (auth === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#64748b", fontSize: 14 }}>Chargement…</div>
      </div>
    );
  }

  if (auth === "login") {
    return <LoginScreen onLogin={() => setAuth("ok")} />;
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Tableau de bord", icon: "📊" },
    { id: "commandes", label: "Commandes", icon: "📦" },
    { id: "coursiers", label: "Coursiers", icon: "🛵" },
    { id: "commercants", label: "Commerçants", icon: "🏪" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#f1f5f9",
    }}>
      {/* Header */}
      <div style={{
        background: "#1e293b",
        borderBottom: "1px solid #334155",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 56,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>🐦</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Gestion</span>
          <span style={{ color: "#334155", fontSize: 18, marginLeft: 4 }}>|</span>
          <span style={{ color: "#64748b", fontSize: 13 }}>Il est chouette</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {data && (
            <button
              onClick={() => { setData(null); setDataLoading(true); fetch("/api/gestion/data").then(r => r.json()).then(d => setData(d)).finally(() => setDataLoading(false)); }}
              style={{ background: "none", border: "1px solid #334155", borderRadius: 6, color: "#64748b", padding: "5px 12px", fontSize: 12, cursor: "pointer" }}
            >
              ↻ Actualiser
            </button>
          )}
          <button
            onClick={logout}
            style={{ background: "none", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", padding: "5px 12px", fontSize: 12, cursor: "pointer" }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        {/* Sidebar */}
        <div style={{
          width: 220,
          background: "#1e293b",
          borderRight: "1px solid #334155",
          padding: "20px 12px",
          flexShrink: 0,
        }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: tab === t.id ? 600 : 400,
                background: tab === t.id ? "#6366f120" : "transparent",
                color: tab === t.id ? "#818cf8" : "#94a3b8",
                marginBottom: 4,
                textAlign: "left",
                transition: "all 0.1s",
              }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}

          {data && (
            <div style={{ marginTop: 24, padding: "0 14px" }}>
              <div style={{ fontSize: 11, color: "#334155", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Résumé</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>
                <div>{data.orders.length} commandes</div>
                <div>{data.couriers.length} coursiers</div>
                <div>{data.merchants.length} commerçants</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "28px 32px", overflowX: "auto" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>
            {tabs.find(t => t.id === tab)?.icon}{" "}
            {tabs.find(t => t.id === tab)?.label}
          </h2>

          {dataLoading && (
            <div style={{ textAlign: "center", color: "#64748b", padding: "60px 0", fontSize: 14 }}>
              Chargement des données…
            </div>
          )}

          {!dataLoading && data && (
            <>
              {tab === "dashboard" && <Dashboard orders={data.orders} assignments={data.assignments} couriers={data.couriers} />}
              {tab === "commandes" && <Commandes orders={data.orders} assignments={data.assignments} />}
              {tab === "coursiers" && <Coursiers couriers={data.couriers} assignments={data.assignments} />}
              {tab === "commercants" && <Commercants merchants={data.merchants} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
