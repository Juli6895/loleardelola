import Hero from "@/components/Hero";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-16">
      <Hero />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-rosa-100 bg-white p-8 shadow-sm">
          <h2 className="font-display text-3xl text-noche">
            ¿Cómo funciona?
          </h2>
          <ol className="mt-6 space-y-4 text-sm text-noche/70">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rosa-500 text-xs font-bold text-white">
                1
              </span>
              Conecta tu cuenta de Pinterest (opcional, pero te permite guardar
              tus outfits favoritos).
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rosa-500 text-xs font-bold text-white">
                2
              </span>
              Pega el link de un pin o sube una foto con el look que te
              enamoró.
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rosa-500 text-xs font-bold text-white">
                3
              </span>
              Detectamos vestidos, jeans, botas, bolsos, etc. y te armamos
              búsquedas listas en Google Shopping.
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rosa-500 text-xs font-bold text-white">
                4
              </span>
              Guarda el outfit en tu perfil para volver después y compralo con
              calma.
            </li>
          </ol>
        </div>

        <div className="rounded-3xl bg-noche p-8 text-white shadow-suave">
          <h2 className="font-display text-3xl">Hecho para Colombia</h2>
          <p className="mt-4 text-sm text-white/70">
            Las búsquedas están configuradas para que te muestren tiendas
            disponibles en Colombia (gl=co). Así no pierdes tiempo viendo algo
            que no te llega.
          </p>
          <p className="mt-4 text-sm text-white/70">
            Mobile-first: LolearDeLola se ve bonito desde el celular, porque
            sabemos que ahí es donde chismoseas tus pines.
          </p>
          <Link
            href="/buscar"
            className="mt-6 inline-block rounded-full bg-rosa-400 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
          >
            Probarlo ahora
          </Link>
        </div>
      </section>
    </div>
  );
}
