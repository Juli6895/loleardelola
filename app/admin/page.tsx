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
type Datos = {
  desde: string | null;
  resumen: { personas: number; cuentasCreadas: number; membresiasActivas: number; mensuales: number; anuales: number };
  embudo: Array<{ paso: string; personas: number }>;
  secciones: Array<{ seccion: string; visitas: number; personas: number; minutosPromedio: number }>;
  errores: Array<{ lugar: string; error: string; veces: number; personas: number; ultimaVez: string }>;
  comercios: Fila[];
  prendas: Fila[];
  actividad: Array<{ dia: string; personas: number; busquedas: number; registros: number; pagos: number }>;
  dinero: { pagosDelMes: number; brutoCop: number; netoEstimadoCop: number };
  porVencer: Array<{ email: string; name: string | null; premium_until: string }>;
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
