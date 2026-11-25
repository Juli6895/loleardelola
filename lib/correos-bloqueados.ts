import crypto from "crypto";

// =====================================================================
// Quién no puede entrar a LoleardLola
// =====================================================================
// Cuentas que se eliminaron a pedido de Juliana y que no deben volver a
// crearse. Se bloquea por tres lados, porque el correo solo no basta:
// en noviembre de 2026 la misma persona volvió con otro correo, desde
// el mismo navegador y con el mismo celular.
//   - el correo: al pedir el código y al verificarlo,
//   - el navegador (x-device-id): en los mismos dos pasos,
//   - el celular: al ponerlo después de entrar (se le cierra la sesión).
//
// Se guardan como huella (SHA-256 del valor en minúscula), no el dato:
// así ni el correo ni el celular de nadie quedan escritos en el código.
// Para bloquear a alguien más, se agrega la huella de su correo, su
// celular (+57...) o su navegador; para desbloquear, se quita.
// =====================================================================

// 25 de noviembre de 2026: se desbloqueó a la única persona que estaba aquí (sus
// dos correos, su celular y su navegador), a pedido de Juliana.
const BLOQUEADOS = new Set<string>([
]);

const huella = (valor: string) => crypto.createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
const bloqueado = (valor: string | null | undefined) => !!valor && BLOQUEADOS.has(huella(valor));

export const esCorreoBloqueado = (correo: string) => bloqueado(correo);
export const esCelularBloqueado = (celular: string) => bloqueado(celular);
/** El navegador, por el encabezado x-device-id de la petición. */
export const esNavegadorBloqueado = (req: Request) => bloqueado(req.headers.get("x-device-id"));

export const MENSAJE_CORREO_BLOQUEADO =
  "Este correo no puede entrar a LoleardLola. Si crees que es un error, escríbenos a hola@loleardlola.com.";
