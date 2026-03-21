import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import PresentationClient from "./PresentationClient";

export const metadata: Metadata = {
  title: "Présentation — Il est chouette",
  description: "Document de présentation complet — confidentiel.",
  robots: { index: false },
};

export const revalidate = 86400;

async function getStats() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [{ count: orders }, { count: merchants }, { count: couriers }] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("merchants").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("couriers").select("*", { count: "exact", head: true }),
    ]);
    return { orders: orders ?? 0, merchants: merchants ?? 0, couriers: couriers ?? 0 };
  } catch {
    return { orders: 0, merchants: 0, couriers: 0 };
  }
}

export default async function PresentationPage() {
  const stats = await getStats();
  const updatedAt = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return <PresentationClient stats={stats} updatedAt={updatedAt} />;
}
