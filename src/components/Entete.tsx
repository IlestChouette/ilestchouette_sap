export default function Entete() {
  return (
    <header className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">🦉 Il est chouette</div>
        <nav className="flex gap-4 text-sm">
          <a href="/" className="hover:underline">Accueil</a>
          <a href="/services" className="hover:underline">Services</a>
          <a href="/tarifs" className="hover:underline">Tarifs</a>
          <a href="/contact" className="hover:underline">Contact</a>
          <a href="/connexion" className="font-medium">Connexion</a>
        </nav>
      </div>
    </header>
  );
}