"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

// Sección hero de la landing — en español colombiano
export default function Hero() {
  const { data: session } = useSession();

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rosa-100 via-white to-rosa-200 px-6 py-16 shadow-suave sm:px-12 sm:py-24">
      {/* Decoración */}
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-rosa-300 opacity-30 blur-3xl" />
      <div className="absolute -bottom-16 -left-20 h-60 w-60 rounded-full bg-rosa-400 opacity-20 blur-3xl" />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="mb-4 inline-block rounded-full border border-rosa-300 bg-white/70 px-4 py-1 text-xs font-medium tracking-wide text-rosa-700">
          Moda + Pinterest + Colombia 🇨🇴
        </p>
        <h1 className="font-display text-4xl leading-tight text-noche sm:text-5xl md:text-6xl">
          Ese outfit que te robó el corazón en Pinterest,{" "}
          <span className="italic text-rosa-500">ya sabemos dónde lo consigues</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-noche/70 sm:text-lg">
          Pega el link de un pin o sube una foto, y te mostramos tiendas online
          donde puedes comprar prendas parecidas. Nada de adivinar: puro shopping
          con estilo.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {session ? (
            <Link
              href="/buscar"
              className="w-full rounded-full bg-noche px-6 py-3 text-sm font-medium text-white transition hover:bg-rosa-500 sm:w-auto"
            >
              Empezar a lolear
            </Link>
          ) : (
            <button
              onClick={() => signIn("pinterest")}
              className="w-full rounded-full bg-noche px-6 py-3 text-sm font-medium text-white transition hover:bg-rosa-500 sm:w-auto"
            >
              Conectar mi Pinterest
            </button>
          )}
          <Link
            href="/buscar"
            className="w-full rounded-full border border-noche/20 bg-white px-6 py-3 text-sm font-medium text-noche transition hover:border-rosa-400 hover:text-rosa-500 sm:w-auto"
          >
            Probar sin cuenta
          </Link>
        </div>

        <p className="mt-4 text-xs text-noche/50">
          Sin compromiso. Tus pins y tus outfits quedan guardados solo pa' ti.
        </p>
      </div>

      {/* Mini-features */}
      <div className="relative mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 text-left sm:grid-cols-3">
        {[
          {
            title: "Pega un pin",
            desc: "Copia el link de Pinterest y nosotros extraemos la imagen.",
          },
          {
            title: "Detectamos prendas",
            desc: "Con IA identificamos vestidos, jeans, botas y más.",
          },
          {
            title: "Buscamos por ti",
            desc: "Abre Google Shopping con las prendas listas pa' comprar.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-rosa-100 bg-white/80 p-5 backdrop-blur"
          >
            <h3 className="font-display text-lg text-rosa-600">{f.title}</h3>
            <p className="mt-2 text-sm text-noche/70">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
