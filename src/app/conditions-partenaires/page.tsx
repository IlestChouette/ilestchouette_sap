import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Partenaire — Il est Chouette",
  description: "Conditions générales pour les commerçants partenaires Il est Chouette à Nice.",
};

export default function ConditionsPartenaires() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-4xl mb-3">🤝</div>
          <h1 className="text-3xl font-bold text-gray-900">Conditions Partenaire</h1>
          <p className="text-gray-500 mt-2">Il est Chouette — Assistant personnel à la demande</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">1. Partenariat gratuit</h2>
            <p>
              Le partenariat avec Il est Chouette est <strong>entièrement gratuit</strong> pour le commerçant.
              Aucune commission, aucun abonnement, aucun frais d'inscription ne sont prélevés.
              Il est Chouette se rémunère uniquement sur les frais de livraison facturés au client final.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">2. Priorité de traitement</h2>
            <p>
              Le commerçant s'engage à traiter les commandes Il est Chouette <strong>en priorité</strong>,
              dès leur réception sur le tableau de bord partenaire. La commande doit être préparée
              et prête avant l'arrivée du coursier, afin de garantir des délais de livraison optimaux
              pour le client final.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">3. Respect des horaires</h2>
            <p>
              Les horaires d'ouverture renseignés lors de l'inscription doivent être <strong>exacts et à jour</strong>.
              Le commerçant s'engage à mettre à jour ses horaires en cas de fermeture exceptionnelle
              ou de changement de planning, afin d'éviter que des commandes soient passées en dehors
              des heures de service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">4. Qualité des produits</h2>
            <p>
              Les produits livrés doivent être <strong>conformes aux descriptions et photos</strong> affichées,
              frais, complets et en bon état. Toute non-conformité (produit manquant, article incorrect,
              qualité insuffisante) constatée par le client peut entraîner un remboursement total ou partiel
              <strong> à la charge du commerçant</strong>.
              Il est Chouette se réserve le droit de retirer un partenaire en cas de plaintes répétées.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">5. Paiement en magasin</h2>
            <p>
              Les commandes sont réglées directement en magasin par le coursier Il est Chouette
              via une <strong>carte virtuelle Il est Chouette</strong> au moment du retrait.
              Le commerçant accepte ce mode de paiement comme tout autre moyen de paiement classique.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">6. Résiliation</h2>
            <p>
              Chaque partie peut mettre fin au partenariat avec un préavis de <strong>1 mois</strong>,
              notifié par email à <a href="mailto:allo@ilestchouette.fr" className="text-orange-500 hover:underline">allo@ilestchouette.fr</a>.
              Il est Chouette se réserve le droit de suspendre immédiatement un partenaire en cas
              de manquements graves aux présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">7. Données personnelles</h2>
            <p>
              Les données du commerçant (nom, adresse, email, téléphone) sont utilisées uniquement
              dans le cadre du partenariat Il est Chouette et ne sont pas cédées à des tiers.
            </p>
          </section>

          <div className="border-t border-gray-100 pt-6 text-xs text-gray-400">
            <p>Il est Chouette — SASU au capital de 5 000 € — SIREN 942 069 949</p>
            <p>Siège social : Nice, Alpes-Maritimes (06)</p>
            <p>Contact : <a href="mailto:allo@ilestchouette.fr" className="hover:underline">allo@ilestchouette.fr</a></p>
          </div>
        </div>

        <div className="text-center mt-8">
          <a href="/commercant" className="bg-orange-500 text-white font-bold px-8 py-3 rounded-xl hover:bg-orange-600 transition inline-block">
            Devenir partenaire →
          </a>
        </div>
      </div>
    </div>
  );
}
