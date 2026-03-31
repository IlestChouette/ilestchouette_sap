export const metadata = {
  title: "Politique de confidentialité — Il est Chouette",
  description: "Politique de confidentialité des applications Il est Chouette",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", color: "#111827", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Politique de confidentialité</h1>
      <p style={{ color: "#6B7280", marginBottom: 40 }}>Dernière mise à jour : 31 mars 2026</p>

      <p>
        La présente politique de confidentialité s'applique aux applications mobiles <strong>Il est Chouette</strong> (application client et application coursier),
        éditées par <strong>Il est Chouette SASU</strong>, SIREN 942 069 949, dont le siège social est situé au
        143 Promenade des Anglais, 06200 Nice, France.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>1. Données collectées</h2>
      <p>Nous collectons les données suivantes :</p>
      <ul style={{ paddingLeft: 20 }}>
        <li><strong>Données d'identification</strong> : nom, prénom, adresse e-mail, numéro de téléphone.</li>
        <li><strong>Données de localisation</strong> : adresse de livraison saisie manuellement par l'utilisateur.</li>
        <li><strong>Données de paiement</strong> : traitées exclusivement par Stripe, nous ne stockons aucune donnée bancaire.</li>
        <li><strong>Données d'utilisation</strong> : historique des commandes et missions effectuées.</li>
        <li><strong>Notifications push</strong> : jeton d'appareil pour l'envoi de notifications (coursiers uniquement).</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>2. Finalités du traitement</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li>Gestion et suivi des commandes de livraison.</li>
        <li>Mise en relation entre clients et coursiers.</li>
        <li>Traitement des paiements en ligne.</li>
        <li>Envoi de notifications de statut de commande.</li>
        <li>Amélioration de nos services.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>3. Base légale</h2>
      <p>
        Le traitement est fondé sur l'exécution du contrat (art. 6.1.b RGPD) pour la gestion des commandes,
        et sur notre intérêt légitime (art. 6.1.f RGPD) pour l'amélioration du service.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>4. Partage des données</h2>
      <p>Vos données ne sont jamais vendues. Elles sont partagées uniquement avec :</p>
      <ul style={{ paddingLeft: 20 }}>
        <li><strong>Supabase</strong> (hébergement base de données, serveurs en Europe).</li>
        <li><strong>Stripe</strong> (paiement en ligne).</li>
        <li><strong>Expo / Google Firebase</strong> (notifications push).</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>5. Conservation des données</h2>
      <p>
        Les données sont conservées pendant la durée de la relation contractuelle, puis archivées 3 ans
        conformément aux obligations légales françaises.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>6. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul style={{ paddingLeft: 20 }}>
        <li>Droit d'accès, de rectification et d'effacement de vos données.</li>
        <li>Droit à la portabilité.</li>
        <li>Droit d'opposition et de limitation du traitement.</li>
      </ul>
      <p>
        Pour exercer ces droits, contactez-nous à :{" "}
        <a href="mailto:allo@ilestchouette.fr" style={{ color: "#f97316" }}>allo@ilestchouette.fr</a>
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>7. Sécurité</h2>
      <p>
        Vos données sont protégées par chiffrement TLS en transit et par des politiques de sécurité au niveau
        de la base de données (Row Level Security). L'accès est strictement limité aux personnes autorisées.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>8. Contact</h2>
      <p>
        <strong>Il est Chouette SASU</strong><br />
        143 Promenade des Anglais, 06200 Nice, France<br />
        E-mail : <a href="mailto:allo@ilestchouette.fr" style={{ color: "#f97316" }}>allo@ilestchouette.fr</a>
      </p>
    </main>
  );
}
