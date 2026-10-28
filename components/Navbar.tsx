"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { comoSeLlama, useUsuario } from "@/lib/use-usuario";
import { esAdmin } from "@/lib/admin-correos";
import { useMarcasFavoritas } from "@/lib/marcas-favoritas";
import SelectorMarcas from "@/components/SelectorMarcas";

// En este orden, a pedido de Juliana (arriba y en el menú ☰): Buscar,
// Mis outfits, Mi perfil, Mi manual, Mi clóset, Membresía, Mis marcas
// favoritas, Preguntas y Salir. "Mis marcas favoritas" no es una página
// sino un panel, por eso va entre las dos listas.
const LINKS = [
  { href: "/buscar", label: "Buscar" },
  { href: "/mis-outfits", label: "Mis outfits" },
  { href: "/mi-perfil", label: "Mi perfil" },
  { href: "/manual", label: "Mi manual" },
  { href: "/mi-closet", label: "Mi clóset" },
  { href: "/membresia", label: "Membresía" },
];
const LINKS_DESPUES_DE_MARCAS = [{ href: "/preguntas", label: "Preguntas" }];

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
  // "Mis marcas": plegado dentro del menú del celular y como panel en
  // computador (ver components/SelectorMarcas.tsx).
  const [marcasAbiertas, setMarcasAbiertas] = useState(false);
  const misMarcas = useMarcasFavoritas();
  const etiquetaMarcas = misMarcas.length > 0 ? `Mis marcas favoritas (${misMarcas.length})` : "Mis marcas favoritas";
  const { usuario, recargar } = useUsuario();
  const router = useRouter();
  const dentro = !!usuario?.conSesion;
  const nombre = comoSeLlama(usuario);
  const administradora = dentro && esAdmin(usuario?.email);

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
        {/* Desde 1024 px: por debajo no caben los enlaces y se usa el menú ☰. */}
        <div className="hidden items-center gap-3 lg:flex xl:gap-5">
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setMarcasAbiertas((v) => !v)}
              aria-expanded={marcasAbiertas}
              className={`text-sm font-medium transition ${
                dentro ? "text-white/70 hover:text-rosa-300" : "text-noche/70 hover:text-rosa-500"
              } ${misMarcas.length > 0 ? (dentro ? "text-rosa-300" : "text-rosa-600") : ""}`}
            >
              {etiquetaMarcas}
            </button>
            {marcasAbiertas && (
              <div className="absolute right-0 top-full z-30 mt-3 w-72 rounded-2xl border border-rosa-100 bg-white p-4 shadow-suave">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-noche">Mis marcas favoritas</p>
                  <button type="button" onClick={() => setMarcasAbiertas(false)} className="text-xs text-noche/50 underline">
                    Listo
                  </button>
                </div>
                <SelectorMarcas />
              </div>
            )}
          </div>
          {LINKS_DESPUES_DE_MARCAS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition ${
                dentro ? "text-white/70 hover:text-rosa-300" : "text-noche/70 hover:text-rosa-500"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {dentro ? (
            <div className="flex items-center gap-3">
              {administradora && (
                <Link
                  href="/admin"
                  className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/80 transition hover:border-rosa-300 hover:text-rosa-300"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/mi-perfil"
                className="flex items-center gap-2 text-sm font-medium text-white transition hover:text-rosa-300"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rosa-300 text-xs font-semibold uppercase text-noche">
                  {nombre.slice(0, 1)}
                </span>
                <span className="hidden xl:inline">{nombre}</span>
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
            className={`hidden rounded-full px-4 py-2 text-sm font-medium transition xl:inline-block ${
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
          className="flex items-center p-2 lg:hidden"
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
          className={`border-t px-4 pb-4 pt-2 lg:hidden ${
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
          <button
            type="button"
            onClick={() => setMarcasAbiertas((v) => !v)}
            aria-expanded={marcasAbiertas}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              dentro ? "text-white/80 hover:bg-white/10" : "text-noche/80 hover:bg-rosa-50"
            }`}
          >
            {etiquetaMarcas}
            <span aria-hidden className="text-xs">{marcasAbiertas ? "▲" : "▼"}</span>
          </button>
          {marcasAbiertas && (
            <div className="px-3 pb-2">
              <SelectorMarcas oscuro={dentro} />
            </div>
          )}
          {LINKS_DESPUES_DE_MARCAS.map((l) => (
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
            <>
              {administradora && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={salir}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
              >
                Salir ({nombre})
              </button>
            </>
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
