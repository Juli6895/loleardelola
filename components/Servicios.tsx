import Link from "next/link";

// =====================================================================
// Los cuatro servicios de LoleardLola, en la página principal
// =====================================================================
// Grandes y con un dibujo de lo que hace cada uno, para que con solo
// entrar se entienda la app sin leer párrafos. El número es el orden en
// que Juliana los presenta; el 3 y el 4 son de la membresía.
// =====================================================================

type Servicio = {
  numero: number;
  titulo: string;
  texto: string;
  boton: string;
  href: string;
  membresia: boolean;
  dibujo: React.ReactNode;
};

const SERVICIOS: Servicio[] = [
  {
    numero: 1,
    titulo: "Sube tu outfit y te decimos dónde lo venden",
    texto: "Una foto o un pin de Pinterest. Detectamos cada prenda y te mostramos dónde comprarla, con foto y precio.",
    boton: "Buscar mi outfit",
    href: "/buscar",
    membresia: false,
    dibujo: <DibujoBuscar />,
  },
  {
    numero: 2,
    titulo: "Carga tu clóset y te asesoramos cómo combinarlo",
    texto: "Sube las prendas que ya tienes y te armamos outfits con ellas, pensados para tu figura y lo que quieres proyectar.",
    boton: "Subir mis prendas",
    href: "/mi-closet",
    membresia: false,
    dibujo: <DibujoCloset />,
  },
  {
    numero: 3,
    titulo: "Descarga tu manual de estilo",
    texto: "Tu morfología, tu paleta de colores, tu estilo, tus prendas favoritas y tu fondo de armario, en un documento para guardar.",
    boton: "Ver mi manual",
    href: "/manual",
    membresia: true,
    dibujo: <DibujoManual />,
  },
  {
    numero: 4,
    titulo: "Te avisamos de las promociones",
    texto: "Las rebajas de los comercios en un solo lugar, y una notificación al celular cuando baja de precio lo que te gustó.",
    boton: "Ver las promos",
    href: "/buscar",
    membresia: true,
    dibujo: <DibujoPromos />,
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

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {SERVICIOS.map((s) => (
          <Link
            key={s.numero}
            href={s.href}
            className="group flex flex-col overflow-hidden rounded-3xl border border-rosa-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-rosa-300 hover:shadow-suave"
          >
            <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-rosa-50 to-rosa-100 sm:h-56">
              <span className="absolute left-5 top-4 z-10 font-display text-5xl text-rosa-300">{s.numero}</span>
              {s.membresia && (
                <span className="absolute right-4 top-4 rounded-full bg-noche px-3 py-1 text-[11px] font-semibold text-white">
                  Membresía
                </span>
              )}
              <div className="translate-x-3 scale-[0.85] sm:translate-x-0 sm:scale-100">{s.dibujo}</div>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-display text-2xl leading-snug text-noche" style={{ textWrap: "balance" }}>
                {s.titulo}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-noche/65">{s.texto}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 self-start rounded-full bg-noche px-5 py-2.5 text-sm font-medium text-white transition group-hover:bg-rosa-500">
                {s.boton}
                <span aria-hidden>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-5 text-center text-sm text-noche/60">
        Buscar outfits y armar tu clóset lo pruebas gratis.{" "}
        <Link href="/membresia" className="font-medium text-rosa-600 underline-offset-2 hover:underline">
          Ver la membresía
        </Link>
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------
// Dibujos: hechos con bloques, sin fotos, para que carguen al instante
// ---------------------------------------------------------------------

/** Las tres prendas que se dibujan: en la foto y en las tiendas. */
function Blusa({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="currentColor">
      <path d="M14 6c1.5 2 3.6 3 6 3s4.5-1 6-3l8 5-3.5 7-3.5-1.8V34H13V16.2L9.5 18 6 11l8-5Z" />
    </svg>
  );
}
function Pantalon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="currentColor">
      <path d="M11 5h18l2 30h-7l-4-19-4 19H9l2-30Z" />
    </svg>
  );
}
function Zapato({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="currentColor">
      <path d="M6 18c4 0 7-1 9-4 3 3 6 5 11 6 5 1 8 3 8 7v3H6V18Z" />
    </svg>
  );
}

/**
 * "Tu foto": una persona con un outfit, cada prenda marcada como la
 * detecta la app. "En tiendas": esas mismas prendas, con tienda y precio.
 */
function DibujoBuscar() {
  const enTiendas = [
    { Prenda: Blusa, color: "text-rosa-500", tienda: "Especia", precio: "$89.900" },
    { Prenda: Pantalon, color: "text-noche/70", tienda: "Bybla", precio: "$129.000" },
    { Prenda: Zapato, color: "text-rosa-300", tienda: "Navissi", precio: "$64.950" },
  ];
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="flex flex-col items-center">
        <div className="relative h-36 w-24 rounded-2xl bg-white p-1.5 shadow-sm">
          <div className="relative h-full w-full overflow-hidden rounded-xl bg-rosa-50">
            {/* La persona */}
            <span className="absolute left-1/2 top-2 h-5 w-5 -translate-x-1/2 rounded-full bg-[#d6a47a]" />
            <Blusa className="absolute left-1/2 top-6 h-11 w-11 -translate-x-1/2 text-rosa-500" />
            <Pantalon className="absolute left-1/2 top-[3.6rem] h-12 w-12 -translate-x-1/2 text-noche/70" />
            <Zapato className="absolute bottom-0.5 left-[1.35rem] h-5 w-5 text-rosa-300" />
            {/* Lo que detecta la app */}
            <span className="absolute left-3 top-6 h-10 w-[4.5rem] rounded-md border-2 border-dashed border-rosa-600" />
            <span className="absolute left-3 top-[3.9rem] h-11 w-[4.5rem] rounded-md border-2 border-dashed border-noche/60" />
          </div>
        </div>
        <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-noche/50">Tu foto</span>
      </div>

      <span className="text-xl text-rosa-400">→</span>

      <div className="flex flex-col items-center">
        <div className="flex flex-col gap-1.5">
          {enTiendas.map(({ Prenda, color, tienda, precio }) => (
            <div key={tienda} className="flex items-center gap-2 rounded-xl bg-white py-1 pl-1 pr-2.5 shadow-sm">
              <span className="flex h-9 w-8 items-center justify-center rounded-lg bg-rosa-50">
                <Prenda className={`h-6 w-6 ${color}`} />
              </span>
              <span className="leading-tight">
                <span className="block text-[9px] text-noche/45">{tienda}</span>
                <span className="block text-[11px] font-semibold text-noche">{precio}</span>
              </span>
            </div>
          ))}
        </div>
        <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-noche/50">En tiendas</span>
      </div>
    </div>
  );
}

/**
 * "Tu clóset": sus prendas en la grilla. "Tu outfit": una de ellas
 * (la blusa) armada con otras dos, como lo hace "Buscar combinaciones".
 */
function DibujoCloset() {
  const closet = [
    { Prenda: Blusa, color: "text-rosa-500", elegida: true },
    { Prenda: Pantalon, color: "text-[#3b6ea5]", elegida: false },
    { Prenda: Zapato, color: "text-noche/60", elegida: false },
    { Prenda: Blusa, color: "text-[#c19a6b]", elegida: false },
  ];
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="flex flex-col items-center">
        <div className="grid grid-cols-2 gap-1.5">
          {closet.map(({ Prenda, color, elegida }, i) => (
            <span
              key={i}
              className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ${
                elegida ? "ring-2 ring-rosa-500" : ""
              }`}
            >
              <Prenda className={`h-8 w-8 ${color}`} />
            </span>
          ))}
        </div>
        <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-noche/50">Tu clóset</span>
      </div>

      <span className="text-xl text-rosa-400">→</span>

      <div className="flex flex-col items-center">
        <div className="flex h-[6.6rem] w-20 flex-col items-center justify-center rounded-2xl bg-white shadow-sm">
          <Blusa className="h-9 w-9 text-rosa-500" />
          <Pantalon className="-mt-2 h-9 w-9 text-noche/70" />
          <Zapato className="-mt-1 h-5 w-5 text-[#c19a6b]" />
        </div>
        <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-noche/50">Tu outfit</span>
      </div>
    </div>
  );
}

/** Una hoja del manual con la paleta y las siluetas. */
function DibujoManual() {
  return (
    <div className="relative" aria-hidden>
      <div className="h-36 w-28 rotate-[-4deg] rounded-lg bg-white p-3 shadow-md">
        <div className="h-2 w-14 rounded bg-noche/70" />
        <div className="mt-2 grid grid-cols-4 gap-1">
          {["#d8c3a0", "#c19a6b", "#c1603e", "#6b7a3a", "#e8b4c0", "#7a1f2b", "#87a06b", "#3b6ea5"].map((c) => (
            <span key={c} className="h-3.5 w-full rounded-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="mt-3 flex items-end justify-between">
          {[10, 14, 12, 16, 11].map((w, i) => (
            <span
              key={i}
              className={`rounded-t-full ${i === 3 ? "bg-rosa-500" : "bg-rosa-200"}`}
              style={{ width: w, height: 30 }}
            />
          ))}
        </div>
        <div className="mt-2 h-1.5 w-16 rounded bg-noche/15" />
        <div className="mt-1 h-1.5 w-12 rounded bg-noche/15" />
      </div>
      <span className="absolute -bottom-3 -right-6 flex h-10 w-10 items-center justify-center rounded-full bg-noche text-white shadow-md">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

/** Una prenda con descuento y la notificación al celular. */
function DibujoPromos() {
  return (
    <div className="relative flex items-center gap-5" aria-hidden>
      <div className="relative h-32 w-24 rounded-2xl bg-white p-2 shadow-sm">
        <div className="h-20 w-full rounded-xl bg-rosa-200" />
        <div className="mt-2 text-[11px] font-semibold text-noche">$79.950</div>
        <div className="text-[9px] text-noche/40 line-through">$159.900</div>
        <span className="absolute -right-3 top-3 rounded-full bg-noche px-2 py-0.5 text-[11px] font-bold text-white">-50%</span>
      </div>
      <div className="w-36 rounded-2xl bg-white p-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rosa-500 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6.5 2 7H4c.5-.5 2-2.5 2-7Zm4 10a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[11px] font-semibold text-noche">¡Bajó de precio!</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded bg-noche/15" />
        <div className="mt-1 h-1.5 w-20 rounded bg-noche/15" />
      </div>
    </div>
  );
}
