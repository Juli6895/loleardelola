import Link from "next/link";

// =====================================================================
// Los servicios de LoleardLola, en la página principal
// =====================================================================
// Cinco servicios, sin dibujos, a pedido de Juliana: el nombre de cada
// página grande y en negrita (es el enlace), y debajo qué se hace ahí.
// =====================================================================

type Servicio = {
  numero: number;
  pagina: string;
  texto: string;
  href: string;
  membresia?: boolean;
};

const SERVICIOS: Servicio[] = [
  {
    numero: 1,
    pagina: "Buscar",
    texto: "Encontramos el comercio que podría vender tu outfit favorito.",
    href: "/buscar",
  },
  {
    numero: 2,
    pagina: "Mis outfits",
    texto: "Puedes guardar tus outfits favoritos.",
    href: "/mis-outfits",
  },
  {
    numero: 3,
    pagina: "Mi perfil",
    texto: "Ingresa tus datos de perfil y te creamos un manual de estilo.",
    href: "/mi-perfil",
  },
  {
    numero: 4,
    pagina: "Manual",
    texto: "Descarga tu manual de estilo cuando lo desees.",
    href: "/manual",
    membresia: true,
  },
  {
    numero: 5,
    pagina: "Mi clóset",
    texto: "Puedes subir tus prendas y te recomendamos con qué combinarlas.",
    href: "/mi-closet",
  },
];

export default function Servicios() {
  return (
    <section aria-labelledby="servicios-titulo">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-rosa-500">Lo que hacemos por ti</p>
        <h2 id="servicios-titulo" className="mt-2 font-display text-3xl text-noche sm:text-4xl">
          Tu asesora de moda, en el celular
        </h2>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SERVICIOS.map((s, i) => (
          <Link
            key={s.numero}
            href={s.href}
            // Con un número impar de servicios, el último ocupa todo el
            // ancho en vez de quedar solo a la izquierda.
            className={`group flex gap-4 rounded-3xl ${
              SERVICIOS.length % 2 === 1 && i === SERVICIOS.length - 1 ? "sm:col-span-2" : ""
            } border border-rosa-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-rosa-300 hover:shadow-suave sm:p-7`}
          >
            <span className="font-display text-4xl leading-none text-rosa-300">{s.numero}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-3xl font-bold text-noche transition group-hover:text-rosa-600 sm:text-4xl">
                  {s.pagina}
                </span>
                {s.membresia && (
                  <span className="rounded-full bg-noche px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    Membresía
                  </span>
                )}
              </span>
              <span className="mt-2 block text-base leading-relaxed text-noche/65">{s.texto}</span>
              <span className="mt-3 inline-block text-sm font-medium text-rosa-600 group-hover:underline">
                Ir a {s.pagina} →
              </span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-5 text-center text-sm text-noche/60">
        Empieza gratis, sin registrarte.{" "}
        <Link href="/membresia" className="font-medium text-rosa-600 underline-offset-2 hover:underline">
          Ver la membresía
        </Link>
      </p>
    </section>
  );
}
