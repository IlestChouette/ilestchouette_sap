"use client";
import { useState } from "react";
import { supabase } from "../../_lib/supabaseClient";

export default function OperatorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Connexion...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg("Erreur : " + error.message);
    else window.location.href = "/operateur";
  }

  return (
    <main className="max-w-md mx-auto mt-20 p-6 border rounded font-sans">
      <h1 className="text-2xl font-semibold mb-4">Connexion opérateur</h1>
      <form onSubmit={handleLogin} className="space-y-3">
        <input
          className="border rounded p-2 w-full"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border rounded p-2 w-full"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-black text-white rounded px-4 py-2 w-full" type="submit">
          Se connecter
        </button>
        {msg && <p className="text-sm text-gray-600 mt-2">{msg}</p>}
      </form>
    </main>
  );
}