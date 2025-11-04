export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-lg w-full bg-white shadow rounded-lg p-6 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Il est chouette 🦉</h1>
        <p className="text-slate-600">
          Le site arrive bientôt. Cette interface est surtout pour les opérateurs.
        </p>
        <p className="text-sm text-slate-400">
          Si tu es opérateur, clique ci-dessous.
        </p>
        <a
          href="/operateur"
          className="inline-block bg-black text-white px-4 py-2 rounded hover:bg-slate-900 transition"
        >
          Aller à l’espace opérateur
        </a>
      </div>
    </main>
  );
}