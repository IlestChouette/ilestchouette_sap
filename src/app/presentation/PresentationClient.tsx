"use client";

import { useEffect, useRef, useState } from "react";
import { logout } from "./actions";

type Stats = { orders: number; merchants: number; couriers: number };

const SECTIONS = [
  { id: "histoire",    label: "Histoire" },
  { id: "probleme",   label: "Problème" },
  { id: "services",   label: "Services" },
  { id: "modele",     label: "Modèle" },
  { id: "tech",       label: "Tech" },
  { id: "apps",       label: "Apps" },
  { id: "commercants",label: "Commerçants" },
  { id: "design",     label: "Design" },
  { id: "roadmap",    label: "Roadmap" },
  { id: "equipe",     label: "Équipe" },
];

export default function PresentationClient({ stats, updatedAt }: { stats: Stats; updatedAt: string }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const owlRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [navVisible, setNavVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrollY(y);
      setNavVisible(y > window.innerHeight * 0.7);

      // Active section detection
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(s.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0)";
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#FAFAF8", color: "#1F2937", overflowX: "hidden" }}>

      {/* ── FLOATING NAV ───────────────────────────────── */}
      <nav className="no-print" style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 100, display: "flex", alignItems: "center", gap: 2,
        background: "rgba(15,15,15,0.85)", backdropFilter: "blur(16px)",
        borderRadius: 50, padding: "6px 10px",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        transition: "opacity 0.4s, transform 0.4s",
        opacity: navVisible ? 1 : 0,
        pointerEvents: navVisible ? "auto" : "none",
        flexWrap: "wrap", justifyContent: "center",
      }}>
        <span style={{ fontSize: 16, marginRight: 4 }}>🦉</span>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => scrollTo(s.id)} style={{
            background: activeSection === s.id ? "#F97316" : "transparent",
            color: activeSection === s.id ? "#fff" : "rgba(255,255,255,0.6)",
            border: "none", borderRadius: 30, padding: "5px 12px",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s", whiteSpace: "nowrap",
          }}>
            {s.label}
          </button>
        ))}
        <form action={logout} style={{ marginLeft: 6 }}>
          <button type="submit" style={{
            background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)",
            border: "none", borderRadius: 30, padding: "5px 10px", fontSize: 11, cursor: "pointer",
          }}>✕</button>
        </form>
      </nav>

      {/* Print button */}
      <div className="no-print" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100 }}>
        <button onClick={() => window.print()} style={{
          background: "linear-gradient(135deg, #F97316, #EA580C)",
          color: "#fff", border: "none", borderRadius: 14,
          padding: "12px 20px", fontWeight: 700, fontSize: 13,
          cursor: "pointer", boxShadow: "0 8px 24px rgba(249,115,22,0.4)",
        }}>🖨️ PDF</button>
      </div>

      {/* ── HERO with PARALLAX ─────────────────────────── */}
      <div ref={heroRef} style={{
        minHeight: "100vh", position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #0F0F0F 0%, #1a0a00 60%, #2d1200 100%)",
      }}>
        {/* Parallax bg blobs */}
        <div ref={bgRef} style={{
          position: "absolute", inset: 0, zIndex: 0,
          transform: `translateY(${scrollY * 0.4}px)`,
        }}>
          <div style={{
            position: "absolute", width: "70vw", height: "70vw", borderRadius: "50%",
            top: "-20%", left: "-15%",
            background: "radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)",
            filter: "blur(60px)",
          }} />
          <div style={{
            position: "absolute", width: "50vw", height: "50vw", borderRadius: "50%",
            bottom: "0%", right: "-10%",
            background: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
          }} />
          {/* Grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(rgba(249,115,22,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.05) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }} />
        </div>

        {/* Hero content */}
        <div style={{
          position: "relative", zIndex: 1, textAlign: "center", padding: "0 24px",
          transform: `translateY(${scrollY * 0.25}px)`,
        }}>
          <div ref={owlRef} style={{
            fontSize: 96, marginBottom: 24, display: "inline-block",
            filter: "drop-shadow(0 0 40px rgba(249,115,22,0.7))",
            animation: "float 4s ease-in-out infinite",
          }}>🦉</div>
          <h1 style={{
            fontSize: "clamp(48px, 8vw, 88px)", fontWeight: 900, color: "#fff",
            margin: "0 0 8px", letterSpacing: -2, lineHeight: 1,
          }}>Il est chouette</h1>
          <p style={{
            fontSize: "clamp(16px, 2.5vw, 22px)", color: "rgba(255,255,255,0.6)",
            margin: "0 0 48px", fontWeight: 400,
          }}>Assistant personnel à la demande · Nice, France</p>

          {/* Stats */}
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { n: stats.orders,    label: "Commandes", icon: "📦" },
              { n: stats.merchants, label: "Commerçants", icon: "🏪" },
              { n: stats.couriers,  label: "Coursiers", icon: "🚴" },
            ].map(s => (
              <div key={s.label} style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20, padding: "20px 32px", backdropFilter: "blur(12px)",
                textAlign: "center", minWidth: 120,
              }}>
                <div style={{ fontSize: 28 }}>{s.icon}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#F97316", lineHeight: 1.1 }}>{s.n}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 48, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            Données en temps réel · {updatedAt}
          </p>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center",
          animation: "bounce 2s ease-in-out infinite",
        }}>
          <div>↓</div>
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* 1. Histoire */}
        <Section id="histoire" label="Qui sommes-nous ?">
          <div className="reveal" style={revealStyle}>
            <p style={proseStyle}>
              <strong>Il est chouette</strong> est un service de livraison à la demande fondé par{" "}
              <strong>Fernando Francisco Fonseca Pinzón</strong> à <strong>Nice, France</strong>. Notre mission :
              rendre les services du quotidien accessibles à tous, à toute heure, grâce à des <strong>coursiers humains</strong>.
            </p>
            <p style={proseStyle}>
              Le nom vient du hibou — présent jour et nuit, avec une connaissance profonde de son territoire.
              Comme lui, nous sommes disponibles à toute heure et connaissons Nice rue par rue.{" "}
              <em>Et « chouette » parce que notre service se veut sympa, chaleureux, humain.</em>
            </p>
            <QuoteBlock>
              "Notre objectif est de devenir l&apos;allié de confiance des Niçois — pas une multinationale froide,
              mais un voisin fiable qui vous rend service quand vous en avez besoin."
              <br /><strong style={{ display: "block", marginTop: 8 }}>— Fernando Fonseca, Président & Directeur</strong>
            </QuoteBlock>
          </div>
        </Section>

        {/* 2. Problème & Solution */}
        <Section id="probleme" label="Le problème & la solution">
          <div className="reveal" style={{ ...revealStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "#FEF2F2", borderRadius: 20, padding: 28, border: "1px solid #FECACA" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#991B1B", margin: "0 0 16px" }}>❌ Le problème</h3>
              <ul style={listStyle}>
                <li>Plateformes prenant <strong>25–35% de commission</strong> aux commerçants</li>
                <li>Livraisons anonymes, sans lien humain</li>
                <li>Petits commerces locaux exclus</li>
                <li>Aucun service polyvalent à Nice</li>
                <li>Coursiers mal rémunérés</li>
              </ul>
            </div>
            <div style={{ background: "#F0FDF4", borderRadius: 20, padding: 28, border: "1px solid #BBF7D0" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#166534", margin: "0 0 16px" }}>✅ Notre solution</h3>
              <ul style={listStyle}>
                <li><strong>0% de commission</strong> pour les commerçants</li>
                <li>Coursiers humains, locaux, bien rémunérés</li>
                <li>Agent IA conversationnel pour commander</li>
                <li>10 services différents (pas seulement la nourriture)</li>
                <li>Ancrage local fort à Nice</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 3. Services */}
        <Section id="services" label="Nos services & tarification">
          <p className="reveal" style={{ ...revealStyle, ...proseStyle, marginBottom: 24 }}>
            Tous tarifés sur le même principe : <strong>frais de base + 1 €/km</strong>.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {[
              { emoji: "🛒", name: "Courses supermarché", price: "8 € + 1 €/km", delay: 0 },
              { emoji: "💊", name: "Pharmacie", price: "6 € + 1 €/km", delay: 50 },
              { emoji: "🍕", name: "Livraison repas", price: "5 € + 1 €/km", delay: 100 },
              { emoji: "🗝️", name: "Clés / documents", price: "6 € + 1 €/km", delay: 150 },
              { emoji: "🛍️", name: "Shopping / colis", price: "8 € + 1 €/km", delay: 200 },
              { emoji: "⚡", name: "Express / urgent", price: "12 € + 1 €/km", delay: 250 },
              { emoji: "🚗", name: "Voiturier", price: "20 €/h", delay: 300 },
              { emoji: "💻", name: "Soutien informatique", price: "50 €/h", delay: 350 },
              { emoji: "🤝", name: "Assistance personnelle", price: "20 €/h", delay: 400 },
              { emoji: "🔧", name: "Bricolage", price: "50 €/h", delay: 450 },
            ].map(s => (
              <div key={s.name} className="reveal" style={{
                ...revealStyle,
                background: "#fff", borderRadius: 18, padding: 20,
                border: "1px solid #F3F4F6",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "default",
                transitionDelay: `${s.delay}ms`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(249,115,22,0.15)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)";
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{s.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 6 }}>{s.name}</div>
                <div style={{ fontSize: 13, color: "#F97316", fontWeight: 700 }}>{s.price}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 4. Modèle économique */}
        <Section id="modele" label="Modèle économique">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { title: "💰 Revenus", color: "#FFF7ED", border: "#FED7AA", items: ["Frais de livraison (base + km)", "Services horaires", "Abonnement premium commerçants (futur)", "Publicité locale ciblée (futur)"] },
              { title: "🎯 Marché cible", color: "#F0F9FF", border: "#BAE6FD", items: ["Nice : 342 000 habitants", "5 M touristes/an", "+1 500 commerces indépendants", "Marché livraison France : 6 Md€", "Croissance : +15%/an"] },
              { title: "🏆 Avantages concurrentiels", color: "#F0FDF4", border: "#BBF7D0", items: ["0% commission (vs 25–35% concurrents)", "Agent IA propriétaire", "Polyvalence unique à Nice", "Image humaine et locale"] },
              { title: "💳 Paiements acceptés", color: "#FDF4FF", border: "#E9D5FF", items: ["Carte bancaire en ligne (Stripe)", "Espèces à la livraison", "Carte à la livraison"] },
            ].map(b => (
              <div key={b.title} className="reveal" style={{
                ...revealStyle,
                background: b.color, borderRadius: 20, padding: 24, border: `1px solid ${b.border}`,
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: "0 0 14px" }}>{b.title}</h3>
                <ul style={listStyle}>
                  {b.items.map(i => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* 5. Tech */}
        <Section id="tech" label="Technologie & Architecture">
          <div className="reveal" style={{ ...revealStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            {[
              { icon: "🌐", title: "Site web", sub: "Next.js 16 · TypeScript · Tailwind v4", detail: "Vercel — CI/CD auto sur push GitHub" },
              { icon: "📱", title: "App client", sub: "Expo / React Native · iOS & Android", detail: "Agent IA · Stripe · Supabase Realtime" },
              { icon: "🚴", title: "App coursier", sub: "Expo / React Native · iOS & Android", detail: "Missions · Maps · Disponibilités" },
              { icon: "⚙️", title: "Backend", sub: "Supabase · PostgreSQL · Deno", detail: "Auth · Edge Functions · RLS · Realtime" },
            ].map(c => (
              <div key={c.title} style={{
                background: "#fff", border: "1px solid #E5E7EB", borderRadius: 18, padding: 22,
                display: "flex", gap: 16, alignItems: "flex-start",
              }}>
                <div style={{ fontSize: 36, flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: "#F97316", fontWeight: 600, marginBottom: 4 }}>{c.sub}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>{c.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="reveal" style={{ ...revealStyle, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {[
              { cat: "Frontend Web", tech: ["Next.js 16", "TypeScript", "Tailwind CSS v4"] },
              { cat: "Apps mobiles", tech: ["Expo (React Native)", "expo-router", "Stripe React Native"] },
              { cat: "Backend", tech: ["Supabase PostgreSQL", "Supabase Auth", "Edge Functions Deno"] },
              { cat: "IA & Intégrations", tech: ["Anthropic claude-sonnet-4-6", "Stripe Payments", "Resend Email"] },
            ].map(c => (
              <div key={c.cat} style={{ background: "#F8FAFC", borderRadius: 14, padding: 16, borderLeft: "3px solid #F97316" }}>
                <div style={{ fontWeight: 700, color: "#F97316", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{c.cat}</div>
                {c.tech.map(t => (
                  <div key={t} style={{ fontSize: 13, color: "#374151", padding: "3px 0", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#F97316", fontSize: 10 }}>●</span> {t}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>

        {/* 6. Apps */}
        <Section id="apps" label="Applications mobiles">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              {
                title: "App Client", emoji: "📱",
                color: "linear-gradient(135deg, #F97316, #DC2626)",
                features: ["🤖 Agent IA conversationnel (Claude)", "📍 Suivi temps réel (timeline)", "💳 Paiement Stripe intégré", "📋 Historique avec filtres", "👤 Profil + adresses sauvegardées", "🌍 Multi-langue FR/EN/ES"],
              },
              {
                title: "App Coursier", emoji: "🚴",
                color: "linear-gradient(135deg, #1D4ED8, #7C3AED)",
                features: ["🔔 Missions disponibles (Uber-like)", "🗺️ Navigation Apple/Google Maps", "📅 Gestion des disponibilités", "✅ Code de validation livraison", "📊 Historique des livraisons", "📸 Validation en temps réel"],
              },
            ].map(app => (
              <div key={app.title} className="reveal" style={{ ...revealStyle, borderRadius: 24, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                <div style={{ background: app.color, padding: "28px 24px 24px" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>{app.emoji}</div>
                  <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>{app.title}</h3>
                </div>
                <div style={{ background: "#fff", padding: 20 }}>
                  {app.features.map(f => (
                    <div key={f} style={{ fontSize: 13, color: "#374151", padding: "7px 0", borderBottom: "1px solid #F9FAFB" }}>{f}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 7. Commerçants */}
        <Section id="commercants" label="Portail commerçants">
          <div className="reveal" style={{ ...revealStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: 28, border: "1px solid #E5E7EB" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 14px" }}>📝 Inscription (ilestchouette.fr/commercant)</h3>
              <ul style={listStyle}>
                <li>Formulaire 3 étapes (5 min)</li>
                <li>Nom, catégorie, adresse, SIRET, horaires</li>
                <li>Catalogue produits / menu</li>
                <li>Validation admin requise</li>
                <li>0% commission garantie</li>
              </ul>
            </div>
            <div style={{ background: "#fff", borderRadius: 20, padding: 28, border: "1px solid #E5E7EB" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 14px" }}>📊 Dashboard commerçant</h3>
              <ul style={listStyle}>
                <li>Connexion sécurisée</li>
                <li>Gestion commandes (accepter/refuser)</li>
                <li>Catalogue produits (CRUD complet)</li>
                <li>Modifier les infos du commerce</li>
                <li>Visible dans l&apos;app client dès validation</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 8. Design */}
        <Section id="design" label="Design & Identité visuelle">
          <div className="reveal" style={{ ...revealStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>🎨 Palette officielle</h3>
              {[
                { hex: "#F97316", name: "Orange principal", usage: "CTA, headers, boutons" },
                { hex: "#EA580C", name: "Orange foncé", usage: "Hover, accents" },
                { hex: "#FFF7ED", name: "Orange pâle", usage: "Backgrounds" },
                { hex: "#1F2937", name: "Gris foncé", usage: "Textes principaux" },
                { hex: "#6B7280", name: "Gris moyen", usage: "Textes secondaires" },
                { hex: "#4ADE80", name: "Vert succès", usage: "Statuts positifs" },
                { hex: "#EF4444", name: "Rouge erreur", usage: "Annulations, erreurs" },
              ].map(c => (
                <div key={c.hex} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: c.hex, border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }} />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                    <span style={{ color: "#9CA3AF", fontSize: 11, marginLeft: 6, fontFamily: "monospace" }}>{c.hex}</span>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{c.usage}</div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>✏️ Directives</h3>
              {[
                { icon: "🦉", text: "Mascotte hibou avec lunettes — orange + noir" },
                { icon: "📐", text: "Coins arrondis : 12–24px (style doux)" },
                { icon: "☀️", text: "Orange = énergie, proximité, optimisme" },
                { icon: "💬", text: "Ton : chaleureux, humain, jamais corporate" },
                { icon: "📱", text: "Mobile-first — UX simple et directe" },
                { icon: "♿", text: "Contrastes élevés pour l'accessibilité" },
              ].map(d => (
                <div key={d.text} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{d.icon}</span>
                  <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{d.text}</span>
                </div>
              ))}
              <div style={{ marginTop: 20, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>SASU IL EST CHOUETTE</div>
                <div style={{ fontSize: 12, color: "#92400E" }}>SIREN 942 069 949 · RCS Nice<br />Capital 5 000 € · Créée le 28/02/2025<br />143 Promenade des Anglais, 06200 Nice</div>
              </div>
            </div>
          </div>
        </Section>

        {/* 9. Roadmap */}
        <Section id="roadmap" label="Roadmap">
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { period: "✅ Fait", color: "#4ADE80", bg: "#F0FDF4", border: "#BBF7D0", items: ["Site web ilestchouette.fr", "App client iOS/Android (agent IA Claude)", "App coursier iOS/Android", "Portail commerçants + dashboard", "Admin panel", "Paiements Stripe", "Notifications email (Resend)", "Multi-langue FR/EN/ES", "Catalogue commerçants intégré dans l'IA", "Page présentation (ce document)", "Suivi commandes temps réel"] },
              { period: "🟡 En cours", color: "#F97316", bg: "#FFF7ED", border: "#FED7AA", items: ["Soumission App Store (Apple, 99€/an)", "Soumission Google Play (25€)", "Email validation commerçants", "Email notification commerçant sur commande", "Vérification domaine Resend"] },
              { period: "🔵 Futur (3–6 mois)", color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", items: ["Notation des coursiers", "Programme fidélité clients", "Abonnement premium commerçants", "Expansion (Cannes, Antibes, Monaco)", "Analytics avancés", "Intégration Google Data API"] },
            ].map((phase, i) => (
              <div key={phase.period} className="reveal" style={{
                ...revealStyle,
                borderLeft: `4px solid ${phase.color}`,
                paddingLeft: 28, paddingBottom: 32, marginLeft: 14,
                transitionDelay: `${i * 100}ms`,
              }}>
                <div style={{
                  background: phase.bg, border: `1px solid ${phase.border}`,
                  display: "inline-block", borderRadius: 20, padding: "6px 16px",
                  fontWeight: 700, fontSize: 14, color: phase.color, marginBottom: 14,
                }}>{phase.period}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {phase.items.map(item => (
                    <span key={item} style={{
                      background: "#fff", border: "1px solid #E5E7EB",
                      borderRadius: 20, padding: "5px 14px", fontSize: 13, color: "#374151",
                    }}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 10. Équipe */}
        <Section id="equipe" label="Équipe & Contact">
          <div className="reveal" style={{ ...revealStyle, background: "linear-gradient(135deg, #F97316, #EA580C)", borderRadius: 28, padding: 40, color: "#fff", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{
                width: 80, height: 80, borderRadius: 40,
                background: "rgba(255,255,255,0.2)", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 36, flexShrink: 0, fontWeight: 900,
              }}>F</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>Fernando Francisco Fonseca Pinzón</div>
                <div style={{ fontSize: 15, opacity: 0.85, marginBottom: 12 }}>Président & Directeur — Fondateur</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {["📞 06 95 42 73 12", "📧 allo@ilestchouette.fr", "🌐 ilestchouette.fr"].map(t => (
                    <span key={t} style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="reveal" style={{ ...revealStyle, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {[
              { icon: "🏛️", label: "Forme juridique", value: "SASU" },
              { icon: "💰", label: "Capital social", value: "5 000 €" },
              { icon: "🔢", label: "SIREN", value: "942 069 949" },
              { icon: "📍", label: "Siège social", value: "143 Promenade des Anglais, 06200 Nice" },
              { icon: "📅", label: "Création", value: "28 février 2025" },
              { icon: "⚖️", label: "RCS", value: "Nice" },
            ].map(c => (
              <div key={c.label} style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #E5E7EB", display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 24 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{c.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "40px 0 20px", color: "#9CA3AF", fontSize: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🦉</div>
          <strong style={{ color: "#F97316" }}>Il est chouette</strong> — SASU au capital de 5 000 € — SIREN 942 069 949 — RCS Nice<br />
          143 Promenade des Anglais, 06200 Nice · Document confidentiel · {updatedAt}
        </div>

      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
        .reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        @media print {
          .no-print { display: none !important; }
          .reveal { opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ paddingTop: 80, scrollMarginTop: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <div style={{ height: 3, width: 40, background: "#F97316", borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 900, color: "#111827", margin: 0 }}>{label}</h2>
        <div style={{ flex: 1, height: 1, background: "#F3F4F6" }} />
      </div>
      {children}
    </section>
  );
}

function QuoteBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #FFF7ED, #FEF3C7)",
      borderLeft: "4px solid #F97316", borderRadius: "0 16px 16px 0",
      padding: "20px 24px", margin: "24px 0",
      fontStyle: "italic", color: "#92400E", lineHeight: 1.7, fontSize: 15,
    }}>
      {children}
    </div>
  );
}

const revealStyle: React.CSSProperties = {
  opacity: 0, transform: "translateY(32px)",
  transition: "opacity 0.7s ease, transform 0.7s ease",
};
const proseStyle: React.CSSProperties = { fontSize: 16, lineHeight: 1.8, color: "#374151", margin: "0 0 16px" };
const listStyle: React.CSSProperties = { fontSize: 14, color: "#374151", lineHeight: 2.2, paddingLeft: 20, margin: 0 };
