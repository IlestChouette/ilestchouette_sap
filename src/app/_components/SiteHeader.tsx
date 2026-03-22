"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/logo-chouette.svg"
            alt="Il est chouette"
            width={120}
            height={40}
            priority
          />
        </Link>

        {/* Menu desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="/#services" className="hover:text-orange-500">Services</a>
          <a href="/#tarifs" className="hover:text-orange-500">Tarifs</a>
          <a href="/#faq" className="hover:text-orange-500">FAQ</a>
          <a href="/#contact" className="hover:text-orange-500">Contact</a>
          <Link
            href="/coursier"
            className="rounded-full border border-slate-900 px-4 py-1.5 text-xs font-semibold hover:bg-slate-900 hover:text-white cursor-pointer"
          >
            Connexion coursier
          </Link>
        </nav>

        {/* Bouton burger (mobile) */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
          onClick={() => setOpen((v) => !v)}
          aria-label="Ouvrir le menu"
        >
          <span className="sr-only">Ouvrir le menu</span>
          <div className="space-y-1.5">
            <span
              className={`block h-[2px] w-5 bg-slate-800 transition-transform ${
                open ? "translate-y-[5px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[2px] w-5 bg-slate-800 transition-opacity ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-[2px] w-5 bg-slate-800 transition-transform ${
                open ? "-translate-y-[5px] -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Menu mobile déroulant */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white/95">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2 text-sm">
            <a href="/#services" className="py-1 hover:text-orange-500" onClick={() => setOpen(false)}>Services</a>
            <a href="/#tarifs" className="py-1 hover:text-orange-500" onClick={() => setOpen(false)}>Tarifs</a>
            <a href="/#faq" className="py-1 hover:text-orange-500" onClick={() => setOpen(false)}>FAQ</a>
            <a href="/#contact" className="py-1 hover:text-orange-500" onClick={() => setOpen(false)}>Contact</a>
            <Link
              href="/coursier"
              className="mt-1 inline-flex items-center justify-center rounded-full border border-slate-900 px-4 py-1.5 text-xs font-semibold hover:bg-slate-900 hover:text-white cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Connexion coursier
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}