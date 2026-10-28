"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProductoTienda } from "@/lib/use-catalogo";
import { anotar, anotarClicComercio } from "@/lib/use-evento";
import { fetchConDispositivo } from "@/lib/device-id";
import { PRECIOS, PRECIOS_NORMALES } from "@/lib/planes";
import BotonAvisame from "@/components/BotonAvisame";
import { guardarMarcas, marcasParaUrl, useMarcasFavoritas } from "@/lib/marcas-favoritas";

// =====================================================================
// Promociones de todas las tiendas
// =====================================================================
// Va a todo el ancho, debajo de "Empezar a lolear" (inicio) y de la
// búsqueda. Más de 10% de descuento, solo con talla disponible (lo deja
// así la revisión diaria, ver lib/promos-diarias.ts).
//
// Agrupadas por marca: de cada una se ven unas pocas, y "Ver más promos
// de esta marca" despliega todas. Si buscó algo, arriba van las de esas
// prendas y abajo "Otros descuentos".
//
// Es el gancho de la membresía: sin cuenta se ven 1 día, con cuenta
// gratis 3 (ver lib/acceso-promos.ts). Después, el aviso para pagar.
// =====================================================================

type Grupo = { dominio: string; tienda: string; total: number; promos: ProductoTienda[] };
type Acceso = { permitido: boolean; plan: "anonimo" | "gratis" | "membresia"; hasta: string | null };

const pesos = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

function descuento(p: ProductoTienda): number | null {
  if (!p.precioCop || !p.precioAntesCop) return null;
  return Math.round((1 - p.precioCop / p.precioAntesCop) * 100);
}

// Cuántas marcas se ven de entrada en cada parte.
const MARCAS_RELACIONADAS = 6;
const MARCAS_OTRAS = 8;

export default function Promociones({ tipos = [] }: { tipos?: string[] }) {
  const clave = tipos.join("|");
  // "Mis marcas" del menú: si escogió algunas, solo esas.
  const misMarcas = useMarcasFavoritas();
  const marcas = marcasParaUrl(misMarcas);
  const [acceso, setAcceso] = useState<Acceso | null>(null);
  const [datos, setDatos] = useState<{ relacionadas: Grupo[]; marcas: Grupo[] } | null>(null);

  useEffect(() => {
    fetchConDispositivo("/api/promos/acceso")
      .then((r) => r.json())
      .then(setAcceso)
      .catch(() => setAcceso({ permitido: true, plan: "anonimo", hasta: null }));
  }, []);

  useEffect(() => {
    if (!acceso?.permitido) return;
    let vigente = true;
    setDatos(null);
    fetch(`/api/promos?tipos=${encodeURIComponent(clave)}&marcas=${encodeURIComponent(marcas)}`)
      .then((r) => r.json())
      .then((j) => vigente && setDatos({ relacionadas: j.relacionadas ?? [], marcas: j.marcas ?? [] }))
      .catch(() => vigente && setDatos({ relacionadas: [], marcas: [] }));
    return () => {
      vigente = false;
    };
  }, [clave, marcas, acceso?.permitido]);

  if (acceso && !acceso.permitido) return <Bloqueo plan={acceso.plan} />;
  const vacio = datos && datos.relacionadas.length === 0 && datos.marcas.length === 0;
  // Sin promos de ninguna tienda no se muestra nada; si es por el filtro
  // de "Mis marcas", se le dice, para que no crea que la app falla.
  if (vacio && misMarcas.length === 0) return null;

  // Las de arriba no se repiten en la vista previa de abajo.
  const yaArriba = new Set(datos?.relacionadas.flatMap((g) => g.promos.map((p) => p.url)) ?? []);
  const sinPromos = !!vacio;
  const otras = datos?.marcas.map((g) => ({ ...g, promos: g.promos.filter((p) => !yaArriba.has(p.url)) })) ?? null;

  return (
    <section aria-labelledby="promos-titulo" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="promos-titulo" className="font-display text-3xl text-noche sm:text-4xl">
            Promociones
          </h2>
          <p className="mt-1 text-sm text-noche/60">
            Más del 10% de descuento, solo en tallas disponibles. Precios de cada tienda, revisados cada día.
          </p>
        </div>
        {acceso && acceso.plan !== "membresia" && acceso.hasta && <QuedaPrueba hasta={acceso.hasta} />}
      </div>

      {misMarcas.length > 0 && (
        <p className="rounded-xl bg-rosa-50/70 px-4 py-2.5 text-sm text-noche/70">
          {vacio ? "Tus marcas no tienen promociones hoy. " : `Solo promociones de tus marcas (${misMarcas.length}). `}
          <button
            type="button"
            onClick={() => guardarMarcas([])}
            className="font-medium text-rosa-600 underline-offset-2 hover:underline"
          >
            Ver las de todas las marcas
          </button>
        </p>
      )}

      {!sinPromos && clave && (datos === null || datos.relacionadas.length > 0) && (
        <Parte titulo="De lo que buscaste" grupos={datos?.relacionadas ?? null} tipos={clave} marcasALaVista={MARCAS_RELACIONADAS} />
      )}
      {!sinPromos && (
      <Parte
        titulo={clave ? "Otros descuentos" : "Descuentos de hoy"}
        grupos={otras}
        tipos=""
        marcasALaVista={MARCAS_OTRAS}
      />
      )}
    </section>
  );
}

/** Cuánto le queda de prueba gratis, con el enlace a la membresía. */
function QuedaPrueba({ hasta }: { hasta: string }) {
  const horas = Math.max(1, Math.round((new Date(hasta).getTime() - Date.now()) / 3_600_000));
  const n = horas >= 24 ? Math.round(horas / 24) : horas;
  const unidad = horas >= 24 ? (n === 1 ? "día" : "días") : n === 1 ? "hora" : "horas";
  return (
    <p className="rounded-full bg-rosa-50 px-3 py-1.5 text-xs text-noche/70">
      {n === 1 ? "Te queda" : "Te quedan"} {n} {unidad} de promociones gratis.{" "}
      <Link href="/membresia" className="font-medium text-rosa-600 underline-offset-2 hover:underline">
        Verlas siempre
      </Link>
    </p>
  );
}

function Parte({
  titulo,
  grupos,
  tipos,
  marcasALaVista,
}: {
  titulo: string;
  grupos: Grupo[] | null;
  tipos: string;
  marcasALaVista: number;
}) {
  const [todasLasMarcas, setTodasLasMarcas] = useState(false);
  const visibles = grupos && !todasLasMarcas ? grupos.slice(0, marcasALaVista) : grupos;
  return (
    <div>
      <h3 className="text-lg font-semibold text-noche">{titulo}</h3>
      <div className="mt-3 space-y-6">
        {visibles === null
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="aspect-[3/4] animate-pulse rounded-xl bg-rosa-50" />
                ))}
              </div>
            ))
          : visibles.filter((g) => g.promos.length > 0 || g.total > 0).map((g) => <Marca key={g.dominio} grupo={g} tipos={tipos} />)}
      </div>
      {grupos && grupos.length > marcasALaVista && (
        <button
          type="button"
          onClick={() => setTodasLasMarcas((v) => !v)}
          className="mt-4 rounded-full border border-rosa-200 px-4 py-2 text-sm font-medium text-rosa-600 hover:bg-rosa-50"
        >
          {todasLasMarcas ? "Ver menos marcas" : `Ver más marcas (${grupos.length})`}
        </button>
      )}
    </div>
  );
}

/** Una marca: su vista previa y, al abrirla, todas sus promos. */
function Marca({ grupo, tipos }: { grupo: Grupo; tipos: string }) {
  const [todas, setTodas] = useState<ProductoTienda[] | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cargar(desde: number) {
    setCargando(true);
    try {
      const r = await fetch(
        `/api/promos?marca=${encodeURIComponent(grupo.dominio)}&tipos=${encodeURIComponent(tipos)}&desde=${desde}`
      );
      const j = await r.json();
      setTodas((antes) => [...(desde === 0 ? [] : (antes ?? [])), ...(j.promos ?? [])]);
    } finally {
      setCargando(false);
    }
  }

  const abierta = todas !== null;
  const lista = abierta ? todas : grupo.promos;
  const faltan = abierta && todas.length < grupo.total;

  return (
    <div>
      <p className="flex items-baseline gap-2 text-sm">
        <span className="font-semibold text-noche">{grupo.tienda}</span>
        <span className="text-noche/40">
          {grupo.total} {grupo.total === 1 ? "promo" : "promos"}
        </span>
      </p>
      <div className={`mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 ${abierta ? "lg:grid-cols-5" : ""}`}>
        {lista.map((p) => (
          <Tarjeta key={p.url} p={p} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {!abierta && grupo.total > grupo.promos.length && (
          <button
            type="button"
            disabled={cargando}
            onClick={() => {
              anotar("promo_marca_abierta", { tienda: grupo.tienda });
              cargar(0);
            }}
            className="text-sm font-medium text-rosa-600 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {cargando ? "Cargando..." : `Ver más promos de ${grupo.tienda} (${grupo.total})`}
          </button>
        )}
        {faltan && (
          <button
            type="button"
            disabled={cargando}
            onClick={() => cargar(todas.length)}
            className="text-sm font-medium text-rosa-600 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {cargando ? "Cargando..." : `Cargar más (${grupo.total - todas.length})`}
          </button>
        )}
        {abierta && (
          <button type="button" onClick={() => setTodas(null)} className="text-sm text-noche/50 underline-offset-2 hover:underline">
            Ver menos
          </button>
        )}
      </div>
    </div>
  );
}

/** Se acabó la prueba: el aviso de la membresía, con unas promos borrosas detrás. */
function Bloqueo({ plan }: { plan: Acceso["plan"] }) {
  const [muestra, setMuestra] = useState<ProductoTienda[]>([]);
  useEffect(() => {
    anotar("promo_bloqueada", { plan });
    fetch("/api/promos?muestra=1")
      .then((r) => r.json())
      .then((j) => setMuestra(j.promos ?? []))
      .catch(() => {});
  }, [plan]);

  const sinCuenta = plan === "anonimo";
  return (
    <section aria-labelledby="promos-titulo" className="relative overflow-hidden rounded-3xl border border-rosa-100 bg-white">
      <div aria-hidden className="pointer-events-none grid select-none grid-cols-2 gap-3 p-4 opacity-60 blur-sm sm:grid-cols-4">
        {muestra.slice(0, 8).map((p) => (
          <div key={p.url} className="aspect-[3/4] overflow-hidden rounded-xl bg-rosa-50">
            {p.imagen && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imagen} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        ))}
        {muestra.length === 0 &&
          Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-xl bg-rosa-100" />)}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 p-6">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-suave">
          <h2 id="promos-titulo" className="font-display text-2xl text-noche">
            {sinCuenta ? "Mira las promociones 3 días más" : "Las promociones son de la membresía"}
          </h2>
          <p className="mt-2 text-sm text-noche/65">
            {sinCuenta
              ? "Crea tu cuenta gratis con tu correo y sigue viendo las rebajas de todas las tiendas, en tallas disponibles."
              : "Tu prueba gratis terminó. Con la membresía ves todos los días las rebajas de todas las tiendas, y te avisamos cuando baja lo que te gusta."}
          </p>
          {!sinCuenta && (
            <p className="mt-3 text-sm text-noche">
              <span className="font-semibold">{pesos(PRECIOS.mensual)} al mes</span>{" "}
              <span className="text-noche/40 line-through">{pesos(PRECIOS_NORMALES.mensual)}</span>
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {sinCuenta && (
              <Link
                href="/entrar?volver=/&motivo=Crea tu cuenta gratis y ve las promociones 3 días más."
                className="rounded-full bg-noche px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
              >
                Crear mi cuenta gratis
              </Link>
            )}
            <Link
              href="/membresia"
              className={
                sinCuenta
                  ? "rounded-full border border-noche/20 px-5 py-2.5 text-sm font-medium text-noche transition hover:border-rosa-400"
                  : "rounded-full bg-noche px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
              }
            >
              Ver la membresía
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tarjeta({ p }: { p: ProductoTienda }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => anotarClicComercio({ tienda: p.tienda, dominio: p.dominio, origen: "promo", prenda: p.titulo })}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-rosa-100 bg-white transition hover:border-rosa-300 hover:shadow-md"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-rosa-50">
        {p.imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imagen}
            alt={p.titulo}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        )}
        {descuento(p) && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-noche px-2 py-0.5 text-[11px] font-semibold text-white">
            -{descuento(p)}%
          </span>
        )}
        <BotonAvisame prenda={{ url: p.url, titulo: p.titulo, imagen: p.imagen, precioCop: p.precioCop }} />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <p className="line-clamp-2 text-xs leading-snug text-noche/80">{p.titulo}</p>
        {p.precioCop && (
          <p className="mt-auto text-sm font-semibold text-noche">
            {pesos(p.precioCop)}{" "}
            {p.precioAntesCop && (
              <span className="text-[11px] font-normal text-noche/40 line-through">{pesos(p.precioAntesCop)}</span>
            )}
          </p>
        )}
        <p className="text-[11px] text-noche/40">{p.tienda}</p>
      </div>
    </a>
  );
}
