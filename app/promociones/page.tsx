"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Promociones from "@/components/Promociones";
import SubNavCuenta from "@/components/SubNavCuenta";
import AnotarVista from "@/components/AnotarVista";

// Promociones en su propia pestaña, la primera del menú (antes iban
// debajo de la búsqueda). Desde Buscar se llega con ?tipos=vestido|blusa
// para ver arriba las de lo que se buscó.
//
// useSearchParams() obliga a renderizar en el navegador, y Next pide
// envolverlo en Suspense.
export default function PromocionesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <SubNavCuenta />
      <AnotarVista nombre="promociones_visto" />
      <Suspense fallback={null}>
        <ConTipos />
      </Suspense>
    </div>
  );
}

function ConTipos() {
  const tipos = (useSearchParams().get("tipos") ?? "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
  return <Promociones tipos={tipos} />;
}
