"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const WHATSAPP_URL =
  "https://wa.me/33695427312?text=" +
  encodeURIComponent("Bonjour, je voudrais commander une course avec Il est chouette.");

const SERVICES = [
  { id: "supermarket", emoji: "🛒", label: "Courses supermarché", desc: "On fait vos courses à votre place dans votre magasin habituel." },
  { id: "meds", emoji: "💊", label: "Médicaments & pharmacie", desc: "Récupération d'ordonnances et de médicaments à l'officine." },
  { id: "food", emoji: "🍕", label: "Nourriture & repas", desc: "Resto, snack ou boulangerie : on va chercher ce que vous voulez." },
  { id: "keys", emoji: "🔑", label: "Clés & objets", desc: "Double de clé à apporter, colis à déposer — on s'en occupe." },
  { id: "shopping", emoji: "🛍️", label: "Achats boutiques", desc: "Boutiques de quartier, petits commerces, achats du quotidien." },
  { id: "assist", emoji: "🤝", label: "Accompagnement", desc: "Accompagnement à un rendez-vous, aide pour les démarches." },
  { id: "valet", emoji: "🚗", label: "Voiturier", desc: "Service de voiturier pour hôtels, résidences et événements." },
  { id: "it", emoji: "💻", label: "Dépannage informatique", desc: "Intervention à domicile pour PC, imprimante, wifi, smartphone." },
  { id: "handyman", emoji: "🔨", label: "Bricolage & petits travaux", desc: "Montage meuble, petite réparation, remplacement d'ampoule..." },
];

const SITUATIONS = [
  {
    title: "Marc, télétravail — Quartier Carras",
    quote: "« Je suis en réunion toute la journée, impossible de sortir. J'ai besoin de mes courses drive ce soir. »",
    answer: "✓ Coursier trouvé · retrait drive + livraison à l'heure demandée.",
  },
  {
    title: "Mme Lefebvre, 82 ans — Nice Ouest",
    quote: "« Je ne peux pas sortir aujourd'hui, j'ai besoin qu'on me livre mes médicaments et un peu de nourriture. »",
    answer: "✓ Coursier trouvé · pharmacie + courses. Livraison dans la journée.",
  },
  {
    title: "Famille en vacances — Promenade des Anglais",
    quote: "« On vient d'arriver à l'hôtel, on a besoin d'eau, de snacks et de crème solaire pour les enfants. »",
    answer: "✓ Coursier trouvé · achats en supérette + livraison hôtel en < 1h.",
  },
];

const PRICING = [
  { label: "Courses supermarché", price: "8 € + 1 €/km" },
  { label: "Médicaments & pharmacie", price: "6 € + 1 €/km" },
  { label: "Nourriture & repas", price: "5 € + 1 €/km" },
  { label: "Clés / objets & petits colis", price: "6 € + 1 €/km" },
  { label: "Achats boutiques", price: "8 € + 1 €/km" },
  { label: "Course éco", price: "7 € + 1 €/km" },
  { label: "Course express (prioritaire)", price: "12 € + 1 €/km" },
  { label: "Accompagnement (rendez-vous, aide, démarches)", price: "20 € / heure" },
  { label: "Voiturier (hôtel, résidence, événements)", price: "20 € / heure" },
  { label: "Dépannage informatique à domicile", price: "50 € / heure" },
  { label: "Bricolage & petits travaux", price: "50 € / heure" },
  { label: "Mission spéciale / autre besoin", price: "Sur devis" },
];

const FAQ = [
  {
    q: "Proposez-vous des services de bricolage à Nice ?",
    a: "Oui ! Il est chouette propose des services de bricolage et petits travaux à domicile partout à Nice : montage de meubles, petites réparations, remplacement d'ampoules, fixation de tableaux... Tarif : 50 € / heure. Contactez-nous au 06 95 42 73 12.",
  },
  {
    q: "Comment commander une livraison de courses à domicile à Nice ?",
    a: "Contactez-nous par téléphone ou WhatsApp au 06 95 42 73 12, ou commandez via notre application mobile. Donnez-nous votre liste et votre adresse — un coursier se déplace dans votre magasin et vous livre. À partir de 8 € + 1 €/km.",
  },
  {
    q: "Livrez-vous des médicaments à domicile à Nice ?",
    a: "Oui, Il est chouette récupère vos ordonnances et médicaments à la pharmacie et vous les livre à domicile à Nice. Idéal pour les personnes âgées, à mobilité réduite ou les professionnels. Tarif : 6 € + 1 €/km.",
  },
  {
    q: "Êtes-vous disponibles le week-end et les jours fériés ?",
    a: "Oui, nous sommes disponibles 7 jours sur 7, de 8h à 22h, y compris le samedi, le dimanche et tous les jours fériés.",
  },
  {
    q: "Proposez-vous un service de voiturier à Nice ?",
    a: "Oui, notre service de voiturier est disponible pour les hôtels, résidences privées et événements à Nice et alentours. Nos coursiers sont professionnels et discrets. Tarif : 20 € / heure.",
  },
  {
    q: "Livrez-vous dans toute la ville de Nice ?",
    a: "Nous intervenons dans toute la ville de Nice et ses environs proches. De la Promenade des Anglais au quartier Libération, de Nice Ouest à Nice Est, nous sommes là. Un supplément de 1 €/km s'applique selon la distance.",
  },
];

const trackEvent = (name: string) => {
  if (typeof window === "undefined") return;
  (window as any).gtag?.("event", name);
};

export default function HomeClient() {
  const [activeSituation, setActiveSituation] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const situation = SITUATIONS[activeSituation];

  // Situation rotation
  useEffect(() => {
    const id = setInterval(() => setActiveSituation((p) => (p + 1) % SITUATIONS.length), 20000);
    return () => clearInterval(id);
  }, []);

  // Hero parallax blobs
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (blob1Ref.current) blob1Ref.current.style.transform = `translateY(${y * 0.3}px)`;
      if (blob2Ref.current) blob2Ref.current.style.transform = `translateY(${y * 0.15}px)`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("iec-visible"); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".iec-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      {/* ══════════════════════ HERO ══════════════════════ */}
      <section style={{ minHeight: "100vh", background: "#080808", position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
        {/* Parallax blobs */}
        <div ref={blob1Ref} style={{ position: "absolute", top: "-20%", left: "-15%", width: "70vw", height: "70vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div ref={blob2Ref} style={{ position: "absolute", bottom: "-15%", right: "-10%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)", filter: "blur(100px)", pointerEvents: "none" }} />
        {/* Grid pattern */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(249,115,22,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.035) 1px, transparent 1px)", backgroundSize: "80px 80px", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "100px 24px 80px", position: "relative", zIndex: 10, width: "100%" }}>
          <div className="iec-hero-grid">
            {/* Left: text */}
            <div>
              <div style={{ marginBottom: 32 }}>
                <Image src="/logo-chouette.svg" alt="Il est chouette — Coursier humain à Nice" width={160} height={54} priority />
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", borderRadius: 100, padding: "7px 16px", marginBottom: 24 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#F97316", display: "inline-block", animation: "iec-blink 2s infinite" }} />
                <span style={{ fontSize: 12, color: "rgba(249,115,22,0.85)", fontWeight: 600, letterSpacing: 0.5 }}>Nice · 7j/7 · 8h – 22h</span>
              </div>

              <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3.4rem)", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, margin: "0 0 20px", letterSpacing: -1 }}>
                Votre assistant<br />
                <span style={{ color: "#F97316" }}>personnel</span> à Nice
              </h1>

              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: "0 0 36px", maxWidth: 500 }}>
                Courses, médicaments, repas, accompagnement, voiturier, bricolage, dépannage informatique — un seul numéro pour tout gérer.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="iec-btn-primary" onClick={() => trackEvent("click_whatsapp_hero")}>
                  💬 Commander par WhatsApp
                </a>
                <a href="tel:+33695427312" className="iec-btn-ghost" onClick={() => trackEvent("click_phone_hero")}>
                  📞 06 95 42 73 12
                </a>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                {["✅ Service humain local", "⭐ Coursiers vérifiés", "🛡️ Paiement sécurisé"].map((b) => (
                  <span key={b} style={{ fontSize: 12, color: "rgba(255,255,255,0.32)" }}>{b}</span>
                ))}
              </div>
            </div>

            {/* Right: situation cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "20px 22px", backdropFilter: "blur(12px)" }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "rgba(249,115,22,0.75)", textTransform: "uppercase", letterSpacing: 0.5 }}>{situation.title}</p>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>{situation.quote}</p>
              </div>
              <div style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: 20, padding: "16px 22px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#F97316", textTransform: "uppercase", letterSpacing: 0.5 }}>Il est chouette</p>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>{situation.answer}</p>
              </div>
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
                <Image src="/hero.svg" alt="Coursier Il est chouette à Nice" width={190} height={190} style={{ filter: "drop-shadow(0 4px 30px rgba(249,115,22,0.25))", animation: "iec-float 4s ease-in-out infinite" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animation: "iec-bounce 2.5s ease-in-out infinite" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: 3, textTransform: "uppercase" }}>Défiler</span>
          <svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 1l6 6 6-6" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </section>

      {/* ══════════════════════ SERVICES ══════════════════════ */}
      <section id="services" style={{ background: "#FFFFFF", padding: "88px 0" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 24px" }}>
          <div className="iec-reveal" style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#F97316", letterSpacing: 3, textTransform: "uppercase", margin: "0 0 14px" }}>Nos services à Nice</p>
            <h2 style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.6rem)", fontWeight: 800, color: "#0A0A0A", margin: "0 0 14px", letterSpacing: -0.75 }}>Tout ce qu'on peut faire pour vous</h2>
            <p style={{ fontSize: 15, color: "#64748B", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Un seul numéro pour tous vos besoins du quotidien à Nice. Service humain, local et bienveillant.</p>
          </div>

          <div className="iec-services-grid">
            {SERVICES.map((s, i) => (
              <div key={s.id} className="iec-reveal" style={{ transitionDelay: `${i * 0.06}s` }}>
                <div className="iec-service-card">
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{s.emoji}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>{s.label}</h3>
                  <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section id="how" style={{ background: "#F8FAFC", padding: "88px 0" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 24px" }}>
          <div className="iec-reveal" style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#F97316", letterSpacing: 3, textTransform: "uppercase", margin: "0 0 14px" }}>Simple & rapide</p>
            <h2 style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.6rem)", fontWeight: 800, color: "#0A0A0A", margin: 0, letterSpacing: -0.75 }}>Comment ça marche ?</h2>
          </div>

          <div className="iec-steps-grid">
            {[
              { num: "01", title: "Tu nous contactes", desc: "Par téléphone, WhatsApp ou via notre application. Tu décris ce dont tu as besoin en quelques mots." },
              { num: "02", title: "On trouve ton coursier", desc: "On sélectionne un coursier disponible à proximité. Il prend en charge ta mission en temps réel." },
              { num: "03", title: "Tu es livré & rassuré", desc: "Le coursier livre en main propre. Tu peux suivre la mission en direct depuis l'application." },
            ].map((step, i) => (
              <div key={step.num} className="iec-reveal" style={{ textAlign: "center", transitionDelay: `${i * 0.15}s` }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#0A0A0A", color: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, margin: "0 auto 20px", letterSpacing: -0.5 }}>{step.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: "0 0 10px" }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.75, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 52 }}>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="iec-btn-dark" onClick={() => trackEvent("click_whatsapp_how")}>
              Commander maintenant →
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════ PRICING ══════════════════════ */}
      <section id="tarifs" style={{ background: "#FFFFFF", padding: "88px 0" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
          <div className="iec-reveal" style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#F97316", letterSpacing: 3, textTransform: "uppercase", margin: "0 0 14px" }}>Transparent</p>
            <h2 style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.6rem)", fontWeight: 800, color: "#0A0A0A", margin: "0 0 12px", letterSpacing: -0.75 }}>Tarifs simples et lisibles</h2>
            <p style={{ fontSize: 14, color: "#64748B", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>Tarif de base + 1 € par km pour les livraisons. Tarif horaire fixe pour les missions à domicile.</p>
          </div>

          <div className="iec-reveal" style={{ transitionDelay: "0.1s", borderRadius: 20, overflow: "hidden", border: "1px solid #E2E8F0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "13px 24px", background: "#0A0A0A", color: "#fff" }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Service</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Tarif</span>
            </div>
            {PRICING.map((row, idx) => (
              <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "14px 24px", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC", borderTop: "1px solid #E2E8F0", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 14, color: "#334155" }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>{row.price}</span>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 14 }}>
            Ex : course supermarché à 3 km = <strong>11 €</strong> · Bricolage 1h = <strong>50 €</strong>
          </p>
        </div>
      </section>

      {/* ══════════════════════ FAQ ══════════════════════ */}
      <section id="faq" style={{ background: "#F8FAFC", padding: "88px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
          <div className="iec-reveal" style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#F97316", letterSpacing: 3, textTransform: "uppercase", margin: "0 0 14px" }}>FAQ</p>
            <h2 style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.6rem)", fontWeight: 800, color: "#0A0A0A", margin: 0, letterSpacing: -0.75 }}>Vos questions, nos réponses</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ.map((item, i) => (
              <div key={i} className="iec-reveal" style={{ transitionDelay: `${i * 0.07}s` }}>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: openFaq === i ? "0 4px 24px rgba(249,115,22,0.08)" : "none", transition: "box-shadow 0.2s" }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: "100%", textAlign: "left", padding: "20px 24px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", lineHeight: 1.45 }}>{item.q}</span>
                    <span style={{ fontSize: 22, color: "#F97316", flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none", lineHeight: 1 }}>+</span>
                  </button>
                  <div style={{ maxHeight: openFaq === i ? 300 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
                    <div style={{ padding: "0 24px 20px", fontSize: 14, color: "#64748B", lineHeight: 1.75, borderTop: "1px solid #F1F5F9" }}>
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CTA FINAL ══════════════════════ */}
      <section id="contact" style={{ background: "#080808", padding: "96px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "70vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.13) 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px", textAlign: "center", position: "relative", zIndex: 10 }}>
          <div className="iec-reveal">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <Image src="/logo_carre.svg" alt="Il est chouette" width={56} height={56} style={{ opacity: 0.85 }} />
            </div>
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", fontWeight: 800, color: "#FFFFFF", margin: "0 0 16px", letterSpacing: -1, lineHeight: 1.1 }}>
              Essayez Il est chouette
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", margin: "0 0 44px", lineHeight: 1.75 }}>
              Service humain, local et bienveillant à Nice.<br />
              Disponible 7j/7 de 8h à 22h.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginBottom: 36 }}>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="iec-btn-primary" onClick={() => trackEvent("click_whatsapp_cta")}>
                💬 WhatsApp
              </a>
              <a href="tel:+33695427312" className="iec-btn-ghost" onClick={() => trackEvent("click_phone_cta")}>
                📞 06 95 42 73 12
              </a>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
              <a href="mailto:allo@ilestchouette.fr" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>✉️ allo@ilestchouette.fr</a>
              <Link href="/coursier" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Devenir coursier</Link>
              <Link href="/commercant" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Espace commerçant</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer style={{ background: "#040404", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "20px 0" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", margin: 0 }}>
            © {new Date().getFullYear()} Il est chouette — SASU · SIREN 942 069 949 · Nice, France
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {[
              { href: "/mentions-legales", label: "Mentions légales" },
              { href: "/coursier", label: "Espace coursier" },
              { href: "/commercant", label: "Espace commerçant" },
              { href: "/operateur", label: "Opérateur" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", textDecoration: "none" }}>{l.label}</Link>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        /* ── Scroll reveal ── */
        .iec-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        .iec-reveal.iec-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Hero grid ── */
        .iec-hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        /* ── Services grid ── */
        .iec-services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        /* ── Service card ── */
        .iec-service-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 28px 22px;
          height: 100%;
          transition: background 0.25s, border-color 0.25s, box-shadow 0.25s, transform 0.25s;
          cursor: default;
        }
        .iec-service-card:hover {
          background: #FFF7ED;
          border-color: rgba(249,115,22,0.3);
          box-shadow: 0 12px 40px rgba(249,115,22,0.1);
          transform: translateY(-4px);
        }

        /* ── Steps grid ── */
        .iec-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
        }

        /* ── Buttons ── */
        .iec-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #F97316, #EA580C);
          color: #fff;
          border-radius: 100px;
          padding: 14px 28px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 8px 30px rgba(249,115,22,0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .iec-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(249,115,22,0.45);
        }
        .iec-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.14);
          color: #fff;
          border-radius: 100px;
          padding: 14px 28px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          backdrop-filter: blur(8px);
          transition: background 0.15s;
        }
        .iec-btn-ghost:hover { background: rgba(255,255,255,0.12); }
        .iec-btn-dark {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0A0A0A;
          color: #fff;
          border-radius: 100px;
          padding: 14px 32px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.1);
          transition: background 0.15s;
        }
        .iec-btn-dark:hover { background: #1a1a1a; }

        /* ── Animations ── */
        @keyframes iec-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes iec-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-8px); }
        }
        @keyframes iec-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .iec-hero-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .iec-services-grid { grid-template-columns: 1fr !important; }
          .iec-steps-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
        @media (min-width: 640px) and (max-width: 1024px) {
          .iec-services-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .iec-steps-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </main>
  );
}
