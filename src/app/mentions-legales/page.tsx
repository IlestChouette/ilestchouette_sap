import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Mentions légales du site Il est chouette, service de coursier humain à Nice.",
  robots: { index: false, follow: false },
};

export default function MentionsLegales() {
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
          <h1 className="text-2xl font-bold text-slate-900">Mentions légales</h1>
          <p className="text-sm text-slate-500 mt-1">
            Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance
            dans l'économie numérique.
          </p>
        </div>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Éditeur du site
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>Il est chouette</strong>
            <br />
            SASU au capital de 1 000 €<br />
            Siège social : 143 Promenade des Anglais, 06200 Nice, France
            <br />
            Téléphone : 06 95 42 73 12
            <br />
            Email : allo@ilestchouette.fr
            <br />
            Directeur de la publication : Fernando Fonseca Pinzon
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Hébergement
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Ce site est hébergé par{" "}
            <strong>Vercel Inc.</strong>
            <br />
            340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis
            <br />
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:underline"
            >
              www.vercel.com
            </a>
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Données personnelles
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Les données collectées sur ce site (nom, téléphone, adresse) sont
            utilisées exclusivement dans le cadre de la prestation de service
            demandée par le client. Elles sont stockées de manière sécurisée et
            ne sont pas transmises à des tiers.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Conformément au Règlement Général sur la Protection des Données
            (RGPD), vous disposez d'un droit d'accès, de rectification et de
            suppression de vos données. Pour exercer ce droit, contactez-nous à{" "}
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
            Cookies et analytics
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Ce site utilise Google Analytics 4 pour mesurer l'audience de
            manière anonyme. Ces données nous permettent d'améliorer votre
            expérience. Aucun cookie publicitaire n'est utilisé.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Vous pouvez refuser la collecte de données en installant l'extension
            Google Analytics Opt-out sur votre navigateur.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Propriété intellectuelle
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            L'ensemble du contenu de ce site (textes, images, logo) est la
            propriété exclusive d'Il est chouette. Toute reproduction, même
            partielle, est interdite sans autorisation préalable.
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
