// =====================================================================
// Envío de correos (el código de ingreso y los avisos de rebaja)
// =====================================================================
// Se usa Resend: 3.000 correos al mes gratis y no hay que montar un
// servidor de correo. Hace falta RESEND_API_KEY y RESEND_FROM en el
// entorno.
//
// Si la llave no está puesta, NO se rompe: el código sale por la
// consola del servidor. Así se puede probar todo el flujo en local sin
// haber configurado nada — pero ojo, en producción sin llave nadie
// podría entrar, porque el código no le llegaría a nadie.
// =====================================================================

const RESEND_URL = "https://api.resend.com/emails";

type Mensaje = { subject: string; html: string; text: string };
type Resultado = { enviado: boolean; motivo?: string; detalle?: string };

export async function enviarCodigo(correo: string, codigo: string, minutos: number): Promise<Resultado> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    console.warn(`[email] Sin RESEND_API_KEY: el código de ${correo} es ${codigo} (solo visible acá).`);
    return { enviado: false, motivo: "correo-no-configurado" };
  }
  return enviar(correo, {
    subject: `${codigo} es tu código para entrar a LoleardLola`,
    html: plantilla(codigo, minutos),
    text: `Tu código para entrar a LoleardLola es ${codigo}. Vence en ${minutos} minutos. Si no lo pediste, ignora este correo.`,
  });
}

/**
 * El aviso de rebaja por correo. Es el respaldo de la notificación en el
 * celular: si no le llegó a ningún aparato (no dio permiso, el navegador
 * no las recibe, se dio de baja), le llega aquí, a su correo.
 */
export async function enviarAvisoRebaja(
  correo: string,
  aviso: { titulo: string; cuerpo: string; url: string; imagen?: string | null }
): Promise<Resultado> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    console.warn(`[email] Sin RESEND_API_KEY: no se mandó el aviso de rebaja a ${correo}.`);
    return { enviado: false, motivo: "correo-no-configurado" };
  }
  return enviar(correo, {
    subject: aviso.titulo,
    html: plantillaAviso(aviso),
    text: `${aviso.titulo}\n${aviso.cuerpo}\nVer la prenda: ${aviso.url}\n\nTe llega porque le diste corazón a esta prenda en LoleardLola. Si ya no quieres el aviso, quítale el corazón en Mis outfits.`,
  });
}

async function enviar(correo: string, m: Mensaje): Promise<Resultado> {
  const apiKey = process.env.RESEND_API_KEY!;
  const from = process.env.RESEND_FROM!;
  // Si Resend rechaza el remitente (dominio sin verificar, o una llave
  // que solo puede enviar desde otro dominio), se reintenta desde el de
  // respaldo, que ya funcionaba: así nadie se queda sin poder entrar
  // por un cambio de configuración (pasó al estrenar loleardlola.com).
  const respaldo = process.env.RESEND_FROM_RESPALDO || "LoleardLola <contacto@lakaja.co>";
  const primero = await enviarDesde(apiKey, from, correo, m);
  if (primero.enviado || from === respaldo || primero.motivo === "red") return primero;
  console.warn("[email] reintentando desde el remitente de respaldo");
  const segundo = await enviarDesde(apiKey, respaldo, correo, m);
  return segundo.enviado ? { ...segundo, detalle: primero.detalle } : segundo;
}

async function enviarDesde(apiKey: string, from: string, correo: string, m: Mensaje): Promise<Resultado> {
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [correo], subject: m.subject, html: m.html, text: m.text }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error("[email] Resend respondió", res.status, detalle);
      return { enviado: false, motivo: "resend-error", detalle: `${res.status} ${detalle}`.slice(0, 160) };
    }
    return { enviado: true };
  } catch (e) {
    console.error("[email] no se pudo enviar:", e);
    return { enviado: false, motivo: "red" };
  }
}

function plantilla(codigo: string, minutos: number): string {
  // Estilos en línea: los clientes de correo descartan las hojas de
  // estilo, así que no hay forma de reutilizar los de la página.
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#2b2430">
  <p style="font-size:22px;margin:0 0 4px;font-weight:600">LoleardLola</p>
  <p style="margin:0 0 28px;color:#7a6f78;font-size:14px">Tu código para entrar</p>
  <p style="font-size:38px;letter-spacing:10px;font-weight:700;margin:0 0 20px;color:#c4577a">${codigo}</p>
  <p style="font-size:14px;color:#5c525c;margin:0 0 6px">Vence en ${minutos} minutos.</p>
  <p style="font-size:13px;color:#8d8189;margin:20px 0 0">Si no pediste este código, puedes ignorar este correo — nadie entró a tu cuenta.</p>
</div>`.trim();
}

// El título y la foto vienen de la tienda: se escapan antes de ponerlos
// en el correo.
const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function plantillaAviso(a: { titulo: string; cuerpo: string; url: string; imagen?: string | null }): string {
  const foto = a.imagen && /^https:\/\//.test(a.imagen)
    ? `<img src="${escapar(a.imagen)}" alt="" style="width:100%;max-width:280px;border-radius:12px;margin:0 0 20px" />`
    : "";
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#2b2430">
  <p style="font-size:22px;margin:0 0 4px;font-weight:600">LoleardLola</p>
  <p style="margin:0 0 24px;color:#7a6f78;font-size:14px">Bajó de precio algo que te gustó</p>
  ${foto}
  <p style="font-size:18px;font-weight:600;margin:0 0 8px">${escapar(a.titulo)}</p>
  <p style="font-size:15px;color:#5c525c;margin:0 0 24px">${escapar(a.cuerpo)}</p>
  <a href="${escapar(a.url)}" style="display:inline-block;background:#2b2430;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">Ver la prenda</a>
  <p style="font-size:12px;color:#8d8189;margin:28px 0 0">Te llega porque le diste corazón a esta prenda. Si ya no quieres el aviso, quítale el corazón en Mis outfits.</p>
</div>`.trim();
}
