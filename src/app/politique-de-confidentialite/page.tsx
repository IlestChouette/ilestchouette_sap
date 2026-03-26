import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité d'Il est chouette, service de coursier humain à Nice.",
  robots: { index: false, follow: false },
};

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div>
          <Link
            href="/"
            className="text-sm text-orange-600 hover:underline mb-6 inline-block"
          >
            ← Retour à l'accueil
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            Politique de confidentialité
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dernière mise à jour : mars 2026
          </p>
        </div>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Responsable du traitement
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>Il est chouette</strong> — SASU au capital de 5 000 €<br />
            SIREN : 942 069 949<br />
            Siège social : 143 Promenade des Anglais, 06200 Nice, France<br />
            Email : allo@ilestchouette.fr
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Données collectées
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Dans le cadre de l'utilisation de nos applications et services, nous
            collectons les données suivantes :
          </p>
          <ul className="text-sm text-slate-600 leading-relaxed list-disc list-inside space-y-1">
            <li>Nom et prénom</li>
            <li>Adresse email</li>
            <li>Numéro de téléphone</li>
            <li>Adresses de collecte et de livraison</li>
            <li>Historique des commandes</li>
            <li>Token de notification push (pour les alertes de commande)</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Finalités du traitement
          </h2>
          <ul className="text-sm text-slate-600 leading-relaxed list-disc list-inside space-y-1">
            <li>Traitement et suivi des commandes</li>
            <li>Communication avec le client et le coursier</li>
            <li>Envoi de notifications de suivi</li>
            <li>Facturation et comptabilité</li>
            <li>Amélioration de nos services</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Conservation des données
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Vos données sont conservées pendant la durée de votre relation avec
            nous, plus 3 ans pour les données de facturation (obligation légale).
            Les données des comptes inactifs sont supprimées après 2 ans.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Partage des données
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Vos données ne sont jamais vendues à des tiers. Elles peuvent être
            partagées uniquement avec :
          </p>
          <ul className="text-sm text-slate-600 leading-relaxed list-disc list-inside space-y-1">
            <li>
              <strong>Supabase</strong> — hébergement de la base de données
            </li>
            <li>
              <strong>Stripe</strong> — traitement des paiements
            </li>
            <li>
              <strong>Expo / Firebase</strong> — notifications push
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Vos droits (RGPD)
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Conformément au Règlement Général sur la Protection des Données
            (RGPD), vous disposez des droits suivants :
          </p>
          <ul className="text-sm text-slate-600 leading-relaxed list-disc list-inside space-y-1">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (droit à l'oubli)</li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition</li>
          </ul>
          <p className="text-sm text-slate-600 leading-relaxed">
            Pour exercer ces droits, contactez-nous à{" "}
            <a
              href="mailto:allo@ilestchouette.fr"
              className="text-orange-600 hover:underline"
            >
              allo@ilestchouette.fr
            </a>
            .
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Sécurité
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nous mettons en œuvre des mesures techniques et organisationnelles
            appropriées pour protéger vos données contre tout accès non
            autorisé, perte ou divulgation.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">Contact</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Pour toute question relative à cette politique de confidentialité :{" "}
            <a
              href="mailto:allo@ilestchouette.fr"
              className="text-orange-600 hover:underline"
            >
              allo@ilestchouette.fr
            </a>
          </p>
        </section>

        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm px-6 py-2.5 font-semibold transition"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
