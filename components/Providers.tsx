"use client";

import { Toaster } from "react-hot-toast";

// Providers globales. Sin SessionProvider por ahora: el login con
// Pinterest quedó para una fase siguiente, y mantenerlo hacía una
// petición a /api/auth/session en cada carga de página sin necesidad.
// El código de NextAuth (lib/auth.ts, app/api/auth) se conserva para
// cuando se retome.
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
