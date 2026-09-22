"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";

// Ingreso en dos pasos: correo → código de 6 dígitos. No hay contraseña
// a propósito, así que tampoco hay nada que recuperar.
//
// La petición va con fetchConDispositivo para que el servidor sepa qué
// navegador es y pueda unir lo que la usuaria ya tenía sin cuenta —el
// clóset, los outfits, el perfil— con la cuenta del correo.
// useSearchParams() obliga a renderizar en el navegador, y Next se
// niega a prerenderizar la página si eso no está envuelto en Suspense.
// El formulario va adentro; esto de afuera solo pone el límite.
export default function EntrarPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md py-10" />}>
      <Formulario />
    </Suspense>
  );
}

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const volverA = params.get("volver") ?? "/";
  const motivo = params.get("motivo");

  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      const res = await fetch("/api/auth/codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: correo }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No pudimos enviarte el código");
      setPaso("codigo");
      toast.success("Te mandamos un código a tu correo");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function validarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      const res = await fetchConDispositivo("/api/auth/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: correo, codigo }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No pudimos validar el código");
      toast.success("¡Listo! Ya estás dentro");
      router.push(volverA);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-2xl border border-rosa-100 bg-white p-7 shadow-sm sm:p-9">
        <h1 className="font-display text-3xl text-noche">
          {paso === "correo" ? "Entra con tu correo" : "Revisa tu correo"}
        </h1>

        {motivo && paso === "correo" && (
          <p className="mt-3 rounded-xl bg-rosa-50 p-3 text-sm text-noche/70">
            {motivo}
          </p>
        )}

        <p className="mt-3 text-sm text-noche/60">
          {paso === "correo"
            ? "Te mandamos un código de 6 dígitos. No tienes que crear ninguna contraseña."
            : `Escribe el código que le mandamos a ${correo}.`}
        </p>

        {paso === "correo" ? (
          <form onSubmit={pedirCodigo} className="mt-6 space-y-4">
            <div>
              <label htmlFor="correo" className="text-sm font-medium text-noche/80">
                Tu correo
              </label>
              <input
                id="correo"
                type="email"
                required
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition focus:border-rosa-400 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? "Enviando..." : "Mandarme el código"}
            </button>
          </form>
        ) : (
          <form onSubmit={validarCodigo} className="mt-6 space-y-4">
            <div>
              <label htmlFor="codigo" className="text-sm font-medium text-noche/80">
                Código de 6 dígitos
              </label>
              <input
                id="codigo"
                // inputMode numérico para que en el celular salga el
                // teclado de números; one-time-code deja que el sistema
                // lo autocomplete desde el correo.
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="mt-1.5 w-full rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-center text-lg tracking-[0.5em] outline-none transition focus:border-rosa-400 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={cargando || codigo.length !== 6}
              className="w-full rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? "Validando..." : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPaso("correo");
                setCodigo("");
              }}
              className="w-full text-center text-xs text-noche/50 underline"
            >
              Usar otro correo
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-noche/40">
          Usamos tu correo solo para que puedas volver a entrar y para
          avisarte de tu membresía. Nada más.
        </p>
      </div>
    </div>
  );
}
