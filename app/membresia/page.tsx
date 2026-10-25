"use client";

import { useEffect, useState } from "react";
import { PAQUETES_BUSQUEDAS, PRECIOS, PRECIOS_NORMALES, TOPES, TOPES_MES_MEMBRESIA } from "@/lib/planes";
import { fetchConDispositivo } from "@/lib/device-id";
import BotonPago from "@/components/BotonPago";
import AnotarVista from "@/components/AnotarVista";
import SubNavCuenta from "@/components/SubNavCuenta";
import { tieneMembresia, useUsuario } from "@/lib/use-usuario";

// Página de la membresía: qué da cada plan y los botones de pago.
//
// Bold no hace cobros recurrentes, así que la membresía es una fecha de
// vencimiento y no una suscripción — ver lib/bold.ts. Eso se dice al
// pie de la página para no prometer una renovación que no existe.
//
// Es cliente (antes era servidor) porque necesita saber si YA tiene
// membresía para mostrar el aviso de arriba y cambiar el texto de los
// botones — antes se veía igual para todo el mundo, así que alguien con
// membresía activa no tenía forma de saber que ya la tenía.

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");

export default function MembresiaPage() {
  const { usuario } = useUsuario();
  const conMembresia = tieneMembresia(usuario);
  const paquete = PAQUETES_BUSQUEDAS.paquete30;

  // Cuántas búsquedas le quedan (las del mes y las de paquetes).
  const [saldo, setSaldo] = useState<{ usadasDelMes: number; topeDelMes: number; extra: number } | null>(null);
  useEffect(() => {
    if (!conMembresia) return;
    fetchConDispositivo("/api/membresia/saldo")
      .then((r) => r.json())
      .then((j) => setSaldo(j.saldo ?? null))
      .catch(() => setSaldo(null));
  }, [conMembresia]);

  const mes = (n: number) => `${n} al mes`;
  const filas: Array<{ que: string; sin: string | number; gratis: string | number; membresia: string }> = [
    {
      que: "Búsquedas de outfits",
      sin: TOPES.anonimo.busquedas ?? "—",
      gratis: TOPES.gratis.busquedas ?? "—",
      membresia: mes(TOPES_MES_MEMBRESIA.busquedas),
    },
    {
      que: "Outfits guardados",
      sin: TOPES.anonimo.outfits ?? "—",
      gratis: TOPES.gratis.outfits ?? "—",
      membresia: "Sin tope",
    },
    {
      que: "Prendas en tu clóset",
      sin: TOPES.anonimo.prendasCloset ?? "—",
      gratis: TOPES.gratis.prendasCloset ?? "—",
      membresia: `${TOPES_MES_MEMBRESIA.prendasCloset} nuevas al mes`,
    },
    {
      que: "Buscar combinaciones",
      sin: TOPES.anonimo.combinacionesClosetGratis ?? "—",
      gratis: TOPES.gratis.combinacionesClosetGratis ?? "—",
      membresia: mes(TOPES_MES_MEMBRESIA.combinaciones),
    },
    {
      que: "Manual de estilo",
      sin: "—",
      gratis: "—",
      membresia: `Sí, ${TOPES_MES_MEMBRESIA.manuales} nuevos al mes`,
    },
    {
      que: "Avisos cuando baja el precio",
      sin: "—",
      gratis: "—",
      membresia: "Sí, al celular",
    },
    {
      que: "Búsquedas adicionales",
      sin: "—",
      gratis: "—",
      membresia: `${paquete.busquedas} por ${pesos(paquete.precio)}`,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <SubNavCuenta />
      {/* Paso 1 del embudo de pago. */}
      <AnotarVista nombre="membresia_vista" />
      <header className="text-center">
        <p className="mb-3 inline-block rounded-full bg-noche px-4 py-1 text-xs font-semibold text-white">
          Precio de lanzamiento
        </p>
        <h1 className="font-display text-4xl text-noche sm:text-5xl">
          La membresía
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-noche/60">
          Mucho más espacio para buscar y combinar, y tu manual de estilo completo: tu silueta, tu paleta
          de colores, las prendas que te favorecen y outfits armados para ti.
        </p>
      </header>

      {conMembresia && usuario?.premiumUntil && (
        <div className="rounded-2xl border border-rosa-300 bg-rosa-50/70 p-5 text-center">
          <p className="font-display text-xl text-noche">
            Ya tienes membresía activa
          </p>
          <p className="mt-1 text-sm text-noche/60">
            Vence el{" "}
            {new Date(usuario.premiumUntil).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Si compras de nuevo, los días se suman a lo que te queda — no
            los reemplazan.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-rosa-100 bg-white shadow-sm">
        {/* En el celular las cuatro columnas no caben (la de Membresía
            quedaba cortada): cada fila se vuelve una tarjeta con los tres
            planes uno al lado del otro. */}
        <ul className="divide-y divide-rosa-100 sm:hidden">
          {filas.map((f) => (
            <li key={f.que} className="px-4 py-4">
              <p className="text-sm font-medium text-noche">{f.que}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-rosa-50/60 px-1.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-noche/45">Sin cuenta</p>
                  <p className="mt-0.5 text-xs tabular-nums text-noche/70">{f.sin}</p>
                </div>
                <div className="rounded-lg bg-rosa-50/60 px-1.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-noche/45">Gratis</p>
                  <p className="mt-0.5 text-xs tabular-nums text-noche/70">{f.gratis}</p>
                </div>
                <div className="rounded-lg border border-rosa-200 bg-white px-1.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-rosa-500">Membresía</p>
                  <p className="mt-0.5 text-xs font-medium text-noche">{f.membresia}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <table className="hidden w-full text-sm sm:table">
          <thead>
            <tr className="border-b border-rosa-100 text-left">
              <th className="px-5 py-3 font-medium text-noche/60"></th>
              <th className="px-3 py-3 text-center font-medium text-noche/60">
                Sin cuenta
              </th>
              <th className="px-3 py-3 text-center font-medium text-noche/60">
                Cuenta gratis
              </th>
              <th className="px-3 py-3 text-center font-medium text-rosa-500">
                Membresía
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.que} className="border-b border-rosa-50">
                <td className="px-5 py-3 text-noche/80">{f.que}</td>
                <td className="px-3 py-3 text-center tabular-nums text-noche/60">
                  {f.sin}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-noche/60">
                  {f.gratis}
                </td>
                <td className="px-3 py-3 text-center font-medium text-noche">
                  {f.membresia}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="-mt-5 text-center text-xs text-noche/40">
        Los límites de la membresía se renuevan el 1 de cada mes.
      </p>

      <div>
        {conMembresia && (
          <p className="mb-3 text-center text-xs text-noche/50">
            Comprar de nuevo te suma tiempo — no hace falta esperar a que se
            venza.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-rosa-100 bg-white p-6 text-center shadow-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-noche/50">
              Mensual
            </p>
            <p className="mt-2 font-display text-3xl text-noche">
              {pesos(PRECIOS.mensual)}
            </p>
            <p className="mt-1 mb-5 text-xs text-noche/50">
              al mes · <span className="line-through">{pesos(PRECIOS_NORMALES.mensual)}</span> precio normal
            </p>
            <div className="mt-auto">
              <BotonPago
                plan="mensual"
                etiqueta={conMembresia ? "Sumar un mes más" : "Pagar el mes"}
              />
            </div>
          </div>
          <div className="flex flex-col rounded-2xl border border-rosa-300 bg-rosa-50/50 p-6 text-center shadow-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-rosa-500">
              Anual
            </p>
            <p className="mt-2 font-display text-3xl text-noche">
              {pesos(PRECIOS.anual)}
            </p>
            <p className="mt-1 text-xs text-noche/50">
              al año · equivale a {pesos(Math.round(PRECIOS.anual / 12))} al mes ·{" "}
              <span className="line-through">{pesos(PRECIOS_NORMALES.anual)}</span> precio normal
            </p>
            <p className="mb-5 mt-2 self-center rounded-full bg-rosa-100 px-3 py-0.5 text-xs font-medium text-rosa-600">
              Ahorras {Math.round((1 - PRECIOS.anual / (PRECIOS.mensual * 12)) * 100)}% frente a pagar mes a mes
            </p>
            <div className="mt-auto">
              <BotonPago
                plan="anual"
                etiqueta={conMembresia ? "Sumar un año más" : "Pagar el año"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---- Paquete de búsquedas ---- */}
      <div id="paquetes" className="scroll-mt-6 rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-rosa-500">¿Se te acabaron las búsquedas?</p>
            <h2 className="mt-1 font-display text-2xl text-noche">
              {paquete.busquedas} búsquedas adicionales por {pesos(paquete.precio)}
            </h2>
            <p className="mt-1 max-w-md text-sm text-noche/60">
              Se usan cuando ya gastaste las {TOPES_MES_MEMBRESIA.busquedas} búsquedas de tu mes, y no se vencen: lo
              que no uses queda para los meses siguientes.
            </p>
            {saldo && (
              <p className="mt-2 text-sm font-medium text-noche">
                Este mes llevas {Math.min(saldo.usadasDelMes, saldo.topeDelMes)} de {saldo.topeDelMes} búsquedas
                {saldo.extra > 0 ? ` · te quedan ${saldo.extra} adicionales` : ""}.
              </p>
            )}
          </div>
          <div className="w-full shrink-0 sm:w-56">
            {conMembresia ? (
              <BotonPago plan="paquete30" etiqueta={`Comprar ${paquete.busquedas} búsquedas`} />
            ) : (
              <p className="rounded-xl bg-rosa-50/70 px-4 py-3 text-center text-xs text-noche/60">
                Los paquetes son para quienes tienen la membresía.
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-noche/40">
        El pago lo procesa Bold. La membresía no se renueva sola: la fecha de
        vencimiento está arriba, y cuando quieras la renuevas desde aquí.
      </p>
    </div>
  );
}
