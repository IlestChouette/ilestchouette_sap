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
  siret: string; status: string;
};
type Product = { id: string; name: string; description: string; price: number; category: string; available: boolean; image_url?: string };
type MerchantOrder = {
  id: string; status: string; created_at: string;
  order: { dropoff_address: string; notes: string; price_total: number; client_email: string };
};

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
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadMerchantData(data.session.user.id);
      else setLoading(false);
    });
  }, []);

  async function loadMerchantData(userId: string) {
    const [{ data: m }, { data: p }, { data: o }] = await Promise.all([
      supabase.from("merchants").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("merchant_products").select("*").eq("merchant_id",
        (await supabase.from("merchants").select("id").eq("user_id", userId).maybeSingle()).data?.id ?? ""
      ).order("category"),
      supabase.from("merchant_orders").select("*, order:orders(dropoff_address,notes,price_total,client_email)")
        .eq("merchant_id",
          (await supabase.from("merchants").select("id").eq("user_id", userId).maybeSingle()).data?.id ?? ""
        ).order("created_at", { ascending: false }).limit(50),
    ]);
    setMerchant(m as Merchant);
    setProducts((p ?? []) as Product[]);
    setOrders((o ?? []) as MerchantOrder[]);
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

  async function handleOrderAction(orderId: string, status: "accepted" | "rejected") {
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
    setSavingProduct(true);
    if (editingProduct.id) {
      await supabase.from("merchant_products").update({
        name: editingProduct.name, description: editingProduct.description,
        price: editingProduct.price, category: editingProduct.category,
        available: editingProduct.available, image_url: editingProduct.image_url ?? null,
      }).eq("id", editingProduct.id);
      setProducts((prev) => prev.map((p) => p.id === editingProduct.id ? { ...p, ...editingProduct } as Product : p));
    } else {
      const { data } = await supabase.from("merchant_products").insert([{
        merchant_id: merchant.id, name: editingProduct.name,
        description: editingProduct.description, price: editingProduct.price,
        category: editingProduct.category, available: true,
        image_url: editingProduct.image_url ?? null,
      }]).select().single();
      if (data) setProducts((prev) => [...prev, data as Product]);
    }
    setEditingProduct(null);
    setSavingProduct(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    await supabase.from("merchant_products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function toggleAvailable(p: Product) {
    await supabase.from("merchant_products").update({ available: !p.available }).eq("id", p.id);
    setProducts((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, available: !pr.available } : pr));
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
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Aucun commerce associé à ce compte.
    </div>
  );

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const pastOrders = orders.filter((o) => o.status !== "pending");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 text-white px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{merchant.name}</h1>
          <p className="text-orange-100 text-sm">{merchant.category}</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingOrders.length > 0 && (
            <span className="bg-white text-orange-500 font-bold text-sm px-3 py-1 rounded-full">
              {pendingOrders.length} nouvelle(s)
            </span>
          )}
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
            {t === "orders" && pendingOrders.length > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* COMMANDES */}
        {tab === "orders" && (
          <div className="space-y-4">
            {pendingOrders.length === 0 && pastOrders.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📭</div>
                <p>Aucune commande pour l&apos;instant</p>
              </div>
            )}
            {pendingOrders.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border-2 border-orange-400 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">🔔 Nouvelle commande</span>
                  <span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleString("fr-FR")}</span>
                </div>
                {o.order?.notes && <p className="text-sm font-semibold text-gray-800 mb-1">📝 {o.order.notes}</p>}
                <p className="text-sm text-gray-500">🏠 Livraison : {o.order?.dropoff_address}</p>
                <p className="text-sm text-gray-500">💶 Total livraison : {o.order?.price_total?.toFixed(2)} €</p>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => handleOrderAction(o.id, "rejected")}
                    className="flex-1 border border-red-200 text-red-500 font-semibold py-2.5 rounded-xl hover:bg-red-50 transition text-sm">
                    ✕ Refuser
                  </button>
                  <button onClick={() => handleOrderAction(o.id, "accepted")}
                    className="flex-2 flex-1 bg-green-500 text-white font-bold py-2.5 rounded-xl hover:bg-green-600 transition text-sm">
                    ✓ Accepter
                  </button>
                </div>
              </div>
            ))}
            {pastOrders.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Historique</h3>
                <div className="space-y-2">
                  {pastOrders.map((o) => (
                    <div key={o.id} className="bg-white rounded-xl p-4 flex items-center justify-between border border-gray-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{o.order?.notes || "Commande"}</p>
                        <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${o.status === "accepted" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                        {o.status === "accepted" ? "Acceptée" : "Refusée"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MENU */}
        {tab === "menu" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Vos produits ({products.length})</h2>
              <button onClick={() => setEditingProduct({ name: "", description: "", price: 0, category: "", available: true })}
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
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                {/* Photo miniature */}
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    {p.category && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{p.category}</span>}
                  </div>
                  {p.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{p.description}</p>}
                  <p className="text-orange-500 font-bold mt-1">{p.price.toFixed(2)} €</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleAvailable(p)}
                    className={`text-xs font-semibold px-2 py-1 rounded-full transition ${p.available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.available ? "Dispo" : "Indispo"}
                  </button>
                  <button onClick={() => setEditingProduct(p)} className="text-gray-400 hover:text-gray-600">✏️</button>
                  <button onClick={() => deleteProduct(p.id)} className="text-gray-400 hover:text-red-500">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INFOS */}
        {tab === "info" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3 text-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Informations du commerce</h2>
            <InfoRow label="Nom" value={merchant.name} />
            <InfoRow label="Catégorie" value={merchant.category} />
            <InfoRow label="Adresse" value={merchant.address} />
            <InfoRow label="Email" value={merchant.email} />
            <InfoRow label="Téléphone" value={merchant.phone} />
            <InfoRow label="SIRET" value={merchant.siret} />
            <InfoRow label="Horaires" value={merchant.opening_hours} />
            {merchant.description && <InfoRow label="Description" value={merchant.description} />}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-gray-400 text-xs">Pour modifier vos informations, contactez-nous : allo@ilestchouette.fr</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal édition produit */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{editingProduct.id ? "Modifier le produit" : "Nouveau produit"}</h3>
            <EField label="Nom *" value={editingProduct.name ?? ""} onChange={(v) => setEditingProduct((p) => ({ ...p, name: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <EField label="Prix (€) *" value={String(editingProduct.price ?? "")} onChange={(v) => setEditingProduct((p) => ({ ...p, price: parseFloat(v) || 0 }))} type="number" />
              <EField label="Catégorie" value={editingProduct.category ?? ""} onChange={(v) => setEditingProduct((p) => ({ ...p, category: v }))} />
            </div>
            <EField label="Description" value={editingProduct.description ?? ""} onChange={(v) => setEditingProduct((p) => ({ ...p, description: v }))} />

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
