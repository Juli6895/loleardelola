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
// Claude para revisar la página publicada después de cada cambio, y los
// robots de Vercel del 25 de octubre de 2026 (abren la página dos veces
// con cada publicación; de ahí en adelante los frena /api/eventos).
export const DISPOSITIVOS_PRUEBA = [
  "27d6f810-db38-4968-bf88-38c9e4aa9b8e",
  "2a83be28-d59a-425f-97d2-b0ab8992edac",
  "50564288-051f-4c2a-9069-29469e714f1e",
  "d968d51b-db2a-4419-ad18-e213c66fa012",
  "6ae47f5e-7c16-4757-b886-184e9f5cea76",
  "be98d44f-6d46-41b7-91a5-186612dea6bf",
  "831da3f5-c529-4bfc-9a04-87b851535f35",
  "ba2c4234-104c-4de1-93ba-b473268fcd8a",
  "350c2bf4-5ad8-4f32-a434-3c144f8e59bb",
  "5c2a469a-9ab4-4ecb-9e4d-6f419d7725a8",
];

export function esAdmin(correo: string | null | undefined): boolean {
  if (!correo) return false;
  return CORREOS_ADMIN.includes(correo.trim().toLowerCase());
}
