import { esAdmin } from "./admin-correos";
import type { UsuarioActual } from "./sesion";

// =====================================================================
// ¿Puede ver las promociones?
// =====================================================================
// Todas las personas las ven, sin límite de días: con o sin cuenta y con
// membresía (noviembre de 2026, decisión de Juliana: son el gancho para
// traer tráfico). Antes eran 1 día sin cuenta y 2 con cuenta gratis.
// La ruta /api/promos/acceso y los filtros siguen usando este resultado:
// si algún día vuelve un límite, se pone aquí.
// =====================================================================

export type AccesoPromos = {
  permitido: boolean;
  plan: "anonimo" | "gratis" | "membresia";
  // Hasta cuándo las ve gratis. null = sin límite.
  hasta: string | null;
};

export async function accesoPromos(usuario: UsuarioActual | null): Promise<AccesoPromos> {
  if (!usuario) return { permitido: true, plan: "anonimo", hasta: null };
  if (usuario.plan === "membresia" || (usuario.conSesion && esAdmin(usuario.email))) {
    return { permitido: true, plan: "membresia", hasta: null };
  }
  return { permitido: true, plan: usuario.conSesion ? "gratis" : "anonimo", hasta: null };
}
