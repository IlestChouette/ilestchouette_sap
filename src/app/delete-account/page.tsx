export const metadata = {
  title: "Supprimer mon compte — Il est Chouette",
  robots: { index: false, follow: false },
};

export default function DeleteAccountPage() {
  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", color: "#111827", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Supprimer mon compte</h1>
      <p style={{ color: "#6B7280", marginBottom: 32 }}>Application Il est Chouette</p>

      <p>
        Pour demander la suppression de votre compte et de toutes vos données personnelles,
        envoyez un e-mail à l'adresse suivante en précisant l'adresse e-mail associée à votre compte :
      </p>

      <div style={{ background: "#FFF7ED", border: "2px solid #F97316", borderRadius: 14, padding: "20px 24px", margin: "28px 0" }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          📧 <a href="mailto:allo@ilestchouette.fr?subject=Suppression de compte" style={{ color: "#F97316" }}>
            allo@ilestchouette.fr
          </a>
        </p>
        <p style={{ margin: "8px 0 0", color: "#6B7280", fontSize: 14 }}>
          Objet : <em>Suppression de compte</em>
        </p>
      </div>

      <p>Nous traiterons votre demande dans un délai de <strong>30 jours</strong>. Les données supprimées incluent :</p>
      <ul style={{ paddingLeft: 20 }}>
        <li>Votre compte et identifiants de connexion</li>
        <li>Votre historique de commandes et missions</li>
        <li>Vos informations personnelles (nom, téléphone, adresses)</li>
      </ul>

      <p style={{ color: "#6B7280", fontSize: 13, marginTop: 32 }}>
        Il est Chouette SASU — SIREN 942 069 949 — 143 Promenade des Anglais, 06200 Nice
      </p>
    </main>
  );
}
