"use client";

import { useEffect, useState } from "react";
import { fetchConDispositivo } from "@/lib/device-id";
import { SQL_GASTOS } from "@/lib/sql-gastos";

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
type CostoServicio = {
  servicio: string;
  tipo: "Variable" | "Fijo";
  consultas: number | null;
  unitarioCop: number | null;
  totalCop: number;
  delMesCop: number;
  medido: boolean;
};
type Costos = {
  trm: number;
  costoPorServicio: CostoServicio[];
  delMes: { variables: CostoVariable[]; totalVariable: number };
  desdeSiempre: { variables: CostoVariable[]; totalVariable: number };
  fijos: Array<{ rubro: string; plan: string; cop: number; siCrece: string }>;
  totalFijo: number;
  planesGratis: Array<{ servicio: string; usado: string; limite: string; porcentaje: number | null; detalle: string }>;
  porPersonaCop: number;
  porMembresiaCop: number;
  resultadoDelMesCop: number;
  gastosManuales: Gasto[];
  faltaMigracionGastos: boolean;
};
type Gasto = { id: string; tipo: "fijo" | "variable"; rubro: string; detalle: string | null; valor_cop: number; fecha: string; activo: boolean };
type Datos = {
  desde: string | null;
  resumen: { personas: number; cuentasCreadas: number; membresiasActivas: number; mensuales: number; anuales: number };
  embudo: Array<{ paso: string; personas: number }>;
  etiquetas: Array<{ etapa: string; etiquetas: Array<{ evento: string; cuando: string; veces: number; personas: number }> }>;
  secciones: Array<{ seccion: string; visitas: number; personas: number; minutosPromedio: number }>;
  errores: Array<{ servicio: string; lugar: string; error: string; veces: number; personas: number; correos: string[]; ultimaVez: string }>;
  erroresPorCorreo: Array<{ correo: string; servicio: string; lugar: string; error: string; veces: number; ultimaVez: string }>;
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

  const cargar = () =>
    fetchConDispositivo("/api/admin/tablero")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "No pudimos cargar el tablero");
        setDatos(j);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    cargar();
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
        <Numero etiqueta="Te queda (después de Bold)" valor={pesos(datos.dinero.netoEstimadoCop)} />
      </div>

      {/* ---- Activar membresía a mano ---- */}
      <SeccionActivarMembresia onCambio={cargar} />

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

      {/* ---- Etiquetas de la experiencia ---- */}
      <Seccion
        titulo="Etiquetas de la experiencia"
        nota="Cada paso que da una persona deja una etiqueta. Aquí, por etapa: cuándo sale, cuántas veces y cuántas personas distintas."
      >
        <div className="space-y-6">
          {datos.etiquetas.map((et) => (
            <div key={et.etapa}>
              <h3 className="text-sm font-semibold text-noche">{et.etapa}</h3>
              <div className="mt-2">
                <Tabla
                  columnas={["Etiqueta", "Cuándo sale", "Veces", "Personas"]}
                  filas={et.etiquetas.map((t) => [t.evento, t.cuando, String(t.veces), String(t.personas)])}
                />
              </div>
            </div>
          ))}
        </div>
      </Seccion>

      {/* ---- Errores ---- */}
      <Seccion titulo="Errores" nota="En qué servicio pasó, cuál fue el error, a qué correos les salió, cuántas veces y cuándo fue la última.">
        {datos.errores.length === 0 ? (
          <Vacio>Sin errores registrados.</Vacio>
        ) : (
          <Tabla
            columnas={["Servicio", "Dónde", "Error", "Correos", "Veces", "Última vez"]}
            filas={datos.errores.map((e) => [
              e.servicio,
              e.lugar,
              e.error,
              e.correos.join(", "),
              String(e.veces),
              fecha(e.ultimaVez),
            ])}
          />
        )}
        <h3 className="mt-6 text-sm font-semibold text-noche">Errores por correo</h3>
        <p className="text-xs text-noche/45">
          Cada correo con lo que le falló y en qué servicio. &quot;Sin cuenta&quot; es alguien que no ha entrado con su correo.
        </p>
        {datos.erroresPorCorreo.length === 0 ? (
          <Vacio>Sin errores registrados.</Vacio>
        ) : (
          <div className="mt-2">
            <Tabla
              columnas={["Correo", "Servicio", "Dónde", "Error", "Veces", "Última vez"]}
              filas={datos.erroresPorCorreo.map((e) => [e.correo, e.servicio, e.lugar, e.error, String(e.veces), fecha(e.ultimaVez)])}
            />
          </div>
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
      <SeccionGastos gastos={datos.costos.gastosManuales} falta={datos.costos.faltaMigracionGastos} onCambio={cargar} />

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

      <h3 className="mt-6 text-sm font-semibold text-noche">Costo por servicio, a hoy</h3>
      <p className="text-xs text-noche/45">
        Total a hoy = consultas × costo de una consulta. El costo de una es el medido en cada llamada; donde dice
        &quot;referencia&quot; todavía no se ha medido y se usa el de octubre de 2026. Los fijos son lo del mes por los
        meses que llevan.
      </p>
      <div className="mt-2">
        <Tabla
          columnas={["Servicio", "Tipo", "Consultas", "Costo de 1 consulta", "Total a hoy", "Este mes"]}
          filas={[
            ...costos.costoPorServicio.map((c) => [
              c.servicio,
              c.tipo,
              c.consultas == null ? "—" : String(c.consultas),
              c.unitarioCop == null ? "—" : pesos(c.unitarioCop) + (c.medido ? "" : " (referencia)"),
              pesos(c.totalCop),
              pesos(c.delMesCop),
            ]),
            [
              "Total",
              "",
              "",
              "",
              pesos(costos.costoPorServicio.reduce((a, c) => a + c.totalCop, 0)),
              pesos(costos.costoPorServicio.reduce((a, c) => a + c.delMesCop, 0)),
            ],
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

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const VACIO = { tipo: "fijo" as Gasto["tipo"], rubro: "", valor: "", fecha: "", detalle: "" };

/**
 * Gastos que la app no mide sola (marketing, pauta, servicios pagados por
 * fuera): se ingresan aquí y el tablero los suma a Costos. Fijos: cada
 * mes mientras estén activos. Variables: una vez, en el mes de su fecha.
 */
function SeccionGastos({ gastos, falta, onCambio }: { gastos: Gasto[]; falta: boolean; onCambio: () => Promise<unknown> }) {
  const [form, setForm] = useState({ ...VACIO, fecha: hoy() });
  const [editando, setEditando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function llamar(metodo: string, url: string, cuerpo?: unknown) {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await fetchConDispositivo(url, {
        method: metodo,
        headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No se pudo guardar.");
      await onCambio();
      return true;
    } catch (e) {
      setAviso((e as Error).message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const cuerpo = { tipo: form.tipo, rubro: form.rubro, valor_cop: form.valor, fecha: form.fecha, detalle: form.detalle };
    const ok = editando
      ? await llamar("PATCH", "/api/admin/gastos", { id: editando, ...cuerpo })
      : await llamar("POST", "/api/admin/gastos", cuerpo);
    if (ok) {
      setForm({ ...VACIO, tipo: form.tipo, fecha: hoy() });
      setEditando(null);
    }
  }

  function editar(g: Gasto) {
    setEditando(g.id);
    setForm({ tipo: g.tipo, rubro: g.rubro, valor: String(g.valor_cop), fecha: g.fecha, detalle: g.detalle ?? "" });
  }

  function borrar(g: Gasto) {
    if (confirm(`¿Borrar "${g.rubro}"?`)) llamar("DELETE", `/api/admin/gastos?id=${g.id}`);
  }

  const fijos = gastos.filter((g) => g.tipo === "fijo");
  const variables = gastos.filter((g) => g.tipo === "variable");
  const dia = (f: string) =>
    new Date(f + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  const campo = "mt-1 w-full rounded-xl border border-rosa-200 bg-white px-3 py-2 text-sm text-noche outline-none focus:border-rosa-400";
  const boton = "text-xs font-medium text-rosa-600 underline-offset-2 hover:underline disabled:opacity-40";
  const acciones = (g: Gasto) => (
    <td className="space-x-3 whitespace-nowrap py-2 align-top">
      <button type="button" className={boton} disabled={ocupado} onClick={() => editar(g)}>
        Editar
      </button>
      {g.tipo === "fijo" && (
        <button
          type="button"
          className={boton}
          disabled={ocupado}
          onClick={() => llamar("PATCH", "/api/admin/gastos", { id: g.id, activo: !g.activo })}
        >
          {g.activo ? "Pausar" : "Reanudar"}
        </button>
      )}
      <button type="button" className={boton} disabled={ocupado} onClick={() => borrar(g)}>
        Borrar
      </button>
    </td>
  );
  const nombre = (g: Gasto) => (
    <td className="py-2 pr-4 align-top text-noche">
      {g.rubro}
      {g.detalle && <span className="block text-xs text-noche/45">{g.detalle}</span>}
    </td>
  );
  const cabeza = (columnas: string[]) => (
    <thead>
      <tr className="border-b border-rosa-100 text-left">
        {columnas.map((c, i) => (
          <th key={i} className="pb-2 pr-4 font-medium text-noche/50">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );

  return (
    <Seccion
      titulo="Gastos ingresados a mano"
      nota="Lo que la app no mide sola: marketing, pauta, servicios que pagas por fuera. Los fijos cuentan cada mes mientras estén activos; los variables, una vez, en el mes de su fecha. Se suman en Costos."
    >
      {falta && <AvisoTablaGastos />}
      <fieldset disabled={falta} className={falta ? "opacity-50" : ""}>
        <>
          <form onSubmit={guardar} className="grid grid-cols-1 gap-3 rounded-2xl bg-rosa-50/60 p-4 sm:grid-cols-6">
            <label className="text-xs text-noche/60 sm:col-span-2">
              Tipo
              <select
                className={campo}
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as Gasto["tipo"] })}
              >
                <option value="fijo">Fijo (cada mes)</option>
                <option value="variable">Variable (una vez)</option>
              </select>
            </label>
            <label className="text-xs text-noche/60 sm:col-span-2">
              Gasto
              <input
                className={campo}
                value={form.rubro}
                onChange={(e) => setForm({ ...form, rubro: e.target.value })}
                placeholder="Ej.: Publicidad en Meta"
                required
              />
            </label>
            <label className="text-xs text-noche/60 sm:col-span-1">
              Valor (pesos)
              <input
                className={`${campo} tabular-nums`}
                inputMode="numeric"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="150000"
                required
              />
            </label>
            <label className="text-xs text-noche/60 sm:col-span-1">
              {form.tipo === "fijo" ? "Desde" : "Fecha"}
              <input
                type="date"
                className={campo}
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                required
              />
            </label>
            <label className="text-xs text-noche/60 sm:col-span-4">
              Detalle (opcional)
              <input
                className={campo}
                value={form.detalle}
                onChange={(e) => setForm({ ...form, detalle: e.target.value })}
                placeholder="Ej.: pauta de Instagram de noviembre"
              />
            </label>
            <div className="flex items-end gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={ocupado}
                className="rounded-full bg-noche px-5 py-2 text-sm font-medium text-white hover:bg-rosa-500 disabled:opacity-50"
              >
                {ocupado ? "Guardando..." : editando ? "Guardar cambios" : "Agregar gasto"}
              </button>
              {editando && (
                <button
                  type="button"
                  className={boton}
                  onClick={() => {
                    setEditando(null);
                    setForm({ ...VACIO, fecha: hoy() });
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
          {aviso && <p className="mt-2 text-sm text-rosa-600">{aviso}</p>}

          <h3 className="mt-6 text-sm font-semibold text-noche">Fijos (cada mes)</h3>
          {fijos.length === 0 ? (
            <Vacio>Todavía no hay gastos fijos ingresados.</Vacio>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                {cabeza(["Gasto", "Al mes", "Desde", "Estado", ""])}
                <tbody>
                  {fijos.map((g) => (
                    <tr key={g.id} className="border-b border-rosa-50 last:border-0">
                      {nombre(g)}
                      <td className="py-2 pr-4 align-top tabular-nums text-noche/70">{pesos(g.valor_cop)}</td>
                      <td className="py-2 pr-4 align-top text-noche/70">{dia(g.fecha)}</td>
                      <td className={`py-2 pr-4 align-top ${g.activo ? "text-noche/70" : "text-noche/40"}`}>
                        {g.activo ? "Activo" : "Pausado"}
                      </td>
                      {acciones(g)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="mt-6 text-sm font-semibold text-noche">Variables (una vez)</h3>
          {variables.length === 0 ? (
            <Vacio>Todavía no hay gastos variables ingresados.</Vacio>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                {cabeza(["Fecha", "Gasto", "Valor", ""])}
                <tbody>
                  {variables.map((g) => (
                    <tr key={g.id} className="border-b border-rosa-50 last:border-0">
                      <td className="py-2 pr-4 align-top text-noche/70">{dia(g.fecha)}</td>
                      {nombre(g)}
                      <td className="py-2 pr-4 align-top tabular-nums text-noche/70">{pesos(g.valor_cop)}</td>
                      {acciones(g)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      </fieldset>
    </Seccion>
  );
}

/**
 * Activar (o extender) una membresía a mano, después de ver el pago en
 * la app de Bold: para cuando no se activó sola. Usa /api/admin/membresias
 * (lib/admin.ts, activarMembresia): si le queda membresía, los días se
 * suman a lo que le falta.
 */
function SeccionActivarMembresia({ onCambio }: { onCambio: () => Promise<unknown> }) {
  const [correo, setCorreo] = useState("");
  const [plan, setPlan] = useState<"mensual" | "anual">("mensual");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const campo = "mt-1 w-full rounded-xl border border-rosa-200 bg-white px-3 py-2 text-sm text-noche outline-none focus:border-rosa-400";

  async function activar(e: React.FormEvent) {
    e.preventDefault();
    const limpio = correo.trim().toLowerCase();
    if (!limpio) return;
    if (!confirm(`¿Activar la membresía ${plan} a ${limpio}? Hazlo solo si ya viste el pago en Bold.`)) return;
    setOcupado(true);
    setAviso(null);
    try {
      const r = await fetchConDispositivo("/api/admin/membresias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: limpio, plan }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error ?? "No se pudo activar.");
      const hasta = new Date(j.hasta).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
      setAviso({ ok: true, texto: `Listo: ${limpio} tiene membresía hasta el ${hasta}.` });
      setCorreo("");
      await onCambio();
    } catch (err) {
      setAviso({ ok: false, texto: (err as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Seccion
      titulo="Activar membresía a mano"
      nota="Para cuando alguien pagó y no se le activó sola. Revisa primero el pago en la app de Bold. Si le queda membresía, los días se suman."
    >
      <form onSubmit={activar} className="grid grid-cols-1 gap-3 rounded-2xl bg-rosa-50/60 p-4 sm:grid-cols-6">
        <label className="text-xs text-noche/60 sm:col-span-3">
          Correo de la cuenta
          <input
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            className={campo}
          />
        </label>
        <label className="text-xs text-noche/60 sm:col-span-2">
          Plan
          <select className={campo} value={plan} onChange={(e) => setPlan(e.target.value as "mensual" | "anual")}>
            <option value="mensual">Mensual (30 días)</option>
            <option value="anual">Anual (365 días)</option>
          </select>
        </label>
        <div className="flex items-end sm:col-span-1">
          <button
            type="submit"
            disabled={ocupado || !correo.trim()}
            className="w-full rounded-full bg-noche px-4 py-2 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:opacity-40"
          >
            {ocupado ? "Activando..." : "Activar"}
          </button>
        </div>
      </form>
      {aviso && (
        <p className={`mt-3 text-sm ${aviso.ok ? "text-noche" : "text-rosa-600"}`}>{aviso.texto}</p>
      )}
    </Seccion>
  );
}

/** La tabla de gastos no existe todavía: el SQL para crearla, listo para copiar. */
function AvisoTablaGastos() {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(SQL_GASTOS);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <div className="mb-4 rounded-2xl border border-rosa-200 bg-rosa-50 px-4 py-4 text-sm text-noche/80">
      <p className="font-semibold text-noche">Falta un paso para poder guardar gastos</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Toca &quot;Copiar SQL&quot;.</li>
        <li>En Supabase (proyecto de LoleardLola) abre <b>SQL Editor</b>, pega y dale <b>Run</b>.</li>
        <li>Recarga esta página: el formulario se activa y ya trae marketing ($600.000), Meta ($150.000) y el dominio ($45.000).</li>
      </ol>
      <button
        type="button"
        onClick={copiar}
        className="mt-3 rounded-full bg-noche px-4 py-1.5 text-xs font-medium text-white"
      >
        {copiado ? "Copiado" : "Copiar SQL"}
      </button>
    </div>
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
