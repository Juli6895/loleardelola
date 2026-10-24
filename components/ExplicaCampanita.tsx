"use client";

/**
 * Para qué es la campanita de las prendas y cómo se activa. Va plegado
 * (se abre al tocarlo) para no tapar las prendas.
 */
export default function ExplicaCampanita() {
  return (
    <details className="group mt-3 rounded-xl bg-rosa-50/70 px-4 py-3 text-sm text-noche/70">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-noche marker:hidden">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-rosa-600 shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path
              d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6.5 2 7H4c.5-.5 2-2.5 2-7Zm4 10a2 2 0 0 0 4 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        ¿Para qué es la campanita?
        <span className="ml-auto text-xs text-rosa-600 group-open:hidden">Ver</span>
      </summary>
      <div className="mt-2 space-y-2 pl-8">
        <p>
          Tócala en una prenda que te guste y te avisamos con una notificación en el celular si baja de
          precio. Revisamos los precios todos los días; el aviso llega cuando baja 10% o más desde que la
          marcaste. Es parte de la membresía.
        </p>
        <p className="font-medium text-noche">Cómo activarla</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Entra con tu correo (y ten la membresía activa).</li>
          <li>Toca la campanita sobre la foto de la prenda.</li>
          <li>Cuando el celular pregunte si LoleardLola puede enviarte notificaciones, dale Permitir.</li>
        </ol>
        <p className="text-xs text-noche/50">
          En iPhone los avisos llegan con la app instalada: en Safari toca Compartir y luego Agregar a
          inicio, y ábrela desde ese ícono. Las prendas que sigues están en Mis outfits.
        </p>
      </div>
    </details>
  );
}
