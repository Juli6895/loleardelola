// =====================================================================
// Correos que no pueden entrar a LoleardLola
// =====================================================================
// Cuentas que se eliminaron a pedido de Juliana y que no deben volver a
// crearse (por ejemplo, tras devolver el pago). Se revisa al pedir el
// código y al verificarlo (app/api/auth/codigo y app/api/auth/verificar),
// así que ni siquiera se les manda el correo. Para desbloquear uno, se
// quita de la lista.
// =====================================================================

const BLOQUEADOS = new Set<string>(["canosantiago2665@gmail.com"]);

export function esCorreoBloqueado(correo: string): boolean {
  return BLOQUEADOS.has(correo.trim().toLowerCase());
}

export const MENSAJE_CORREO_BLOQUEADO =
  "Este correo no puede entrar a LoleardLola. Si crees que es un error, escríbenos a hola@loleardlola.com.";
