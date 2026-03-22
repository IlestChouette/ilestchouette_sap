"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const WHATSAPP_URL =
  "https://wa.me/33695427312?text=" +
  encodeURIComponent(
    "Bonjour, je voudrais commander une course avec Il est chouette."
  );

const SERVICES = [
  { id: "supermarket", emoji: "🛒", label: "Courses supermarché", desc: "On fait tes courses à ta place dans ton magasin habituel." },
  { id: "meds", emoji: "💊", label: "Médicaments & pharmacie", desc: "Récupération d'ordonnances et de médicaments à l'officine." },
  { id: "food", emoji: "🍕", label: "Nourriture & repas", desc: "Resto, snack ou boulangerie : on va chercher ce que tu veux." },
  { id: "keys", emoji: "🔑", label: "Clés & objets", desc: "Un double de clé à apporter ? Un colis à déposer ? On s'en occupe." },
  { id: "shopping", emoji: "🛍️", label: "Achats boutiques", desc: "Boutiques de quartier, petits commerces, achats du quotidien." },
  { id: "assist", emoji: "🤝", label: "Accompagnement", desc: "Accompagnement à un rendez-vous, aide pour les démarches, etc." },
  { id: "valet", emoji: "🚗", label: "Voiturier", desc: "Service de voiturier pour hôtels, résidences et événements.", },
  { id: "it", emoji: "💻", label: "Dépannage informatique", desc: "Intervention à domicile pour PC, imprimante, wifi, smartphone." },
  { id: "handyman", emoji: "🔨", label: "Bricolage & petits travaux", desc: "Montage meuble, petite réparation, remplacement d'ampoule..." },
];

const SITUATIONS = [
  {
    title: "Client · Marc, télétravail – Quartier Carras",
    quote: "« Je suis en réunion toute la journée, impossible de sortir. J'ai besoin de mes courses drive ce soir. »",
    answer: "✓ Coursier trouvé · retrait drive + livraison à l'heure demandée.",
  },
  {
    title: "Cliente · Madame L., 82 ans – Nice Ouest",
    quote: "« Je ne peux pas sortir aujourd'hui, j'ai besoin qu'on me livre mes médicaments et un peu de nourriture. »",
    answer: "✓ Coursier trouvé · visite à la pharmacie + courses rapides. Livraison prévue dans la journée.",
  },
  {
    title: "Famille en vacances – Promenade des Anglais",
    quote: "« On vient d'arriver à l'hôtel, on a besoin d'eau, de snacks et de crème solaire pour les enfants. »",
    answer: "✓ Coursier trouvé · achats en supérette + livraison à l'hôtel en moins d'1 heure.",
  },
];

const PRICING = [
  { label: "Courses supermarché", price: "8 € + 1 €/km" },
  { label: "Médicaments & pharmacie", price: "6 € + 1 €/km" },
  { label: "Nourriture & repas", price: "5 € + 1 €/km" },
  { label: "Clés / objets & petits colis", price: "6 € + 1 €/km" },
  { label: "Achats boutiques & petits commerces", price: "8 € + 1 €/km" },
  { label: "Course éco", price: "7 € + 1 €/km" },
  { label: "Course express (prioritaire)", price: "12 € + 1 €/km" },
  { label: "Accompagnement (rendez-vous, aide, démarches…)", price: "20 € / heure (sans km)" },
  { label: "Voiturier (hôtel, résidence, événements…)", price: "20 € / heure (sans km)" },
  { label: "Dépannage informatique à domicile", price: "50 € / heure (sans km)" },
  { label: "Bricolage & petits travaux", price: "50 € / heure (sans km)" },
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

const trackEvent = (eventName: string) => {
  if (typeof window === "undefined") return;
  (window as any).gtag?.("event", eventName);
};

export default function HomeClient() {
  const [activeSituation, setActiveSituation] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const situation = SITUATIONS[activeSituation];

  useEffect(() => {
    const id = setInterval(
      () => setActiveSituation((prev) => (prev + 1) % SITUATIONS.length),
      20000
    );
    return () => clearInterval(id);
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
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* ══════════════════════ HERO ORANGE ══════════════════════ */}
      <section className="relative overflow-hidden bg-[#f7901d] text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-20 lg:py-24 grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-10 items-center">
          {/* Texte */}
          <div className="space-y-5">
            <p className="text-xs tracking-[0.25em] uppercase">
              NICE · COURSIER HUMAIN · SERVICE À LA PERSONNE
            </p>
            <h1 className="text-2xl md:text-3xl lg:text-[2.2rem] font-bold leading-tight">
              Nous sommes Il est chouette
              <span className="block mt-2">
                On facilite votre quotidien, d'une façon simple et rapide.
              </span>
            </h1>

            <p className="text-sm md:text-base text-orange-50/90 max-w-xl">
              Un accompagnement chez le médecin, aller chercher ou envoyer un
              colis, aller faire les courses, livraison de nourriture,
              voiturier, bricolage et même dépannage informatique.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 hover:bg-black text-sm md:text-base px-6 py-2.5 font-semibold shadow-md cursor-pointer transition-transform hover:-translate-y-0.5"
                onClick={() => trackEvent("click_whatsapp_hero")}
              >
                Nous contacter
              </a>
              <a
                href="tel:+33695427312"
                className="inline-flex items-center justify-center rounded-full bg-slate-900/90 hover:bg-slate-900 text-sm md:text-base px-6 py-2.5 font-semibold shadow-md cursor-pointer transition-transform hover:-translate-y-0.5"
                onClick={() => trackEvent("click_phone_hero")}
              >
                06 95 42 73 12
              </a>
              <Link
                href="/coursier"
                className="inline-flex items-center justify-center rounded-full bg-white/95 hover:bg-white text-sm md:text-base px-6 py-2.5 font-semibold text-slate-900 shadow-md cursor-pointer transition-transform hover:-translate-y-0.5"
                onClick={() => trackEvent("click_devenir_coursier_hero")}
              >
                Devenir coursier
              </Link>
            </div>

            <p className="text-xs md:text-sm text-orange-50/85 pt-1">
              Service humain, local et bienveillant pour les habitants,
              seniors et touristes à Nice.
            </p>
          </div>

          {/* Visuel hero */}
          <div className="relative">
            {/* Desktop */}
            <div className="hidden md:block relative min-h-[320px]">
              <div className="absolute right-[-20px] bottom-[40px] lg:right-[-40px] lg:bottom-[80px]">
                <Image
                  src="/hero.svg"
                  alt="Personnage Il est chouette"
                  width={280}
                  height={280}
                  className="drop-shadow-xl"
                  style={{ animation: "iec-float 4s ease-in-out infinite" }}
                />
              </div>

              <div className="absolute left-0 top-0 max-w-[360px] bg-white text-slate-900 rounded-3xl shadow-xl px-5 py-4">
                <p className="text-xs font-semibold text-slate-700">{situation.title}</p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">{situation.quote}</p>
              </div>

              <div className="absolute left-[32px] bottom-[10px] max-w-[340px] bg-[#fff4de] text-slate-900 rounded-3xl shadow-md px-4 py-3 border border-orange-200">
                <p className="text-xs font-semibold">Il est chouette</p>
                <p className="mt-1 text-[11px] text-slate-600 leading-snug">{situation.answer}</p>
                <p className="mt-2 text-[10px] text-slate-400">
                  Nouvelle situation affichée toutes les 20 secondes.
                </p>
              </div>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col items-center gap-3 mt-6">
              <Image
                src="/hero.svg"
                alt="Personnage Il est chouette"
                width={240}
                height={240}
                className="drop-shadow-xl"
                style={{ animation: "iec-float 4s ease-in-out infinite" }}
              />
              <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl shadow-xl px-4 py-3">
                <p className="text-xs font-semibold text-slate-700">{situation.title}</p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">{situation.quote}</p>
              </div>
              <div className="w-full max-w-sm bg-[#fff4de] text-slate-900 rounded-3xl shadow-md px-4 py-3 border border-orange-200">
                <p className="text-xs font-semibold">Il est chouette</p>
                <p className="mt-1 text-[11px] text-slate-600 leading-snug">{situation.answer}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ SERVICES ══════════════════════ */}
      <section id="services" className="max-w-6xl mx-auto px-4 py-12 md:py-16 space-y-6">
        <div className="iec-reveal flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold">Nos services du quotidien.</h2>
            <p className="text-sm text-slate-600 max-w-xl mt-1">
              Une seule plateforme pour gérer les petits besoins qui prennent du temps : on s'adapte à ta situation, à ton logement et à ton rythme.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {SERVICES.map((s, i) => (
            <div key={s.id} className="iec-reveal" style={{ transitionDelay: `${i * 0.07}s` }}>
              <div className="iec-service-card rounded-2xl border border-slate-100 bg-white p-4 shadow-sm h-full">
                <div className="text-2xl mb-2">{s.emoji}</div>
                <h3 className="text-sm font-semibold mb-1">{s.label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════ TARIFS ══════════════════════ */}
      <section id="tarifs" className="bg-white border-y border-slate-100 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="iec-reveal">
            <h2 className="text-xl md:text-2xl font-semibold text-center mb-3">
              Tarifs simples et lisibles.
            </h2>
            <p className="text-sm text-slate-600 text-center max-w-2xl mx-auto mb-3">
              Pour les courses, pharmacie, nourriture et petits colis : tu as un{" "}
              <span className="font-semibold">tarif de base</span>, puis on ajoute{" "}
              <span className="font-semibold">1 € par kilomètre</span> entre le point de départ et le point d'arrivée.
            </p>
            <p className="text-sm text-slate-600 text-center max-w-2xl mx-auto mb-8">
              Pour les missions à l'heure (voiturier, accompagnement, dépannage informatique, bricolage), tu paies un{" "}
              <span className="font-semibold">tarif horaire fixe</span>, sans compter les kilomètres.
            </p>
          </div>

          <div className="iec-reveal max-w-3xl mx-auto bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden" style={{ transitionDelay: "0.1s" }}>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] text-xs md:text-sm font-semibold bg-slate-100/70 px-4 py-2">
              <div>Type de mission</div>
              <div className="text-right">Tarif</div>
            </div>
            {PRICING.map((row, idx) => (
              <div
                key={row.label}
                className={`grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] px-4 py-3 text-xs md:text-sm ${idx % 2 === 1 ? "bg-white" : "bg-slate-50"}`}
              >
                <div>{row.label}</div>
                <div className="text-right font-semibold">{row.price}</div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 text-center mt-3">
            Exemple 1 : course supermarché à 8 € + 3 km = 11 € au total.{" "}
            <br />
            Exemple 2 : dépannage informatique à domicile = 50 € pour 1 heure.
          </p>
        </div>
      </section>

      {/* ══════════════════════ COMMENT ÇA MARCHE ══════════════════════ */}
      <section id="how" className="max-w-6xl mx-auto px-4 py-12 md:py-16 space-y-8">
        <h2 className="iec-reveal text-xl md:text-2xl font-semibold text-center">
          Comment ça marche ?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { num: "1", title: "Tu nous contactes", desc: "Par téléphone, WhatsApp ou via ton hôtel / résidence partenaire. Tu expliques ce dont tu as besoin." },
            { num: "2", title: "On trouve le bon coursier", desc: "On regarde les disponibilités en temps réel et on confie ta mission à un coursier chouette à proximité." },
            { num: "3", title: "Tu es livré & rassuré", desc: "Le coursier t'appelle si besoin, livre en main propre et peut saisir un code de validation pour sécuriser la livraison." },
          ].map((step, i) => (
            <div key={step.num} className="iec-reveal bg-white rounded-2xl shadow-sm p-5" style={{ transitionDelay: `${i * 0.15}s` }}>
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 mb-3">
                {step.num}
              </div>
              <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
              <p className="text-xs text-slate-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════ FAQ ══════════════════════ */}
      <section id="faq" className="bg-white border-t border-slate-100 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="iec-reveal text-center mb-10">
            <h2 className="text-xl md:text-2xl font-semibold">Questions fréquentes</h2>
            <p className="text-sm text-slate-500 mt-1">Tout ce que vous voulez savoir sur nos services à Nice.</p>
          </div>

          <div className="flex flex-col gap-3">
            {FAQ.map((item, i) => (
              <div key={i} className="iec-reveal" style={{ transitionDelay: `${i * 0.07}s` }}>
                <div className={`rounded-2xl border transition-shadow ${openFaq === i ? "border-orange-200 shadow-md" : "border-slate-100 shadow-sm"} bg-white overflow-hidden`}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left px-5 py-4 flex justify-between items-start gap-4 cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-slate-800 leading-snug">{item.q}</span>
                    <span className={`text-orange-500 text-xl flex-shrink-0 leading-none transition-transform duration-200 ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                  </button>
                  <div style={{ maxHeight: openFaq === i ? 300 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
                    <div className="px-5 pb-4 text-xs text-slate-500 leading-relaxed border-t border-slate-50">
                      <div className="pt-3">{item.a}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CONTACT / CTA FINAL ══════════════════════ */}
      <section id="contact" className="bg-slate-900 text-slate-50 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 flex flex-col md:flex-row items-start gap-10">
          <div className="iec-reveal flex-1 space-y-3">
            <h2 className="text-xl md:text-2xl font-semibold">
              Envie d'essayer Il est chouette ?
            </h2>
            <p className="text-sm text-slate-300">
              Contacte-nous pour ta prochaine course ou pour devenir coursier.
              Nous sommes basés à Nice et nous développons la communauté pas à pas.
            </p>
            <p className="text-sm">
              📞 <span className="font-semibold">06 95 42 73 12</span>
              <br />
              💬 WhatsApp : <span className="font-semibold">06 95 42 73 12</span>
              <br />
              ✉️ Email : <span className="font-semibold">allo@ilestchouette.fr</span>
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs text-slate-400">Suivre Il est chouette :</span>
              <a href="#" aria-label="Instagram" className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[13px] hover:bg-orange-500 cursor-pointer transition-colors">IG</a>
              <a href="#" aria-label="Facebook" className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[13px] hover:bg-orange-500 cursor-pointer transition-colors">f</a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[13px] hover:bg-orange-500 cursor-pointer transition-colors" onClick={() => trackEvent("click_whatsapp_footer")}>WA</a>
            </div>
          </div>

          <div className="iec-reveal flex-1 flex flex-col gap-3" style={{ transitionDelay: "0.1s" }}>
            <Link href="/operateur" className="inline-flex items-center justify-center rounded-full bg-white text-slate-900 text-sm px-6 py-2.5 font-semibold shadow-md cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => trackEvent("click_connexion_operateur_footer")}>
              Connexion opérateur
            </Link>
            <Link href="/coursier" className="inline-flex items-center justify-center rounded-full border border-slate-600 text-sm px-6 py-2.5 font-semibold cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => trackEvent("click_candidature_coursier_footer")}>
              Envoyer ma candidature coursier
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="bg-slate-950 text-slate-400 text-[11px]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Il est chouette — SASU · SIREN 942 069 949 · Nice, France</p>
          <div className="flex gap-4">
            <Link href="/mentions-legales" className="hover:text-slate-200">Mentions légales</Link>
            <Link href="/operateur" className="hover:text-slate-200">Espace opérateur</Link>
            <Link href="/coursier" className="hover:text-slate-200">Espace coursier</Link>
            <Link href="/commercant" className="hover:text-slate-200">Espace commerçant</Link>
          </div>
        </div>
      </footer>

      <style>{`
        /* ── Scroll reveal ── */
        .iec-reveal {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .iec-reveal.iec-visible {
          opacity: 1;
          transform: translateY(0);
        }
        /* ── Service card hover ── */
        .iec-service-card {
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .iec-service-card:hover {
          box-shadow: 0 8px 24px rgba(249,115,22,0.15);
          transform: translateY(-3px);
        }
        /* ── Hero float ── */
        @keyframes iec-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </main>
  );
}
