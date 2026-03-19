import type { Metadata } from "next";
import Script from "next/script";
import HomeClient from "./HomeClient";

/* ═══════════════════════════════════════════════════════════
   SEO — rendu côté serveur (HTML initial, indexé par Google)
═══════════════════════════════════════════════════════════ */
export const metadata: Metadata = {
  title:
    "Il est chouette · Coursier humain à Nice – Courses, pharmacie, voiturier et aide du quotidien",
  description:
    "Il est chouette est un service de coursier humain à Nice : courses supermarché, médicaments, repas, achats du quotidien, accompagnement, voiturier, dépannage informatique et petits bricolages pour habitants, seniors et touristes.",
  keywords:
    "coursier Nice, livraison courses Nice, médicaments à domicile Nice, voiturier Nice, dépannage informatique Nice, bricolage Nice, service à la personne Nice, aide seniors Nice, conciergerie Nice, il est chouette, livraison repas Nice, accompagnement rendez-vous Nice",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://www.ilestchouette.fr/",
  },
  openGraph: {
    type: "website",
    title:
      "Il est chouette · Coursier humain, voiturier et aide du quotidien à Nice",
    description:
      "Service de coursier humain, voiturier et d'aide du quotidien à Nice : courses, pharmacie, repas, accompagnement, aide administrative, dépannage informatique et petits bricolages.",
    url: "https://www.ilestchouette.fr/",
    siteName: "Il est chouette",
    locale: "fr_FR",
    images: [
      {
        url: "https://www.ilestchouette.fr/og-image.jpg",
        alt: "Coursier Il est chouette livrant des courses à Nice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Il est chouette · Coursier humain à Nice",
    description:
      "Coursier humain à Nice pour courses, pharmacie, nourriture, accompagnement, voiturier et aide du quotidien.",
    images: ["https://www.ilestchouette.fr/og-image.jpg"],
  },
};

/* ── Données structurées JSON-LD (LocalBusiness) ── */
const jsonLd = {
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
  areaServed: [{ "@type": "City", name: "Nice" }],
  description:
    "Service de coursier humain, voiturier et d'aide du quotidien à Nice pour habitants, seniors et touristes : courses, médicaments, repas, accompagnement, aide administrative, dépannage informatique et petits bricolages.",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday", "Sunday",
      ],
      opens: "08:00",
      closes: "22:00",
    },
  ],
  sameAs: [
    "https://www.instagram.com/ilestchouette",
    "https://www.facebook.com/ilestchouette",
  ],
  priceRange: "€€",
};

export default function HomePage() {
  return (
    <>
      {/* JSON-LD — rendu serveur, visible dans le HTML source */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Contenu interactif côté client */}
      <HomeClient />
    </>
  );
}
