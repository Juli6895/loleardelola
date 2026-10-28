"use client";

/**
 * Para qué es el corazón de las prendas y cómo se activa. Va plegado
 * (se abre al tocarlo) para no tapar las prendas.
 */
export default function ExplicaCampanita() {
  return (
    <details className="group mt-3 rounded-xl bg-rosa-50/70 px-4 py-3 text-sm text-noche/70">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-noche marker:hidden">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-rosa-600 shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path
              d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.4 3.9 4.5 7 4.5c2 0 3.4 1.2 5 3 1.6-1.8 3-3 5-3 3.1 0 5.3 2.9 4.2 6.2C19.5 15.4 12 20 12 20Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        ¿Para qué es el corazón?
        <span className="ml-auto text-xs text-rosa-600 group-open:hidden">Ver</span>
      </summary>
      <div className="mt-2 space-y-2 pl-8">
        <p>
          Tócalo en una prenda que te guste y te avisamos con una notificación en tu app si baja de
          precio. Revisamos los precios todos los días; el aviso llega cuando baja 10% o más desde que la
          marcaste. Es parte de la membresía.
        </p>
        <p className="font-medium text-noche">Cómo activarlo</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Entra con tu correo (y ten la membresía activa).</li>
          <li>Toca el corazón sobre la foto de la prenda.</li>
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
