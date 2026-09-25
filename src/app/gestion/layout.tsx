import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestion — Il est chouette",
  robots: { index: false, follow: false },
};

export default function GestionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
