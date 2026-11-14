"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ProductoTienda } from "@/lib/use-catalogo";
import { anotar, anotarClicComercio } from "@/lib/use-evento";
import { PRECIOS, PRECIOS_NORMALES } from "@/lib/planes";
import BotonAvisame from "@/components/BotonAvisame";
import { guardarMarcas, marcasParaUrl, useMarcasFavoritas } from "@/lib/marcas-favoritas";
import SelectorMarcas, { cargarMarcas, type Marca } from "@/components/SelectorMarcas";
import SugerirComercio from "@/components/SugerirComercio";
import { esTallaDeLetra, guardarTallas, ordenarTallas, useTallasFavoritas } from "@/lib/tallas-favoritas";
import {
  guardarPrendas,
  guardarVista,
  useAccesoPromos,
  useAlAbrirFiltros,
  usePrendasFiltro,
  useVistaPromos,
  type VistaPromos,
} from "@/lib/filtros-promos";

// =====================================================================
// Promociones de todas las tiendas
// =====================================================================
// Va a todo el ancho, en su propia pestaña (app/promociones). Más de 10%
// de descuento, solo con talla disponible (lo deja así la revisión
// diaria, ver lib/promos-diarias.ts).
//
// Agrupadas por marca: de cada una se ven unas pocas, y "Ver más promos
// de esta marca" despliega todas. Si buscó algo, arriba van las de esas
// prendas y abajo "Otros descuentos".
//
// Es el gancho de la membresía: sin cuenta se ven 1 día, con cuenta
// gratis 3 (ver lib/acceso-promos.ts). Después, el aviso para pagar.
//
// Arriba se escoge "Solo promociones" o "Ver todo": todas las prendas
// de sus marcas, con o sin rebaja (lib/catalogo-completo.ts), para que
// les dé corazón y se le avise si después bajan.
// =====================================================================

type Grupo = { dominio: string; tienda: string; total: number; promos: ProductoTienda[] };
type Facetas = { tipos: Array<{ tipo: string; n: number }>; tallas: Array<{ talla: string; n: number }> };
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
  // Filtros: el tipo de prenda es de esta visita; la talla se guarda
  // para la próxima ("Mi talla", ver lib/tallas-favoritas.ts). El panel
  // lo abre el botón de rayitas de la barra (lib/filtros-promos.ts).
  const prendas = usePrendasFiltro();
  const misTallas = useTallasFavoritas();
  const filtros = `&prendas=${encodeURIComponent(prendas.join(","))}&tallas=${encodeURIComponent(misTallas.join(","))}`;
  const conFiltros = misMarcas.length > 0 || prendas.length > 0 || misTallas.length > 0;
  const acceso = useAccesoPromos();
  const vista = useVistaPromos();
  const [panelAbierto, setPanelAbierto] = useState(false);
  useAlAbrirFiltros(useCallback(() => setPanelAbierto(true), []));
  // Desde otra página, la barra trae aquí con ?filtros=1. Se quita de la
  // dirección al abrir: si no, cada vez que recargaba la página le salía
  // otra vez el panel con la lista de marcas.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("filtros") !== "1") return;
    setPanelAbierto(true);
    params.delete("filtros");
    const resto = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (resto ? `?${resto}` : ""));
  }, []);
  const cerrarPanel = useCallback(() => setPanelAbierto(false), []);
  const [datos, setDatos] = useState<{ relacionadas: Grupo[]; marcas: Grupo[]; facetas: Facetas | null } | null>(null);

  useEffect(() => {
    if (!acceso?.permitido) return;
    let vigente = true;
    setDatos(null);
    fetch(`/api/promos?tipos=${encodeURIComponent(clave)}&marcas=${encodeURIComponent(marcas)}${filtros}`)
      .then((r) => r.json())
      .then((j) => vigente && setDatos({ relacionadas: j.relacionadas ?? [], marcas: j.marcas ?? [], facetas: j.facetas ?? null }))
      .catch(() => vigente && setDatos({ relacionadas: [], marcas: [], facetas: null }));
    return () => {
      vigente = false;
    };
  }, [clave, marcas, filtros, acceso?.permitido]);

  // Los nombres de las marcas, para decir cuáles de las escogidas no
  // tienen promociones hoy (si no, parece que el filtro no las tomó).
  const [nombres, setNombres] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    cargarMarcas().then((ms) => setNombres(new Map(ms.map((m) => [m.dominio, m.nombre]))));
  }, []);

  if (acceso && !acceso.permitido) return <Bloqueo plan={acceso.plan} />;
  const vacio = datos && datos.relacionadas.length === 0 && datos.marcas.length === 0;
  // Sin promos de ninguna tienda no se muestra nada; si es por un filtro
  // (marcas, prenda o talla), se le dice, para que no crea que la app
  // falla.
  if (vacio && !conFiltros && vista === "promos") return null;

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
            {vista === "promos"
              ? "Más del 10% de descuento, solo en tallas disponibles. Precios de cada tienda, revisados cada día."
              : "Todo lo que tienen tus marcas, con o sin descuento, de lo más nuevo a lo más viejo. Dale corazón a lo que te guste: si baja de precio, te llega una notificación en tu app."}
          </p>
          <SelectorVista vista={vista} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {acceso && acceso.plan !== "membresia" && acceso.hasta && <QuedaPrueba hasta={acceso.hasta} />}
        </div>
      </div>

      {panelAbierto && (
        <PanelFiltros onCerrar={cerrarPanel}>
          <Filtros
            facetas={vista === "promos" ? (datos?.facetas ?? null) : facetasDeTodo(datos?.facetas ?? null)}
            conNumeros={vista === "promos"}
            prendas={prendas}
            onPrendas={guardarPrendas}
            tallas={misTallas}
          />
          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-noche/50">Mis marcas favoritas</p>
          <SelectorMarcas />
        </PanelFiltros>
      )}

      {vista === "todo" && <VerTodo misMarcas={misMarcas} filtros={filtros} onEscoger={() => setPanelAbierto(true)} />}

      {vista === "promos" && vacio && (prendas.length > 0 || misTallas.length > 0) && (
        <p className="rounded-xl bg-rosa-50/70 px-4 py-2.5 text-sm text-noche/70">
          No hay promociones con esos filtros hoy. Prueba con otra prenda u otra talla.
        </p>
      )}

      {vista === "promos" && misMarcas.length > 0 && (
        <p className="rounded-xl bg-rosa-50/70 px-4 py-2.5 text-sm text-noche/70">
          {vacio ? "Tus marcas no tienen promociones hoy. " : `Solo promociones de tus marcas (${misMarcas.length}). `}
          {datos && !vacio && (() => {
            const conPromos = new Set(datos.marcas.map((g) => g.dominio));
            const sinHoy = misMarcas.filter((d) => !conPromos.has(d)).map((d) => nombres.get(d) ?? d);
            return sinHoy.length > 0 ? `Hoy no hay promociones de ${sinHoy.join(", ")}. ` : null;
          })()}
          <button
            type="button"
            onClick={() => guardarMarcas([])}
            className="font-medium text-rosa-600 underline-offset-2 hover:underline"
          >
            Ver las de todas las marcas
          </button>
        </p>
      )}

      {vista === "promos" && !sinPromos && clave && (datos === null || datos.relacionadas.length > 0) && (
        <Parte titulo="De lo que buscaste" grupos={datos?.relacionadas ?? null} tipos={clave} filtros={filtros} marcasALaVista={MARCAS_RELACIONADAS} />
      )}
      {vista === "promos" && !sinPromos && (
      <Parte
        titulo={clave ? "Otros descuentos" : "Descuentos de hoy"}
        grupos={otras}
        tipos=""
        filtros={filtros}
        marcasALaVista={MARCAS_OTRAS}
      />
      )}

      <SugerirComercio origen="promociones" />
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
  filtros,
  marcasALaVista,
}: {
  titulo: string;
  grupos: Grupo[] | null;
  tipos: string;
  filtros: string;
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
          : visibles.filter((g) => g.promos.length > 0 || g.total > 0).map((g) => <Marca key={g.dominio + filtros} grupo={g} tipos={tipos} filtros={filtros} />)}
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
function Marca({ grupo, tipos, filtros }: { grupo: Grupo; tipos: string; filtros: string }) {
  const [todas, setTodas] = useState<ProductoTienda[] | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cargar(desde: number) {
    setCargando(true);
    try {
      const r = await fetch(
        `/api/promos?marca=${encodeURIComponent(grupo.dominio)}&tipos=${encodeURIComponent(tipos)}&desde=${desde}${filtros}`
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

/** "Solo promociones" o "Ver todo". */
function SelectorVista({ vista }: { vista: VistaPromos }) {
  const opciones: Array<{ valor: VistaPromos; texto: string }> = [
    { valor: "promos", texto: "Solo promociones" },
    { valor: "todo", texto: "Ver todo" },
  ];
  return (
    <div role="group" aria-label="Qué ver" className="mt-3 inline-flex rounded-full border border-rosa-200 bg-white p-0.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={vista === o.valor}
          onClick={() => {
            if (vista === o.valor) return;
            anotar("promos_vista", { vista: o.valor });
            guardarVista(o.valor);
          }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            vista === o.valor ? "bg-noche text-white" : "text-noche/60 hover:text-noche"
          }`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

/** En "Ver todo", el filtro ofrece todos los tipos (no solo los que hoy tienen promo). */
function facetasDeTodo(f: Facetas | null): Facetas {
  return {
    tipos: Object.keys(NOMBRE_TIPO).map((tipo) => ({ tipo, n: 0 })),
    tallas: f?.tallas ?? [],
  };
}

// De cada marca se ven estas de entrada; "Ver más" muestra el resto.
const VISTA_PREVIA_TODO = 8;

/**
 * "Ver todo": las marcas favoritas o, si no ha escogido, todas. Cada
 * marca trae sus prendas cuando la usuaria llega a ella (ver MarcaTodo).
 */
function VerTodo({ misMarcas, filtros, onEscoger }: { misMarcas: string[]; filtros: string; onEscoger: () => void }) {
  const [marcas, setMarcas] = useState<Marca[] | null>(null);
  useEffect(() => {
    cargarMarcas().then(setMarcas);
  }, []);
  const lista = marcas && (misMarcas.length > 0 ? marcas.filter((m) => misMarcas.includes(m.dominio)) : marcas);

  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-rosa-50/70 px-4 py-2.5 text-sm text-noche/70">
        {misMarcas.length > 0
          ? `Todas las prendas de tus marcas favoritas (${misMarcas.length}). `
          : "Estás viendo todas las marcas. "}
        <button type="button" onClick={onEscoger} className="font-medium text-rosa-600 underline-offset-2 hover:underline">
          {misMarcas.length > 0 ? "Cambiar mis marcas" : "Escoger mis marcas favoritas"}
        </button>
      </p>
      {lista === null
        ? Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="aspect-[3/4] animate-pulse rounded-xl bg-rosa-50" />
              ))}
            </div>
          ))
        : lista.map((m) => <MarcaTodo key={m.dominio + filtros} marca={m} filtros={filtros} deUna={misMarcas.length > 0} />)}
    </div>
  );
}

/**
 * Una marca en "Ver todo". Pide sus prendas a la tienda (en vivo, ver
 * app/api/promos/todo) solo cuando está por aparecer en la pantalla: con
 * más de 40 marcas, pedirlas todas de entrada sería lento y pesado. Las
 * favoritas (pocas) se piden de una (`deUna`).
 */
function MarcaTodo({ marca, filtros, deUna }: { marca: Marca; filtros: string; deUna: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [prendas, setPrendas] = useState<ProductoTienda[] | null>(null);
  const [siguiente, setSiguiente] = useState<number | null>(null);
  const [abierta, setAbierta] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(
    async (desde: number) => {
      setCargando(true);
      try {
        const r = await fetch(`/api/promos/todo?marca=${encodeURIComponent(marca.dominio)}&desde=${desde}${filtros}`);
        const j = await r.json();
        const nuevas = (j.prendas ?? []) as ProductoTienda[];
        setPrendas((antes) => {
          // La primera página reemplaza (puede pedirse dos veces); las
          // siguientes se suman sin repetir.
          if (desde === 1) return nuevas;
          const ya = new Set((antes ?? []).map((p) => p.url));
          return [...(antes ?? []), ...nuevas.filter((p) => !ya.has(p.url))];
        });
        setSiguiente(j.siguiente ?? null);
      } catch {
        setPrendas((antes) => antes ?? []);
        setSiguiente(null);
      } finally {
        setCargando(false);
      }
    },
    [marca.dominio, filtros]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (deUna || typeof IntersectionObserver === "undefined") {
      cargar(1);
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          obs.disconnect();
          cargar(1);
        }
      },
      { rootMargin: "600px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cargar, deUna]);

  // Sin nada con talla disponible (o con esos filtros): la marca no se muestra.
  if (prendas && prendas.length === 0 && !cargando) return null;
  const visibles = prendas ? (abierta ? prendas : prendas.slice(0, VISTA_PREVIA_TODO)) : null;
  const hayMas = prendas && (prendas.length > VISTA_PREVIA_TODO || siguiente !== null);

  return (
    <div ref={ref}>
      <p className="text-sm font-semibold text-noche">{marca.nombre}</p>
      <div className={`mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 ${abierta ? "lg:grid-cols-5" : ""}`}>
        {visibles
          ? visibles.map((p) => <Tarjeta key={p.url} p={p} />)
          : Array.from({ length: 4 }).map((_, j) => <div key={j} className="aspect-[3/4] animate-pulse rounded-xl bg-rosa-50" />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {!abierta && hayMas && (
          <button
            type="button"
            onClick={() => {
              anotar("promo_marca_abierta", { tienda: marca.nombre, vista: "todo" });
              setAbierta(true);
              if (prendas!.length <= VISTA_PREVIA_TODO && siguiente !== null) cargar(siguiente);
            }}
            className="text-sm font-medium text-rosa-600 underline-offset-2 hover:underline"
          >
            Ver más de {marca.nombre}
          </button>
        )}
        {abierta && siguiente !== null && (
          <button
            type="button"
            disabled={cargando}
            onClick={() => cargar(siguiente)}
            className="text-sm font-medium text-rosa-600 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {cargando ? "Cargando..." : "Cargar más"}
          </button>
        )}
        {abierta && (
          <button type="button" onClick={() => setAbierta(false)} className="text-sm text-noche/50 underline-offset-2 hover:underline">
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
    <div className="space-y-3">
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
    </div>
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

/**
 * El panel de Filtros (tipo de prenda, Mi talla y Mis marcas favoritas).
 * Lo abre el botón de rayitas de la barra de arriba, al lado de
 * "Promociones" (ver lib/filtros-promos.ts). Va fijo debajo de la barra:
 * en celular de borde a borde, en computador a la derecha.
 */
function PanelFiltros({ onCerrar, children }: { onCerrar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const conEsc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", conEsc);
    return () => window.removeEventListener("keydown", conEsc);
  }, [onCerrar]);
  return (
    <>
      {/* Tocar afuera lo cierra. */}
      <div className="fixed inset-0 z-30 bg-noche/10" onClick={onCerrar} aria-hidden />
      <div
        role="dialog"
        aria-label="Filtros"
        className="fixed inset-x-4 top-20 z-40 max-h-[75vh] overflow-y-auto rounded-2xl border border-rosa-100 bg-white p-4 shadow-suave lg:inset-x-auto lg:right-8 lg:w-[30rem]"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-noche">Filtros</p>
          <button type="button" onClick={onCerrar} className="text-xs text-noche/50 underline">
            Listo
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

// Cómo se ve cada tipo en los botones (en plural).
const NOMBRE_TIPO: Record<string, string> = {
  blusa: "Blusas", camisa: "Camisas", camiseta: "Camisetas", top: "Tops", body: "Bodys", buzo: "Buzos",
  sueter: "Suéteres", cardigan: "Cárdigans", chaqueta: "Chaquetas", blazer: "Blazers", abrigo: "Abrigos",
  chaleco: "Chalecos", pantalon: "Pantalones", jean: "Jeans", falda: "Faldas", short: "Shorts",
  vestido: "Vestidos", enterizo: "Enterizos", tenis: "Tenis", sandalia: "Sandalias", zapato: "Zapatos",
  bota: "Botas", bolso: "Bolsos", cinturon: "Cinturones", aretes: "Aretes", collar: "Collares", pulsera: "Pulseras",
};

function Boton({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        activo ? "border-noche bg-noche text-white" : "border-rosa-200 bg-white text-noche/70 hover:border-rosa-400"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Filtros de tipo de prenda y talla. La prenda se escoge para esta
 * visita; la talla queda guardada ("Mi talla") y se cambia aquí mismo
 * cuando quiera. Los números dicen cuántas promos hay con cada uno.
 */
function Filtros({
  facetas,
  conNumeros = true,
  prendas,
  onPrendas,
  tallas,
}: {
  facetas: Facetas | null;
  // En "Ver todo" los números (que cuentan promos) no aplican.
  conNumeros?: boolean;
  prendas: string[];
  onPrendas: (p: string[]) => void;
  tallas: string[];
}) {
  const [masTallas, setMasTallas] = useState(false);
  // Mientras llegan, el lugar de los filtros (si no, el panel abre solo
  // con la lista de marcas y los filtros aparecen después encima).
  if (!facetas) {
    return (
      <div className="space-y-4" aria-busy="true">
        {["Tipo de prenda", "Mi talla"].map((t) => (
          <div key={t}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-noche/50">{t}</p>
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="h-7 w-16 animate-pulse rounded-full bg-rosa-50" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  const alternar = (lista: string[], x: string) => (lista.includes(x) ? lista.filter((y) => y !== x) : [...lista, x]);
  const cuantasTalla = new Map(facetas.tallas.map((t) => [t.talla, t.n]));
  // Las escogidas siempre se ven, aunque hoy no tengan promos.
  const todasTallas = ordenarTallas(Array.from(new Set([...facetas.tallas.map((t) => t.talla), ...tallas])));
  const letras = todasTallas.filter(esTallaDeLetra);
  const numeros = todasTallas.filter((t) => !esTallaDeLetra(t));
  const numeroEscogido = tallas.some((t) => !esTallaDeLetra(t));

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-noche/50">Tipo de prenda</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
          <Boton activo={prendas.length === 0} onClick={() => onPrendas([])}>
            Todas
          </Boton>
          {facetas.tipos.map((t) => (
            <Boton key={t.tipo} activo={prendas.includes(t.tipo)} onClick={() => onPrendas(alternar(prendas, t.tipo))}>
              {NOMBRE_TIPO[t.tipo] ?? t.tipo} {conNumeros && <span className="opacity-60">{t.n}</span>}
            </Boton>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 flex flex-wrap items-baseline gap-x-2 text-xs font-semibold uppercase tracking-wide text-noche/50">
          Mi talla
          <span className="font-normal normal-case tracking-normal text-noche/40">
            {tallas.length > 0
              ? "Guardada para la próxima vez. Tócala para cambiarla."
              : "Escógela y la guardamos para la próxima vez."}
          </span>
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
          <Boton activo={tallas.length === 0} onClick={() => guardarTallas([])}>
            Todas
          </Boton>
          {letras.map((t) => (
            <Boton key={t} activo={tallas.includes(t)} onClick={() => guardarTallas(alternar(tallas, t))}>
              {t} {conNumeros && <span className="opacity-60">{cuantasTalla.get(t) ?? 0}</span>}
            </Boton>
          ))}
          {numeros.length > 0 && !masTallas && !numeroEscogido && (
            <button
              type="button"
              onClick={() => setMasTallas(true)}
              className="shrink-0 px-2 py-1.5 text-xs font-medium text-rosa-600 underline-offset-2 hover:underline"
            >
              Tallas en número ({numeros.length})
            </button>
          )}
        </div>
        {numeros.length > 0 && (masTallas || numeroEscogido) && (
          <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
            {numeros.map((t) => (
              <Boton key={t} activo={tallas.includes(t)} onClick={() => guardarTallas(alternar(tallas, t))}>
                {t} {conNumeros && <span className="opacity-60">{cuantasTalla.get(t) ?? 0}</span>}
              </Boton>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
