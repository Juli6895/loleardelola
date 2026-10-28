import type { Metadata } from "next";
import Link from "next/link";
import {
  DIAS_PRUEBA_PROMOS,
  PAQUETES_BUSQUEDAS,
  PRECIOS,
  PRECIOS_NORMALES,
  TOPES,
  TOPES_MES_MEMBRESIA,
} from "@/lib/planes";

export const metadata: Metadata = {
  title: "Términos y condiciones — LoleardLola",
  description:
    "Las reglas de uso de LoleardLola: tu cuenta, los planes y sus límites, la membresía, las promociones, los avisos de rebaja y Mis marcas favoritas.",
};

// Términos y condiciones, en el mismo dominio de la app. Los precios y
// los límites salen de lib/planes.ts: si cambian allá, cambian acá.
//
// ⚠️ ESTE ES UN BORRADOR, NO UN DOCUMENTO LEGAL CERRADO. Describe con
// precisión lo que la app hace hoy, pero alguien con experiencia legal
// en Colombia (Estatuto del Consumidor, Ley 1480 de 2011, y comercio
// electrónico) debería revisarlo antes de tratarlo como definitivo —
// sobre todo lo de pagos y devoluciones.

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");
const CORREO = "contacto@lakaja.co";
const cuantas = (n: number | null, una: string, varias: string) =>
  n === null ? "Sin tope" : n === 0 ? "No incluye" : `${n} ${n === 1 ? una : varias}`;

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 font-display text-xl text-rosa-600">{children}</h2>;
}

function Lista({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 list-disc space-y-2 pl-5 text-noche/80 marker:text-rosa-400">{children}</ul>;
}

export default function TerminosPage() {
  const paquete = PAQUETES_BUSQUEDAS.paquete30;
  const filas: Array<[string, string, string, string]> = [
    [
      "Búsquedas de outfit",
      cuantas(TOPES.anonimo.busquedas, "búsqueda", "búsquedas"),
      cuantas(TOPES.gratis.busquedas, "búsqueda", "búsquedas"),
      `${TOPES_MES_MEMBRESIA.busquedas} al mes`,
    ],
    [
      "Outfits guardados",
      cuantas(TOPES.anonimo.outfits, "outfit", "outfits"),
      cuantas(TOPES.gratis.outfits, "outfit", "outfits"),
      "Sin tope",
    ],
    [
      "Prendas en tu clóset",
      cuantas(TOPES.anonimo.prendasCloset, "prenda", "prendas"),
      cuantas(TOPES.gratis.prendasCloset, "prenda", "prendas"),
      `${TOPES_MES_MEMBRESIA.prendasCloset} nuevas al mes`,
    ],
    [
      "Combinaciones de tu clóset",
      cuantas(TOPES.anonimo.combinacionesClosetGratis, "combinación", "combinaciones"),
      cuantas(TOPES.gratis.combinacionesClosetGratis, "combinación", "combinaciones"),
      `${TOPES_MES_MEMBRESIA.combinaciones} al mes`,
    ],
    ["Manual de estilo", "No incluye", "No incluye", `${TOPES_MES_MEMBRESIA.manuales} al mes`],
    [
      "Promociones de todas las tiendas",
      `${DIAS_PRUEBA_PROMOS.anonimo} día`,
      `${DIAS_PRUEBA_PROMOS.gratis} días`,
      "Siempre",
    ],
    ["Mis marcas favoritas", "Sí", "Sí", "Sí"],
    ["Me gusta (corazón) con aviso de rebaja", "No incluye", "No incluye", "Sí"],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl border border-rosa-100 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-xs font-medium uppercase tracking-widest text-rosa-500">Documento legal</p>
        <h1 className="mt-3 font-display text-3xl text-noche sm:text-4xl">Términos y condiciones</h1>
        <p className="mt-2 text-sm text-noche/50">Última actualización: 28 de octubre de 2026</p>

        <p className="mt-6 text-noche/80">
          Estas son las reglas para usar LoleardLola, en la página y en la app. Al crear tu cuenta las aceptas,
          junto con la{" "}
          <Link href="/privacy" className="font-medium text-rosa-600 underline">
            política de privacidad
          </Link>
          , que explica qué datos guardamos y para qué.
        </p>

        <Titulo>1. Qué es LoleardLola</Titulo>
        <p className="mt-3 text-noche/80">
          Es una asesoría de moda: te ayuda a encontrar dónde venden un outfit que te gustó, a combinar las prendas
          de tu clóset, a armar tu manual de estilo y a ver las rebajas de las tiendas en un solo lugar.
        </p>
        <Lista>
          <li>
            <strong>LoleardLola no vende ropa.</strong> Al dar clic en una prenda vas a la página o al Instagram de
            cada tienda. La compra, el pago, las tallas, el envío, los cambios y las garantías son con esa tienda.
          </li>
          <li>
            Los precios, las fotos y la disponibilidad son los que publica cada tienda, y pueden cambiar en
            cualquier momento. El precio que vale es el que ves en la tienda al comprar.
          </li>
          <li>
            Las búsquedas por foto, las combinaciones y el manual los arma una inteligencia artificial. Son
            sugerencias: pueden no ser exactas.
          </li>
        </Lista>

        <Titulo>2. Tu cuenta</Titulo>
        <Lista>
          <li>
            Entras con tu correo: te llega un código de 6 números y no hay contraseña. Cuida el acceso a tu correo,
            porque quien lo tenga puede entrar a tu cuenta.
          </li>
          <li>
            Al crear tu cuenta te pedimos tu celular. No te mandamos códigos por mensaje: lo usamos para
            contactarte sobre tu cuenta y tu membresía.
          </li>
          <li>Usa tu correo de siempre: no aceptamos correos temporales (de los que duran unos minutos).</li>
          <li>
            La prueba gratis es una por celular o computador. Crear varias cuentas o borrar los datos del navegador
            para repetirla va en contra de estas reglas.
          </li>
          <li>
            Podemos suspender una cuenta que abuse del servicio (ver el punto 8). Tú puedes pedir que borremos tu
            cuenta cuando quieras, escribiendo a {CORREO}.
          </li>
        </Lista>

        <Titulo>3. Planes y límites</Titulo>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-rosa-100 text-left text-noche/50">
                <th className="py-2 pr-4 font-medium">Qué</th>
                <th className="py-2 pr-4 font-medium">Sin cuenta</th>
                <th className="py-2 pr-4 font-medium">Cuenta gratis</th>
                <th className="py-2 font-medium">Membresía</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rosa-50">
              {filas.map(([que, sin, gratis, membresia]) => (
                <tr key={que}>
                  <td className="py-2.5 pr-4 font-medium text-noche">{que}</td>
                  <td className="py-2.5 pr-4 text-noche/70">{sin}</td>
                  <td className="py-2.5 pr-4 text-noche/70">{gratis}</td>
                  <td className="py-2.5 text-noche/70">{membresia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-noche/60">
          Sin membresía, los límites no se renuevan cada mes. Los de la membresía se renuevan el 1 de cada mes, y
          lo que no uses en un mes no se acumula para el siguiente.
        </p>

        <Titulo>4. Membresía y pagos</Titulo>
        <Lista>
          <li>
            Con el precio de lanzamiento, la membresía cuesta {pesos(PRECIOS.mensual)} al mes o{" "}
            {pesos(PRECIOS.anual)} al año. El precio normal será de {pesos(PRECIOS_NORMALES.mensual)} al mes y{" "}
            {pesos(PRECIOS_NORMALES.anual)} al año. Un cambio de precio no afecta lo que ya pagaste.
          </li>
          <li>
            Para pagar tienes que entrar con tu correo: así la membresía queda en tu cuenta y se activa sola. El
            pago lo procesa Bold con tarjeta o PSE. LoleardLola nunca ve los datos de tu tarjeta.
          </li>
          <li>
            <strong>No se renueva sola:</strong> pagas un mes o un año y ya, sin cobros automáticos. Si pagas antes
            de que se venza, los días se suman a los que te quedan.
          </li>
          <li>
            Con la membresía puedes comprar búsquedas adicionales: {paquete.busquedas} por {pesos(paquete.precio)}.
            No vencen y se usan cuando se te acaban las del mes.
          </li>
          <li>
            Si tienes un problema con un pago, o quieres retractarte de una compra, escríbenos a {CORREO}. Lo
            atendemos según el Estatuto del Consumidor (Ley 1480 de 2011).
          </li>
        </Lista>

        <Titulo>5. Promociones</Titulo>
        <Lista>
          <li>
            Cada día revisamos el catálogo de las tiendas y mostramos las prendas con más del 10% de descuento que
            tienen alguna talla disponible. El precio es el de la talla disponible más económica, y al dar clic la
            tienda abre esa talla.
          </li>
          <li>
            Como se revisan una vez al día, una promoción puede haberse acabado o una talla agotado cuando entres a
            la tienda. LoleardLola no maneja las promociones: son de cada tienda.
          </li>
          <li>
            Sin cuenta las ves {DIAS_PRUEBA_PROMOS.anonimo} día desde la primera vez que entras; con cuenta gratis,{" "}
            {DIAS_PRUEBA_PROMOS.gratis} días desde que la creas; con la membresía, siempre.
          </li>
        </Lista>

        <Titulo>6. El corazón y los avisos de rebaja</Titulo>
        <Lista>
          <li>
            Con la membresía, al tocar el corazón de una prenda te avisamos con una notificación en tu app si su
            precio baja 10% o más desde que la marcaste. No es un mensaje de texto ni de WhatsApp.
          </li>
          <li>
            Para recibirla tienes que darle permiso a LoleardLola de enviarte notificaciones. En iPhone solo llegan
            con la app instalada en la pantalla de inicio.
          </li>
          <li>
            Revisamos los precios una vez al día. Hacemos lo posible para que el aviso llegue, pero no podemos
            garantizarlo: depende de tu celular, de su conexión y de que la tienda siga publicando la prenda.
          </li>
        </Lista>

        <Titulo>7. Mis marcas favoritas</Titulo>
        <p className="mt-3 text-noche/80">
          En el menú puedes escoger las marcas que te gustan. Si escoges alguna, solo te mostramos promociones de
          esas marcas; cuando buscas un outfit siguen apareciendo todas las tiendas. Si no escoges ninguna, ves
          las promociones de todas. Tu selección se guarda en ese celular o computador, no en tu cuenta.
        </p>

        <Titulo>8. Lo que no se permite</Titulo>
        <Lista>
          <li>Usar programas o robots para hacer búsquedas, crear cuentas o copiar la información de la app.</li>
          <li>Crear varias cuentas para repetir las pruebas gratis o saltarse los límites.</li>
          <li>Subir fotos de otras personas sin su permiso, o contenido ilegal u ofensivo.</li>
          <li>Intentar entrar a cuentas ajenas o afectar el funcionamiento del servicio.</li>
        </Lista>

        <Titulo>9. Tus fotos y nuestro contenido</Titulo>
        <p className="mt-3 text-noche/80">
          Las fotos que subes siguen siendo tuyas. Nos das permiso de procesarlas solo para darte el servicio
          (buscar las prendas, guardar tu clóset, armar tu manual). Las fotos y los nombres de los productos son de
          cada tienda. El diseño y los textos de LoleardLola son nuestros.
        </p>

        <Titulo>10. Responsabilidad</Titulo>
        <p className="mt-3 text-noche/80">
          Las recomendaciones de LoleardLola son orientativas. No respondemos por las compras que hagas en las
          tiendas, ni por cambios de precio, de disponibilidad o de condiciones que haga cada tienda. Hacemos lo
          posible para que la app funcione siempre, pero puede tener interrupciones o errores.
        </p>

        <Titulo>11. Cambios a estas reglas</Titulo>
        <p className="mt-3 text-noche/80">
          Podemos actualizar estos términos. La fecha de arriba dice cuándo fue el último cambio, y si es un cambio
          importante te lo contamos. Si sigues usando la app después de un cambio, lo aceptas.
        </p>

        <Titulo>12. Ley aplicable</Titulo>
        <p className="mt-3 text-noche/80">Estos términos se rigen por las leyes de la República de Colombia.</p>

        <div className="mt-10 flex flex-col gap-1 border-t border-rosa-100 pt-6 text-sm">
          <span className="text-noche/50">¿Preguntas sobre estos términos?</span>
          <a href={`mailto:${CORREO}`} className="font-medium text-rosa-600 hover:underline">
            {CORREO}
          </a>
          <Link href="/preguntas" className="mt-2 text-noche/60 underline underline-offset-2">
            Ver las preguntas frecuentes
          </Link>
        </div>
      </div>
    </div>
  );
}
