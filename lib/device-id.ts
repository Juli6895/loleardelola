"use client";

// =====================================================================
// Identidad anónima por dispositivo (mientras no hay login)
// =====================================================================
// El login con Pinterest quedó para una fase siguiente, pero el clóset,
// el perfil y los outfits guardados necesitan saber "de quién" son. La
// solución de esta fase: un UUID generado en el navegador que se manda
// en el header `x-device-id`; el servidor crea/reusa una fila en `users`
// con ese device_id.
//
// Limitación conocida (y esperada): si la usuaria borra los datos del
// navegador o entra desde otro dispositivo, no ve sus cosas. Cuando
// llegue el login real, se migra la fila del device_id a la cuenta.
// =====================================================================

const STORAGE_KEY = "loleardelola:deviceId";

export const DEVICE_ID_HEADER = "x-device-id";

/** Devuelve el id de este dispositivo, creándolo la primera vez. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY);
    if (guardado) return guardado;
    const nuevo = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, nuevo);
    return nuevo;
  } catch {
    // Modo privado / localStorage bloqueado: generamos uno efímero para
    // que la sesión actual funcione aunque no persista.
    return crypto.randomUUID();
  }
}

/**
 * fetch con el header de dispositivo puesto. Usarlo para TODO lo que
 * toque datos de la usuaria (clóset, perfil, outfits).
 */
export function fetchConDispositivo(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      [DEVICE_ID_HEADER]: getDeviceId(),
    },
  });
}
