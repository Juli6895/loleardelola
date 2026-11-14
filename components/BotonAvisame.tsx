"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";
import { anotar } from "@/lib/use-evento";
import { activarNotificaciones, marcarSeguida, useSeguimientos } from "@/lib/use-avisos";

type Prenda = { url: string; titulo: string; imagen: string | null; precioCop: number | null };

/**
 * El corazón "Avísame si baja" sobre la foto de una prenda de tienda.
 * Antes era una campanita; Juliana lo cambió por un corazón porque la
 * gente ya lo entiende como "me gusta".
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

      // Primero se guarda el me gusta: el corazón queda rojo aunque el
      // celular no deje mandar notificaciones. Antes se pedía el permiso
      // primero y, si estaba bloqueado, no se guardaba nada (noviembre de
      // 2026: ningún corazón llegó a guardarse). Sin notificaciones el
      // aviso igual llega, por correo (ver app/api/revisar-precios).
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

      const problema = await activarNotificaciones();
      if (problema) {
        anotar("aviso_error", { paso: "notificaciones", motivo: problema.slice(0, 160) });
        toast(`Listo: si baja de precio te avisamos por correo. ${problema}`, { duration: 9000 });
        return;
      }
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
      aria-label={seguida ? "Quitar el me gusta y dejar de avisarme si baja" : "Me gusta: avísame si baja de precio"}
      title={seguida ? "Te gusta: te avisamos si baja. Toca para quitarlo." : "Me gusta: avísame si baja"}
      className={`absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition ${
        // Con me gusta: el corazón relleno en rojo (pedido de Juliana).
        seguida ? "bg-white text-red-500" : "bg-white/90 text-noche/60 hover:bg-white hover:text-red-500"
      } ${ocupado ? "opacity-60" : ""} ${estado.puede ? "" : "opacity-80"}`}
    >
      <svg viewBox="0 0 24 24" fill={seguida ? "currentColor" : "none"} className={seguida ? "h-5 w-5" : "h-4 w-4"} aria-hidden>
        <path
          d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.4 3.9 4.5 7 4.5c2 0 3.4 1.2 5 3 1.6-1.8 3-3 5-3 3.1 0 5.3 2.9 4.2 6.2C19.5 15.4 12 20 12 20Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
