"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CUPOS_MEMBRESIA, DIAS_PRUEBA_PROMOS, ME_GUSTA_GRATIS, PAQUETE_VIGENTE, PAQUETES_BUSQUEDAS, PRECIOS, PRECIOS_NORMALES, TOPES, type TipoPlan } from "@/lib/planes";
import { fetchConDispositivo } from "@/lib/device-id";
import BotonPago from "@/components/BotonPago";
import AnotarVista from "@/components/AnotarVista";
import SubNavCuenta from "@/components/SubNavCuenta";
import { tieneMembresia, useUsuario } from "@/lib/use-usuario";

// Página de la membresía: arriba se escoge el plan y abajo se ve solo lo
// que incluye ese plan, con su botón.
//
// Bold no hace cobros recurrentes, así que la membresía es una fecha de
// vencimiento y no una suscripción — ver lib/bold.ts. Eso se dice al
// pie de la página para no prometer una renovación que no existe.
//
// Es cliente porque necesita saber si YA tiene membresía para mostrar el
// aviso de arriba y cambiar el texto de los botones.

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");
const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;
const cupo = (n: number | null) => (n === null ? "Sin tope" : String(n));

type ClavePlan = "gratis" | "registro" | TipoPlan;
type Grupo = { titulo: string; rubros: Array<[string, string]> };

const AHORRO_ANUAL = Math.round((1 - PRECIOS.anual / (PRECIOS.mensual * 12)) * 100);

const OPCIONES: Array<{ clave: ClavePlan; nombre: string; precio: string; nota: string }> = [
  { clave: "gratis", nombre: "Gratis", precio: "$0", nota: "Sin cuenta" },
  { clave: "registro", nombre: "Con registro", precio: "$0", nota: "Con tu correo" },
  { clave: "mensual", nombre: "Pago un mes", precio: pesos(PRECIOS.mensual), nota: "31 días" },
  { clave: "anual", nombre: "Pago anual", precio: pesos(PRECIOS.anual), nota: `Ahorras ${AHORRO_ANUAL}%` },
];

function gruposDe(plan: ClavePlan): Grupo[] {
  if (plan === "gratis") {
    return [
      {
        titulo: "Lo que incluye",
        rubros: [
          ["Promociones de todas las tiendas", dias(DIAS_PRUEBA_PROMOS.anonimo)],
          ["Marcas favoritas", "Sí"],
        ],
      },
    ];
  }
  if (plan === "registro") {
    return [
      {
        titulo: "Lo que incluye",
        rubros: [
          ["Promociones de todas las tiendas", dias(DIAS_PRUEBA_PROMOS.gratis)],
          ["Outfits guardados", cupo(TOPES.gratis.outfits)],
          ["Me gusta en tus prendas", String(ME_GUSTA_GRATIS)],
          ["Marcas favoritas", "Sí"],
        ],
      },
    ];
  }
  const c = CUPOS_MEMBRESIA[plan];
  return [
    {
      titulo: "Busca y combina",
      rubros: [
        ["Búsquedas de outfits", cupo(c.busquedas)],
        ["Combinaciones", cupo(c.combinaciones)],
        ["Prendas al clóset", cupo(c.prendasCloset)],
        ["Outfits guardados", cupo(c.outfits)],
      ],
    },
    {
      titulo: "Tu estilo",
      rubros: [
        ["Manual de estilo", cupo(c.manuales)],
        ["Personalidad por foto", cupo(c.personalidadFoto)],
        ["Personalidad por referencia", cupo(c.personalidadReferencia)],
      ],
    },
    {
      titulo: "Promociones y avisos",
      rubros: [
        ["Promociones", plan === "anual" ? "Todo el año" : "31 días"],
        ["Me gusta", cupo(c.meGusta)],
        ["Avisos de rebaja", cupo(c.meGusta)],
        ["Marcas favoritas", "Sí"],
      ],
    },
  ];
}

export default function MembresiaPage() {
  const { usuario } = useUsuario();
  const conMembresia = tieneMembresia(usuario);
  const paquete = PAQUETES_BUSQUEDAS[PAQUETE_VIGENTE];
  const [plan, setPlan] = useState<ClavePlan>("mensual");
  const opcion = OPCIONES.find((o) => o.clave === plan)!;
  const esPago = plan === "mensual" || plan === "anual";
  const grupos = gruposDe(plan);

  // Cuántas búsquedas le quedan (las de su membresía y las de paquetes).
  const [saldo, setSaldo] = useState<{ usadas: number; tope: number | null; extra: number; alMes: boolean } | null>(null);
  useEffect(() => {
    if (!conMembresia) return;
    fetchConDispositivo("/api/membresia/saldo")
      .then((r) => r.json())
      .then((j) => setSaldo(j.saldo ?? null))
      .catch(() => setSaldo(null));
  }, [conMembresia]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <SubNavCuenta />
      {/* Paso 1 del embudo de pago. */}
      <AnotarVista nombre="membresia_vista" />
      <header className="text-center">
        <p className="mb-3 inline-block rounded-full bg-noche px-4 py-1 text-xs font-semibold text-white">
          Precio de lanzamiento
        </p>
        <h1 className="font-display text-4xl text-noche sm:text-5xl">La membresía</h1>
        <p className="mx-auto mt-3 max-w-xl text-noche/60">Escoge un plan para ver qué incluye.</p>
      </header>

      {conMembresia && usuario?.premiumUntil && (
        <div className="rounded-2xl border border-rosa-300 bg-rosa-50/70 p-4 text-center">
          <p className="font-display text-xl text-noche">Ya tienes membresía activa</p>
          <p className="mt-1 text-sm text-noche/60">
            Vence el{" "}
            {new Date(usuario.premiumUntil).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Si compras de nuevo, los días se suman a lo que te queda.
          </p>
        </div>
      )}

      <div role="group" aria-label="Planes" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {OPCIONES.map((o) => {
          const activa = o.clave === plan;
          return (
            <button
              key={o.clave}
              type="button"
              onClick={() => setPlan(o.clave)}
              aria-pressed={activa}
              className={`rounded-2xl border px-3 py-3 text-center transition ${
                activa
                  ? "border-noche bg-noche text-white shadow-sm"
                  : "border-rosa-100 bg-white text-noche hover:border-rosa-300"
              }`}
            >
              <span className="block text-sm font-semibold">{o.nombre}</span>
              <span className="mt-1 block font-display text-2xl">{o.precio}</span>
              <span className={`mt-0.5 block text-xs ${activa ? "text-white/70" : "text-noche/50"}`}>{o.nota}</span>
            </button>
          );
        })}
      </div>

      <section aria-live="polite" className="rounded-2xl border border-rosa-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-noche">{opcion.nombre}</h2>
            <p className="mt-1 text-sm text-noche/60">
              {plan === "gratis" && "Para mirar las promociones sin crear una cuenta."}
              {plan === "registro" && "Crea tu cuenta gratis con tu correo."}
              {plan === "mensual" && (
                <>
                  {pesos(PRECIOS.mensual)} por 31 días ·{" "}
                  <span className="line-through">{pesos(PRECIOS_NORMALES.mensual)}</span> precio normal
                </>
              )}
              {plan === "anual" && (
                <>
                  Equivale a {pesos(Math.round(PRECIOS.anual / 12))} al mes ·{" "}
                  <span className="line-through">{pesos(PRECIOS_NORMALES.anual)}</span> precio normal
                </>
              )}
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-52">
            {plan === "gratis" && (
              <Link
                href="/promociones"
                className="block rounded-full bg-noche px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-rosa-500"
              >
                Ver promociones
              </Link>
            )}
            {plan === "registro" &&
              (usuario?.conSesion ? (
                <p className="rounded-full bg-rosa-50 px-6 py-3 text-center text-sm font-medium text-noche/70">Ya tienes tu cuenta</p>
              ) : (
                <Link
                  href="/entrar?volver=/membresia&motivo=Crea tu cuenta gratis con tu correo."
                  className="block rounded-full bg-noche px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-rosa-500"
                >
                  Crear mi cuenta
                </Link>
              ))}
            {plan === "mensual" && <BotonPago plan="mensual" etiqueta={conMembresia ? "Sumar un mes más" : "Pagar el mes"} />}
            {plan === "anual" && <BotonPago plan="anual" etiqueta={conMembresia ? "Sumar un año más" : "Pagar el año"} />}
          </div>
        </div>

        <div className={`mt-5 grid gap-5 border-t border-rosa-100 pt-5 ${esPago ? "sm:grid-cols-3" : ""}`}>
          {grupos.map((g) => (
            <div key={g.titulo}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-rosa-500">{g.titulo}</h3>
              <dl className="mt-2 divide-y divide-rosa-50">
                {g.rubros.map(([rubro, consumo]) => (
                  <div key={rubro} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <dt className="text-noche/70">{rubro}</dt>
                    <dd className="shrink-0 font-semibold tabular-nums text-noche">{consumo}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-noche/50">
          {plan === "mensual" && `Tus cupos duran los 31 días de tu membresía. Si necesitas más: ${paquete.busquedas} búsquedas por ${pesos(paquete.precio)}.`}
          {plan === "anual" && `Usas tus cupos a tu ritmo durante todo el año. Si necesitas más: ${paquete.busquedas} búsquedas por ${pesos(paquete.precio)}.`}
          {!esPago && (
            <>
              Buscar outfits, tu clóset y tu manual de estilo son parte de la membresía.{" "}
              <button type="button" onClick={() => setPlan("mensual")} className="font-medium text-rosa-600 underline">
                Ver Pago un mes
              </button>
            </>
          )}
        </p>
      </section>

      {/* ---- Paquete de búsquedas: solo para quien ya tiene membresía ---- */}
      {conMembresia && (
        <div id="paquetes" className="scroll-mt-6 rounded-2xl border border-rosa-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl text-noche">
                {paquete.busquedas} búsquedas adicionales por {pesos(paquete.precio)}
              </h2>
              <p className="mt-1 max-w-md text-sm text-noche/60">
                Se usan cuando se acaban las de tu membresía y se vencen en la misma fecha que ella.
              </p>
              {saldo && (
                <p className="mt-2 text-sm font-medium text-noche">
                  {saldo.alMes ? "Este mes" : "En esta membresía"} llevas{" "}
                  {saldo.tope === null ? saldo.usadas : `${Math.min(saldo.usadas, saldo.tope)} de ${saldo.tope}`} búsquedas
                  {saldo.extra > 0 ? ` · te quedan ${saldo.extra} adicionales` : ""}.
                </p>
              )}
            </div>
            <div className="w-full shrink-0 sm:w-52">
              <BotonPago plan={PAQUETE_VIGENTE} etiqueta={`Comprar ${paquete.busquedas} búsquedas`} />
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-noche/40">
        El pago lo procesa Bold. La membresía no se renueva sola: cuando quieras la renuevas desde aquí.
      </p>
    </div>
  );
}
