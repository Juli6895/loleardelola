import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — LoleardLola",
  description:
    "Qué datos recoge LoleardLola, con quién se comparten, cuánto se guardan y los derechos de la usuaria.",
};

// Política de privacidad, servida en el mismo dominio de la app.
//
// ⚠️ ESTE ES UN BORRADOR TÉCNICO, NO UN DOCUMENTO LEGAL CERRADO.
// Lo escribí describiendo con precisión lo que el código de la app
// realmente hace hoy — no es una certificación de cumplimiento con la
// Ley 1581 de 2012 (Habeas Data) ni con ninguna otra norma. Antes de
// tratarlo como definitivo, alguien con experiencia legal en protección
// de datos en Colombia debería revisarlo — sobre todo porque la app ya
// procesa pagos reales y guarda datos como tono de piel, que la ley
// colombiana podría tratar como dato sensible por su cercanía al origen
// étnico/racial.
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl border border-rosa-100 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-xs font-medium uppercase tracking-widest text-rosa-500">
          Documento legal
        </p>
        <h1 className="mt-3 font-display text-3xl text-noche sm:text-4xl">
          Política de Privacidad
        </h1>
        <p className="mt-2 text-sm text-noche/50">
          Última actualización: 24 de septiembre de 2026
        </p>

        <p className="mt-6 text-noche/80">
          LoleardLola analiza fotos de outfits para ayudarte a encontrar dónde
          comprar prendas parecidas, y arma una asesoría de imagen a partir de
          tu silueta, tu color y tu estilo. Este documento explica qué datos
          recogemos, para qué los usamos, con quién los compartimos y qué
          puedes hacer al respecto.
        </p>

        <h2 className="mt-10 font-display text-xl text-rosa-600">
          1. Qué datos recogemos
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rosa-100 text-left text-xs uppercase tracking-wide text-noche/40">
                <th className="py-2 pr-4 font-medium">Dato</th>
                <th className="py-2 pr-4 font-medium">Cuándo lo pedimos</th>
                <th className="py-2 font-medium">Para qué se usa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rosa-50">
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">Correo</td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Al crear tu cuenta
                </td>
                <td className="py-2.5 text-noche/70">
                  Identificar tu cuenta y mandarte el código para entrar. No
                  usamos contraseña: el código se guarda cifrado, nunca en
                  texto plano.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Foto del outfit o prenda
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Al buscar o subir algo al clóset
                </td>
                <td className="py-2.5 text-noche/70">
                  Identificar las prendas, su color y su estilo, para armar la
                  búsqueda y clasificarlas en tu clóset.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Medidas (busto, cintura, cadera, estatura)
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Si completas Mi perfil
                </td>
                <td className="py-2.5 text-noche/70">
                  Calcular tu silueta y la asesoría de figura. Es opcional:
                  sin esto, esa parte del perfil simplemente no se calcula.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Tono de piel, color y largo de cabello
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Si completas Mi perfil
                </td>
                <td className="py-2.5 text-noche/70">
                  Sugerirte qué colores te favorecen. Nunca se usa para
                  identificarte ni se comparte fuera de tu cuenta — ver la
                  nota de la sección 2.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Personalidad de estilo y qué quieres proyectar
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Si completas Mi perfil
                </td>
                <td className="py-2.5 text-noche/70">
                  Ubicarte en un arquetipo de estilo para tu manual y las
                  sugerencias de outfit.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Outfits, prendas del clóset y búsquedas
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Uso normal de la app
                </td>
                <td className="py-2.5 text-noche/70">
                  Mostrarlas en Mis Outfits y Mi Clóset, y contar cuántas
                  llevas usadas frente al límite de tu plan.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Pago de la membresía
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Al pagar
                </td>
                <td className="py-2.5 text-noche/70">
                  Activar tu membresía. El pago lo procesa Bold — nosotros
                  nunca vemos ni guardamos el número de tu tarjeta, solo el
                  monto y si Bold confirmó que se pagó.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Uso de la app (qué pantallas ves, si tocaste un botón)
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Todo el tiempo
                </td>
                <td className="py-2.5 text-noche/70">
                  Entender dónde la gente tiene dificultades para mejorar la
                  app. No incluye tus medidas, tu correo ni el contenido de
                  tus búsquedas — solo qué acción ocurrió y cuándo.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-2xl border border-rosa-200 bg-rosa-50/70 p-5 text-sm text-noche/80">
          <strong className="text-rosa-600">Sobre el tono de piel:</strong> lo
          preguntamos únicamente para sugerirte colores que te favorezcan.
          Nunca se usa para identificarte, no se comparte con nadie fuera de
          tu cuenta, y siempre puedes dejarlo en blanco sin perder acceso al
          resto de la app.
        </div>

        <h2 className="mt-10 font-display text-xl text-rosa-600">
          2. Con quién se comparte
        </h2>
        <p className="mt-3 text-noche/80">
          No vendemos tus datos. Se comparten fragmentos puntuales con estos
          proveedores, únicamente para que la función correspondiente opere:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-noche/80 marker:text-rosa-400">
          <li>
            <strong>Anthropic (Claude)</strong> recibe la foto de la prenda o
            outfit, y tu perfil de estilo si generas tu manual, para poder
            analizarlos. No los usa para entrenar sus modelos.
          </li>
          <li>
            <strong>Google Cloud Vision</strong> recibe la misma foto solo si
            Claude no está disponible en ese momento.
          </li>
          <li>
            <strong>Google</strong> recibe los términos de búsqueda que arma
            la IA (por ejemplo &ldquo;vestido midi rojo mujer&rdquo;) — nunca
            tu foto ni tu identidad.
          </li>
          <li>
            <strong>Cloudinary</strong> almacena las fotos que subes a la app.
          </li>
          <li>
            <strong>Resend</strong> envía el correo con tu código para entrar.
          </li>
          <li>
            <strong>Bold</strong> procesa el pago de tu membresía. Ve tus
            datos de pago directamente — nosotros no.
          </li>
          <li>
            <strong>Supabase</strong> aloja toda la base de datos: tu cuenta,
            tu perfil, tu clóset y tu historial.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-xl text-rosa-600">
          3. Cuánto tiempo conservamos tus datos
        </h2>
        <p className="mt-3 text-noche/80">
          Tu perfil, tu clóset, tus outfits y tu historial permanecen en tu
          cuenta hasta que los elimines o cierres tu cuenta. Las fotos que
          analizas sin guardar no se conservan más allá de procesar esa
          búsqueda. Los registros de pago se conservan el tiempo que exige la
          normativa tributaria colombiana, aunque cierres tu cuenta.
        </p>

        <h2 className="mt-10 font-display text-xl text-rosa-600">
          4. Tus derechos
        </h2>
        <p className="mt-3 text-noche/80">
          Como titular de tus datos personales en Colombia, puedes en
          cualquier momento:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-noche/80 marker:text-rosa-400">
          <li>Conocer, actualizar y rectificar tus datos.</li>
          <li>Pedir una copia de los datos asociados a tu cuenta.</li>
          <li>
            Eliminar outfits o prendas de tu clóset individualmente desde la
            app.
          </li>
          <li>
            Solicitar la eliminación completa de tu cuenta y tus datos.
          </li>
          <li>
            Revocar tu consentimiento sobre alguno de estos usos, escribiendo
            al correo de abajo.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-xl text-rosa-600">
          5. Seguridad
        </h2>
        <p className="mt-3 text-sm text-noche/60">
          No usamos contraseñas: el código para entrar y el token de tu
          sesión se guardan cifrados, nunca en texto plano. Las llaves de
          nuestros proveedores (Supabase, Anthropic, Cloudinary, Resend,
          Bold) se mantienen únicamente en el servidor y no se exponen al
          navegador.
        </p>

        <div className="mt-10 flex flex-col gap-1 border-t border-rosa-100 pt-6 text-sm">
          <span className="text-noche/50">
            Contacto para temas de privacidad
          </span>
          <a
            href="mailto:contacto@lakaja.co"
            className="font-medium text-rosa-600 hover:underline"
          >
            contacto@lakaja.co
          </a>
        </div>
      </div>
    </div>
  );
}
