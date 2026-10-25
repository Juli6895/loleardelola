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

// Cuentas de prueba: lo que hagan no cuenta en el tablero (ni lo que
// pase en los navegadores donde entraron con ellas).
export const CORREOS_PRUEBA = ["contacto@lakaja.co", "julyalvarez9@hotmail.com"];

// Navegadores de prueba que no entran con ninguna cuenta: el que usa
// Claude para revisar la página publicada después de cada cambio.
export const DISPOSITIVOS_PRUEBA = ["27d6f810-db38-4968-bf88-38c9e4aa9b8e"];

export function esAdmin(correo: string | null | undefined): boolean {
  if (!correo) return false;
  return CORREOS_ADMIN.includes(correo.trim().toLowerCase());
}
