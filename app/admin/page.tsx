"use client";

import { useEffect, useState } from "react";
import { fetchConDispositivo } from "@/lib/device-id";

// Tablero de administración. Solo para el correo de administración
// (ver lib/admin.ts) — el permiso se revisa en el servidor, no acá:
// esconder una página no impide que alguien llame la API.
//
// Las cuentas de prueba no cuentan en ninguna cifra (ver
// CORREOS_PRUEBA en lib/admin-correos.ts).

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");
const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

type Fila = { nombre: string; tienda: string; clics: number; personas: number };
type CostoVariable = { rubro: string; veces: number | null; totalCop: number; unitarioCop: number };
type Costos = {
  trm: number;
  delMes: { variables: CostoVariable[]; totalVariable: number };
  desdeSiempre: { variables: CostoVariable[]; totalVariable: number };
  fijos: Array<{ rubro: string; plan: string; cop: number; siCrece: string }>;
  totalFijo: number;
  planesGratis: Array<{ servicio: string; usado: string; limite: string; porcentaje: number | null; detalle: string }>;
  porPersonaCop: number;
  porMembresiaCop: number;
  resultadoDelMesCop: number;
};
type Datos = {
  desde: string | null;
  resumen: { personas: number; cuentasCreadas: number; membresiasActivas: number; mensuales: number; anuales: number };
  embudo: Array<{ paso: string; personas: number }>;
  secciones: Array<{ seccion: string; visitas: number; personas: number; minutosPromedio: number }>;
  errores: Array<{ lugar: string; error: string; veces: number; personas: number; ultimaVez: string }>;
  comercios: Fila[];
  prendas: Fila[];
  comerciosVinculados: Array<{
    dominio: string;
    nombre: string;
    instagram: string | null;
    catalogo: boolean;
    enInstagram: boolean;
    google: boolean;
    clics: number;
  }>;
  comerciosExcluidos: string[];
  gustos: {
    meGusta: Array<{ comercio: string; meGusta: number; personas: number }>;
    favoritas: Array<{ comercio: string; personas: number }>;
    tallas: Array<{ talla: string; personas: number }>;
    porEdad: Array<{ edad: string; personas: number; masMeGusta: string; masFavoritas: string; masTallas: string }>;
  };
  actividad: Array<{ dia: string; personas: number; busquedas: number; registros: number; pagos: number }>;
  dinero: { pagosDelMes: number; brutoCop: number; netoEstimadoCop: number };
  costos: Costos;
  porVencer: Array<{ email: string; name: string | null; premium_until: string }>;
  cuentas: Array<{ email: string; celular: string | null; desde: string; ultimaVez: string | null; plan: string; venceMembresia: string | null }>;
};

export default function AdminPage() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConDispositivo("/api/admin/tablero")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "No pudimos cargar el tablero");
        setDatos(j);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="rounded-2xl border border-rosa-100 bg-white p-8 shadow-sm">
          <p className="font-display text-2xl text-noche">Sin acceso</p>
          <p className="mt-2 text-sm text-noche/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!datos) {
    return <div className="mx-auto mt-20 h-8 w-48 animate-pulse-rosa rounded-full bg-rosa-100" />;
  }

  const r = datos.resumen;

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-4">
      <header>
        <h1 className="font-display text-3xl text-noche">Tablero</h1>
        <p className="mt-1 text-sm text-noche/50">
          Quién usa LoleardLola, dónde se cae y qué se rompe.{" "}
          {datos.desde
            ? `Datos desde el ${new Date(datos.desde).toLocaleDateString("es-CO", { day: "numeric", month: "long" })}.`
            : "Todavía no hay datos."}{" "}
          Tu cuenta de prueba no cuenta.
        </p>
      </header>

      {/* ---- Resumen ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Numero etiqueta="Personas que entraron" valor={r.personas} />
        <Numero etiqueta="Crearon cuenta" valor={r.cuentasCreadas} />
        <Numero etiqueta="Con membresía" valor={r.membresiasActivas} destacado />
        <Numero etiqueta="Mensual" valor={r.mensuales} />
        <Numero etiqueta="Anual" valor={r.anuales} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Numero etiqueta="Pagos este mes" valor={datos.dinero.pagosDelMes} />
        <Numero etiqueta="Cobrado este mes" valor={pesos(datos.dinero.brutoCop)} />
        <Numero etiqueta="Te queda (estimado)" valor={pesos(datos.dinero.netoEstimadoCop)} />
      </div>

      {/* ---- Cuentas creadas ---- */}
      <SeccionCuentas cuentas={datos.cuentas} />

      {/* ---- Embudo ---- */}
      <Seccion
        titulo="El embudo"
        nota="Cuántas personas distintas llegan a cada paso. El porcentaje es contra el paso anterior; en rosado, donde se cae más de la mitad."
      >
        <Embudo pasos={datos.embudo} />
      </Seccion>

      {/* ---- Secciones ---- */}
      <Seccion
        titulo="Secciones"
        nota="Cuántas veces se abrió cada sección, cuántas personas distintas, y cuánto tiempo se quedan en promedio (solo con la pantalla a la vista)."
      >
        <Tabla
          columnas={["Sección", "Clics (visitas)", "Personas", "Minutos promedio"]}
          filas={datos.secciones.map((s) => [
            s.seccion,
            String(s.visitas),
            String(s.personas),
            s.minutosPromedio ? s.minutosPromedio.toLocaleString("es-CO") : "—",
          ])}
        />
      </Seccion>

      {/* ---- Errores ---- */}
      <Seccion titulo="Errores" nota="Dónde pasó, cuál fue el error, cuántas veces y a cuántas personas.">
        {datos.errores.length === 0 ? (
          <Vacio>Sin errores registrados.</Vacio>
        ) : (
          <Tabla
            columnas={["Dónde", "Error", "Veces", "Personas", "Última vez"]}
            filas={datos.errores.map((e) => [e.lugar, e.error, String(e.veces), String(e.personas), fecha(e.ultimaVez)])}
          />
        )}
      </Seccion>

      {/* ---- Clics ---- */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Seccion titulo="Comercios con más clics" nota="Clics que llevaron a alguien a la página de la tienda.">
          {datos.comercios.length === 0 ? (
            <Vacio>Todavía nadie ha hecho clic hacia un comercio.</Vacio>
          ) : (
            <Tabla
              columnas={["Comercio", "Clics", "Personas"]}
              filas={datos.comercios.map((c) => [c.nombre, String(c.clics), String(c.personas)])}
            />
          )}
        </Seccion>
        <Seccion titulo="Prendas con más clics" nota="Las prendas de tienda que más abren.">
          {datos.prendas.length === 0 ? (
            <Vacio>Todavía nadie ha hecho clic en una prenda.</Vacio>
          ) : (
            <Tabla
              columnas={["Prenda", "Tienda", "Clics"]}
              filas={datos.prendas.map((p) => [p.nombre, p.tienda, String(p.clics)])}
            />
          )}
        </Seccion>
      </div>

      {/* ---- Comercios vinculados ---- */}
      <SeccionComercios comercios={datos.comerciosVinculados} excluidos={datos.comerciosExcluidos} />

      {/* ---- Me gusta y marcas favoritas, también por edad ---- */}
      <SeccionGustos gustos={datos.gustos} />

      {/* ---- Costos ---- */}
      <SeccionCostos costos={datos.costos} cobrado={datos.dinero.brutoCop} />

      {/* ---- Día a día ---- */}
      <Seccion titulo="Día a día" nota="Los últimos 30 días.">
        {datos.actividad.length === 0 ? (
          <Vacio>Sin actividad todavía.</Vacio>
        ) : (
          <Tabla
            columnas={["Día", "Personas", "Búsquedas", "Cuentas nuevas", "Pagos"]}
            filas={datos.actividad.map((a) => [
              new Date(a.dia + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" }),
              String(a.personas),
              String(a.busquedas),
              String(a.registros),
              String(a.pagos),
            ])}
          />
        )}
      </Seccion>

      {datos.porVencer.length > 0 && (
        <Seccion titulo="Membresías por vencer" nota="Vencen en los próximos 15 días: buen momento para escribirles.">
          <Tabla
            columnas={["Correo", "Nombre", "Vence"]}
            filas={datos.porVencer.map((u) => [
              u.email,
              u.name ?? "—",
              new Date(u.premium_until).toLocaleDateString("es-CO", { day: "numeric", month: "long" }),
            ])}
          />
        </Seccion>
      )}
    </div>
  );
}

function Numero({ etiqueta, valor, destacado = false }: { etiqueta: string; valor: number | string; destacado?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${destacado ? "border-rosa-300 bg-rosa-50" : "border-rosa-100 bg-white"}`}>
      <p className="text-xs text-noche/50">{etiqueta}</p>
      <p className="mt-1 font-display text-2xl tabular-nums text-noche">{valor}</p>
    </div>
  );
}

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-rosa-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl text-noche">{titulo}</h2>
      {nota && <p className="mt-0.5 text-xs text-noche/50">{nota}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Embudo({ pasos }: { pasos: Array<{ paso: string; personas: number }> }) {
  const tope = Math.max(...pasos.map((p) => p.personas), 1);
  return (
    <div className="space-y-3">
      {pasos.map((p, i) => {
        const anterior = i > 0 ? pasos[i - 1].personas : null;
        const pct = anterior && anterior > 0 ? (p.personas / anterior) * 100 : null;
        // Menos de la mitad sobreviviendo es donde hay que mirar.
        const caidaFuerte = pct !== null && pct < 50;
        return (
          <div key={p.paso}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-noche/80">
                {i + 1}. {p.paso}
              </span>
              <span className="tabular-nums text-noche">
                {p.personas}
                {pct !== null && (
                  <span className={`ml-2 text-xs ${caidaFuerte ? "font-medium text-rosa-600" : "text-noche/40"}`}>
                    {pct.toFixed(0)}%
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-rosa-50">
              <div
                className={`h-full rounded-full ${caidaFuerte ? "bg-rosa-500" : "bg-rosa-300"}`}
                style={{ width: `${Math.max((p.personas / tope) * 100, 1)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Tabla({ columnas, filas }: { columnas: string[]; filas: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-rosa-100 text-left">
            {columnas.map((c) => (
              <th key={c} className="pb-2 pr-4 font-medium text-noche/50">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-b border-rosa-50 last:border-0">
              {f.map((celda, j) => (
                <td key={j} className={`py-2 pr-4 align-top ${j === 0 ? "text-noche" : "tabular-nums text-noche/70"}`}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-noche/40">{children}</p>;
}

/**
 * Lo que cuesta operar la app: variables (se pagan por uso, medidos de
 * verdad en cada llamada) y fijos (al mes, aunque nadie la use).
 */
function SeccionCostos({ costos, cobrado }: { costos: Costos; cobrado: number }) {
  const siempre = new Map(costos.desdeSiempre.variables.map((v) => [v.rubro, v]));
  const rubros = Array.from(
    new Set([...costos.delMes.variables.map((v) => v.rubro), ...costos.desdeSiempre.variables.map((v) => v.rubro)])
  );
  const delMes = new Map(costos.delMes.variables.map((v) => [v.rubro, v]));
  return (
    <Seccion
      titulo="Costos"
      nota={`Variables: se pagan por uso y se miden en cada llamada (incluye las de prueba, porque también se pagan). Fijos: al mes. Dólar a $${costos.trm.toLocaleString("es-CO")}.`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Numero etiqueta="Variables este mes" valor={pesos(costos.delMes.totalVariable)} />
        <Numero etiqueta="Fijos al mes" valor={pesos(costos.totalFijo)} />
        <Numero etiqueta="Costo por persona (mes)" valor={pesos(costos.porPersonaCop)} />
        <Numero etiqueta="Costo por membresía (mes)" valor={pesos(costos.porMembresiaCop)} />
        <Numero
          etiqueta="Resultado del mes"
          valor={pesos(costos.resultadoDelMesCop)}
          destacado={costos.resultadoDelMesCop < 0}
        />
      </div>
      <p className="mt-2 text-xs text-noche/45">
        Resultado = cobrado este mes ({pesos(cobrado)}) − variables − fijos.
      </p>

      <h3 className="mt-6 text-sm font-semibold text-noche">Variables</h3>
      <div className="mt-2">
        <Tabla
          columnas={["Rubro", "Veces (mes)", "Costo del mes", "Costo unitario", "Total desde el inicio"]}
          filas={[
            ...rubros.map((r) => {
              const m = delMes.get(r);
              const t = siempre.get(r);
              return [
                r,
                m?.veces == null ? "—" : String(m.veces),
                pesos(m?.totalCop ?? 0),
                pesos(m?.unitarioCop || t?.unitarioCop || 0),
                pesos(t?.totalCop ?? 0),
              ];
            }),
            ["Total variables", "", pesos(costos.delMes.totalVariable), "", pesos(costos.desdeSiempre.totalVariable)],
          ]}
        />
      </div>

      <h3 className="mt-6 text-sm font-semibold text-noche">Consumo de los planes gratis</h3>
      <p className="text-xs text-noche/45">
        Fotos y correos no cuestan mientras estén dentro del plan gratis. Al acercarse al 80%, toca pasar al
        plan pago.
      </p>
      <div className="mt-2 space-y-3">
        {costos.planesGratis.map((p) => (
          <div key={p.servicio}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="text-noche">{p.servicio}</span>
              <span className="tabular-nums text-noche/70">
                {p.usado} de {p.limite}
                {p.porcentaje != null && (
                  <span className={`ml-2 text-xs ${p.porcentaje >= 80 ? "font-semibold text-rosa-600" : "text-noche/40"}`}>
                    {p.porcentaje.toLocaleString("es-CO")}%
                  </span>
                )}
              </span>
            </div>
            {p.porcentaje != null && (
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-rosa-50">
                <div
                  className={`h-full rounded-full ${p.porcentaje >= 80 ? "bg-rosa-500" : "bg-rosa-300"}`}
                  style={{ width: `${Math.min(Math.max(p.porcentaje, 1), 100)}%` }}
                />
              </div>
            )}
            <p className="mt-0.5 text-[11px] text-noche/40">{p.detalle}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-semibold text-noche">Fijos</h3>
      <div className="mt-2">
        <Tabla
          columnas={["Rubro", "Plan de hoy", "Al mes", "Si crece"]}
          filas={[
            ...costos.fijos.map((c) => [c.rubro, c.plan, pesos(c.cop), c.siCrece]),
            ["Total fijos", "", pesos(costos.totalFijo), ""],
          ]}
        />
      </div>
    </Seccion>
  );
}

/**
 * Los comercios con que trabaja LoleardLola y cómo está vinculado cada
 * uno: catálogo (fotos y precios de verdad), directorio de Instagram, y
 * lista de tiendas de la búsqueda en Google.
 */
function SeccionComercios({
  comercios,
  excluidos,
}: {
  comercios: Datos["comerciosVinculados"];
  excluidos: string[];
}) {
  const conCatalogo = comercios.filter((c) => c.catalogo).length;
  const enInstagram = comercios.filter((c) => c.enInstagram).length;
  const enGoogle = comercios.filter((c) => c.google).length;
  const Chip = ({ si, texto }: { si: boolean; texto: string }) =>
    si ? (
      <span className="mr-1 inline-block rounded-full bg-rosa-50 px-2 py-0.5 text-[11px] font-medium text-rosa-600">{texto}</span>
    ) : null;
  return (
    <Seccion
      titulo="Comercios vinculados"
      nota="Catálogo: la app trae sus prendas con foto y precio. Instagram: sale en las tiendas para mirar. Google: la búsqueda de Google Imágenes se limita a estas tiendas."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero etiqueta="Comercios" valor={comercios.length} />
        <Numero etiqueta="Con catálogo" valor={conCatalogo} destacado />
        <Numero etiqueta="En Instagram" valor={enInstagram} />
        <Numero etiqueta="En Google" valor={enGoogle} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-rosa-100 text-left">
              {["Comercio", "Página", "Instagram", "Vinculado por", "Clics"].map((c) => (
                <th key={c} className="pb-2 pr-4 font-medium text-noche/50">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comercios.map((c) => (
              <tr key={c.dominio} className="border-b border-rosa-50 last:border-0">
                <td className="py-2 pr-4 font-medium text-noche">{c.nombre}</td>
                <td className="py-2 pr-4">
                  {c.dominio.includes(".") ? (
                    <a href={`https://${c.dominio}`} target="_blank" rel="noopener noreferrer" className="text-rosa-600 hover:underline">
                      {c.dominio}
                    </a>
                  ) : (
                    <span className="text-noche/40">—</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {c.instagram ? (
                    <a href={`https://www.instagram.com/${c.instagram}/`} target="_blank" rel="noopener noreferrer" className="text-rosa-600 hover:underline">
                      @{c.instagram}
                    </a>
                  ) : (
                    <span className="text-noche/40">—</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <Chip si={c.catalogo} texto="Catálogo" />
                  <Chip si={c.enInstagram} texto="Instagram" />
                  <Chip si={c.google} texto="Google" />
                </td>
                <td className="py-2 pr-4 tabular-nums text-noche/70">{c.clics}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {excluidos.length > 0 && (
        <p className="mt-3 text-xs text-noche/50">
          Excluidos (nunca se muestran): {excluidos.join(", ")}.
        </p>
      )}
    </Seccion>
  );
}

/** Los correos de las cuentas creadas (sin las de prueba). */
function SeccionCuentas({ cuentas }: { cuentas: Datos["cuentas"] }) {
  const [copiado, setCopiado] = useState(false);
  const fecha = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(cuentas.map((c) => c.email).join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: los correos igual están en la tabla.
    }
  };
  return (
    <Seccion titulo="Cuentas creadas" nota="Sin las cuentas de prueba. Última vez: la última vez que entró, en cualquier navegador.">
      {cuentas.length === 0 ? (
        <p className="text-sm text-noche/50">Todavía nadie ha creado su cuenta.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={copiar}
            className="mb-3 rounded-full border border-rosa-200 px-3 py-1 text-xs font-medium text-rosa-600 hover:bg-rosa-50"
          >
            {copiado ? "Copiados" : `Copiar los ${cuentas.length} correos`}
          </button>
          <Tabla
            columnas={["Correo", "Celular", "Desde", "Plan", "Vence", "Última vez"]}
            filas={cuentas.map((c) => [c.email, c.celular ?? "—", fecha(c.desde), c.plan, fecha(c.venceMembresia), fecha(c.ultimaVez)])}
          />
        </>
      )}
    </Seccion>
  );
}

/**
 * Qué comercios gustan más: los corazones ("me gusta") de las prendas y
 * las "Mis marcas favoritas" del menú, en total y por el rango de edad
 * que cada quien puso en Mi perfil.
 */
function SeccionGustos({ gustos }: { gustos: Datos["gustos"] }) {
  const vacio = <p className="text-sm text-noche/50">Todavía no hay datos.</p>;
  return (
    <Seccion
      titulo="Me gusta y marcas favoritas"
      nota="Me gusta: los corazones de las prendas (solo con membresía). Marcas favoritas: las que eligen en el menú. Tallas: &quot;Mi talla&quot; del filtro de Promociones. La edad es la que pusieron en Mi perfil."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-noche">Comercios con más me gusta</p>
          {gustos.meGusta.length === 0 ? (
            vacio
          ) : (
            <Tabla
              columnas={["Comercio", "Me gusta", "Personas"]}
              filas={gustos.meGusta.map((g) => [g.comercio, String(g.meGusta), String(g.personas)])}
            />
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-noche">Marcas favoritas más elegidas</p>
          {gustos.favoritas.length === 0 ? (
            vacio
          ) : (
            <Tabla
              columnas={["Marca", "Personas que la eligieron"]}
              filas={gustos.favoritas.map((g) => [g.comercio, String(g.personas)])}
            />
          )}
        </div>
      </div>
      <p className="mb-2 mt-6 text-sm font-semibold text-noche">Tallas más elegidas en Promociones</p>
      {gustos.tallas.length === 0 ? (
        vacio
      ) : (
        <Tabla
          columnas={["Talla", "Personas que la eligieron"]}
          filas={gustos.tallas.map((g) => [g.talla, String(g.personas)])}
        />
      )}
      <p className="mb-2 mt-6 text-sm font-semibold text-noche">Por edad: qué comercios y tallas eligen</p>
      {gustos.porEdad.length === 0 ? (
        vacio
      ) : (
        <Tabla
          columnas={["Edad", "Personas", "Más me gusta", "Más elegidas como favoritas", "Tallas más elegidas"]}
          filas={gustos.porEdad.map((g) => [
            g.edad,
            String(g.personas),
            g.masMeGusta || "—",
            g.masFavoritas || "—",
            g.masTallas || "—",
          ])}
        />
      )}
    </Seccion>
  );
}
