"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Merchant = {
  id: string; name: string; address: string; category: string;
  phone: string; email: string; description: string; opening_hours: string;
  siret: string; status: string; closed_dates?: string[]; is_open?: boolean;
};
type Product = {
  id: string; name: string; description: string; price: number;
  category: string; available: boolean; image_url?: string; is_featured?: boolean;
};
type MerchantOrder = {
  id: string; status: string; created_at: string;
  order: {
    dropoff_address: string; notes: string; price_total: number;
    client_email: string; client_name?: string; client_phone?: string;
    scheduled_at?: string | null; status?: string;
  };
};

function playOrderAlert() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.20].forEach((delay) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.45);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.45);
    });
  } catch (_) { /* navigateur sans AudioContext */ }
}

export default function MerchantDashboard() {
  const [session, setSession] = useState<any>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [tab, setTab] = useState<"orders" | "menu" | "info">("orders");
  const [loading, setLoading] = useState(true);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Edit product
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Edit info (feature 4)
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ opening_hours: "", closed_dates: [] as string[] });
  const [savingInfo, setSavingInfo] = useState(false);
  const [newClosedDate, setNewClosedDate] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadMerchantData(data.session.user.id);
      else setLoading(false);
    });
  }, []);

  // Realtime : nouvelle commande arrivante
  useEffect(() => {
    if (!merchant?.id) return;

    const channel = supabase
      .channel(`merchant-orders-${merchant.id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "merchant_orders",
          filter: `merchant_id=eq.${merchant.id}`,
        },
        async (payload: any) => {
          const { data } = await supabase
            .from("merchant_orders")
            .select("*, order:orders(dropoff_address,notes,price_total,client_email,client_name,client_phone,scheduled_at)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setOrders((prev) => [data as MerchantOrder, ...prev]);
            playOrderAlert();
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [merchant?.id]);

  async function loadMerchantData(userId: string) {
    let { data: m } = await supabase.from("merchants").select("*").eq("user_id", userId).limit(1).maybeSingle();

    if (!m) {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (email) {
        const { data: byEmail } = await supabase.from("merchants").select("*").eq("email", email).maybeSingle();
        if (byEmail) {
          await supabase.from("merchants").update({ user_id: userId }).eq("id", byEmail.id);
          m = { ...byEmail, user_id: userId };
        }
      }
    }

    if (!m) { setLoading(false); return; }
    setMerchant(m as Merchant);

    const [{ data: p }, { data: o }] = await Promise.all([
      supabase.from("merchant_products").select("*").eq("merchant_id", m.id).order("category"),
      supabase.from("merchant_orders")
        .select("*, order:orders(dropoff_address,notes,price_total,client_email,client_name,client_phone,scheduled_at,status)")
        .eq("merchant_id", m.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setProducts((p ?? []) as Product[]);
    // Filter out merchant_orders whose parent order is cancelled
    const validOrders = (o ?? []).filter((mo: any) => mo.order?.status !== 'annulee') as MerchantOrder[];
    setOrders(validOrders);
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) { setLoginError("Email ou mot de passe incorrect"); setLoggingIn(false); return; }
    setSession(data.session);
    await loadMerchantData(data.session!.user.id);
    setLoggingIn(false);
  }

  async function handleOrderAction(orderId: string, status: string) {
    await supabase.from("merchant_orders").update({ status }).eq("id", orderId);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    if (!merchant) return null;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `${merchant.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    setUploadingPhoto(false);
    if (error) { alert("Erreur upload photo"); return null; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveProduct() {
    if (!editingProduct || !merchant) return;
    const parsedPrice = parseFloat(priceInput.replace(",", "."));
    if (isNaN(parsedPrice) || parsedPrice <= 0) { alert("Prix invalide"); return; }
    const productWithPrice = { ...editingProduct, price: parsedPrice };
    setSavingProduct(true);
    if (productWithPrice.id) {
      const { error } = await supabase.from("merchant_products").update({
        name: productWithPrice.name, description: productWithPrice.description,
        price: productWithPrice.price, category: productWithPrice.category,
        available: productWithPrice.available, image_url: productWithPrice.image_url ?? null,
        is_featured: productWithPrice.is_featured ?? false,
      }).eq("id", productWithPrice.id);
      if (error) { alert("Erreur modification : " + error.message); setSavingProduct(false); return; }
      setProducts((prev) => prev.map((p) => p.id === productWithPrice.id ? { ...p, ...productWithPrice } as Product : p));
    } else {
      const { data, error } = await supabase.from("merchant_products").insert([{
        merchant_id: merchant.id, name: productWithPrice.name,
        description: productWithPrice.description, price: productWithPrice.price,
        category: productWithPrice.category, available: true,
        image_url: productWithPrice.image_url ?? null,
        is_featured: productWithPrice.is_featured ?? false,
      }]).select().single();
      if (error) { alert("Erreur : " + error.message); setSavingProduct(false); return; }
      if (data) setProducts((prev) => [...prev, data as Product]);
    }
    setEditingProduct(null);
    setSavingProduct(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("merchant_products").delete().eq("id", id);
    if (error) { alert("Erreur suppression : " + error.message); return; }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function toggleAvailable(p: Product) {
    await supabase.from("merchant_products").update({ available: !p.available }).eq("id", p.id);
    setProducts((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, available: !pr.available } : pr));
  }

  async function toggleFeatured(p: Product) {
    await supabase.from("merchant_products").update({ is_featured: !p.is_featured }).eq("id", p.id);
    setProducts((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, is_featured: !pr.is_featured } : pr));
  }

  async function toggleIsOpen() {
    if (!merchant) return;
    const newVal = !(merchant.is_open ?? true);
    await supabase.from("merchants").update({ is_open: newVal }).eq("id", merchant.id);
    setMerchant((m) => m ? { ...m, is_open: newVal } : m);
  }

  async function saveInfo() {
    if (!merchant) return;
    setSavingInfo(true);
    const { error } = await supabase.from("merchants").update({
      opening_hours: infoForm.opening_hours,
      closed_dates: infoForm.closed_dates,
    }).eq("id", merchant.id);
    if (error) { alert("Erreur : " + error.message); setSavingInfo(false); return; }
    setMerchant((m) => m ? { ...m, opening_hours: infoForm.opening_hours, closed_dates: infoForm.closed_dates } : m);
    setEditingInfo(false);
    setSavingInfo(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">Chargement…</div></div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🏪</div>
            <h1 className="text-2xl font-bold text-gray-900">Espace commerçant</h1>
            <p className="text-gray-500 text-sm mt-1">Connectez-vous pour gérer vos commandes</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Mot de passe</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button type="submit" disabled={loggingIn}
              className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 transition">
              {loggingIn ? "Connexion…" : "Se connecter"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-4">
            Pas encore inscrit ? <a href="/commercant" className="text-orange-500 font-semibold hover:underline">Rejoindre Il est chouette</a>
          </p>
        </div>
      </div>
    );
  }

  if (!merchant) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md text-center">
        <div className="text-4xl mb-3">🏪</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Aucun commerce associé</h2>
        <p className="text-sm text-gray-500 mb-1">Compte connecté :</p>
        <p className="text-sm font-semibold text-gray-700 mb-6">{session?.user?.email}</p>
        <p className="text-sm text-gray-400 mb-6">Ce compte n&apos;est pas encore lié à un commerce. Contactez-nous : allo@ilestchouette.fr</p>
        <button
          onClick={() => supabase.auth.signOut().then(() => setSession(null))}
          className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );

  const newOrders = orders.filter((o) => o.status === "pending");
  const scheduledNewOrders = newOrders.filter((o) => !!o.order?.scheduled_at);
  const immediateNewOrders = newOrders.filter((o) => !o.order?.scheduled_at);
  const activeOrders = orders.filter((o) => ["accepted", "preparing", "ready"].includes(o.status));
  const pastOrders = orders.filter((o) => ["rejected", "delivered"].includes(o.status));

  // Feature 2: group products by category
  const productsByCategory = products.reduce((acc, p) => {
    const cat = p.category || "Autres";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Product[]>);
  const categories = Object.keys(productsByCategory).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 text-white px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{merchant.name}</h1>
          <p className="text-orange-100 text-sm">{merchant.category}</p>
        </div>
        <div className="flex items-center gap-3">
          {newOrders.length > 0 && (
            <span className="bg-white text-orange-500 font-bold text-sm px-3 py-1 rounded-full animate-pulse">
              🔔 {newOrders.length} nouvelle(s)
            </span>
          )}
          <button
            onClick={toggleIsOpen}
            className={`text-sm font-bold px-4 py-1.5 rounded-full border-2 transition ${
              (merchant.is_open ?? true)
                ? "bg-green-500 border-green-400 text-white hover:bg-green-600"
                : "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
            }`}>
            {(merchant.is_open ?? true) ? "🟢 Ouvert" : "🔴 Fermé"}
          </button>
          <button onClick={() => supabase.auth.signOut().then(() => setSession(null))}
            className="text-orange-100 hover:text-white text-sm">Déconnexion</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6 flex gap-6">
        {([["orders", "📋 Commandes"], ["menu", "🍽️ Menu"], ["info", "⚙️ Mon commerce"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-4 text-sm font-semibold border-b-2 transition ${tab === t ? "border-orange-500 text-orange-500" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
            {t === "orders" && (newOrders.length + activeOrders.length) > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{newOrders.length + activeOrders.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* COMMANDES */}
        {tab === "orders" && (
          <div className="space-y-6">
            {newOrders.length === 0 && activeOrders.length === 0 && pastOrders.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📭</div>
                <p>Aucune commande pour l&apos;instant</p>
                <p className="text-sm mt-1">Les nouvelles commandes apparaissent ici en temps réel</p>
              </div>
            )}

            {/* Feature 5: Commandes programmées — bannière proéminente */}
            {scheduledNewOrders.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3">🕐 Commandes programmées</h3>
                <div className="space-y-3">
                  {scheduledNewOrders.map((o) => (
                    <div key={o.id} className="bg-blue-50 rounded-2xl border-2 border-blue-400 p-5 shadow-sm">
                      <div className="bg-blue-600 text-white rounded-xl px-4 py-3 mb-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Livraison prévue le</p>
                        <p className="text-lg font-bold mt-0.5">
                          {new Date(o.order.scheduled_at!).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {o.order?.client_name && <p className="text-sm font-bold text-gray-900 mb-1">👤 {o.order.client_name}</p>}
                      {o.order?.client_phone && (
                        <a href={`tel:${o.order.client_phone}`} className="text-sm text-blue-700 font-semibold mb-1 block hover:underline">
                          📞 {o.order.client_phone}
                        </a>
                      )}
                      {o.order?.notes && <p className="text-sm text-gray-700 mb-1">📝 {o.order.notes}</p>}
                      <p className="text-sm text-gray-500">🏠 {o.order?.dropoff_address}</p>
                      <p className="text-blue-600 font-bold mt-2">{o.order?.price_total?.toFixed(2)} €</p>
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => handleOrderAction(o.id, "rejected")}
                          className="flex-1 border border-red-200 text-red-500 font-semibold py-2.5 rounded-xl hover:bg-red-50 transition text-sm">
                          ✕ Refuser
                        </button>
                        <button onClick={() => handleOrderAction(o.id, "preparing")}
                          className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition text-sm">
                          ✓ Accepter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nouvelles commandes immédiates */}
            {immediateNewOrders.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wide mb-3">🔔 Nouvelles commandes</h3>
                <div className="space-y-3">
                  {immediateNewOrders.map((o) => (
                    <div key={o.id} className="bg-white rounded-2xl border-2 border-orange-400 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleString("fr-FR")}</span>
                      </div>
                      {o.order?.client_name && <p className="text-sm font-bold text-gray-900 mb-1">👤 {o.order.client_name}</p>}
                      {o.order?.client_phone && (
                        <a href={`tel:${o.order.client_phone}`} className="text-sm text-blue-600 font-semibold mb-1 block hover:underline">
                          📞 {o.order.client_phone}
                        </a>
                      )}
                      {o.order?.notes && <p className="text-sm text-gray-700 mb-1">📝 {o.order.notes}</p>}
                      <p className="text-sm text-gray-500">🏠 {o.order?.dropoff_address}</p>
                      <p className="text-orange-500 font-bold mt-2">{o.order?.price_total?.toFixed(2)} €</p>
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => handleOrderAction(o.id, "rejected")}
                          className="flex-1 border border-red-200 text-red-500 font-semibold py-2.5 rounded-xl hover:bg-red-50 transition text-sm">
                          ✕ Refuser
                        </button>
                        <button onClick={() => handleOrderAction(o.id, "preparing")}
                          className="flex-1 bg-orange-500 text-white font-bold py-2.5 rounded-xl hover:bg-orange-600 transition text-sm">
                          ✓ Accepter &amp; préparer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commandes en préparation */}
            {activeOrders.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3">🍳 En cours</h3>
                <div className="space-y-3">
                  {activeOrders.map((o) => (
                    <div key={o.id} className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          o.status === "preparing" ? "bg-blue-100 text-blue-700" :
                          o.status === "ready" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {o.status === "preparing" ? "🍳 En préparation" : o.status === "ready" ? "✅ Prête" : o.status}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleString("fr-FR")}</span>
                      </div>
                      {/* Feature 5: badge programmée dans les commandes actives aussi */}
                      {!!o.order?.scheduled_at && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-2">
                          <p className="text-blue-700 text-xs font-semibold">
                            🕐 Programmée — {new Date(o.order.scheduled_at).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      )}
                      {o.order?.client_name && <p className="text-sm font-semibold text-gray-900">👤 {o.order.client_name}</p>}
                      {o.order?.notes && <p className="text-sm text-gray-600 mt-1">📝 {o.order.notes}</p>}
                      <p className="text-sm text-gray-500 mt-1">🏠 {o.order?.dropoff_address}</p>
                      {o.status === "preparing" && (
                        <button onClick={() => handleOrderAction(o.id, "ready")}
                          className="w-full mt-4 bg-green-500 text-white font-bold py-2.5 rounded-xl hover:bg-green-600 transition text-sm">
                          ✅ Commande prête — coursier peut venir
                        </button>
                      )}
                      {o.status === "ready" && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-center text-sm text-green-700 font-semibold">
                          🚴 En attente du coursier
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historique */}
            {pastOrders.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Historique</h3>
                <div className="space-y-2">
                  {pastOrders.map((o) => (
                    <div key={o.id} className="bg-white rounded-xl p-4 flex items-center justify-between border border-gray-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{o.order?.client_name || o.order?.notes || "Commande"}</p>
                        <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        o.status === "delivered" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"
                      }`}>
                        {o.status === "delivered" ? "✅ Livrée" : "✕ Refusée"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MENU — Feature 2: organisé par catégorie, Feature 3: mise en avant */}
        {tab === "menu" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Vos produits ({products.length})</h2>
              <button onClick={() => { setEditingProduct({ name: "", description: "", price: 0, category: "", available: true, is_featured: false }); setPriceInput(""); }}
                className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-orange-600 transition">
                + Ajouter
              </button>
            </div>
            {products.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🍽️</div>
                <p>Aucun produit — ajoutez votre menu</p>
              </div>
            )}

            {/* Feature 2: groupement par catégorie */}
            {categories.map((cat) => (
              <div key={cat}>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mt-4">{cat}</h3>
                <div className="space-y-2">
                  {productsByCategory[cat].map((p) => (
                    <div key={p.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{p.name}</p>
                          {/* Feature 3: badge mis en avant */}
                          {p.is_featured && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-semibold">⭐ Mis en avant</span>}
                        </div>
                        {p.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{p.description}</p>}
                        <p className="text-orange-500 font-bold mt-1">{p.price.toFixed(2)} €</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        <button onClick={() => toggleAvailable(p)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full transition ${p.available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {p.available ? "Dispo" : "Indispo"}
                        </button>
                        {/* Feature 3: bouton mise en avant */}
                        <button onClick={() => toggleFeatured(p)}
                          title={p.is_featured ? "Retirer de la mise en avant" : "Mettre en avant"}
                          className={`text-xs font-semibold px-2 py-1 rounded-full transition ${p.is_featured ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600"}`}>
                          ⭐
                        </button>
                        <button onClick={() => { setEditingProduct(p); setPriceInput(String(p.price ?? "")); }} className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition">Modifier</button>
                        <button onClick={() => deleteProduct(p.id)} className="bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition">Suppr.</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INFOS — Feature 4: modification horaires + fermetures */}
        {tab === "info" && (
          <div className="space-y-4">
            {!editingInfo ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3 text-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Informations du commerce</h2>
                  <button
                    onClick={() => {
                      setInfoForm({ opening_hours: merchant.opening_hours || "", closed_dates: merchant.closed_dates || [] });
                      setEditingInfo(true);
                    }}
                    className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-4 py-2 rounded-xl text-sm font-semibold transition">
                    ✏️ Modifier les horaires
                  </button>
                </div>
                <InfoRow label="Nom" value={merchant.name} />
                <InfoRow label="Catégorie" value={merchant.category} />
                <InfoRow label="Adresse" value={merchant.address} />
                <InfoRow label="Email" value={merchant.email} />
                <InfoRow label="Téléphone" value={merchant.phone} />
                <InfoRow label="SIRET" value={merchant.siret} />
                <InfoRow label="Horaires" value={merchant.opening_hours} />
                {merchant.description && <InfoRow label="Description" value={merchant.description} />}
                {/* Fermetures exceptionnelles */}
                {(merchant.closed_dates ?? []).length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Fermetures exceptionnelles</p>
                    <div className="flex flex-wrap gap-2">
                      {(merchant.closed_dates ?? []).map((d) => (
                        <span key={d} className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1 rounded-full border border-red-100">
                          🔒 {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-gray-400 text-xs">Pour modifier le nom, l&apos;adresse ou le SIRET : allo@ilestchouette.fr</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 text-sm">
                <h2 className="text-lg font-bold text-gray-900">Modifier les horaires</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Horaires d&apos;ouverture</label>
                  <textarea
                    rows={3}
                    value={infoForm.opening_hours}
                    onChange={(e) => setInfoForm((f) => ({ ...f, opening_hours: e.target.value }))}
                    placeholder="Ex: Lun-Ven 9h-19h, Sam 10h-18h, Dim fermé"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>

                {/* Fermetures exceptionnelles */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Jours de fermeture exceptionnelle</p>
                  {infoForm.closed_dates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {infoForm.closed_dates.map((d) => (
                        <span key={d} className="flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-semibold px-3 py-1 rounded-full border border-red-100">
                          🔒 {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                          <button
                            onClick={() => setInfoForm((f) => ({ ...f, closed_dates: f.closed_dates.filter((x) => x !== d) }))}
                            className="text-red-400 hover:text-red-600 ml-0.5 font-bold">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newClosedDate}
                      onChange={(e) => setNewClosedDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <button
                      onClick={() => {
                        if (!newClosedDate || infoForm.closed_dates.includes(newClosedDate)) return;
                        setInfoForm((f) => ({ ...f, closed_dates: [...f.closed_dates, newClosedDate].sort() }));
                        setNewClosedDate("");
                      }}
                      className="bg-red-50 text-red-600 font-semibold px-4 py-2.5 rounded-xl hover:bg-red-100 transition text-sm">
                      + Ajouter
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditingInfo(false)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl">Annuler</button>
                  <button onClick={saveInfo} disabled={savingInfo}
                    className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50">
                    {savingInfo ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal édition produit */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900">{editingProduct.id ? "Modifier le produit" : "Nouveau produit"}</h3>
            <EField label="Nom *" value={editingProduct.name ?? ""} onChange={(v) => setEditingProduct((p) => ({ ...p, name: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Prix (€) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="14.50"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Catégorie</label>
                <input
                  list="product-categories"
                  value={editingProduct.category ?? ""}
                  onChange={(e) => setEditingProduct((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Pizza, Boisson…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <datalist id="product-categories">
                  {Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>
            <EField label="Description" value={editingProduct.description ?? ""} onChange={(v) => setEditingProduct((p) => ({ ...p, description: v }))} />

            {/* Feature 3: case mis en avant */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editingProduct.is_featured ?? false}
                onChange={(e) => setEditingProduct((p) => ({ ...p, is_featured: e.target.checked }))}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="text-sm font-semibold text-gray-700">⭐ Mettre ce produit en avant (recommandé par l&apos;assistant)</span>
            </label>

            {/* Photo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Photo du produit</label>
              {editingProduct.image_url && (
                <div className="relative mb-2 inline-block">
                  <img src={editingProduct.image_url} alt="aperçu" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
                  <button
                    onClick={() => setEditingProduct((p) => ({ ...p, image_url: undefined }))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >×</button>
                </div>
              )}
              <label className={`flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-orange-400 transition ${uploadingPhoto ? "opacity-50" : ""}`}>
                <span className="text-sm text-gray-500">
                  {uploadingPhoto ? "Upload en cours…" : editingProduct.image_url ? "Changer la photo" : "📷 Choisir une photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadPhoto(file);
                    if (url) setEditingProduct((p) => ({ ...p, image_url: url }));
                  }}
                />
              </label>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · max 5 Mo recommandé</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingProduct(null)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl">Annuler</button>
              <button onClick={saveProduct} disabled={savingProduct || uploadingPhoto || !editingProduct.name}
                className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50">
                {savingProduct ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-semibold text-gray-900 text-right">{value}</span>
    </div>
  );
}

function EField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </div>
  );
}
