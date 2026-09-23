"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { comoSeLlama, useUsuario } from "@/lib/use-usuario";

const LINKS = [
  { href: "/buscar", label: "Buscar" },
  { href: "/mi-closet", label: "Mi clóset" },
  { href: "/mi-perfil", label: "Mi perfil" },
  { href: "/mis-outfits", label: "Mis outfits" },
  { href: "/manual", label: "Mi manual" },
  { href: "/membresia", label: "Membresía" },
];

// Navbar responsive. Todas las secciones siguen abiertas sin cuenta —
// se puede usar la app sin registrarse, con topes (ver lib/planes.ts).
// El enlace de "Entrar" es para que quien ya tenga cuenta recupere su
// clóset desde otro dispositivo, y para pasarse a la membresía.
//
// Con sesión iniciada la barra pasa a fondo oscuro (noche, ya un color
// de marca) en vez del blanco de siempre — así se nota de un vistazo
// que se está "dentro" de la cuenta, sin inventar un color nuevo fuera
// de la paleta.
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { usuario, recargar } = useUsuario();
  const router = useRouter();
  const dentro = !!usuario?.conSesion;
  const nombre = comoSeLlama(usuario);

  async function salir() {
    await fetch("/api/auth/salir", { method: "POST" });
    setMenuOpen(false);
    await recargar();
    router.push("/");
    router.refresh();
  }

  return (
    <nav
      className={`sticky top-0 z-20 border-b backdrop-blur transition-colors ${
        dentro ? "border-noche bg-noche/95" : "border-rosa-100 bg-white/80"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rosa-400 text-white">
            <span className="font-display text-xl">L</span>
          </span>
          <span
            className={`font-display text-xl tracking-tight sm:text-2xl ${
              dentro ? "text-white" : "text-noche"
            }`}
          >
            LoleardLola
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition ${
                dentro
                  ? "text-white/70 hover:text-rosa-300"
                  : "text-noche/70 hover:text-rosa-500"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {dentro ? (
            <div className="flex items-center gap-3">
              <Link
                href="/mi-perfil"
                className="flex items-center gap-2 text-sm font-medium text-white transition hover:text-rosa-300"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rosa-300 text-xs font-semibold uppercase text-noche">
                  {nombre.slice(0, 1)}
                </span>
                {nombre}
              </Link>
              <button
                onClick={salir}
                className="text-xs text-white/40 underline transition hover:text-rosa-300"
              >
                Salir
              </button>
            </div>
          ) : (
            <Link
              href="/entrar"
              className="text-sm font-medium text-noche/70 transition hover:text-rosa-500"
            >
              Entrar
            </Link>
          )}
          <Link
            href="/buscar"
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              dentro
                ? "bg-rosa-400 text-white hover:bg-rosa-300"
                : "bg-noche text-white hover:bg-rosa-500"
            }`}
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
            <span className={`block h-0.5 w-6 ${dentro ? "bg-white" : "bg-noche"}`}></span>
            <span className={`block h-0.5 w-6 ${dentro ? "bg-white" : "bg-noche"}`}></span>
            <span className={`block h-0.5 w-6 ${dentro ? "bg-white" : "bg-noche"}`}></span>
          </span>
        </button>
      </div>

      {menuOpen && (
        <div
          className={`border-t px-4 pb-4 pt-2 sm:hidden ${
            dentro ? "border-white/10 bg-noche" : "border-rosa-100 bg-white"
          }`}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                dentro ? "text-white/80 hover:bg-white/10" : "text-noche/80 hover:bg-rosa-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {dentro ? (
            <button
              onClick={salir}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
            >
              Salir ({nombre})
            </button>
          ) : (
            <Link
              href="/entrar"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-noche/80 hover:bg-rosa-50"
            >
              Entrar
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
