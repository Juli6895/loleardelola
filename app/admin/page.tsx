"use client";

import { useEffect, useState } from "react";
import { fetchConDispositivo } from "@/lib/device-id";

// Tablero de administración. Solo para el correo de administración
// (ver lib/admin.ts) — el permiso se revisa en el servidor, no acá:
// esconder una página no impide que alguien llame la API.
//
// Responde tres preguntas y no más, a propósito: cuánta gente hay de
// cada tipo, dónde se está cayendo, y qué se rompió. Un tablero que
// intenta mostrarlo todo no se mira.

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");

type Paso = { orden: number; paso: string; personas: number };
type Datos = {
  niveles: Array<{ nivel: string; personas: number }>;
  embudo: Paso[];
  embudoPago: Paso[];
  errores: Array<{ nombre: string; motivo: string | null; veces: number; personas: number; ultima_vez: string }>;
  seQuedaron: Array<{ email: string; nombre: string | null; ultimo_intento: string; donde_se_quedo: string }>;
  actividad: Array<{
    dia: string;
    busquedas: number;
    registros: number;
    ingresos: number;
    intentos_de_pago: number;
    pagos: number;
  }>;
  servicios: Array<{ orden: number; servicio: string; personas: number; veces: number }>;
  comerciosMasClic: Array<{ tienda: string; dominio: string | null; clics: number; personas: number; ultimo_clic: string }>;
  dinero: { pagosDelMes: number; brutoCop: number; netoEstimadoCop: number };
  cuentas: { registrosDelMes: number; ingresosDelMes: number };
  porVencer: Array<{ email: string; name: string | null; premium_until: string }>;
};

const NOMBRE_NIVEL: Record<string, string> = {
  anonima: "Sin cuenta",
  registrada: "Con cuenta",
  membresia: "Con membresía",
};

const NOMBRE_ERROR: Record<string, string> = {
  tope_alcanzado: "Se topó con un límite",
  busqueda_error: "Falló la búsqueda",
  pago_error: "Falló al abrir el pago",
  ingreso_error: "Falló al entrar",
  manual_error: "Falló el manual",
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

  const totalPersonas = datos.niveles.reduce((a, n) => a + n.personas, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-4">
      <header>
        <h1 className="font-display text-3xl text-noche">Tablero</h1>
        <p className="mt-1 text-sm text-noche/50">
          Quién está usando LoleardLola y dónde se está cayendo.
        </p>
      </header>

      {/* ---- Números de cabecera ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero etiqueta="Personas" valor={String(totalPersonas)} />
        {["anonima", "registrada", "membresia"].map((n) => (
          <Numero
            key={n}
            etiqueta={NOMBRE_NIVEL[n]}
            valor={String(datos.niveles.find((x) => x.nivel === n)?.personas ?? 0)}
            destacado={n === "membresia"}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Numero etiqueta="Se registraron este mes" valor={String(datos.cuentas.registrosDelMes)} />
        <Numero etiqueta="Ingresos este mes" valor={String(datos.cuentas.ingresosDelMes)} />
        <Numero etiqueta="Pagos este mes" valor={String(datos.dinero.pagosDelMes)} />
        <Numero etiqueta="Cobrado" valor={pesos(datos.dinero.brutoCop)} />
        <Numero
          etiqueta="Te queda (estimado)"
          valor={pesos(datos.dinero.netoEstimadoCop)}
        />
      </div>

      <Seccion
        titulo="Qué servicios usan"
        nota="Cuánta gente distinta ha abierto cada sección, y cuántas veces en total."
      >
        {datos.servicios.length === 0 ? (
          <Vacio>Sin datos todavía.</Vacio>
        ) : (
          <Tabla
            columnas={["Servicio", "Personas", "Veces"]}
            filas={datos.servicios.map((s) => [s.servicio, String(s.personas), String(s.veces)])}
          />
        )}
      </Seccion>

      <Seccion
        titulo="Comercios con más clic"
        nota="Clics hacia UN comercio puntual — no cuenta la búsqueda genérica de Google Shopping, que no dice a cuál tienda entró."
      >
        {datos.comerciosMasClic.length === 0 ? (
          <Vacio>Sin datos todavía.</Vacio>
        ) : (
          <Tabla
            columnas={["Comercio", "Clics", "Personas", "Último clic"]}
            filas={datos.comerciosMasClic.map((c) => [
              c.tienda || c.dominio || "—",
              String(c.clics),
              String(c.personas),
              new Date(c.ultimo_clic).toLocaleDateString("es-CO"),
            ])}
          />
        )}
      </Seccion>

      <Embudo
        titulo="El recorrido completo"
        nota="De la primera búsqueda al pago. La caída más grande es dónde hay que trabajar."
        pasos={datos.embudo}
      />

      <Embudo
        titulo="El embudo de pago"
        nota="Entre «tocó pagar» y «se abrió el checkout» se cae quien tuvo un problema en NUESTRA página. Entre «se abrió» y «pagó», quien se cayó en Bold."
        pasos={datos.embudoPago}
      />

      {/* ---- Quién se quedó en el camino ---- */}
      <Seccion
        titulo="Tocaron pagar y no terminaron"
        nota="Cada una es una persona a la que le puedes escribir."
      >
        {datos.seQuedaron.length === 0 ? (
          <Vacio>Nadie por ahora.</Vacio>
        ) : (
          <Tabla
            columnas={["Correo", "Dónde se quedó", "Último intento"]}
            filas={datos.seQuedaron.map((x) => [
              x.email,
              x.donde_se_quedo,
              new Date(x.ultimo_intento).toLocaleDateString("es-CO"),
            ])}
          />
        )}
      </Seccion>

      {/* ---- Qué se está rompiendo ---- */}
      <Seccion titulo="Dónde se rompe" nota="Lo que hay que arreglar, en orden.">
        {datos.errores.length === 0 ? (
          <Vacio>Nada roto todavía.</Vacio>
        ) : (
          <Tabla
            columnas={["Qué pasó", "Motivo", "Veces", "Personas"]}
            filas={datos.errores.map((e) => [
              NOMBRE_ERROR[e.nombre] ?? e.nombre,
              e.motivo ?? "—",
              String(e.veces),
              String(e.personas),
            ])}
          />
        )}
      </Seccion>

      {/* ---- Membresías por vencer ---- */}
      <Seccion
        titulo="Se les vence pronto"
        nota="Bold no renueva solo. Sin un recordatorio, esta gente se cae por olvido."
      >
        {datos.porVencer.length === 0 ? (
          <Vacio>Ninguna en los próximos 15 días.</Vacio>
        ) : (
          <Tabla
            columnas={["Correo", "Nombre", "Vence"]}
            filas={datos.porVencer.map((u) => [
              u.email,
              u.name ?? "—",
              new Date(u.premium_until).toLocaleDateString("es-CO"),
            ])}
          />
        )}
      </Seccion>

      {/* ---- Actividad ---- */}
      <Seccion titulo="Últimos 30 días">
        {datos.actividad.length === 0 ? (
          <Vacio>Sin actividad registrada todavía.</Vacio>
        ) : (
          <Tabla
            columnas={["Día", "Búsquedas", "Registros", "Ingresos", "Tocaron pagar", "Pagaron"]}
            filas={datos.actividad
              .slice()
              .reverse()
              .map((d) => [
                new Date(d.dia).toLocaleDateString("es-CO"),
                String(d.busquedas ?? 0),
                String(d.registros ?? 0),
                String(d.ingresos ?? 0),
                String(d.intentos_de_pago ?? 0),
                String(d.pagos ?? 0),
              ])}
          />
        )}
      </Seccion>
    </div>
  );
}

function Numero({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        destacado ? "border-rosa-300 bg-rosa-50/60" : "border-rosa-100 bg-white"
      }`}
    >
      <p className="text-xs text-noche/50">{etiqueta}</p>
      <p className="mt-1 font-display text-2xl tabular-nums text-noche">{valor}</p>
    </div>
  );
}

function Seccion({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-rosa-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl text-noche">{titulo}</h2>
      {nota && <p className="mt-1 text-xs leading-relaxed text-noche/50">{nota}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Embudo con barras proporcionales. Lo que importa no es cuánta gente
 * hay en cada paso sino qué PORCENTAJE sobrevivió del paso anterior —
 * 200 personas no dicen nada si no se sabe de cuántas venían.
 */
function Embudo({
  titulo,
  nota,
  pasos,
}: {
  titulo: string;
  nota: string;
  pasos: Paso[];
}) {
  const tope = Math.max(...pasos.map((p) => p.personas), 1);
  return (
    <Seccion titulo={titulo} nota={nota}>
      <div className="space-y-3">
        {pasos.map((p, i) => {
          const anterior = i > 0 ? pasos[i - 1].personas : null;
          const pct = anterior && anterior > 0 ? (p.personas / anterior) * 100 : null;
          // Se marca la caída fuerte: menos de la mitad sobreviviendo
          // es donde de verdad hay que mirar.
          const caidaFuerte = pct !== null && pct < 50;
          return (
            <div key={p.orden}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-noche/80">{p.paso}</span>
                <span className="tabular-nums text-noche">
                  {p.personas}
                  {pct !== null && (
                    <span
                      className={`ml-2 text-xs ${
                        caidaFuerte ? "font-medium text-rosa-600" : "text-noche/40"
                      }`}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-rosa-50">
                <div
                  className={`h-full rounded-full ${
                    caidaFuerte ? "bg-rosa-500" : "bg-rosa-300"
                  }`}
                  style={{ width: `${Math.max((p.personas / tope) * 100, 1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Seccion>
  );
}

function Tabla({ columnas, filas }: { columnas: string[]; filas: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
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
                <td
                  key={j}
                  className={`py-2 pr-4 ${
                    j === 0 ? "text-noche" : "tabular-nums text-noche/70"
                  }`}
                >
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
