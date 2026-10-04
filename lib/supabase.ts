import { createClient } from "@supabase/supabase-js";

// Cliente público de Supabase (para el navegador)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

// Next.js guarda en su caché las respuestas de fetch hechas en el
// servidor, y supabase-js consulta con fetch: sin esto, contar las
// búsquedas de una usuaria por segunda vez devolvía el número de la
// primera (comprobado: con 20 búsquedas guardadas seguía leyendo 0), y
// los topes no se aplicaban. La base siempre se lee fresca.
const fetchSinCache: typeof fetch = (entrada, opciones) =>
  fetch(entrada, { ...opciones, cache: "no-store" });

// Cliente de servicio (solo servidor). Tiene permisos elevados — nunca exponerlo al cliente.
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchSinCache },
  });
}
