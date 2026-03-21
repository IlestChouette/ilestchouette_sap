import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import PrintButton from "./PrintButton";

export const metadata: Metadata = {
  title: "Présentation — Il est chouette",
  description: "Document de présentation complet du projet Il est chouette — investisseurs, développeurs, graphistes.",
  robots: { index: false },
};

export const revalidate = 86400; // rebuild every 24h

async function getStats() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [{ count: orders }, { count: merchants }, { count: couriers }] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("merchants").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("couriers").select("*", { count: "exact", head: true }),
    ]);
    return { orders: orders ?? 0, merchants: merchants ?? 0, couriers: couriers ?? 0 };
  } catch {
    return { orders: 0, merchants: 0, couriers: 0 };
  }
}

export default async function PresentationPage() {
  const stats = await getStats();
  const updatedAt = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: "#FFFBF7", minHeight: "100vh", color: "#1F2937" }}>

      <PrintButton />

      {/* Cover */}
      <div style={{ background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)", color: "#fff", padding: "80px 60px 60px", pageBreakAfter: "always" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🦉</div>
          <h1 style={{ fontSize: 52, fontWeight: 900, margin: "0 0 8px", letterSpacing: -1 }}>Il est chouette</h1>
          <p style={{ fontSize: 22, opacity: 0.9, margin: "0 0 4px" }}>Assistant personnel à la demande</p>
          <p style={{ fontSize: 14, opacity: 0.7, margin: "0 0 40px" }}>Nice, France · SASU · SIREN 942 069 949</p>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <CoverStat value={`${stats.orders}`} label="Commandes passées" />
            <CoverStat value={`${stats.merchants}`} label="Commerçants partenaires" />
            <CoverStat value={`${stats.couriers}`} label="Coursiers actifs" />
          </div>
          <p style={{ marginTop: 48, fontSize: 13, opacity: 0.7 }}>Document mis à jour le {updatedAt} · Données en temps réel</p>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Table des matières */}
        <Section title="Table des matières">
          <ol style={{ lineHeight: 2.2, paddingLeft: 20, color: "#F97316", fontWeight: 600 }}>
            {["Qui sommes-nous ?", "Le problème & la solution", "Nos services", "Modèle économique", "Technologie & Architecture", "Applications mobiles", "Portail commerçants", "Panel administrateur", "Stack technique", "Design & Identité visuelle", "Roadmap", "Équipe", "Contact"].map((t, i) => (
              <li key={i} style={{ color: "#F97316" }}><span style={{ color: "#1F2937", fontWeight: 400 }}>{t}</span></li>
            ))}
          </ol>
        </Section>

        {/* 1. Qui sommes-nous */}
        <Section title="1. Qui sommes-nous ?">
          <p style={prose}>
            <strong>Il est chouette</strong> est un service de livraison à la demande basé à <strong>Nice, France</strong>, fondé par <strong>Fernando Fonseca</strong>. Notre mission : rendre les services du quotidien accessibles à tous, à toute heure, grâce à des <strong>coursiers humains</strong> qui connaissent le terrain.
          </p>
          <p style={prose}>
            Le nom vient du hibou — présent jour et nuit, avec une connaissance profonde de son territoire. Comme lui, nous sommes disponibles à toute heure et nous connaissons Nice rue par rue. <em>Et « chouette » parce que notre service se veut sympa, chaleureux, humain.</em>
          </p>
          <QuoteBlock>
            "Notre objectif est de devenir l&apos;allié de confiance des Niçois — pas une multinationale froide, mais un voisin fiable qui vous rend service quand vous en avez besoin."
            <br /><strong style={{ display: "block", marginTop: 8 }}>— Fernando Fonseca, Fondateur</strong>
          </QuoteBlock>
        </Section>

        {/* 2. Problème & solution */}
        <Section title="2. Le problème & la solution">
          <TwoCol
            left={
              <div>
                <h3 style={h3}>❌ Le problème</h3>
                <ul style={list}>
                  <li>Les grandes plateformes (Uber Eats, Deliveroo) prennent <strong>25–35% de commission</strong> aux commerçants</li>
                  <li>Les livraisons sont anonymes, sans lien humain</li>
                  <li>Les petits commerçants locaux sont exclus ou dépendent de géants</li>
                  <li>Les clients n&apos;ont pas accès à des services de proximité variés</li>
                  <li>Les coursiers sont mal rémunérés et mal considérés</li>
                </ul>
              </div>
            }
            right={
              <div>
                <h3 style={h3}>✅ Notre solution</h3>
                <ul style={list}>
                  <li><strong>0% de commission</strong> pour les commerçants partenaires</li>
                  <li>Coursiers humains, locaux, bien rémunérés</li>
                  <li>Agent IA conversationnel pour commander facilement</li>
                  <li>Large gamme de services (pas seulement la nourriture)</li>
                  <li>Ancrage local fort à Nice</li>
                </ul>
              </div>
            }
          />
        </Section>

        {/* 3. Services */}
        <Section title="3. Nos services & tarification">
          <p style={{ ...prose, marginBottom: 16 }}>Tous les services sont tarifés sur le même principe : <strong>frais de base + 1 €/km</strong>. Les services horaires sont facturés à l&apos;heure.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {[
              { emoji: "🛒", name: "Courses supermarché", price: "8 € + 1 €/km" },
              { emoji: "💊", name: "Pharmacie / médicaments", price: "6 € + 1 €/km" },
              { emoji: "🍕", name: "Livraison repas", price: "5 € + 1 €/km" },
              { emoji: "🗝️", name: "Clés / documents", price: "6 € + 1 €/km" },
              { emoji: "🛍️", name: "Shopping / colis", price: "8 € + 1 €/km" },
              { emoji: "⚡", name: "Express / urgent", price: "12 € + 1 €/km" },
              { emoji: "🚗", name: "Voiturier", price: "20 €/h (min 1h)" },
              { emoji: "💻", name: "Soutien informatique", price: "50 €/h (min 1h)" },
              { emoji: "🤝", name: "Assistance personnelle", price: "20 €/h (min 1h)" },
              { emoji: "🔧", name: "Bricolage / réparations", price: "50 €/h (min 1h)" },
            ].map((s) => (
              <div key={s.name} style={{ background: "#fff", border: "1px solid #FED7AA", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "#F97316", fontWeight: 600 }}>{s.price}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 4. Modèle économique */}
        <Section title="4. Modèle économique">
          <TwoCol
            left={
              <div>
                <h3 style={h3}>💰 Sources de revenus</h3>
                <ul style={list}>
                  <li><strong>Frais de livraison</strong> payés par le client (base + km)</li>
                  <li><strong>Services horaires</strong> (voiturier, IT, assistance, bricolage)</li>
                  <li>À terme : <strong>abonnement mensuel</strong> commerçants (visibilité premium)</li>
                  <li>À terme : <strong>publicité locale</strong> ciblée dans l&apos;app</li>
                </ul>
                <h3 style={{ ...h3, marginTop: 20 }}>🎯 Avantage concurrentiel</h3>
                <ul style={list}>
                  <li>0% commission (vs 25–35% des concurrents)</li>
                  <li>Agent IA propriétaire pour la prise de commande</li>
                  <li>Polyvalence des services (unique à Nice)</li>
                  <li>Image humaine et locale forte</li>
                </ul>
              </div>
            }
            right={
              <div>
                <h3 style={h3}>📊 Marché cible</h3>
                <ul style={list}>
                  <li>Nice : <strong>342 000 habitants</strong></li>
                  <li>Zone touristique : <strong>5 M de visiteurs/an</strong></li>
                  <li>+1 500 commerces indépendants</li>
                  <li>Marché livraison France : <strong>6 Md€</strong> (2024)</li>
                  <li>Croissance : +15%/an</li>
                </ul>
                <h3 style={{ ...h3, marginTop: 20 }}>💸 Paiements acceptés</h3>
                <ul style={list}>
                  <li>💳 Carte bancaire en ligne (Stripe)</li>
                  <li>💵 Espèces à la livraison</li>
                  <li>📲 Carte à la livraison</li>
                </ul>
              </div>
            }
          />
        </Section>

        {/* 5. Architecture technique */}
        <Section title="5. Technologie & Architecture">
          <p style={prose}>Le projet est organisé en <strong>monorepo</strong> avec 4 composants principaux :</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { icon: "🌐", title: "Site web (Next.js)", desc: "ilestchouette.fr — landing page, portail commerçants, admin, opérateur. Hébergé sur Vercel." },
              { icon: "📱", title: "App client (Expo)", desc: "iOS & Android. Agent IA conversationnel, suivi en temps réel, paiement Stripe, multi-langue." },
              { icon: "🚴", title: "App coursier (Expo)", desc: "iOS & Android. Affectation des missions, navigation Maps, gestion des disponibilités." },
              { icon: "⚙️", title: "Backend (Supabase)", desc: "Base de données PostgreSQL, Auth, Edge Functions Deno, Realtime, Row Level Security." },
            ].map((c) => (
              <div key={c.title} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
          <h3 style={h3}>🗄️ Base de données (tables principales)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#FFF7ED" }}>
                {["Table", "Description", "Colonnes clés"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", borderBottom: "2px solid #FED7AA", color: "#92400E" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["orders", "Commandes clients", "service_type, pickup_address, dropoff_address, price_total, status, payment_method"],
                ["couriers", "Coursiers enregistrés", "name, email, phone, is_active"],
                ["courier_assignments", "Missions des coursiers", "courier_id, order_id, status"],
                ["merchants", "Commerçants partenaires", "name, category, address, siret, status"],
                ["merchant_products", "Catalogue produits", "merchant_id, name, price, category, available"],
                ["merchant_orders", "Commandes commerçants", "order_id, merchant_id, status"],
                ["profiles", "Profils clients", "full_name, phone, preferred_language"],
                ["saved_addresses", "Adresses sauvegardées", "user_id, label, address"],
              ].map(([table, desc, cols], i) => (
                <tr key={table} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#F97316", fontFamily: "monospace", borderBottom: "1px solid #F3F4F6" }}>{table}</td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #F3F4F6" }}>{desc}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "#6B7280", fontFamily: "monospace", borderBottom: "1px solid #F3F4F6" }}>{cols}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 style={{ ...h3, marginTop: 20 }}>⚡ Edge Functions (Supabase / Deno)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { name: "chat-agent", desc: "Agent IA Anthropic Claude (claude-sonnet-4-6) — prise de commande conversationnelle, injection du catalogue commerçants" },
              { name: "create-payment-intent", desc: "Création d'intent Stripe pour le paiement en ligne" },
              { name: "notify-new-order", desc: "Email de notification admin via Resend lors d'une nouvelle commande" },
              { name: "notify-courier", desc: "Notification push Expo vers les coursiers disponibles" },
            ].map(f => (
              <div key={f.name} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", borderLeft: "3px solid #F97316" }}>
                <code style={{ fontWeight: 700, color: "#F97316", whiteSpace: "nowrap", fontSize: 13 }}>{f.name}</code>
                <span style={{ fontSize: 13, color: "#6B7280" }}>{f.desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 6. App client */}
        <Section title="6. Application mobile client">
          <p style={prose}>Disponible sur iOS et Android. Développée avec <strong>Expo / React Native</strong>.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {[
              { icon: "🤖", title: "Agent IA", desc: "Commander en langage naturel, comme par SMS. L'IA guide la conversation." },
              { icon: "📍", title: "Suivi temps réel", desc: "Timeline verticale avec statut en direct via Supabase Realtime." },
              { icon: "💳", title: "Paiement Stripe", desc: "Carte en ligne, espèces ou carte à la livraison." },
              { icon: "📋", title: "Historique", desc: "Toutes les commandes avec filtres, stats et notes." },
              { icon: "👤", title: "Profil", desc: "Adresses sauvegardées, langue, mot de passe." },
              { icon: "🌍", title: "Multi-langue", desc: "Français, anglais, espagnol." },
            ].map(f => (
              <div key={f.title} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 7. App coursier */}
        <Section title="7. Application mobile coursier">
          <p style={prose}>Application dédiée aux coursiers. Développée avec <strong>Expo / React Native</strong>.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {[
              { icon: "🔔", title: "Nouvelles missions", desc: "Affichage Uber-like des commandes disponibles à accepter ou passer." },
              { icon: "🗺️", title: "Navigation", desc: "Lien direct Apple Maps (iOS) ou Google Maps (Android) avec l'itinéraire." },
              { icon: "📅", title: "Disponibilités", desc: "Gestion des jours et horaires de disponibilité." },
              { icon: "✅", title: "Validation", desc: "Code de validation remis au client à la livraison." },
              { icon: "📊", title: "Dashboard", desc: "Historique des livraisons, gains, statut des missions." },
            ].map(f => (
              <div key={f.title} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 8. Portail commerçants */}
        <Section title="8. Portail commerçants (web)">
          <p style={prose}>Accessible sur <strong>ilestchouette.fr/commercant</strong>. Permet aux commerçants de rejoindre la plateforme et gérer leur activité.</p>
          <TwoCol
            left={
              <div>
                <h3 style={h3}>📝 Inscription</h3>
                <ul style={list}>
                  <li>Formulaire 3 étapes</li>
                  <li>Infos commerce (nom, catégorie, SIRET, adresse, horaires)</li>
                  <li>Catalogue produits/menu</li>
                  <li>Validation admin requise</li>
                  <li>Notification WhatsApp à Fernando</li>
                </ul>
              </div>
            }
            right={
              <div>
                <h3 style={h3}>📊 Dashboard commerçant</h3>
                <ul style={list}>
                  <li>Connexion sécurisée (Supabase Auth)</li>
                  <li>Onglet Commandes (accepter / refuser)</li>
                  <li>Onglet Menu (ajouter, modifier, supprimer, disponibilité)</li>
                  <li>Onglet Mon commerce (modifier les infos)</li>
                </ul>
              </div>
            }
          />
        </Section>

        {/* 9. Admin */}
        <Section title="9. Panel administrateur">
          <p style={prose}>Accessible sur <strong>ilestchouette.fr/admin</strong> (accès restreint). Géré par Fernando.</p>
          <ul style={list}>
            <li>Vue d&apos;ensemble des commandes en cours et historique</li>
            <li>Gestion des coursiers (inscription, activation)</li>
            <li>Gestion des commerçants (validation, refus)</li>
            <li>Facturation clients (PDF)</li>
            <li>Stats Google Analytics intégrées</li>
          </ul>
        </Section>

        {/* 10. Stack */}
        <Section title="10. Stack technique complète">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { cat: "Frontend Web", items: ["Next.js 16 (App Router)", "TypeScript", "Tailwind CSS v4", "Vercel (hébergement)"] },
              { cat: "Apps mobiles", items: ["Expo (React Native)", "expo-router", "Stripe React Native", "react-i18next"] },
              { cat: "Backend", items: ["Supabase (PostgreSQL)", "Supabase Auth", "Edge Functions (Deno)", "Supabase Realtime"] },
              { cat: "IA & APIs", items: ["Anthropic Claude claude-sonnet-4-6", "Stripe (paiements)", "Resend (emails)", "Expo Push Notifications"] },
              { cat: "DevOps", items: ["GitHub (monorepo)", "Vercel CI/CD auto", "Supabase CLI"] },
              { cat: "Design", items: ["Couleur principale : #F97316 (orange)", "Police : Système natif", "Style : Clean, chaleureux, moderne"] },
            ].map(c => (
              <div key={c.cat} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700, color: "#F97316", marginBottom: 8, fontSize: 13 }}>{c.cat}</div>
                <ul style={{ margin: 0, paddingLeft: 16, listStyle: "disc" }}>
                  {c.items.map(i => <li key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 3 }}>{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* 11. Design */}
        <Section title="11. Design & Identité visuelle">
          <TwoCol
            left={
              <div>
                <h3 style={h3}>🎨 Palette de couleurs</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {[
                    { hex: "#F97316", name: "Orange principal", usage: "CTA, headers, boutons" },
                    { hex: "#EA580C", name: "Orange foncé", usage: "Hover, accents" },
                    { hex: "#FFF7ED", name: "Orange pâle", usage: "Backgrounds" },
                    { hex: "#1F2937", name: "Gris foncé", usage: "Textes principaux" },
                    { hex: "#6B7280", name: "Gris moyen", usage: "Textes secondaires" },
                    { hex: "#4ADE80", name: "Vert", usage: "Statuts positifs" },
                    { hex: "#EF4444", name: "Rouge", usage: "Erreurs, annulations" },
                  ].map(c => (
                    <div key={c.hex} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: c.hex, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 6 }}>{c.hex}</span>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>{c.usage}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            }
            right={
              <div>
                <h3 style={h3}>✏️ Directives de design</h3>
                <ul style={list}>
                  <li>Style <strong>chaleureux et humain</strong> — pas de froid corporate</li>
                  <li>Coins arrondis (border-radius 12–24px)</li>
                  <li>Ombres légères et douces</li>
                  <li>Emojis utilisés avec parcimonie pour la chaleur</li>
                  <li>Police système native sur mobile</li>
                  <li>Contraste élevé pour l&apos;accessibilité</li>
                  <li>Orange dominant = énergie, proximité, optimisme</li>
                </ul>
                <h3 style={{ ...h3, marginTop: 20 }}>🦉 Mascotte</h3>
                <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
                  Le hibou symbolise la disponibilité (jour et nuit), la connaissance locale, la sagesse et la fiabilité. Il est utilisé dans le logo, les communications et l&apos;app.
                </p>
              </div>
            }
          />
        </Section>

        {/* 12. Roadmap */}
        <Section title="12. Roadmap">
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { period: "✅ Fait", color: "#4ADE80", bg: "#F0FDF4", items: ["Site web ilestchouette.fr", "App client iOS/Android (agent IA)", "App coursier iOS/Android", "Portail commerçants + dashboard", "Admin panel", "Paiements Stripe", "Notifications email (Resend)", "Multi-langue (FR/EN/ES)", "Catalogue commerçants dans l'IA"] },
              { period: "🟡 En cours / Prochain", color: "#F97316", bg: "#FFF7ED", items: ["Soumission App Store (Apple, 99€/an)", "Soumission Google Play (25€)", "Email validation commerçants", "Email notification commerçant sur nouvelle commande", "Vérification domaine Resend"] },
              { period: "🔵 Futur (3–6 mois)", color: "#3B82F6", bg: "#EFF6FF", items: ["Système de notation coursiers", "Programme de fidélité clients", "Abonnement mensuel commerçants premium", "Expansion géographique (Cannes, Antibes, Monaco)", "Tableau de bord analytics avancé", "Intégration Google Data API admin"] },
            ].map(phase => (
              <div key={phase.period} style={{ borderLeft: `3px solid ${phase.color}`, paddingLeft: 20, paddingBottom: 24, marginLeft: 8 }}>
                <div style={{ background: phase.bg, display: "inline-block", borderRadius: 8, padding: "4px 12px", fontWeight: 700, fontSize: 13, color: phase.color, marginBottom: 10 }}>{phase.period}</div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {phase.items.map(item => <li key={item} style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* 13. Équipe */}
        <Section title="13. Équipe">
          <div style={{ background: "#fff", border: "1px solid #FED7AA", borderRadius: 16, padding: 24, display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ width: 70, height: 70, borderRadius: 35, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>F</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>Fernando Francisco Fonseca Pinzón</div>
              <div style={{ color: "#F97316", fontWeight: 600, marginBottom: 6 }}>Président & Directeur — Fondateur</div>
              <p style={{ margin: 0, fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
                Entrepreneur passionné basé à Nice. Fondateur et opérateur principal de Il est chouette. Gère la stratégie, les opérations, le développement commercial et la validation des partenaires.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Tag>📞 06 95 42 73 12</Tag>
                <Tag>📧 allo@ilestchouette.fr</Tag>
                <Tag>🌐 ilestchouette.fr</Tag>
              </div>
            </div>
          </div>
          <p style={{ ...prose, marginTop: 16 }}>
            L&apos;équipe est en cours de constitution. Nous recherchons activement des <strong>coursiers partenaires</strong>, des <strong>commerçants locaux</strong> et potentiellement un <strong>co-fondateur technique</strong>.
          </p>
        </Section>

        {/* 14. Contact */}
        <Section title="14. Contact & Liens">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { icon: "🌐", label: "Site web", value: "ilestchouette.fr" },
              { icon: "📧", label: "Email", value: "allo@ilestchouette.fr" },
              { icon: "📞", label: "Téléphone", value: "06 95 42 73 12" },
              { icon: "🏛️", label: "Forme juridique", value: "SASU — Capital 5 000 €" },
              { icon: "🔢", label: "SIREN", value: "942 069 949 · RCS Nice" },
              { icon: "📍", label: "Siège social", value: "143 Promenade des Anglais, 06200 Nice" },
              { icon: "📱", label: "App client", value: "App Store / Google Play (bientôt)" },
              { icon: "🚀", label: "Hébergement web", value: "Vercel — déploiement auto sur push" },
              { icon: "💻", label: "Code source", value: "GitHub — IlestChouette/ilestchouette_sap" },
            ].map(c => (
              <div key={c.label} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>{c.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "40px 0 20px", color: "#9CA3AF", fontSize: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🦉</div>
          <strong style={{ color: "#F97316" }}>Il est chouette</strong> — SASU au capital de 5 000 € — SIREN 942 069 949 — RCS Nice<br />
          143 Promenade des Anglais, 06200 Nice, France<br />
          Document généré automatiquement · Mis à jour le {updatedAt} · Données en temps réel
        </div>

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          @page { margin: 20mm; }
        }
      `}</style>
    </div>
  );
}

// ── Composants utilitaires ──────────────────────────────

function CoverStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>{value}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", borderBottom: "3px solid #F97316", paddingBottom: 10, marginBottom: 20 }}>{title}</h2>
      {children}
    </div>
  );
}

function QuoteBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFF7ED", borderLeft: "4px solid #F97316", borderRadius: "0 12px 12px 0", padding: "16px 20px", margin: "20px 0", fontStyle: "italic", color: "#92400E", lineHeight: 1.7 }}>
      {children}
    </div>
  );
}

function TwoCol({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#92400E" }}>
      {children}
    </span>
  );
}

// ── Styles constants ─────────────────────────────────────
const prose: React.CSSProperties = { fontSize: 15, lineHeight: 1.7, color: "#374151", margin: "0 0 12px" };
const h3: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 10px" };
const list: React.CSSProperties = { fontSize: 13, color: "#374151", lineHeight: 2, paddingLeft: 18, margin: "0 0 8px" };
