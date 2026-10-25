import type { Metadata } from "next";
import Link from "next/link";
import AnotarVista from "@/components/AnotarVista";
import { PAQUETES_BUSQUEDAS, PRECIOS, PRECIOS_NORMALES, TOPES, TOPES_MES_MEMBRESIA } from "@/lib/planes";

// Preguntas frecuentes, para todas las usuarias (en la página y en la
// app instalada, que es la misma página). Los precios y los límites
// salen de lib/planes.ts: si cambian allá, cambian acá solos.

export const metadata: Metadata = {
  title: "Preguntas frecuentes — LoleardLola",
  description: "Qué ofrece LoleardLola, si es gratis, cómo te inscribes, la membresía, la app y más.",
};

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");
const CORREO = "contacto@lakaja.co";

type Pregunta = { p: string; r: React.ReactNode };

const GRUPOS: Array<{ titulo: string; preguntas: Pregunta[] }> = [
  {
    titulo: "Sobre LoleardLola",
    preguntas: [
      {
        p: "¿Qué ofrece LoleardLola?",
        r: (
          <>
            <p>Es tu asesora de moda en el celular. Te ayuda en cuatro cosas:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                <strong>Encontrar dónde comprar un outfit:</strong> subes una foto o un pin de Pinterest,
                detectamos cada prenda y te mostramos tiendas donde la venden, con foto y precio.
              </li>
              <li>
                <strong>Combinar lo que ya tienes:</strong> subes las prendas de tu clóset y te armamos
                outfits con ellas.
              </li>
              <li>
                <strong>Tu manual de estilo:</strong> tu morfología, tu paleta de colores, tu estilo, cómo
                combinar tus prendas favoritas y los básicos de tu armario (membresía).
              </li>
              <li>
                <strong>Promociones:</strong> las rebajas de los comercios en un solo lugar, y un aviso al
                celular cuando baja de precio lo que te gustó (membresía).
              </li>
            </ol>
          </>
        ),
      },
      {
        p: "¿LoleardLola vende la ropa?",
        r: (
          <p>
            No. Te mostramos dónde está la prenda y, al dar clic, vas directo a la página o al Instagram de
            cada comercio. Allá ves tallas y disponibilidad, y la compra, el pago y el envío los haces con
            ellos. Nosotros no cobramos nada por las prendas.
          </p>
        ),
      },
      {
        p: "¿En qué tiendas buscan?",
        r: (
          <p>
            En tiendas que venden en Colombia: marcas con tienda en línea de las que tenemos el catálogo (por
            ejemplo Especia, Bybla, Navissi, Gracies, Esprit o Color Blue), tiendas en Instagram, y una
            búsqueda en Google Imágenes filtrada a comercios colombianos.
          </p>
        ),
      },
    ],
  },
  {
    titulo: "Precios y cuenta",
    preguntas: [
      {
        p: "¿Es gratis?",
        r: (
          <>
            <p>Puedes probarla gratis:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Sin cuenta:</strong> {TOPES.anonimo.busquedas} búsquedas de outfit,{" "}
                {TOPES.anonimo.prendasCloset} prenda en tu clóset y {TOPES.anonimo.combinacionesClosetGratis}{" "}
                combinación.
              </li>
              <li>
                <strong>Con cuenta gratis:</strong> {TOPES.gratis.busquedas} búsquedas,{" "}
                {TOPES.gratis.outfits} outfits guardados, {TOPES.gratis.prendasCloset} prendas y{" "}
                {TOPES.gratis.combinacionesClosetGratis} combinaciones.
              </li>
            </ul>
            <p className="mt-2">
              Para usarla sin esos límites, el manual de estilo y los avisos de rebaja está la{" "}
              <Link href="/membresia" className="font-medium text-rosa-600 underline">
                membresía
              </Link>
              .
            </p>
          </>
        ),
      },
      {
        p: "¿Cómo me inscribo?",
        r: (
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Toca <strong>Entrar</strong>, arriba a la derecha (en el celular, en el menú ☰).
            </li>
            <li>Escribe tu correo. Te llega un código de 6 números.</li>
            <li>Escribe el código y listo: no necesitas contraseña.</li>
          </ol>
        ),
      },
      {
        p: "¿Qué incluye la membresía y cuánto cuesta?",
        r: (
          <>
            <p>
              Con el precio de lanzamiento cuesta <strong>{pesos(PRECIOS.mensual)} al mes</strong> o{" "}
              <strong>{pesos(PRECIOS.anual)} al año</strong> (sale a {pesos(Math.round(PRECIOS.anual / 12))}{" "}
              al mes). El precio normal será de {pesos(PRECIOS_NORMALES.mensual)} al mes y{" "}
              {pesos(PRECIOS_NORMALES.anual)} al año. Cada mes incluye:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{TOPES_MES_MEMBRESIA.busquedas} búsquedas de outfit.</li>
              <li>
                {TOPES_MES_MEMBRESIA.prendasCloset} prendas nuevas en tu clóset y{" "}
                {TOPES_MES_MEMBRESIA.combinaciones} combinaciones.
              </li>
              <li>Outfits guardados sin tope.</li>
              <li>Tu manual de estilo completo, para descargar ({TOPES_MES_MEMBRESIA.manuales} nuevo al mes).</li>
              <li>Avisos al celular cuando baja de precio lo que te gustó.</li>
            </ul>
            <p className="mt-2">Los límites se renuevan el 1 de cada mes.</p>
          </>
        ),
      },
      {
        p: "¿Qué pasa si se me acaban las búsquedas del mes?",
        r: (
          <p>
            Puedes comprar un paquete de{" "}
            <strong>
              {PAQUETES_BUSQUEDAS.paquete30.busquedas} búsquedas adicionales por{" "}
              {pesos(PAQUETES_BUSQUEDAS.paquete30.precio)}
            </strong>{" "}
            en{" "}
            <Link href="/membresia#paquetes" className="font-medium text-rosa-600 underline">
              Membresía
            </Link>
            . Se usan cuando ya gastaste las de tu mes y no se vencen: lo que no uses queda para los meses
            siguientes. Los paquetes son para quienes tienen la membresía.
          </p>
        ),
      },
      {
        p: "¿Cómo pago?",
        r: (
          <p>
            Desde{" "}
            <Link href="/membresia" className="font-medium text-rosa-600 underline">
              Membresía
            </Link>
            , con tarjeta o PSE. El pago lo procesa Bold, una plataforma de pagos colombiana: nosotros nunca
            vemos los datos de tu tarjeta.
          </p>
        ),
      },
      {
        p: "¿La membresía se renueva sola?",
        r: (
          <p>
            No. Pagas un mes o un año y ya: no hay cobros automáticos. Cuando se acerque la fecha de
            vencimiento, decides si la renuevas. Si pagas antes de que se venza, los días se suman a los que te
            quedan.
          </p>
        ),
      },
    ],
  },
  {
    titulo: "Cómo se usa",
    preguntas: [
      {
        p: "¿Cómo busco un outfit?",
        r: (
          <p>
            En{" "}
            <Link href="/buscar" className="font-medium text-rosa-600 underline">
              Buscar
            </Link>
            , pega el link de un pin de Pinterest o sube una foto. Te mostramos cada prenda que detectamos (en
            negrilla) y, debajo, prendas parecidas en tiendas y las tiendas donde vale la pena mirar.
          </p>
        ),
      },
      {
        p: "¿Cómo funciona Mi clóset?",
        r: (
          <p>
            Sube fotos de las prendas que ya tienes. Las clasificamos solas y, con "Buscar combinaciones", te
            armamos un outfit alrededor de esa prenda según lo que quieres proyectar, con prendas de tiendas
            que le suman.
          </p>
        ),
      },
      {
        p: "¿Qué es el manual de estilo?",
        r: (
          <p>
            Un documento hecho para ti con tu morfología, tu colorimetría, tu estilo, outfits para momentos
            específicos, cómo combinar tus prendas favoritas y tu fondo de armario. Para armarlo necesitamos
            que llenes{" "}
            <Link href="/mi-perfil" className="font-medium text-rosa-600 underline">
              Mi perfil
            </Link>
            . Lo puedes descargar para verlo sin internet o compartirlo.
          </p>
        ),
      },
      {
        p: "¿Para qué es la campanita?",
        r: (
          <p>
            Tócala en una prenda de tienda que te guste y, si baja de precio 10% o más, te llega una
            notificación al celular. Es parte de la membresía. La primera vez el celular te pregunta si
            LoleardLola puede enviarte notificaciones: dale Permitir. Las prendas que sigues están en Mis
            outfits.
          </p>
        ),
      },
    ],
  },
  {
    titulo: "La app",
    preguntas: [
      {
        p: "¿Cómo instalo la app en iPhone?",
        r: (
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Abre <strong>Safari</strong> y entra a loleardelola.vercel.app.
            </li>
            <li>
              Toca <strong>Compartir</strong> (el cuadrito con una flecha hacia arriba, abajo en el centro).
            </li>
            <li>
              Toca <strong>Agregar a pantalla de inicio</strong> y luego <strong>Agregar</strong>.
            </li>
            <li>Ábrela desde el ícono rosado con la L y entra con tu correo.</li>
          </ol>
        ),
      },
      {
        p: "¿Cómo instalo la app en Android?",
        r: (
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Abre <strong>Chrome</strong> y entra a loleardelola.vercel.app.
            </li>
            <li>
              Toca <strong>Instalar</strong> en el aviso que aparece abajo. Si no sale, toca los tres puntos
              (⋮) arriba a la derecha y luego <strong>Instalar app</strong>.
            </li>
            <li>Ábrela desde el ícono y entra con tu correo.</li>
          </ol>
        ),
      },
      {
        p: "No me sale la opción de instalar",
        r: (
          <p>
            Casi siempre es porque abriste el enlace desde Instagram o WhatsApp, que usan su propio navegador.
            Ábrelo en Safari (iPhone) o Chrome (Android): en Instagram, toca los tres puntos arriba a la
            derecha y luego "Abrir en el navegador".
          </p>
        ),
      },
      {
        p: "Instalé la app y no veo mis cosas",
        r: (
          <p>
            La app no siempre comparte la sesión con el navegador. Entra con tu correo una vez dentro de la
            app y aparecen tu clóset, tu perfil y tu membresía.
          </p>
        ),
      },
    ],
  },
  {
    titulo: "Privacidad y ayuda",
    preguntas: [
      {
        p: "¿Qué hacen con mis fotos y mis datos?",
        r: (
          <p>
            Usamos tus fotos solo para detectar las prendas y guardar tu clóset, y tus medidas solo para tu
            asesoría. No vendemos tus datos. Todo el detalle está en la{" "}
            <Link href="/privacy" className="font-medium text-rosa-600 underline">
              política de privacidad
            </Link>
            .
          </p>
        ),
      },
      {
        p: "¿Cómo me comunico con LoleardLola?",
        r: (
          <p>
            Escríbenos a{" "}
            <a href={`mailto:${CORREO}`} className="font-medium text-rosa-600 underline">
              {CORREO}
            </a>
            . Te respondemos lo antes posible.
          </p>
        ),
      },
    ],
  },
];

export default function PreguntasPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <AnotarVista nombre="preguntas_visto" />
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-rosa-500">Ayuda</p>
        <h1 className="mt-2 font-display text-4xl text-noche sm:text-5xl">Preguntas frecuentes</h1>
        <p className="mt-3 text-noche/60">Todo lo que te preguntas sobre LoleardLola. Toca una pregunta para ver la respuesta.</p>
      </header>

      {GRUPOS.map((g) => (
        <section key={g.titulo}>
          <h2 className="mb-3 font-display text-2xl text-noche">{g.titulo}</h2>
          <div className="divide-y divide-rosa-100 overflow-hidden rounded-2xl border border-rosa-100 bg-white shadow-sm">
            {g.preguntas.map((q) => (
              <details key={q.p} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-noche marker:hidden">
                  {q.p}
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rosa-50 text-rosa-600 transition group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <div className="mt-3 text-sm leading-relaxed text-noche/70">{q.r}</div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="rounded-2xl bg-rosa-50/70 p-6 text-center">
        <p className="font-display text-xl text-noche">¿No encontraste tu respuesta?</p>
        <p className="mt-1 text-sm text-noche/60">
          Escríbenos a{" "}
          <a href={`mailto:${CORREO}`} className="font-medium text-rosa-600 underline">
            {CORREO}
          </a>
        </p>
      </div>
    </div>
  );
}
