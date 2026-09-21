"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/buscar", label: "Buscar" },
  { href: "/mi-closet", label: "Mi clóset" },
  { href: "/mi-perfil", label: "Mi perfil" },
  { href: "/mis-outfits", label: "Mis outfits" },
];

// Navbar responsive. Sin login por ahora — el ingreso con Pinterest
// quedó para una fase siguiente, así que todas las secciones están
// abiertas y los datos viven por dispositivo (ver lib/device-id.ts).
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-20 border-b border-rosa-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rosa-400 text-white">
            <span className="font-display text-xl">L</span>
          </span>
          <span className="font-display text-xl tracking-tight sm:text-2xl">
            LoleardLola
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-noche/70 transition hover:text-rosa-500"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/buscar"
            className="rounded-full bg-noche px-4 py-2 text-sm font-medium text-white transition hover:bg-rosa-500"
          >
            Buscar un outfit
          </Link>
        </div>

        {/* Mobile */}
        <button
          className="flex items-center p-2 sm:hidden"
          aria-label="Menú"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="space-y-1">
            <span className="block h-0.5 w-6 bg-noche"></span>
            <span className="block h-0.5 w-6 bg-noche"></span>
            <span className="block h-0.5 w-6 bg-noche"></span>
          </span>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-rosa-100 bg-white px-4 pb-4 pt-2 sm:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-noche/80 hover:bg-rosa-50"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
