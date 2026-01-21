"use client";

import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import Script from "next/script";
import { useEffect, useState } from "react";

const WHATSAPP_URL =
  "https://wa.me/33695427312?text=" +
  encodeURIComponent(
    "Bonjour, je voudrais commander une course avec Il est chouette."
  );

const SERVICES = [
  {
    id: "supermarket",
    label: "Courses supermarché",
    desc: "On fait tes courses à ta place dans ton magasin habituel.",
  },
  {
    id: "meds",
    label: "Médicaments & pharmacie",
    desc: "Récupération d’ordonnances et de médicaments à l’officine.",
  },
  {
    id: "food",
    label: "Nourriture & repas",
    desc: "Resto, snack ou boulangerie : on va chercher ce que tu veux.",
  },
  {
    id: "keys",
    label: "Clés & objets",
    desc: "Un double de clé à apporter ? Un colis à déposer ? On s’en occupe.",
  },
  {
    id: "shopping",
    label: "Achats boutiques",
    desc: "Boutiques de quartier, petits commerces, achats du quotidien.",
  },
  {
    id: "assist",
    label: "Accompagnement",
    desc: "Accompagnement à un rendez-vous, aide pour les démarches, etc.",
  },
];

const SITUATIONS = [
  {
    title: "Client · Marc, télétravail – Quartier Carras",
    quote:
      "« Je suis en réunion toute la journée, impossible de sortir. J’ai besoin de mes courses drive ce soir. »",
    answer:
      "✓ Coursier trouvé · retrait drive + livraison à l’heure demandée.",
  },
  {
    title: "Cliente · Madame L., 82 ans – Nice Ouest",
    quote:
      "« Je ne peux pas sortir aujourd’hui, j’ai besoin qu’on me livre mes médicaments et un peu de nourriture. »",
    answer:
      "✓ Coursier trouvé · visite à la pharmacie + courses rapides. Livraison prévue dans la journée.",
  },
  {
    title: "Famille en vacances – Promenade des Anglais",
    quote:
      "« On vient d’arriver à l’hôtel, on a besoin d’eau, de snacks et de crème solaire pour les enfants. »",
    answer:
      "✓ Coursier trouvé · achats en supérette + livraison à l’hôtel en moins d’1 heure.",
  },
];

/** 🔸 TARIFS MIS À JOUR (mêmes prix que sur l’espace opérateur) */
const PRICING = [
  { label: "Courses supermarché", price: "8 € + 1 €/km" },
  { label: "Médicaments & pharmacie", price: "6 € + 1 €/km" },
  { label: "Nourriture & repas", price: "5 € + 1 €/km" },
  { label: "Clés / objets & petits colis", price: "6 € + 1 €/km" },
  { label: "Achats boutiques & petits commerces", price: "8 € + 1 €/km" },
  { label: "Course éco", price: "7 € + 1 €/km" },
  { label: "Course express (prioritaire)", price: "12 € + 1 €/km" },
  {
    label: "Accompagnement (rendez-vous, aide, démarches…)",
    price: "20 € / heure (sans km)",
  },
  {
    label: "Voiturier (hôtel, résidence, événements…)",
    price: "20 € / heure (sans km)",
  },
  {
    label: "Dépannage informatique à domicile",
    price: "50 € / heure (sans km)",
  },
  {
    label: "Bricolage & petits travaux",
    price: "50 € / heure (sans km)",
  },
  {
    label: "Mission spéciale / autre besoin",
    price: "Sur devis",
  },
];

/** Petit helper pour envoyer des events GA quand on clique sur les boutons importants */
const trackEvent = (eventName: string) => {
  if (typeof window === "undefined") return;
  (window as any).gtag?.("event", eventName);
};

export default function HomePage() {
  const [activeSituation, setActiveSituation] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setActiveSituation((prev) => (prev + 1) % SITUATIONS.length),
      20000
    );
    return () => clearInterval(id);
  }, []);

  const situation = SITUATIONS[activeSituation];

  return (
    <>
      <Head>
        {/* === SEO de base === */}
        <title>
          Il est chouette · Coursier humain à Nice – Courses, pharmacie, voiturier et aide du quotidien
        </title>
        <meta
          name="description"
          content="Il est chouette est un service de coursier humain à Nice : courses supermarché, médicaments, repas, achats du quotidien, accompagnement, voiturier, dépannage informatique et petits bricolages pour habitants, seniors et touristes."
        />
        <meta
          name="keywords"
          content="coursier Nice, livraison courses Nice, médicaments à domicile Nice, voiturier Nice, dépannage informatique Nice, bricolage Nice, service à la personne Nice, aide seniors Nice, conciergerie Nice, il est chouette, livraison repas Nice, accompagnement rendez-vous Nice"
        />
        <meta name="robots" content="index,follow" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <link rel="canonical" href="https://www.ilestchouette.fr/" />

        {/* === Open Graph (Facebook, LinkedIn...) === */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Il est chouette · Coursier humain, voiturier et aide du quotidien à Nice"
        />
        <meta
          property="og:description"
          content="Service de coursier humain, voiturier et d’aide du quotidien à Nice : courses, pharmacie, repas, accompagnement, aide administrative, dépannage informatique et petits bricolages."
        />
        <meta property="og:url" content="https://www.ilestchouette.fr/" />
        <meta property="og:site_name" content="Il est chouette" />
        <meta property="og:locale" content="fr_FR" />
        <meta
          property="og:image"
          content="https://www.ilestchouette.fr/og-image.jpg"
        />
        <meta
          property="og:image:alt"
          content="Coursier Il est chouette livrant des courses à Nice"
        />

        {/* === Twitter Card === */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Il est chouette · Coursier humain à Nice"
        />
        <meta
          name="twitter:description"
          content="Coursier humain à Nice pour courses, pharmacie, nourriture, accompagnement, voiturier et aide du quotidien."
        />
        <meta
          name="twitter:image"
          content="https://www.ilestchouette.fr/og-image.jpg"
        />

        {/* === Données structurées LocalBusiness (JSON-LD) === */}
        <script
          type="application/ld+json"
          // @ts-ignore
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "Il est chouette",
              image: "https://www.ilestchouette.fr/og-image.jpg",
              "@id": "https://www.ilestchouette.fr",
              url: "https://www.ilestchouette.fr",
              telephone: "+33 6 95 42 73 12",
              address: {
                "@type": "PostalAddress",
                streetAddress: "143 Promenade des Anglais",
                addressLocality: "Nice",
                postalCode: "06200",
                addressCountry: "FR",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 43.695,
                longitude: 7.255,
              },
              areaServed: [
                {
                  "@type": "City",
                  name: "Nice",
                },
              ],
              description:
                "Service de coursier humain, voiturier et d’aide du quotidien à Nice pour habitants, seniors et touristes : courses, médicaments, repas, accompagnement, aide administrative, dépannage informatique et petits bricolages.",
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ],
                  opens: "08:00",
                  closes: "22:00",
                },
              ],
              sameAs: [
                "https://www.instagram.com/ilestchouette",
                "https://www.facebook.com/ilestchouette",
              ],
            }),
          }}
        />
      </Head>

      {/* ========= GOOGLE ANALYTICS 4 =========
          Utilise l’ID que tu as mis dans .env.local : NEXT_PUBLIC_GA_ID */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
            send_page_view: true
          });
        `}
      </Script>

      <main className="min-h-screen bg-slate-50 text-slate-900">
        {/* HERO ORANGE */}
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
                  On facilite votre quotidien, d’une façon simple et rapide.
                </span>
              </h1>

              <p className="text-sm md:text-base text-orange-50/90 max-w-xl">
                Un accompagnement chez le médecin, aller chercher ou envoyer un
                colis, aller faire les courses, livraison de nourriture,
                voiturier, bricolage et même dépannage informatique.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                {/* 👉 vers WhatsApp */}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 hover:bg-black text-sm md:text-base px-6 py-2.5 font-semibold shadow-md cursor-pointer"
                  onClick={() => trackEvent("click_whatsapp_hero")}
                >
                  Nous contacter
                </a>

                {/* 👉 Bouton téléphone entre les deux */}
                <a
                  href="tel:+33695427312"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900/90 hover:bg-slate-900 text-sm md:text-base px-6 py-2.5 font-semibold shadow-md cursor-pointer"
                  onClick={() => trackEvent("click_phone_hero")}
                >
                  06 95 42 73 12
                </a>

                <Link
                  href="/coursier"
                  className="inline-flex items-center justify-center rounded-full bg-white/95 hover:bg-white text-sm md:text-base px-6 py-2.5 font-semibold text-slate-900 shadow-md cursor-pointer"
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
              {/* ====== Version desktop (cartes en overlay) ====== */}
              <div className="hidden md:block relative min-h-[320px]">
                <div className="absolute right-[-20px] bottom-[40px] lg:right-[-40px] lg:bottom-[80px]">
                  <Image
                    src="/hero.svg"
                    alt="Personnage Il est chouette"
                    width={260}
                    height={260}
                    className="drop-shadow-xl"
                  />
                </div>

                <div className="absolute left-0 top-0 max-w-[360px] bg-white text-slate-900 rounded-3xl shadow-xl px-5 py-4">
                  <p className="text-xs font-semibold text-slate-700">
                    {situation.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 leading-snug">
                    {situation.quote}
                  </p>
                </div>

                <div className="absolute left-[32px] bottom-[10px] max-w-[340px] bg-[#fff4de] text-slate-900 rounded-3xl shadow-md px-4 py-3 border border-orange-200">
                  <p className="text-xs font-semibold">Il est chouette</p>
                  <p className="mt-1 text-[11px] text-slate-600 leading-snug">
                    {situation.answer}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-400">
                    Nouvelle situation affichée toutes les 20 secondes.
                  </p>
                </div>
              </div>

              {/* ====== Version mobile ====== */}
              <div className="md:hidden flex flex-col items-center gap-3 mt-6">
                <Image
                  src="/hero.svg"
                  alt="Personnage Il est chouette"
                  width={220}
                  height={220}
                  className="drop-shadow-xl"
                />
                <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl shadow-xl px-4 py-3">
                  <p className="text-xs font-semibold text-slate-700">
                    {situation.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 leading-snug">
                    {situation.quote}
                  </p>
                </div>
                <div className="w-full max-w-sm bg-[#fff4de] text-slate-900 rounded-3xl shadow-md px-4 py-3 border border-orange-200">
                  <p className="text-xs font-semibold">Il est chouette</p>
                  <p className="mt-1 text-[11px] text-slate-600 leading-snug">
                    {situation.answer}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-400">
                    Nouvelle situation affichée toutes les 20 secondes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section
          id="services"
          className="max-w-6xl mx-auto px-4 py-12 md:py-16 space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold">
                Nos services du quotidien.
              </h2>
              <p className="text-sm text-slate-600 max-w-xl mt-1">
                Une seule plateforme pour gérer les petits besoins qui prennent
                du temps : on s’adapte à ta situation, à ton logement et à ton
                rythme.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {SERVICES.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-sm font-semibold mb-1">{s.label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* TARIFS */}
        <section
          id="tarifs"
          className="bg-white border-y border-slate-100 py-12 md:py-16"
        >
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-semibold text-center mb-3">
              Tarifs simples et lisibles.
            </h2>
            <p className="text-sm text-slate-600 text-center max-w-2xl mx-auto mb-3">
              Pour les courses, pharmacie, nourriture et petits colis : tu as un{" "}
              <span className="font-semibold">tarif de base</span>, puis on ajoute{" "}
              <span className="font-semibold">1 € par kilomètre</span> entre le
              point de départ et le point d’arrivée.
            </p>
            <p className="text-sm text-slate-600 text-center max-w-2xl mx-auto mb-8">
              Pour les missions à l’heure (voiturier, accompagnement, dépannage
              informatique, bricolage), tu paies un{" "}
              <span className="font-semibold">tarif horaire fixe</span>, sans
              compter les kilomètres.
            </p>

            <div className="max-w-3xl mx-auto bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] text-xs md:text-sm font-semibold bg-slate-100/70 px-4 py-2">
                <div>Type de mission</div>
                <div className="text-right">Tarif</div>
              </div>
              {PRICING.map((row, idx) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] px-4 py-3 text-xs md:text-sm ${
                    idx % 2 === 1 ? "bg-white" : "bg-slate-50"
                  }`}
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

        {/* COMMENT ÇA MARCHE */}
        <section
          id="how"
          className="max-w-6xl mx-auto px-4 py-12 md:py-16 space-y-8"
        >
          <h2 className="text-xl md:text-2xl font-semibold text-center">
            Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 mb-3">
                1
              </div>
              <h3 className="text-sm font-semibold mb-1">Tu nous contactes</h3>
              <p className="text-xs text-slate-500">
                Par téléphone, WhatsApp ou via ton hôtel / résidence partenaire.
                Tu expliques ce dont tu as besoin.
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 mb-3">
                2
              </div>
              <h3 className="text-sm font-semibold mb-1">
                On trouve le bon coursier
              </h3>
              <p className="text-xs text-slate-500">
                On regarde les disponibilités en temps réel et on confie ta
                mission à un coursier chouette à proximité.
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 mb-3">
                3
              </div>
              <h3 className="text-sm font-semibold mb-1">
                Tu es livré & rassuré
              </h3>
              <p className="text-xs text-slate-500">
                Le coursier t’appelle si besoin, livre en main propre et peut
                saisir un code de validation pour sécuriser la livraison.
              </p>
            </div>
          </div>
        </section>

        {/* CONTACT / CTA FINAL */}
        <section
          id="contact"
          className="bg-slate-900 text-slate-50 border-t border-slate-800"
        >
          <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 flex flex-col md:flex-row items-start gap-10">
            <div className="flex-1 space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">
                Envie d’essayer Il est chouette ?
              </h2>
              <p className="text-sm text-slate-300">
                Contacte-nous pour ta prochaine course ou pour devenir coursier.
                Nous sommes basés à Nice et nous développons la communauté pas à
                pas.
              </p>
              <p className="text-sm">
                📞 <span className="font-semibold">06 95 42 73 12</span>
                <br />
                💬 WhatsApp :{" "}
                <span className="font-semibold">06 95 42 73 12</span>
                <br />
                ✉️ Email :{" "}
                <span className="font-semibold">allo@ilestchouette.fr</span>
              </p>

              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs text-slate-400">
                  Suivre Il est chouette :
                </span>
                <a
                  href="#"
                  aria-label="Instagram"
                  className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[13px] hover:bg-orange-500 cursor-pointer"
                >
                  IG
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[13px] hover:bg-orange-500 cursor-pointer"
                >
                  f
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[13px] hover:bg-orange-500 cursor-pointer"
                  onClick={() => trackEvent("click_whatsapp_footer")}
                >
                  WA
                </a>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <Link
                href="/operateur"
                className="inline-flex items-center justify-center rounded-full bg-white text-slate-900 text-sm px-6 py-2.5 font-semibold shadow-md cursor-pointer"
                onClick={() => trackEvent("click_connexion_operateur_footer")}
              >
                Connexion opérateur
              </Link>
              <Link
                href="/coursier"
                className="inline-flex items-center justify-center rounded-full border border-slate-600 text-sm px-6 py-2.5 font-semibold cursor-pointer"
                onClick={() => trackEvent("click_candidature_coursier_footer")}
              >
                Envoyer ma candidature coursier
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-slate-950 text-slate-400 text-[11px]">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
            <p>
              © {new Date().getFullYear()} Il est chouette — SASU basée à Nice.
            </p>
            <div className="flex gap-4">
              <Link href="/mentions-legales" className="hover:text-slate-200">
                Mentions légales
              </Link>
              <Link href="/operateur" className="hover:text-slate-200">
                Espace opérateur
              </Link>
              <Link href="/coursier" className="hover:text-slate-200">
                Espace coursier
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}