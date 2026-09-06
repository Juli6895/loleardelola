import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — LolearDeLola",
  description:
    "Qué datos recoge LolearDeLola vía Pinterest OAuth, con quién se comparten y los derechos de la usuaria.",
};

// Política de privacidad, servida en el mismo dominio de la app
// (loleardelola.vercel.app/privacy) — Pinterest exige que el enlace de
// privacidad viva en un dominio de la empresa, no en un repo de GitHub.
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
          Vigente desde el 6 de septiembre de 2026 · Aplica a la app web y a
          la integración con Pinterest API v5
        </p>

        <p className="mt-6 text-noche/80">
          LolearDeLola conecta tu cuenta de Pinterest con Google Shopping para
          ayudarte a encontrar dónde comprar prendas similares a las que
          guardas en tus tableros. Este documento explica qué datos
          recogemos, para qué los usamos y cómo los protegemos.
        </p>

        <h2 className="mt-10 font-display text-xl text-rosa-600">
          1. Qué datos recogemos
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rosa-100 text-left text-xs uppercase tracking-wide text-noche/40">
                <th className="py-2 pr-4 font-medium">Dato</th>
                <th className="py-2 pr-4 font-medium">Origen</th>
                <th className="py-2 font-medium">Para qué se usa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rosa-50">
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Nombre, correo, foto de perfil
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Login con Pinterest (OAuth)
                </td>
                <td className="py-2.5 text-noche/70">
                  Identificar tu cuenta dentro de la app
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Tableros y pines públicos
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Pinterest API v5
                </td>
                <td className="py-2.5 text-noche/70">
                  Mostrar tus tableros para elegir una inspiración
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Imagen del outfit o prenda
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Subida por ti, pin seleccionado, o foto de tu clóset
                </td>
                <td className="py-2.5 text-noche/70">
                  Analizar prendas, color y estilo
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Prendas y etiquetas detectadas
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Generado por Claude
                </td>
                <td className="py-2.5 text-noche/70">
                  Armar los términos de búsqueda en Shopping y tu clóset
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-noche">
                  Outfits y prendas guardadas
                </td>
                <td className="py-2.5 pr-4 text-noche/70">
                  Acción &ldquo;Guardar outfit&rdquo; y tu clóset
                </td>
                <td className="py-2.5 text-noche/70">
                  Mostrarlas en tus secciones Mis Outfits y Mi Clóset
                </td>
              </tr>
            </tbody>
          </table>
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
            <strong>Anthropic (Claude)</strong> recibe la imagen de la prenda
            u outfit para identificar prendas, color y estilo.
          </li>
          <li>
            <strong>Google Cloud Vision</strong> recibe la misma imagen solo
            si Claude no está disponible.
          </li>
          <li>
            <strong>Google Shopping</strong> recibe los términos de búsqueda
            generados (nunca tu imagen ni tu identidad).
          </li>
          <li>
            <strong>Cloudinary</strong> almacena las imágenes que subes
            directamente a la app.
          </li>
          <li>
            <strong>Supabase</strong> aloja la base de datos de usuarios,
            outfits guardados, clóset e historial de búsquedas.
          </li>
        </ul>

        <div className="mt-6 rounded-2xl border border-rosa-100 bg-rosa-50/60 p-5 text-sm text-noche/80">
          <strong className="text-rosa-600">
            Alcance del acceso a Pinterest:
          </strong>{" "}
          solicitamos únicamente los permisos{" "}
          <code className="rounded bg-white px-1.5 py-0.5">
            user_accounts:read
          </code>
          ,{" "}
          <code className="rounded bg-white px-1.5 py-0.5">
            boards:read
          </code>{" "}
          y{" "}
          <code className="rounded bg-white px-1.5 py-0.5">pins:read</code>.
          No publicamos, editamos ni eliminamos nada en tu cuenta de
          Pinterest.
        </div>

        <h2 className="mt-10 font-display text-xl text-rosa-600">
          3. Cuánto tiempo conservamos tus datos
        </h2>
        <p className="mt-3 text-noche/80">
          Los outfits guardados, las prendas de tu clóset y el historial de
          búsquedas permanecen en tu cuenta hasta que los elimines o cierres
          tu cuenta. Las imágenes analizadas que no guardas explícitamente no
          se conservan más allá del procesamiento de la solicitud.
        </p>

        <h2 className="mt-10 font-display text-xl text-rosa-600">
          4. Tus derechos
        </h2>
        <p className="mt-3 text-noche/80">
          Puedes en cualquier momento:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-noche/80 marker:text-rosa-400">
          <li>Pedir una copia de los datos asociados a tu cuenta.</li>
          <li>
            Eliminar outfits o prendas de tu clóset individualmente desde la
            app.
          </li>
          <li>
            Solicitar la eliminación completa de tu cuenta y datos
            asociados.
          </li>
          <li>
            Revocar el acceso de LolearDeLola desde la configuración de
            aplicaciones conectadas de tu cuenta de Pinterest.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-xl text-rosa-600">
          5. Seguridad
        </h2>
        <p className="mt-3 text-sm text-noche/60">
          Las credenciales de Pinterest se manejan mediante OAuth 2.0 —
          LolearDeLola nunca ve ni almacena tu contraseña de Pinterest. Las
          claves de servicio (Supabase, Anthropic, Cloudinary) se mantienen
          únicamente en el servidor y no se exponen al navegador.
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
