// =====================================================================
// Envío de correos (el código de ingreso)
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

export async function enviarCodigo(
  correo: string,
  codigo: string,
  minutos: number
): Promise<{ enviado: boolean; motivo?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    console.warn(
      `[email] Sin RESEND_API_KEY: el código de ${correo} es ${codigo} (solo visible acá).`
    );
    return { enviado: false, motivo: "correo-no-configurado" };
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [correo],
        subject: `${codigo} es tu código para entrar a LoleardLola`,
        html: plantilla(codigo, minutos),
        text: `Tu código para entrar a LoleardLola es ${codigo}. Vence en ${minutos} minutos. Si no lo pediste, ignora este correo.`,
      }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error("[email] Resend respondió", res.status, detalle);
      return { enviado: false, motivo: "resend-error" };
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
