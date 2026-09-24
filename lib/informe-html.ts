import type { ManualListo } from "./manual-estilo";
import type { ProductoTienda } from "./catalogo-tiendas";

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
} | null;

export function construirInformeHtml(datos: {
  nombre: string | null;
  manual: ManualListo;
  perfilResumen: ResumenPerfil;
  generadoEl: string | null;
}): string {
  const { nombre, manual, perfilResumen, generadoEl } = datos;

  const fecha = generadoEl
    ? new Date(generadoEl).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  const filasPerfil = perfilResumen
    ? [
        ["Silueta", perfilResumen.silueta],
        ["Tu color", perfilResumen.contraste],
        ["Tu personalidad", perfilResumen.personalidad],
        ["Quieres proyectar", perfilResumen.proyeccion],
        ["Medidas (busto · cintura · cadera)", perfilResumen.medidas],
      ].filter(([, v]) => v)
    : [];

  const outfitsHtml = manual.outfits
    .map(
      (o) => `
      <div class="outfit">
        <p class="outfit-titulo">${escapar(o.titulo)}</p>
        ${o.descripcion ? `<p class="outfit-desc">${escapar(o.descripcion)}</p>` : ""}
        <div class="grid-4">${o.prendas.map((p) => p.fotos.slice(0, 2).map(tarjetaProducto).join("")).join("")}</div>
      </div>`
    )
    .join("");

  const claveHtml = manual.prendasClave
    .map(
      (p, i) => `
      <div class="clave-item">
        <span class="clave-numero">${i + 1}</span>
        <div class="clave-texto">
          <p class="clave-nombre">${escapar(describir(p))}</p>
          ${p.porque ? `<p class="clave-porque">${escapar(p.porque)}</p>` : ""}
          <div class="grid-4 clave-fotos">${p.fotos.slice(0, 4).map(tarjetaProducto).join("")}</div>
        </div>
      </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="es-CO">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Manual de estilo${nombre ? " — " + escapar(nombre) : ""}</title>
<style>
  :root {
    --rosa-50:#fff5f7; --rosa-100:#ffe9ee; --rosa-200:#fbd3dc; --rosa-300:#f5b3c2;
    --rosa-400:#ec88a0; --rosa-500:#db627f; --rosa-600:#c34862; --noche:#111111;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--rosa-50); color: var(--noche);
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.55;
  }
  .pagina { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 34px; margin: 0 0 4px; }
  h2 { font-family: Georgia, 'Times New Roman', serif; font-size: 22px; margin: 28px 0 10px; color: var(--noche); }
  h2:first-child { margin-top: 0; }
  p { font-size: 14px; margin: 0 0 12px; color: rgba(17,17,17,0.75); }
  .fecha { font-size: 12px; color: rgba(17,17,17,0.4); margin: 0 0 24px; }
  .tarjeta {
    background: #fff; border: 1px solid var(--rosa-100); border-radius: 18px;
    padding: 22px 24px; margin-bottom: 20px;
  }
  .perfil-tabla { width: 100%; border-collapse: collapse; font-size: 13px; }
  .perfil-tabla td { padding: 6px 0; border-bottom: 1px solid var(--rosa-100); }
  .perfil-tabla td:first-child { color: rgba(17,17,17,0.5); padding-right: 16px; white-space: nowrap; }
  .perfil-tabla td:last-child { font-weight: 600; }
  ul { margin: 0 0 12px; padding-left: 18px; }
  li { font-size: 14px; margin-bottom: 6px; color: rgba(17,17,17,0.75); }
  strong { color: var(--noche); font-weight: 600; }
  .outfit { margin-bottom: 26px; }
  .outfit:last-child { margin-bottom: 0; }
  .outfit-titulo { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--rosa-600); margin: 0 0 4px; }
  .outfit-desc { font-size: 13px; margin-bottom: 12px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media (max-width: 480px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } }
  .producto { display: flex; flex-direction: column; border: 1px solid var(--rosa-100); border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; background: #fff; }
  .producto img { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; background: var(--rosa-50); }
  .producto-sin-foto { width: 100%; aspect-ratio: 3/4; background: var(--rosa-50); }
  .producto-info { padding: 6px 8px; }
  .producto-titulo { font-size: 10px; line-height: 1.3; margin: 0; color: rgba(17,17,17,0.8); }
  .producto-precio { font-size: 11px; font-weight: 600; margin: 3px 0 0; color: var(--noche); }
  .producto-tienda { font-size: 9px; margin: 2px 0 0; color: rgba(17,17,17,0.4); }
  .clave-item { display: flex; gap: 14px; margin-bottom: 20px; }
  .clave-item:last-child { margin-bottom: 0; }
  .clave-numero { flex-shrink: 0; width: 24px; height: 24px; border-radius: 999px; background: var(--rosa-100); color: var(--rosa-600); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .clave-nombre { font-size: 14px; font-weight: 600; margin: 0; color: var(--noche); }
  .clave-porque { font-size: 13px; margin: 3px 0 10px; }
  .clave-fotos { grid-template-columns: repeat(4, 1fr); }
  footer { text-align: center; margin-top: 40px; }
  footer p { font-size: 11px; color: rgba(17,17,17,0.35); }
  @media print {
    body { background: #fff; }
    .tarjeta { border: none; box-shadow: none; }
    .producto { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="pagina">
    <h1>LoleardLola</h1>
    <p class="fecha">Manual de estilo${nombre ? " de " + escapar(nombre) : ""} · armado el ${fecha}</p>

    ${
      filasPerfil.length > 0
        ? `<div class="tarjeta">
            <table class="perfil-tabla">
              ${filasPerfil.map(([k, v]) => `<tr><td>${escapar(k as string)}</td><td>${escapar(v as string)}</td></tr>`).join("")}
            </table>
          </div>`
        : ""
    }

    <div class="tarjeta">
      ${markdownAHtml(manual.texto)}
    </div>

    ${
      manual.outfits.length > 0
        ? `<div class="tarjeta">
            <h2>Tres outfits para ti</h2>
            ${outfitsHtml}
          </div>`
        : ""
    }

    ${
      manual.prendasClave.length > 0
        ? `<div class="tarjeta">
            <h2>Lo primero que compraría</h2>
            ${claveHtml}
          </div>`
        : ""
    }

    <footer>
      <p>Hecho con LoleardLola · las fotos y precios son de cada tienda, no nuestros.</p>
    </footer>
  </div>
</body>
</html>`;
}
