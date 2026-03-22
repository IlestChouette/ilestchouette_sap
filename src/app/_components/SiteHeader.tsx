"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-black/70 backdrop-blur-md border-b border-white/8">
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
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
          <a href="/#services" className="hover:text-orange-400 transition-colors">Services</a>
          <a href="/#tarifs" className="hover:text-orange-400 transition-colors">Tarifs</a>
          <a href="/#faq" className="hover:text-orange-400 transition-colors">FAQ</a>
          <a href="/#contact" className="hover:text-orange-400 transition-colors">Contact</a>
          <Link
            href="/coursier"
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white hover:border-orange-500 hover:text-orange-400 transition-colors cursor-pointer"
          >
            Connexion coursier
          </Link>
        </nav>

        {/* Bouton burger (mobile) */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/20 text-white hover:bg-white/10 cursor-pointer"
          onClick={() => setOpen((v) => !v)}
          aria-label="Ouvrir le menu"
        >
          <span className="sr-only">Ouvrir le menu</span>
          <div className="space-y-1.5">
            <span
              className={`block h-[2px] w-5 bg-white transition-transform ${
                open ? "translate-y-[5px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[2px] w-5 bg-white transition-opacity ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-[2px] w-5 bg-white transition-transform ${
                open ? "-translate-y-[5px] -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Menu mobile déroulant */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-black/90 backdrop-blur-md">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2 text-sm text-white/70">
            <a href="/#services" className="py-1 hover:text-orange-400" onClick={() => setOpen(false)}>Services</a>
            <a href="/#tarifs" className="py-1 hover:text-orange-400" onClick={() => setOpen(false)}>Tarifs</a>
            <a href="/#faq" className="py-1 hover:text-orange-400" onClick={() => setOpen(false)}>FAQ</a>
            <a href="/#contact" className="py-1 hover:text-orange-400" onClick={() => setOpen(false)}>Contact</a>
            <Link
              href="/coursier"
              className="mt-1 inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white hover:border-orange-500 cursor-pointer"
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