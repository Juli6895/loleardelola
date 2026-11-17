"use client";

import { Toaster } from "react-hot-toast";

// Providers globales. Se entra con el código al correo (lib/sesion.ts);
// el login con Pinterest de la primera versión se quitó en noviembre de
// 2026 (pegar el link de un pin en Buscar sigue funcionando).
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "12px",
            background: "#fff",
            color: "#111",
            border: "1px solid #fbd3dc",
            boxShadow: "0 10px 40px -10px rgba(219,98,127,0.25)",
          },
        }}
      />
    </>
  );
}
