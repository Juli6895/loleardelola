import Link from "next/link";
import { PRECIOS, TOPES } from "@/lib/planes";

// Página de la membresía. El botón de pago todavía no está conectado:
// falta decidir el plan de precios frente a las comisiones (ver la
// conversación sobre Bold/Wompi) y cargar las llaves de Bold.
//
// Se publica igual, sin botón, porque sirve desde ya para explicar qué
// da la membresía cuando alguien se topa con un límite.

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");

export default function MembresiaPage() {
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-rosa-100 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-noche/50">
            Mensual
          </p>
          <p className="mt-2 font-display text-3xl text-noche">
            {pesos(PRECIOS.mensual)}
          </p>
          <p className="mt-1 text-xs text-noche/50">al mes</p>
        </div>
        <div className="rounded-2xl border border-rosa-300 bg-rosa-50/50 p-6 text-center shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-rosa-500">
            Anual
          </p>
          <p className="mt-2 font-display text-3xl text-noche">
            {pesos(PRECIOS.anual)}
          </p>
          <p className="mt-1 text-xs text-noche/50">al año</p>
        </div>
      </div>

      <div className="rounded-2xl border border-rosa-100 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-noche">
          El pago todavía no está habilitado
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-noche/60">
          Estamos terminando de conectarlo. Mientras tanto, crea tu cuenta
          gratis: así no pierdes tu clóset ni tus outfits, y te avisamos
          apenas la membresía esté lista.
        </p>
        <Link
          href="/entrar?volver=/membresia"
          className="mt-4 inline-block rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
        >
          Crear mi cuenta gratis
        </Link>
      </div>
    </div>
  );
}
