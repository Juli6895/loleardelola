"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

// Providers globales (sesión de NextAuth + sistema de notificaciones)
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
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
    </SessionProvider>
  );
}
