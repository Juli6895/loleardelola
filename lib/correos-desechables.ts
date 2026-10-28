// =====================================================================
// Correos de usar y botar
// =====================================================================
// Servicios que dan un buzón por minutos, sin registro. Sirven para
// sacar una prueba gratis tras otra, así que no se aceptan para crear
// cuenta. No es una lista completa (hay miles): son los más usados.
// =====================================================================

const DESECHABLES = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com", "anonaddy.me",
  "burnermail.io", "discard.email", "dispostable.com", "emailondeck.com", "fakeinbox.com",
  "fakemail.net", "getairmail.com", "getnada.com", "guerrillamail.com", "guerrillamail.net",
  "guerrillamail.org", "guerrillamailblock.com", "harakirimail.com", "inboxkitten.com",
  "mail.tm", "mailcatch.com", "maildrop.cc", "mailinator.com", "mailinator.net", "mailnesia.com",
  "mailpoof.com", "mintemail.com", "moakt.com", "mohmal.com", "mytemp.email", "nada.email",
  "sharklasers.com", "spam4.me", "spamgourmet.com", "tempail.com", "tempmail.com", "tempmail.net",
  "tempmailo.com", "temp-mail.org", "temp-mail.io", "tempr.email", "throwawaymail.com",
  "tmail.ws", "tmailor.com", "trashmail.com", "trashmail.de", "trashmail.net", "yopmail.com",
  "yopmail.fr", "yopmail.net", "emailfake.com", "fakemailgenerator.com", "minuteinbox.com",
  "dropmail.me", "linshiyouxiang.net", "byom.de", "wegwerfmail.de", "mailforspam.com",
]);

export function esCorreoDesechable(correo: string): boolean {
  const dominio = correo.split("@")[1]?.toLowerCase() ?? "";
  return DESECHABLES.has(dominio);
}
