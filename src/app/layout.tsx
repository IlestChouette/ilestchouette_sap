// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "./_components/SiteHeader";

export const metadata: Metadata = {
  title: "Il est chouette",
  description:
    "Coursier humain à Nice : courses, médicaments, colis, accompagnement… on facilite ton quotidien.",
};

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
      </body>
    </html>
  );
}