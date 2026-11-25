// =====================================================================
// Marcas colombianas: las que llevan la banderita
// =====================================================================
// La marca, no solo la tienda. Las tiendas Shopify de la lista están
// registradas en Colombia (país CO en su /meta.json, noviembre de 2026),
// pero eso dice dónde opera la tienda: Esprit también sale ahí y es una
// marca alemana que vende aquí un franquiciado. Por eso la lista es a
// mano. Quedan por fuera las marcas extranjeras: American Eagle, Esprit,
// Naf Naf, Chevignon, Girbaud, H&M, Bimba y Lola, Rapsodia y Mango.
// Al agregar una tienda colombiana, va aquí también.
// =====================================================================

export const MARCAS_COLOMBIANAS = new Set([
  // Shopify
  "especia.com.co", "julianasanchez.co", "inmaculadavj.com", "gracies.com.co", "bybla.com.co",
  "navissi.com", "jeansandblouses.com", "ticketstores.co", "tiendacomplicity.com", "co.malvaonline.com",
  "leonisa.co", "gef.co", "aguabendita.com.co", "maaji.com.co", "stopjeans.com.co",
  "camiloalvarez.co", "rayuelaclothing.com", "sixxta.com", "casaprecis.com", "naos.com.co",
  "benditaseas.co", "etnicacolombia.com", "maracolombia.com", "nittabonita.com", "elvestidor.co",
  "centricaropa.co", "mompossina.com", "juanashop.co", "lakapitalindomable.com.co", "superlindas.co",
  "elentari.co", "melaomimila.com", "mhorayma.com", "molgoa.com", "vidamia.co",
  "bionica.co", "lolarelola.com", "wanitta.com.co", "lemontree.com.co",
  // WooCommerce
  "pepitaperez.co",
  // VTEX (Americanino nació en Italia, pero desde 1989 es de una empresa colombiana)
  "colorblue.com", "arturocalle.com", "studiof.com.co", "ela.com.co", "velez.com.co",
  "mattelsa.net", "tennis.com.co", "americanino.com", "pilatos.com", "mercedescampuzano.com",
  "ragged.com.co", "frutafresca.com.co",
  // Solo en el directorio de Instagram
  "koaj.co",
]);

export const esColombiana = (dominio: string) => MARCAS_COLOMBIANAS.has(dominio.replace(/^www\./, ""));
