"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

// Navbar responsive con logo, link a Mis Outfits y botón de login
export default function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-20 border-b border-rosa-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rosa-400 text-white">
            <span className="font-display text-xl">L</span>
          </span>
          <span className="font-display text-xl tracking-tight sm:text-2xl">
            LolearDeLola
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/buscar"
            className="text-sm font-medium text-noche/70 transition hover:text-rosa-500"
          >
            Buscar
          </Link>
          {session && (
            <Link
              href="/mis-outfits"
              className="text-sm font-medium text-noche/70 transition hover:text-rosa-500"
            >
              Mis outfits
            </Link>
          )}
          {status === "loading" ? (
            <div className="h-9 w-24 animate-pulse-rosa rounded-full bg-rosa-100" />
          ) : session ? (
            <div className="flex items-center gap-3">
              {session.user?.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-rosa-200"
                />
              )}
              <button
                onClick={() => signOut()}
                className="rounded-full border border-rosa-200 px-4 py-1.5 text-sm font-medium text-noche/70 transition hover:bg-rosa-100"
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("pinterest")}
              className="rounded-full bg-noche px-4 py-2 text-sm font-medium text-white transition hover:bg-rosa-500"
            >
              Entrar con Pinterest
            </button>
          )}
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
          <Link
            href="/buscar"
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-noche/80 hover:bg-rosa-50"
          >
            Buscar
          </Link>
          {session && (
            <Link
              href="/mis-outfits"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-noche/80 hover:bg-rosa-50"
            >
              Mis outfits
            </Link>
          )}
          <div className="mt-2 border-t border-rosa-100 pt-3">
            {session ? (
              <button
                onClick={() => {
                  signOut();
                  setMenuOpen(false);
                }}
                className="w-full rounded-full border border-rosa-200 px-4 py-2 text-sm font-medium text-noche/70"
              >
                Salir
              </button>
            ) : (
              <button
                onClick={() => {
                  signIn("pinterest");
                  setMenuOpen(false);
                }}
                className="w-full rounded-full bg-noche px-4 py-2 text-sm font-medium text-white"
              >
                Entrar con Pinterest
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
