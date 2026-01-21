import { notFound } from "next/navigation";
import Image from "next/image";
import { supabaseAdmin } from "../../../_lib/supabaseAdmin";

/* ==== Types simples pour la facture ==== */
type OrderRow = {
  id: string;
  customer_id: string | null;
  service_type: string;
  pickup_address: string;
  dropoff_address: string;
  price_total: number;
  distance_km: number | null;
  express?: boolean | null;
  created_at?: string | null;
  notes?: string | null;
  access_info?: string | null;
  validation_code?: string | null;
  wants_invoice?: boolean | null;
};

type CustomerRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
  zipcode?: string | null;
  city?: string | null;
  phone: string;
};

type AssignmentRow = {
  payment_method?: string | null;
};

/* ==== Labels jolis pour les services ==== */
const SERVICE_LABELS: Record<string, string> = {
  supermarket: "Courses supermarché (8€)",
  meds: "Médicaments (6€)",
  food: "Nourriture (6€)",
  keys: "Clés / objets (6€)",
  shopping: "Achats boutique (8€)",
  concierge: "Conciergerie (12€)",
  express: "Express (12€)",
  eco: "Éco (7€)",
  it: "Dépannage informatique (50€/h)",
  assist: "Accompagnement (20€/h)",
  bricolage: "Bricolage (50€/h)",
  other: "Autre",
};

/* Petite fonction pour formater les dates */
function formatDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* Helper pour afficher le libellé du mode de règlement */
function paymentLabel(method?: string | null): string {
  switch (method) {
    case "cash":
      return "Espèces";
    case "card":
      return "CB";
    case "to_pay":
      return "À régler";
    default:
      return "—";
  }
}

/* ============================================================
 * PAGE FACTURE
 * ========================================================== */
export default async function FacturePage({
  params,
}: {
  // Sur Next 16, params est un Promise → on l'await
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  // Sécurité : si jamais l’URL est bizarre
  if (!orderId) {
    console.error("Facture: orderId manquant dans l’URL");
    notFound();
  }

  // 1) On récupère la commande
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();

  if (orderErr) {
    console.error("Facture: erreur requête order", orderErr);
    throw new Error("Erreur lors du chargement de la commande");
  }
  if (!order) {
    console.error("Facture: order introuvable", { orderId });
    notFound();
  }

  // 2) On récupère le client (si customer_id est renseigné)
  let customer: CustomerRow | null = null;
  if (order.customer_id) {
    const { data: cust, error: custErr } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", order.customer_id)
      .maybeSingle<CustomerRow>();

    if (custErr) {
      console.error("Facture: erreur requête customer", custErr);
    } else {
      customer = cust ?? null;
    }
  }

  // 3) On récupère l'assignation pour connaître le mode de règlement
  let assignment: AssignmentRow | null = null;
  const { data: assign, error: assignErr } = await supabaseAdmin
    .from("assignments")
    .select("payment_method")
    .eq("order_id", orderId)
    .order("assigned_at", { ascending: false })
    .maybeSingle<AssignmentRow>();

  if (assignErr) {
    console.error("Facture: erreur requête assignment", assignErr);
  } else {
    assignment = assign ?? null;
  }

  const method = assignment?.payment_method ?? null;
  const modeReglement = paymentLabel(method);

  // 4) Montant TTC (micro-entreprise : pas de TVA)
  const totalTTC = order.price_total || 0;

  // 5) Texte lisible du service (label joli + notes opérateur)
  const serviceLabel =
    SERVICE_LABELS[order.service_type] ?? order.service_type;

  const serviceDescription =
    order.notes && order.notes.trim().length > 0
      ? `${serviceLabel} — ${order.notes}`
      : serviceLabel;

  // 6) Statut de la facture (en fonction du mode de règlement)
  let statutFacture = "—";
  if (method === "to_pay" || !method) {
    statutFacture = "À régler";
  } else if (method === "cash" || method === "card") {
    statutFacture = "Payée";
  }

  // 7) Facture demandée ? (infos pour affichage)
  let factureDemandeeLabel = "Non renseigné";
  if (order.wants_invoice === true) {
    factureDemandeeLabel = "Oui";
  } else if (order.wants_invoice === false) {
    factureDemandeeLabel = "Non";
  }

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center py-10">
      <div className="bg-white w-[800px] shadow-md p-10">
        {/* ENTÊTE */}
        <header className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-orange-600">
              Il est chouette
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              143 Promenade des Anglais
              <br />
              06200 Nice, France
              <br />
              SIREN : 942 069 949
            </p>
          </div>
          <div>
            <Image
              src="/logo-chouette.png"
              alt="Logo Il est chouette"
              width={200}
              height={80}
            />
          </div>
        </header>

        {/* INFO FACTURE */}
        <section className="flex justify-between mb-8 text-sm">
          <div>
            <p className="font-semibold mb-1">Facturé à :</p>
            <p>
              {customer?.first_name || customer?.last_name
                ? `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim()
                : "Client particulier"}
            </p>
            {customer?.address && <p>{customer.address}</p>}
            {(customer?.zipcode || customer?.city) && (
              <p>
                {customer?.zipcode} {customer?.city}
              </p>
            )}
            {customer?.phone && <p>{customer.phone}</p>}
          </div>
          <div className="text-right space-y-1">
            <p>
              <span className="font-semibold">Facture n° :</span>{" "}
              {order.id.slice(0, 8)}
            </p>
            <p>
              <span className="font-semibold">Date :</span>{" "}
              {formatDate(order.created_at || null)}
            </p>
            <p>
              <span className="font-semibold">Statut :</span> {statutFacture}
            </p>
            <p>
              <span className="font-semibold">Mode de règlement :</span>{" "}
              {modeReglement}
            </p>
            {/* ✅ Info : facture demandée ou non */}
            <p>
              <span className="font-semibold">Facture demandée par le client :</span>{" "}
              {factureDemandeeLabel}
            </p>
          </div>
        </section>

        {/* DÉTAIL LIGNE */}
        <section className="mb-8">
          <table className="w-full text-sm border-t border-b border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-2">Description</th>
                <th className="text-right py-2 px-2">Prix TTC</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-2 align-top">
                  {/* Service + notes opérateur */}
                  <div className="font-semibold">
                    Service : {serviceDescription}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    <div>
                      <b>Pickup :</b> {order.pickup_address}
                    </div>
                    <div>
                      <b>Livraison :</b> {order.dropoff_address}
                    </div>
                    {typeof order.distance_km === "number" && (
                      <div>
                        <b>Distance :</b> {order.distance_km} km
                      </div>
                    )}
                    {/* Infos livraison / accès */}
                    {order.access_info &&
                      order.access_info.trim().length > 0 && (
                        <div>
                          <b>Infos livraison :</b> {order.access_info}
                        </div>
                      )}
                    {order.express && (
                      <div className="text-red-500">Option Express</div>
                    )}
                    {order.validation_code && (
                      <div>Code client : {order.validation_code}</div>
                    )}
                  </div>
                </td>
                <td className="py-2 px-2 text-right align-top">
                  {totalTTC.toFixed(2)} €
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* RÉCAP TOTAL + MENTION TVA */}
        <section className="flex flex-col items-end text-sm space-y-1 mb-8">
          <p className="text-xs text-gray-600">
            TVA non applicable, art. 293 B du CGI
          </p>
          <p className="text-lg font-bold">
            Total TTC : {totalTTC.toFixed(2)} €
          </p>
        </section>

        <p className="text-xs text-gray-500 text-center">
          Merci d&apos;avoir fait appel à Il est chouette 🦉
        </p>
      </div>
    </main>
  );
}