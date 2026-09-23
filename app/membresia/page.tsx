"use client";

import { PRECIOS, TOPES } from "@/lib/planes";
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

  const filas = [
    {
      que: "Búsquedas de outfits",
      sin: TOPES.anonimo.busquedas,
      gratis: TOPES.gratis.busquedas,
    },
    {
      que: "Outfits guardados",
      sin: TOPES.anonimo.outfits,
      gratis: TOPES.gratis.outfits,
    },
    {
      que: "Prendas en tu clóset",
      sin: TOPES.anonimo.prendasCloset,
      gratis: TOPES.gratis.prendasCloset,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <SubNavCuenta />
      {/* Paso 1 del embudo de pago. */}
      <AnotarVista nombre="membresia_vista" />
      <header className="text-center">
        <h1 className="font-display text-4xl text-noche sm:text-5xl">
          La membresía
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-noche/60">
          Sin topes, y tu manual de estilo completo: tus medidas, tu silueta,
          tu paleta de colores, las prendas que te favorecen y outfits armados
          para ti.
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
        <table className="w-full text-sm">
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
                  Sin tope
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-5 py-3 text-noche/80">Manual de estilo</td>
              <td className="px-3 py-3 text-center text-noche/30">—</td>
              <td className="px-3 py-3 text-center text-noche/30">—</td>
              <td className="px-3 py-3 text-center font-medium text-noche">Sí</td>
            </tr>
          </tbody>
        </table>
      </div>

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
            <p className="mt-1 mb-5 text-xs text-noche/50">al mes</p>
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
            <p className="mt-1 mb-5 text-xs text-noche/50">al año</p>
            <div className="mt-auto">
              <BotonPago
                plan="anual"
                etiqueta={conMembresia ? "Sumar un año más" : "Pagar el año"}
              />
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-noche/40">
        El pago lo procesa Bold. La membresía no se renueva sola: cuando se
        acerque el vencimiento te avisamos por correo.
      </p>
    </div>
  );
}
