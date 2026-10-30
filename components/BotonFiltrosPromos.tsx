"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMarcasFavoritas } from "@/lib/marcas-favoritas";
import { useTallasFavoritas } from "@/lib/tallas-favoritas";
import { abrirFiltros, useAccesoPromos, usePrendasFiltro } from "@/lib/filtros-promos";

/**
 * Las rayitas de Filtros, en la barra de arriba al lado de "Promociones".
 * Si la página tiene las promociones (inicio o /promociones), abre el
 * panel ahí; si no, lleva a /promociones con el panel abierto. El número
 * dice cuántos filtros tiene puestos.
 *
 * En gris si no puede ver las promociones (se le acabó la prueba).
 */
export default function BotonFiltrosPromos({ oscuro = false, alTocar }: { oscuro?: boolean; alTocar?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const acceso = useAccesoPromos();
  const cuantos =
    (useMarcasFavoritas().length > 0 ? 1 : 0) + useTallasFavoritas().length + usePrendasFiltro().length;
  const bloqueado = acceso !== null && !acceso.permitido;
  const ayuda = bloqueado
    ? acceso!.plan === "anonimo"
      ? "Filtros: con tu cuenta gratis"
      : "Filtros: con la membresía"
    : "Filtros";

  function tocar() {
    alTocar?.();
    if (pathname === "/" || pathname === "/promociones") abrirFiltros();
    else router.push("/promociones?filtros=1");
  }

  return (
    <button
      type="button"
      onClick={tocar}
      disabled={bloqueado}
      aria-label={ayuda}
      title={ayuda}
      className={`group relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${
        bloqueado
          ? "cursor-not-allowed opacity-40"
          : oscuro
            ? "text-white/80 hover:bg-white/10 hover:text-rosa-300"
            : "text-noche/70 hover:bg-rosa-50 hover:text-rosa-500"
      } ${oscuro ? "text-white/80" : "text-noche/70"}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16" cy="7" r="2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="10" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="18" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      {cuantos > 0 && !bloqueado && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rosa-500 px-1 text-[9px] font-semibold text-white">
          {cuantos}
        </span>
      )}
      <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-noche px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition group-hover:opacity-100 group-focus-visible:opacity-100">
        {ayuda}
      </span>
    </button>
  );
}
