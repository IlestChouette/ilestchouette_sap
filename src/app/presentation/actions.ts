"use server";

import { cookies } from "next/headers";
import { createHash } from "crypto";
import { redirect } from "next/navigation";

const VALID_EMAIL = "allo@ilestchouette.fr";
const VALID_PASSWORD_HASH = createHash("sha256").update("Bogota841219@@").digest("hex");
const COOKIE_TOKEN = "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1";
const COOKIE = "iec_pres_auth";

export async function authenticate(formData: FormData) {
  const email = (formData.get("email") as string ?? "").trim().toLowerCase();
  const password = formData.get("password") as string ?? "";
  const passwordHash = createHash("sha256").update(password).digest("hex");

  if (email !== VALID_EMAIL || passwordHash !== VALID_PASSWORD_HASH) {
    return { error: "Identifiants incorrects" };
  }

  const jar = await cookies();
  jar.set(COOKIE, COOKIE_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: "/",
  });

  redirect("/presentation");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
  redirect("/presentation/login");
}
