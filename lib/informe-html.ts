import type { ColorPintado, ManualListo } from "./manual-estilo";
import type { Silueta } from "./image-consulting/morfologia";
import { svgSiluetas } from "./manual-figuras";
import { CABELLO_HEX, PIEL_HEX } from "./manual-colores";
import type { ProductoTienda } from "./catalogo-tiendas";
import { colorAHex } from "./color-swatch";

// =====================================================================
// El manual, como página HTML descargable
// =====================================================================
// Se arma en el navegador con lo que ya trae el manual guardado — las
// fotos ya están adjuntas desde que se generó (ver adjuntarFotos en
// lib/manual-estilo.ts), así que esto no vuelve a preguntarle nada al
// catálogo.
//
// Es un solo archivo autocontenido (CSS por dentro, sin nada externo
// salvo las fotos, que son URLs de las propias tiendas): se puede abrir
// sin internet — menos las fotos, que si necesitan conexión—, guardar,
// imprimir o mandar por WhatsApp como archivo.
// =====================================================================

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Igual que el render de pantalla, pero a HTML en vez de JSX. */
function markdownAHtml(texto: string): string {
  const bloques = texto.split(/\n{2,}/);
  return bloques
    .map((b) => {
      const t = b.trim();
      if (!t) return "";
      if (t.startsWith("## ")) return `<h2>${escapar(t.slice(3))}</h2>`;
      if (t.startsWith("# ")) return `<h2>${escapar(t.slice(2))}</h2>`;
      if (/^[-*]\s/m.test(t)) {
        const items = t
          .split("\n")
          .filter((l) => /^[-*]\s/.test(l.trim()))
          .map((l) => `<li>${negritas(l.trim().replace(/^[-*]\s/, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${negritas(t)}</p>`;
    })
    .join("\n");
}

function negritas(s: string): string {
  return escapar(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function describir(p: { tipo: string; color: string; rasgos: string[] }): string {
  return [p.tipo, p.color, ...p.rasgos].filter(Boolean).join(" · ");
}

function punto(color: string): string {
  return `<span class="punto-color" style="background:${escapar(colorAHex(color))}"></span>`;
}

/** La paleta de un outfit, en puntos de color — sin repetir. */
function paletaHtml(prendas: Array<{ color: string }>): string {
  const vistos = new Set<string>();
  const colores = prendas
    .map((p) => p.color)
    .filter((c) => {
      const k = c.toLowerCase();
      if (!c || vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  if (colores.length === 0) return "";
  return `<div class="paleta">${colores
    .map((c) => `<span class="paleta-item">${punto(c)}<span>${escapar(c)}</span></span>`)
    .join("")}</div>`;
}

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");

function tarjetaProducto(p: ProductoTienda): string {
  return `
    <a class="producto" href="${escapar(p.url)}" target="_blank" rel="noopener noreferrer">
      ${p.imagen ? `<img src="${escapar(p.imagen)}" alt="${escapar(p.titulo)}" loading="lazy" />` : `<div class="producto-sin-foto"></div>`}
      <div class="producto-info">
        <p class="producto-titulo">${escapar(p.titulo)}</p>
        ${p.precioCop ? `<p class="producto-precio">${pesos(p.precioCop)}</p>` : ""}
        <p class="producto-tienda">${escapar(p.tienda)}</p>
      </div>
    </a>`;
}

export type ResumenPerfil = {
  silueta: string | null;
  contraste: string | null;
  personalidad: string | null;
  proyeccion: string | null;
  medidas: string | null;
  silueta_clave: Silueta | null;
  tono_piel: string | null;
  color_cabello: string | null;
} | null;

const PASOS = [
  "Morfología, estilo y colorimetría",
  "Outfits para momentos específicos",
  "Prendas favoritas (cómo combinar)",
  "Básicos de armario",
];

/** Parte el texto del manual por sus títulos (## ...). */
function secciones(texto: string): Record<string, string> {
  const salida: Record<string, string> = {};
  let actual: string | null = null;
  for (const linea of texto.split("\n")) {
    const titulo = linea.match(/^##\s+(.+?)\s*$/);
    if (titulo) {
      actual = titulo[1];
      salida[actual] = "";
    } else if (actual) {
      salida[actual] += linea + "\n";
    }
  }
  for (const k of Object.keys(salida)) salida[k] = salida[k].trim();
  return salida;
}

function lamina(titulo: string, cuerpo: string, paso?: number): string {
  return `<section class="lamina">
    ${paso ? `<p class="eyebrow">Paso ${paso} · ${escapar(PASOS[paso - 1])}</p>` : ""}
    <h2>${escapar(titulo)}</h2>
    ${cuerpo}
  </section>`;
}

function cuadrito(c: ColorPintado): string {
  return `<div class="cuadrito"><span style="background:${escapar(c.hex)}"></span><small>${escapar(c.nombre)}</small></div>`;
}

export function construirInformeHtml(datos: {
  nombre: string | null;
  manual: ManualListo;
  perfilResumen: ResumenPerfil;
  generadoEl: string | null;
}): string {
  const { nombre, manual, perfilResumen: perfil, generadoEl } = datos;
  const textos = secciones(manual.texto);
  const basicos = manual.basicos ?? manual.prendasClave ?? [];

  const fecha = new Date(generadoEl ?? Date.now()).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const fotosPortada = (manual.estilo ?? [])
    .map((p) => p.fotos[0]?.imagen)
    .filter((u): u is string => !!u)
    .slice(0, 4);

  const portada = `<header class="portada">
    <div class="portada-texto">
      <p class="eyebrow">Tu manual de estilo</p>
      <h1>Asesoría ${escapar(nombre || "de estilo")}</h1>
      <p class="lema">¡Te enseñaré a conocerte y verte mejor de lo que ya eres!</p>
      ${textos["Tu punto de partida"] ? `<p>${negritas(textos["Tu punto de partida"])}</p>` : ""}
      <p class="fecha">Armado el ${fecha}</p>
    </div>
    ${fotosPortada.length > 0 ? `<div class="portada-fotos">${fotosPortada.map((u) => `<img src="${escapar(u)}" alt="" />`).join("")}</div>` : ""}
  </header>`;

  const linea = `<section class="lamina">
    <h2>¿Qué haremos?</h2>
    <ol class="linea">${PASOS.map((p, i) => `<li><span class="punto"></span><b>${i + 1}.</b> ${escapar(p)}</li>`).join("")}</ol>
  </section>`;

  const morfologia = lamina(
    "Morfología",
    `${perfil?.silueta ? `<p>Tu silueta: <strong>${escapar(perfil.silueta)}</strong></p>` : ""}
     <div class="siluetas">${svgSiluetas(perfil?.silueta_clave ?? null, "descarga")}</div>
     ${textos["Cómo te viste tu figura"] ? markdownAHtml(textos["Cómo te viste tu figura"]) : ""}`,
    1
  );

  const tuyos = [
    perfil?.tono_piel && PIEL_HEX[perfil.tono_piel] ? { nombre: `Piel ${perfil.tono_piel}`, hex: PIEL_HEX[perfil.tono_piel] } : null,
    perfil?.color_cabello && CABELLO_HEX[perfil.color_cabello]
      ? { nombre: `Cabello ${perfil.color_cabello}`, hex: CABELLO_HEX[perfil.color_cabello] }
      : null,
  ].filter((c): c is ColorPintado => c !== null);

  const colorimetria = lamina(
    "Colorimetría",
    `${perfil?.contraste ? `<p class="grande">${escapar(perfil.contraste)}</p>` : ""}
     ${tuyos.length > 0 ? `<div class="tuyos">${tuyos.map(cuadrito).join("")}</div>` : ""}
     ${manual.paleta?.length ? `<p class="etiqueta">Tu paleta</p><div class="paleta-grid">${manual.paleta.map(cuadrito).join("")}</div>` : ""}
     ${manual.evitar?.length ? `<p class="etiqueta">Lejos de tu cara</p><div class="tuyos evitar">${manual.evitar.map(cuadrito).join("")}</div>` : ""}
     ${textos["Tus colores"] ? markdownAHtml(textos["Tus colores"]) : ""}`
  );

  const conSecciones = Object.keys(textos).length > 0;
  const estilo = lamina(
    perfil?.personalidad ? `Estilo ${perfil.personalidad}` : "Tu estilo",
    `${manual.estilo?.length ? `<div class="grid-4">${manual.estilo.map((p) => tarjetaProducto(p.fotos[0])).join("")}</div>` : ""}
     ${textos["Tu sello"] ? markdownAHtml(textos["Tu sello"]) : ""}
     ${textos["Cuando chocan"] ? `<div class="aparte"><h3>Cuando tus pilares chocan</h3>${markdownAHtml(textos["Cuando chocan"])}</div>` : ""}
     ${conSecciones ? "" : markdownAHtml(manual.texto)}`
  );

  const outfits = manual.outfits.length
    ? lamina(
        "Outfits para momentos específicos",
        manual.outfits
          .map(
            (o) => `<div class="outfit">
              <p class="outfit-titulo">${escapar(o.titulo)}</p>
              ${o.descripcion ? `<p class="outfit-desc">${escapar(o.descripcion)}</p>` : ""}
              ${paletaHtml(o.prendas)}
              <div class="grid-4">${o.prendas.map((p) => tarjetaProducto(p.fotos[0])).join("")}</div>
            </div>`
          )
          .join(""),
        2
      )
    : "";

  const favoritas = manual.favoritas?.length
    ? lamina(
        "Prendas favoritas",
        `<div class="favoritas">${manual.favoritas
          .map(
            (f) => `<div class="favorita">
              <img src="${escapar(f.foto)}" alt="${escapar(f.label)}" />
              <div>
                <p class="clave-nombre">${escapar(f.label)}</p>
                <p>${escapar(f.comoCombinar)}</p>
                ${f.conQue.length ? `<p class="chips">${f.conQue.map((c) => `<span>${escapar(c)}</span>`).join("")}</p>` : ""}
              </div>
            </div>`
          )
          .join("")}</div>`,
        3
      )
    : "";

  const fondo = basicos.length
    ? lamina(
        "Fondo de armario",
        `<div class="fondo">
          <div class="grid-3">${basicos.map((p) => tarjetaProducto(p.fotos[0])).join("")}</div>
          <ol class="lista-basicos">${basicos
            .map(
              (p) => `<li><p class="clave-nombre">${punto(p.color)}${escapar(describir(p))}</p>${p.porque ? `<p class="clave-porque">${escapar(p.porque)}</p>` : ""}</li>`
            )
            .join("")}</ol>
        </div>`,
        4
      )
    : "";

  return `<!doctype html>
<html lang="es-CO">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Asesoría ${escapar(nombre || "de estilo")}</title>
<style>
  :root {
    --rosa-50:#fff5f7; --rosa-100:#ffe9ee; --rosa-200:#fbd3dc; --rosa-300:#f5b3c2;
    --rosa-400:#ec88a0; --rosa-500:#db627f; --rosa-600:#c34862; --noche:#111111;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--rosa-50); color: var(--noche); font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.55; }
  .pagina { max-width: 860px; margin: 0 auto; padding: 28px 16px 64px; display: grid; gap: 20px; }
  h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; font-weight: 400; margin: 0; }
  h1 { font-size: 40px; line-height: 1.1; text-wrap: balance; }
  h2 { font-size: 30px; margin-bottom: 14px; }
  h3 { font-size: 20px; margin-bottom: 8px; }
  p { font-size: 14px; margin: 0 0 12px; color: rgba(17,17,17,0.75); }
  strong { color: var(--noche); font-weight: 600; }
  ul { margin: 0 0 12px; padding-left: 18px; }
  li { font-size: 14px; margin-bottom: 6px; color: rgba(17,17,17,0.75); }
  .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--rosa-500); margin-bottom: 6px; }
  .lamina { background: #fff; border: 1px solid var(--rosa-100); border-radius: 18px; padding: 28px; break-inside: avoid-page; }
  .portada { display: grid; grid-template-columns: 1.4fr 1fr; background: #fff; border: 1px solid var(--rosa-100); border-radius: 18px; overflow: hidden; }
  .portada-texto { padding: 32px; }
  .lema { font-size: 16px; color: rgba(17,17,17,0.6); margin-top: 10px; }
  .fecha { font-size: 12px; color: rgba(17,17,17,0.4); margin-top: 18px; }
  .portada-fotos { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; background: var(--rosa-50); }
  .portada-fotos img { width: 100%; height: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; }
  .linea { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; border-top: 1px solid var(--rosa-200); padding-top: 14px; position: relative; }
  .linea li { font-size: 13px; position: relative; }
  .linea .punto { position: absolute; top: -22px; left: 0; width: 15px; height: 15px; border-radius: 999px; background: var(--rosa-500); border: 2px solid #fff; }
  .linea b { color: var(--rosa-600); display: block; }
  .siluetas { max-width: 640px; margin: 8px auto 18px; }
  .siluetas svg { width: 100%; height: auto; display: block; font-family: inherit; }
  .grande { font-family: Georgia, serif; font-size: 24px; color: var(--noche); }
  .etiqueta { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(17,17,17,0.5); margin: 16px 0 6px; }
  .tuyos { display: flex; flex-wrap: wrap; gap: 10px; }
  .tuyos .cuadrito { width: 72px; }
  .evitar { margin-bottom: 18px; }
  .evitar span { opacity: 0.7; }
  .paleta-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; margin-bottom: 14px; }
  .cuadrito span { display: block; aspect-ratio: 1; border-radius: 6px; border: 1px solid rgba(17,17,17,0.1); }
  .cuadrito small { display: block; font-size: 9px; color: rgba(17,17,17,0.5); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .aparte { background: var(--rosa-50); border-radius: 12px; padding: 18px; margin-top: 16px; }
  .outfit { margin-bottom: 26px; }
  .outfit:last-child { margin-bottom: 0; }
  .outfit-titulo { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--rosa-600); margin: 0 0 4px; }
  .outfit-desc { font-size: 13px; margin-bottom: 12px; }
  .paleta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .paleta-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(17,17,17,0.5); }
  .punto-color { display: inline-block; width: 13px; height: 13px; border-radius: 999px; border: 1px solid rgba(17,17,17,0.1); flex-shrink: 0; vertical-align: middle; margin-right: 6px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; align-self: start; }
  .grid-3 .producto-info { display: none; }
  .producto { display: flex; flex-direction: column; border: 1px solid var(--rosa-100); border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; background: #fff; }
  .producto img { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; background: var(--rosa-50); }
  .producto-sin-foto { width: 100%; aspect-ratio: 3/4; background: var(--rosa-50); }
  .producto-info { padding: 6px 8px; }
  .producto-titulo { font-size: 10px; line-height: 1.3; margin: 0; color: rgba(17,17,17,0.8); }
  .producto-precio { font-size: 11px; font-weight: 600; margin: 3px 0 0; color: var(--noche); }
  .producto-tienda { font-size: 9px; margin: 2px 0 0; color: rgba(17,17,17,0.4); }
  .favoritas { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .favorita { display: flex; gap: 14px; }
  .favorita img { width: 96px; height: 116px; object-fit: cover; border-radius: 12px; border: 1px solid var(--rosa-100); flex-shrink: 0; background: var(--rosa-50); }
  .chips span { display: inline-block; background: var(--rosa-50); color: var(--rosa-600); font-size: 11px; font-weight: 600; border-radius: 999px; padding: 3px 9px; margin: 0 4px 4px 0; }
  .fondo { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .lista-basicos { list-style: none; padding: 0; margin: 0; }
  .lista-basicos li { border-bottom: 1px solid var(--rosa-100); padding: 10px 0; margin: 0; }
  .clave-nombre { font-size: 14px; font-weight: 600; margin: 0; color: var(--noche); }
  .clave-porque { font-size: 13px; margin: 3px 0 0; }
  footer { text-align: center; }
  footer p { font-size: 11px; color: rgba(17,17,17,0.35); }
  @media (max-width: 640px) {
    .portada, .fondo, .favoritas { grid-template-columns: 1fr; }
    .linea { grid-template-columns: 1fr; border-top: none; border-left: 1px solid var(--rosa-200); padding: 0 0 0 18px; }
    .linea .punto { top: 3px; left: -26px; }
    .grid-4 { grid-template-columns: repeat(2, 1fr); }
    .paleta-grid { grid-template-columns: repeat(4, 1fr); }
    h1 { font-size: 32px; }
  }
  @media print {
    body { background: #fff; }
    .lamina, .portada { border: none; }
    .producto { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="pagina">
    ${portada}
    ${linea}
    ${morfologia}
    ${colorimetria}
    ${estilo}
    ${outfits}
    ${favoritas}
    ${fondo}
    <footer>
      <p>Hecho con LoleardLola · las fotos y precios son de cada tienda, no nuestros.</p>
    </footer>
  </div>
</body>
</html>`;
}
