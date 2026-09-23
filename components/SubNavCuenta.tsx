"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pestañas dentro del área de cuenta. Antes, entrar a "Mi perfil" y
// luego a "Mi clóset" se sentía como saltar a una página aparte —cada
// una vivía sola arriba en el navbar, mezclada con enlaces que no
// tienen nada que ver entre sí. Esto pone las secciones de la cuenta
// juntas, como pestañas de un mismo lugar, con la actual resaltada.
//
// Se monta en cada página de la cuenta (mi-perfil, mi-closet,
// mis-outfits, manual, membresia) — no en el navbar de arriba, que
// sigue igual para el resto del sitio.
const PESTANAS = [
  { href: "/mi-perfil", label: "Mi perfil" },
  { href: "/buscar", label: "Buscar" },
  { href: "/mi-closet", label: "Mi clóset" },
  { href: "/mis-outfits", label: "Mis outfits" },
  { href: "/manual", label: "Mi manual" },
  { href: "/membresia", label: "Membresía" },
];

export default function SubNavCuenta() {
  const pathname = usePathname();

  return (
    <div className="-mx-4 mb-6 overflow-x-auto sm:mx-0">
      <div className="flex min-w-max gap-1 border-b border-rosa-100 px-4 sm:px-0">
        {PESTANAS.map((p) => {
          const activa = pathname === p.href;
          return (
            <Link
              key={p.href}
              href={p.href}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                activa
                  ? "border-rosa-500 text-noche"
                  : "border-transparent text-noche/50 hover:text-noche/80"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
