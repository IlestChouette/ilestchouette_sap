import "./globals.css";
import Entete from "../components/Entete";

export const metadata = {
  title: "Il est chouette",
  description: "Plateforme de coursiers & services à la demande",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen text-slate-900 bg-white">
        <Entete />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
