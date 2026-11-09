"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import { fetchConDispositivo } from "@/lib/device-id";

// Al abrir la app, y al volver a ella (por ejemplo desde Nequi o el
// banco), se pregunta si quien entra tiene un pago sin acreditar (ver
// app/api/membresia/pendientes). Si ya se aprobó, se le avisa y se
// recarga para que vea todo habilitado. Como mucho una vez por minuto.
const CADA_MS = 60_000;

export default function RevisarPagoPendiente() {
  useEffect(() => {
    let ultima = 0;
    const revisar = () => {
      if (Date.now() - ultima < CADA_MS) return;
      ultima = Date.now();
      fetchConDispositivo("/api/membresia/pendientes", { method: "POST" })
        .then((r) => r.json())
        .then((j) => {
          if (!j?.acreditadas) return;
          toast.success("¡Tu pago quedó aprobado! Ya tienes todo habilitado.");
          setTimeout(() => window.location.reload(), 1800);
        })
        .catch(() => {});
    };
    revisar();
    const alVolver = () => document.visibilityState === "visible" && revisar();
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, []);
  return null;
}
