"use server";

import { cookies } from "next/headers";
import { createHash } from "crypto";
import { redirect } from "next/navigation";

const VALID_EMAIL = process.env.PRESENTATION_EMAIL ?? "";
const VALID_PASSWORD_HASH = process.env.PRESENTATION_PASSWORD_HASH ?? "";
const COOKIE_TOKEN = process.env.PRESENTATION_COOKIE_TOKEN ?? "";
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
