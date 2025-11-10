"use client";

import { useState } from "react";
import { supabase } from "../../_lib/supabaseClient"; // garde ce chemin comme tu l'as mis

export default function CoursierLoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  /* ==== LOGIN ==== */
  const [loginEmail, setLoginEmail] = useState("coursier@ilestchouette.fr");
  const [loginPassword, setLoginPassword] = useState("motdepasse");
  const [loginError, setLoginError] = useState("");

  /* ==== SIGNUP ==== */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupMessage, setSignupMessage] = useState("");
  const [signupError, setSignupError] = useState("");

  /* ====================== LOGIN AVEC SUPABASE ====================== */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError(error.message);
    } else {
      console.log("Connexion réussie ✅", data);
      // plus tard : router vers /coursier
    }
  }

  /* ====================== DEMANDE D'INSCRIPTION ====================== */
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    setSignupMessage("");

    if (!firstName || !lastName || !signupEmail || !signupPhone) {
      setSignupError("Remplis tous les champs.");
      return;
    }

    const { error } = await supabase.from("courier_signups").insert([
      {
        first_name: firstName,
        last_name: lastName,
        email: signupEmail,
        phone: signupPhone,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      setSignupError(error.message);
    } else {
      setSignupMessage(
        "Demande envoyée ✅ L’opérateur pourra créer ton accès."
      );
      setFirstName("");
      setLastName("");
      setSignupEmail("");
      setSignupPhone("");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">
          {mode === "login" ? "Connexion coursier" : "Créer un compte coursier"}
        </h1>

        {mode === "login" ? (
          <>
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                className="w-full border rounded p-2"
                placeholder="email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <input
                className="w-full border rounded p-2"
                placeholder="mot de passe"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              {loginError && (
                <p className="text-red-600 text-sm">{loginError}</p>
              )}
              <button
                type="submit"
                className="w-full bg-black text-white rounded py-2"
              >
                Se connecter
              </button>
            </form>

            <p className="text-sm text-center">
              Pas encore de compte ?{" "}
              <button
                type="button"
                className="text-blue-600 underline"
                onClick={() => {
                  setMode("signup");
                  setLoginError("");
                }}
              >
                Créer un compte coursier
              </button>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="flex gap-2">
                <input
                  className="w-1/2 border rounded p-2"
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  className="w-1/2 border rounded p-2"
                  placeholder="Nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <input
                className="w-full border rounded p-2"
                placeholder="Email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
              <input
                className="w-full border rounded p-2"
                placeholder="Téléphone"
                type="tel"
                value={signupPhone}
                onChange={(e) => setSignupPhone(e.target.value)}
              />
              {signupError && (
                <p className="text-red-600 text-sm">{signupError}</p>
              )}
              {signupMessage && (
                <p className="text-green-600 text-sm">{signupMessage}</p>
              )}
              <button
                type="submit"
                className="w-full bg-black text-white rounded py-2"
              >
                Envoyer la demande
              </button>
            </form>

            <p className="text-sm text-center">
              Déjà un compte ?{" "}
              <button
                type="button"
                className="text-blue-600 underline"
                onClick={() => {
                  setMode("login");
                  setSignupError("");
                  setSignupMessage("");
                }}
              >
                Revenir à la connexion
              </button>
            </p>
          </>
        )}
      </div>
    </main>
  );
}