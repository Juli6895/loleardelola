"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";
import { anotar } from "@/lib/use-evento";
import { activarNotificaciones, marcarSeguida, useSeguimientos } from "@/lib/use-avisos";

type Prenda = { url: string; titulo: string; imagen: string | null; precioCop: number | null };

/**
 * La campanita "Avísame si baja" sobre la foto de una prenda de tienda.
 * Va dentro de tarjetas que son enlaces: por eso frena el clic, para no
 * abrir la tienda al tocarla.
 */
export default function BotonAvisame({ prenda }: { prenda: Prenda }) {
  const estado = useSeguimientos();
  const [ocupado, setOcupado] = useState(false);
  const seguida = estado.urls.has(prenda.url);

  async function alTocar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (ocupado) return;

    if (!estado.puede) {
      // Sin sesión en este navegador (o en la app instalada, que no
      // siempre comparte la sesión con Chrome) no se sabe si tiene
      // membresía: hay que pedirle que entre, no que pague.
      const sinSesion = (estado.motivo ?? "").toLowerCase().includes("correo");
      toast(
        (t) => (
          <span className="text-sm">
            {sinSesion
              ? "Para recibir avisos de rebaja, entra con tu correo."
              : "Los avisos de rebaja son parte de la membresía."}{" "}
            <Link
              href={sinSesion ? "/entrar" : "/membresia"}
              onClick={() => toast.dismiss(t.id)}
              className="font-medium text-rosa-600 underline"
            >
              {sinSesion ? "Entrar" : "Ver la membresía"}
            </Link>
          </span>
        ),
        { duration: 6000 }
      );
      return;
    }

    setOcupado(true);
    try {
      if (seguida) {
        await fetchConDispositivo(`/api/seguimientos?url=${encodeURIComponent(prenda.url)}`, { method: "DELETE" });
        marcarSeguida(prenda.url, false);
        toast("Ya no te avisamos de esta prenda");
        return;
      }

      const problema = await activarNotificaciones();
      if (problema) {
        anotar("aviso_error", { paso: "notificaciones", motivo: problema.slice(0, 160) });
        toast.error(problema, { duration: 8000 });
        return;
      }
      const res = await fetchConDispositivo("/api/seguimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prenda),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        anotar("aviso_error", { paso: "guardar", estado: res.status, motivo: String(json.error ?? "").slice(0, 160) });
        throw new Error(json.error ?? "No pudimos guardar el aviso.");
      }
      marcarSeguida(prenda.url, true);
      toast.success("Listo: te avisamos si baja de precio");
    } catch (err: any) {
      anotar("aviso_error", { paso: "otro", motivo: String(err?.name ?? "") + ": " + String(err?.message ?? "").slice(0, 160) });
      toast.error(err.message ?? "No pudimos guardar el aviso.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <button
      type="button"
      onClick={alTocar}
      aria-pressed={seguida}
      aria-label={seguida ? "Dejar de avisarme si baja de precio" : "Avísame si baja de precio"}
      title={seguida ? "Te avisamos si baja. Toca para dejar de seguirla." : "Avísame si baja"}
      className={`absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition ${
        seguida ? "bg-rosa-500 text-white" : "bg-white/90 text-noche/60 hover:bg-white hover:text-rosa-600"
      } ${ocupado ? "opacity-60" : ""} ${estado.puede ? "" : "opacity-80"}`}
    >
      <svg viewBox="0 0 24 24" fill={seguida ? "currentColor" : "none"} className="h-4 w-4" aria-hidden>
        <path
          d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6.5 2 7H4c.5-.5 2-2.5 2-7Zm4 10a2 2 0 0 0 4 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
