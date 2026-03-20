"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORIES = [
  "Restaurant", "Pizzeria", "Boulangerie / Pâtisserie", "Boucherie / Traiteur",
  "Pharmacie", "Supermarché / Épicerie", "Fleuriste", "Pressing / Cordonnerie",
  "Beauté / Bien-être", "Autre",
];

type Product = { name: string; description: string; price: string; category: string };

const emptyProduct = (): Product => ({ name: "", description: "", price: "", category: "" });

export default function CommercantPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Infos commerce
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [siret, setSiret] = useState("");

  // Produits
  const [products, setProducts] = useState<Product[]>([emptyProduct()]);

  function updateProduct(i: number, field: keyof Product, value: string) {
    setProducts((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  function addProduct() {
    setProducts((prev) => [...prev, emptyProduct()]);
  }

  function removeProduct(i: number) {
    setProducts((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const { data: merchant, error: mErr } = await supabase
        .from("merchants")
        .insert([{ name, address, category, phone, email, description, opening_hours: openingHours, siret: siret || null, status: "pending" }])
        .select("id")
        .single();

      if (mErr) throw new Error(mErr.message);

      const validProducts = products.filter((p) => p.name.trim() && p.price);
      if (validProducts.length > 0) {
        await supabase.from("merchant_products").insert(
          validProducts.map((p) => ({
            merchant_id: merchant.id,
            name: p.name,
            description: p.description || null,
            price: parseFloat(p.price),
            category: p.category || null,
          }))
        );
      }

      setDone(true);
    } catch (e: any) {
      setError(e.message ?? "Une erreur est survenue");
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Demande envoyée !</h1>
          <p className="text-gray-500 mb-6">
            Nous allons examiner votre dossier et vous contacterons sous 24-48h à l&apos;adresse <strong>{email}</strong>.
          </p>
          <a href="/" className="inline-block bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition">
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Hero */}
      <div className="bg-orange-500 text-white py-14 px-6 text-center">
        <h1 className="text-3xl font-bold mb-3">Rejoignez Il est chouette</h1>
        <p className="text-orange-100 max-w-xl mx-auto text-lg">
          Proposez vos produits à la livraison sans commission. Nos coursiers livrent vos clients à Nice.
        </p>
        <div className="flex justify-center gap-8 mt-8 text-sm">
          {["0% de commission", "Livraison rapide", "Vos clients fidélisés"].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="text-orange-200">✓</span> {t}
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Steps */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {([1, 2, 3] as const).map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>{s}</div>
              {s < 3 && <div className={`w-12 h-1 rounded ${step > s ? "bg-orange-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-500 mb-6">
          {step === 1 && "Informations du commerce"}
          {step === 2 && "Vos produits / menu"}
          {step === 3 && "Récapitulatif"}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

          {/* ÉTAPE 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Votre commerce</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nom du commerce *" value={name} onChange={setName} placeholder="Pizza Cresci" />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Catégorie *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    <option value="">Sélectionner…</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <Field label="Adresse complète *" value={address} onChange={setAddress} placeholder="12 rue Masséna, 06000 Nice" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Email *" value={email} onChange={setEmail} placeholder="contact@pizzacresci.fr" type="email" />
                <Field label="Téléphone" value={phone} onChange={setPhone} placeholder="04 93 XX XX XX" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description courte</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={3} placeholder="Pizzeria napolitaine depuis 1985, cuisson au feu de bois…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>

              <Field label="Horaires d'ouverture" value={openingHours} onChange={setOpeningHours}
                placeholder="Lun-Sam 11h-14h / 18h-23h, Dim fermé" />

              <Field label="Numéro SIRET *" value={siret} onChange={setSiret} placeholder="362 521 879 00034" />

              <button onClick={() => setStep(2)}
                disabled={!name || !category || !address || !email || !siret}
                className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 disabled:opacity-40 transition">
                Continuer →
              </button>
            </div>
          )}

          {/* ÉTAPE 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Vos produits / menu</h2>
                <span className="text-sm text-gray-400">{products.filter(p => p.name).length} produit(s)</span>
              </div>
              <p className="text-sm text-gray-500">Ajoutez vos produits avec les prix. Vous pourrez les modifier à tout moment depuis votre espace.</p>

              <div className="space-y-4">
                {products.map((p, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Produit {i + 1}</span>
                      {products.length > 1 && (
                        <button onClick={() => removeProduct(i)} className="text-red-400 hover:text-red-600 text-sm">✕ Supprimer</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Nom *" value={p.name} onChange={(v) => updateProduct(i, "name", v)} placeholder="Pizza 4 fromages" />
                      <Field label="Prix (€) *" value={p.price} onChange={(v) => updateProduct(i, "price", v)} placeholder="14.50" type="number" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Catégorie" value={p.category} onChange={(v) => updateProduct(i, "category", v)} placeholder="Pizza, Entrée…" />
                      <Field label="Description" value={p.description} onChange={(v) => updateProduct(i, "description", v)} placeholder="Mozzarella, gorgonzola…" />
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addProduct}
                className="w-full border-2 border-dashed border-orange-300 text-orange-500 font-semibold py-3 rounded-xl hover:bg-orange-50 transition">
                + Ajouter un produit
              </button>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-4 rounded-xl hover:bg-gray-50 transition">
                  ← Retour
                </button>
                <button onClick={() => setStep(3)} className="flex-2 flex-1 bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition">
                  Continuer →
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — Récapitulatif */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Récapitulatif</h2>

              <div className="bg-orange-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Commerce</span><span className="font-semibold">{name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Catégorie</span><span className="font-semibold">{category}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Adresse</span><span className="font-semibold text-right max-w-[60%]">{address}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-semibold">{email}</span></div>
                {phone && <div className="flex justify-between"><span className="text-gray-500">Téléphone</span><span className="font-semibold">{phone}</span></div>}
                {openingHours && <div className="flex justify-between"><span className="text-gray-500">Horaires</span><span className="font-semibold text-right max-w-[60%]">{openingHours}</span></div>}
              </div>

              {products.filter(p => p.name).length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">{products.filter(p => p.name).length} produit(s) ajouté(s)</p>
                  <div className="space-y-2">
                    {products.filter(p => p.name).map((p, i) => (
                      <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span>{p.name}</span>
                        <span className="font-bold text-orange-500">{parseFloat(p.price || "0").toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-4 rounded-xl hover:bg-gray-50 transition">
                  ← Retour
                </button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex-1 bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 disabled:opacity-50 transition">
                  {submitting ? "Envoi…" : "Envoyer ma demande ✓"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </div>
  );
}
