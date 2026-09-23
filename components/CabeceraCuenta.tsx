"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";
import { comoSeLlama, tieneMembresia, useUsuario } from "@/lib/use-usuario";

// El enlace al tablero solo aparece para administración. No es una
// medida de seguridad —el permiso se revisa en el servidor, ver
// lib/admin.ts— sino para no mostrarle a nadie una puerta que no
// puede abrir.
const CORREOS_ADMIN = ["contacto@lakaja.co"];

// Cabecera de la cuenta, arriba de "Mi perfil".
//
// Hace dos cosas que faltaban después de entrar: saludar por el nombre
// (y pedirlo si todavía no lo puso) y mostrar, en gris, lo que la
// membresía destraba. Antes de esto, entrar no cambiaba nada en
// pantalla y no se entendía qué se ganaba pagando.

const LO_DE_LA_MEMBRESIA = [
  {
    titulo: "Manual de estilo completo",
    detalle: "Tus cuatro pilares cruzados en un documento: figura, color, sello y lo que quieres proyectar, con tres outfits armados para ti.",
  },
  {
    titulo: "Clóset sin tope",
    detalle: "Hoy puedes subir 2 prendas. Con membresía, las que quieras.",
  },
  {
    titulo: "Búsquedas y outfits sin tope",
    detalle: "Sin contador: busca y guarda cuanto quieras.",
  },
];

export default function CabeceraCuenta() {
  const { usuario, topes, cargando, recargar } = useUsuario();
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Pedir el nombre de nuevo es un estado de pantalla, no un cambio en
  // la base: borrarlo en el servidor para volver a preguntarlo sería
  // destruir el dato por una razón de interfaz.
  const [editandoNombre, setEditandoNombre] = useState(false);

  useEffect(() => {
    if (usuario?.nombre) setNombre(usuario.nombre);
  }, [usuario?.nombre]);

  if (cargando) return null;

  const dentro = !!usuario?.conSesion;
  const conMembresia = tieneMembresia(usuario);
  const saludo = comoSeLlama(usuario);

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetchConDispositivo("/api/auth/nombre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No pudimos guardar tu nombre");
      await recargar();
      setEditandoNombre(false);
      toast.success("¡Listo!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ---- Quién eres ---- */}
      <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-7">
        {!dentro ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-xl text-noche">
                Estás usando LoleardLola sin cuenta
              </p>
              <p className="mt-1 text-sm text-noche/60">
                Todo lo que armes vive solo en este navegador. Entra con tu
                correo para no perderlo y verlo desde el celular.
              </p>
            </div>
            <Link
              href="/entrar?volver=/mi-perfil"
              className="shrink-0 rounded-full bg-noche px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-rosa-500"
            >
              Entrar
            </Link>
          </div>
        ) : !usuario?.nombre || editandoNombre ? (
          // Entró pero no nos ha dicho cómo se llama.
          <form onSubmit={guardarNombre}>
            <p className="font-display text-xl text-noche">
              ¿Cómo te llamamos?
            </p>
            <p className="mt-1 text-sm text-noche/60">
              Para personalizar tu asesoría. Solo tu nombre.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                maxLength={60}
                required
                className="flex-1 rounded-full border border-rosa-200 bg-rosa-50/40 px-4 py-2.5 text-sm outline-none transition focus:border-rosa-400 focus:bg-white"
              />
              <button
                type="submit"
                disabled={guardando || !nombre.trim()}
                className="rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-2xl text-noche">
                Hola, {saludo}
              </p>
              <p className="mt-1 text-sm text-noche/60">
                {usuario.email}
                {conMembresia ? " · Membresía activa" : " · Cuenta gratis"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <button
                onClick={() => setEditandoNombre(true)}
                className="text-xs text-noche/40 underline transition hover:text-rosa-500"
              >
                Cambiar mi nombre
              </button>
              {CORREOS_ADMIN.includes((usuario.email ?? "").toLowerCase()) && (
                <Link
                  href="/admin"
                  className="text-xs text-rosa-500 underline transition hover:text-rosa-600"
                >
                  Ver el tablero
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---- Lo que destraba la membresía ---- */}
      {!conMembresia && (
        <div className="rounded-2xl border border-rosa-100 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-rosa-500">
                Con la membresía
              </p>
              <p className="mt-1 font-display text-xl text-noche">
                Esto es lo que se te destraba
              </p>
            </div>
            <Link
              href="/membresia"
              className="shrink-0 rounded-full bg-noche px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
            >
              Ver planes
            </Link>
          </div>

          <ul className="mt-5 space-y-3">
            {LO_DE_LA_MEMBRESIA.map((x) => (
              // En gris y con candado: se ve lo que hay, sin poder
              // usarlo todavía.
              <li key={x.titulo} className="flex gap-3 opacity-50">
                <span className="mt-0.5 text-noche/40" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>
                  <span className="block text-sm font-medium text-noche">
                    {x.titulo}
                  </span>
                  <span className="block text-xs text-noche/60">{x.detalle}</span>
                </span>
              </li>
            ))}
          </ul>

          {topes && (
            <p className="mt-5 border-t border-rosa-50 pt-4 text-xs text-noche/40">
              Ahora mismo tienes {topes.busquedas} búsquedas, {topes.outfits}{" "}
              outfits guardados y {topes.prendasCloset} prendas en tu clóset.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
