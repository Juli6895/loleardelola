import Link from "next/link";

// Sección hero de la landing — en español colombiano. Corta a propósito:
// lo que explica la app son los cuatro servicios que van debajo
// (components/Servicios.tsx).
export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rosa-100 via-white to-rosa-200 px-6 py-14 shadow-suave sm:px-12 sm:py-20">
      {/* Decoración */}
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-rosa-300 opacity-30 blur-3xl" />
      <div className="absolute -bottom-16 -left-20 h-60 w-60 rounded-full bg-rosa-400 opacity-20 blur-3xl" />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="mb-4 inline-block rounded-full border border-rosa-300 bg-white/70 px-4 py-1 text-xs font-medium tracking-wide text-rosa-700">
          Moda + IA + Colombia 🇨🇴
        </p>
        <h1 className="font-display text-4xl leading-tight text-noche sm:text-5xl md:text-6xl">
          Encuentra{" "}
          <span className="italic text-rosa-500">ese outfit que te robó el corazón</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-noche/70 sm:text-lg">
          Te decimos dónde comprarlo, cómo combinar lo que ya tienes y qué te favorece a ti.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/buscar"
            className="w-full rounded-full bg-noche px-6 py-3 text-sm font-medium text-white transition hover:bg-rosa-500 sm:w-auto"
          >
            Empezar a lolear
          </Link>
          <Link
            href="/mi-closet"
            className="w-full rounded-full border border-noche/20 bg-white px-6 py-3 text-sm font-medium text-noche transition hover:border-rosa-400 hover:text-rosa-500 sm:w-auto"
          >
            Armar mi clóset
          </Link>
        </div>

        <p className="mt-4 text-xs text-noche/50">Empieza gratis, sin registrarte.</p>
      </div>
    </section>
  );
}
