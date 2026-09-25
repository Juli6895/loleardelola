// Quién puede administrar. Se edita acá, igual que las listas de
// comercios: no hay pantalla para cambiarlo desde la app.
//
// Aparte de lib/admin.ts a propósito: ese archivo importa el cliente de
// Supabase con la llave de servicio (solo servidor), y este necesita
// poder cargarse también en el navegador — es lo que usa la barra de
// navegación para decidir si le muestra el botón de "Admin" a alguien.
// El permiso de VERDAD lo sigue revisando el servidor en cada API de
// /admin; esto solo decide si se muestra el atajo.
const CORREOS_ADMIN = ["contacto@lakaja.co"];

export function esAdmin(correo: string | null | undefined): boolean {
  if (!correo) return false;
  return CORREOS_ADMIN.includes(correo.trim().toLowerCase());
}
