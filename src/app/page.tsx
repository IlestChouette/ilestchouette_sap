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
    addressLocality: "Nice",
    postalCode: "06200",
    addressCountry: "FR",
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

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Proposez-vous des services de bricolage à Nice ?",
      acceptedAnswer: { "@type": "Answer", text: "Oui ! Il est chouette propose des services de bricolage et petits travaux à domicile partout à Nice : montage de meubles, petites réparations, remplacement d'ampoules... Tarif : 60 € / heure. Contactez-nous au 06 95 42 73 12." },
    },
    {
      "@type": "Question",
      name: "Comment fonctionne le service de courses drive à Nice ?",
      acceptedAnswer: { "@type": "Answer", text: "Passez votre commande sur le site drive de votre supermarché (Carrefour Drive, Leclerc Drive...), puis contactez-nous avec votre numéro de commande et l'heure de retrait. Prévenez le drive qu'un coursier d'Il est chouette viendra récupérer en votre nom. Notre coursier récupère et vous livre. À partir de 8 € + 1 €/km (frais de livraison uniquement)." },
    },
    {
      "@type": "Question",
      name: "Livrez-vous des médicaments à domicile à Nice ?",
      acceptedAnswer: { "@type": "Answer", text: "Oui, Il est chouette récupère vos ordonnances et médicaments à la pharmacie et vous les livre à domicile à Nice. Tarif : 6 € + 1 €/km." },
    },
    {
      "@type": "Question",
      name: "Êtes-vous disponibles le week-end et les jours fériés ?",
      acceptedAnswer: { "@type": "Answer", text: "Oui, nous sommes disponibles 7 jours sur 7, de 8h à 22h, y compris le samedi, le dimanche et tous les jours fériés." },
    },
    {
      "@type": "Question",
      name: "Proposez-vous un service de voiturier à Nice ?",
      acceptedAnswer: { "@type": "Answer", text: "Oui, notre service de voiturier est disponible pour les hôtels, résidences privées et événements à Nice et alentours. Tarif : 25 € / heure." },
    },
    {
      "@type": "Question",
      name: "Livrez-vous dans toute la ville de Nice ?",
      acceptedAnswer: { "@type": "Answer", text: "Nous intervenons dans toute la ville de Nice et ses environs proches. Un supplément de 1 €/km s'applique selon la distance." },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      {/* LocalBusiness JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* FAQ JSON-LD — aide Google à afficher des résultats enrichis */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <HomeClient />
    </>
  );
}
