import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import SiteHeader from "./_components/SiteHeader";

export const metadata: Metadata = {
  title: {
    default: "Il est chouette · Assistant personnel à la demande à Nice",
    template: "%s · Il est chouette",
  },
  description:
    "Assistant personnel à la demande à Nice : courses, médicaments, livraisons, accompagnement… on facilite ton quotidien.",
  metadataBase: new URL("https://ilestchouette.fr"),
  alternates: {
    canonical: "https://ilestchouette.fr",
  },
  openGraph: {
    title: "Il est chouette · Assistant personnel à la demande à Nice",
    description: "Assistant personnel à la demande à Nice : courses, médicaments, livraisons, accompagnement… on facilite ton quotidien.",
    url: "https://ilestchouette.fr",
    siteName: "Il est chouette",
    locale: "fr_FR",
    type: "website",
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 text-slate-900">
        <SiteHeader />
        <main>{children}</main>

        {/* Google Analytics 4 — chargé sur toutes les pages */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: true });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
