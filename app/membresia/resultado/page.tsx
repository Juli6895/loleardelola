"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// A dónde vuelve la usuaria después de pagar.
//
// Bold pone el resultado en la dirección (bold-tx-status=approved), pero
// eso NO se usa para nada: cualquiera podría escribirlo a mano. Lo único
// que se toma es el identificador de la orden, y con ese el servidor le
// pregunta a Bold si de verdad se pagó.

export default function ResultadoPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md py-16" />}>
      <Resultado />
    </Suspense>
  );
}

type Estado = "verificando" | "listo" | "pendiente" | "fallo";

function Resultado() {
  const params = useSearchParams();
  const orden = params.get("bold-order-id");
  const [estado, setEstado] = useState<Estado>("verificando");
  const [detalle, setDetalle] = useState<string>("");

  useEffect(() => {
    if (!orden) {
      setEstado("fallo");
      setDetalle("No llegó el identificador del pago.");
      return;
    }
    let vigente = true;
    (async () => {
      try {
        const res = await fetch("/api/membresia/confirmar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orden }),
        });
        const json = await res.json();
        if (!vigente) return;
        if (json.ok) {
          setEstado("listo");
        } else if (json.estado === "PENDING" || json.estado === "PROCESSING") {
          // PSE sobre todo: el banco puede tardar en confirmar.
          setEstado("pendiente");
        } else {
          setEstado("fallo");
          setDetalle(json.error ?? "El pago no se completó.");
        }
      } catch {
        if (vigente) {
          setEstado("fallo");
          setDetalle("No pudimos verificar el pago.");
        }
      }
    })();
    return () => {
      vigente = false;
    };
  }, [orden]);

  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="rounded-2xl border border-rosa-100 bg-white p-8 shadow-sm">
        {estado === "verificando" && (
          <>
            <p className="font-display text-2xl text-noche">
              Verificando tu pago...
            </p>
            <p className="mt-2 text-sm text-noche/60">
              Le estamos preguntando a Bold. No cierres esta página.
            </p>
          </>
        )}

        {estado === "listo" && (
          <>
            <p className="font-display text-3xl text-noche">¡Bienvenida!</p>
            <p className="mt-2 text-sm text-noche/70">
              Tu membresía quedó activa. Ya no tienes topes y tu manual de
              estilo está disponible.
            </p>
            <Link
              href="/mi-perfil"
              className="mt-6 inline-block rounded-full bg-noche px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rosa-500"
            >
              Ir a mi perfil
            </Link>
          </>
        )}

        {estado === "pendiente" && (
          <>
            <p className="font-display text-2xl text-noche">
              Tu pago está en proceso
            </p>
            <p className="mt-2 text-sm text-noche/70">
              Algunos medios, como PSE, tardan un momento en confirmarse. Apenas
              el banco lo confirme, tu membresía se activa sola.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full border border-rosa-300 px-6 py-2.5 text-sm font-medium text-noche transition hover:bg-rosa-50"
            >
              Volver a revisar
            </button>
          </>
        )}

        {estado === "fallo" && (
          <>
            <p className="font-display text-2xl text-noche">
              No pudimos confirmar el pago
            </p>
            <p className="mt-2 text-sm text-noche/70">{detalle}</p>
            <p className="mt-3 text-xs text-noche/50">
              Si el dinero salió de tu cuenta, escríbenos a contacto@lakaja.co
              con la hora del pago y lo revisamos.
            </p>
            <Link
              href="/membresia"
              className="mt-6 inline-block rounded-full border border-rosa-300 px-6 py-2.5 text-sm font-medium text-noche transition hover:bg-rosa-50"
            >
              Volver a intentar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
