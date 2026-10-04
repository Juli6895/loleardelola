import { SILUETAS, type Silueta } from "./image-consulting/morfologia";

// =====================================================================
// Morfología: las cinco siluetas, con una estrella en la suya
// =====================================================================
// Como en una asesoría presencial: se muestran las cinco, cada una con
// su forma geométrica encima (triángulo, triángulo invertido,
// rectángulo, reloj de arena, óvalo), y se marca la de ella. Son
// maniquíes de modista (sin brazos ni cara), iguales para todas: lo que
// importa es la forma, no un retrato.
//
// Devuelve el SVG como texto para usarlo igual en la pantalla y en el
// HTML descargable.
// =====================================================================

type Medidas = { hombro: number; busto: number; cintura: number; cadera: number };

// Mitad del ancho, en un lienzo de 100 de ancho.
const FORMAS: Record<Silueta, Medidas & { traje: string; corto: string }> = {
  pera: { hombro: 17, busto: 18, cintura: 13, cadera: 27, traje: "#c98a99", corto: "Triángulo" },
  triangulo_invertido: { hombro: 27, busto: 24, cintura: 16, cadera: 18, traje: "#db627f", corto: "Triángulo invertido" },
  rectangulo: { hombro: 21, busto: 21, cintura: 19, cadera: 21, traje: "#a23850", corto: "Rectángulo" },
  reloj_de_arena: { hombro: 24, busto: 24, cintura: 13, cadera: 24, traje: "#6e2838", corto: "Reloj de arena" },
  manzana: { hombro: 21, busto: 25, cintura: 25, cadera: 22, traje: "#b9717f", corto: "Óvalo" },
};

const ORDEN: Silueta[] = ["pera", "triangulo_invertido", "rectangulo", "reloj_de_arena", "manzana"];

type Punto = [number, number];

/** Curva suave que pasa por todos los puntos (Catmull-Rom a Bézier). */
function curva(puntos: Punto[]): string {
  let d = `M${puntos[0][0].toFixed(1)},${puntos[0][1].toFixed(1)}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;
    const c1: Punto = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Punto = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/** El contorno del maniquí: mitad izquierda y su espejo. */
function contorno(m: Medidas): string {
  const piernaFuera = 50 - (m.cadera * 0.55 + 4);
  const izquierda: Punto[] = [
    [45, 42],
    [50 - m.hombro * 0.82, 48.5],
    [50 - m.hombro, 56],
    [50 - m.busto, 77],
    [50 - m.cintura, 100],
    [50 - m.cadera, 124],
    [50 - m.cadera + 3, 152],
    [piernaFuera, 204],
  ];
  const derecha = izquierda.map(([x, y]) => [100 - x, y] as Punto).reverse();
  return [
    curva(izquierda),
    "L48,204",
    curva([[48, 204], [49, 160], [50, 143]]).replace(/^M[^C]*/, ""),
    curva([[50, 143], [51, 160], [52, 204]]).replace(/^M[^C]*/, ""),
    `L${(100 - piernaFuera).toFixed(1)},204`,
    curva(derecha).replace(/^M[^C]*/, ""),
    "Z",
  ].join(" ");
}

/** La forma geométrica que resume cada silueta. */
function figuraGeometrica(s: Silueta, m: Medidas): string {
  const trazo = 'fill="none" stroke="#111111" stroke-opacity="0.55" stroke-width="1.6" stroke-linejoin="round"';
  const arriba = 50;
  const abajo = 140;
  switch (s) {
    case "pera":
      return `<polygon points="50,${arriba - 2} ${50 - m.cadera - 5},${abajo} ${50 + m.cadera + 5},${abajo}" ${trazo}/>`;
    case "triangulo_invertido":
      return `<polygon points="${50 - m.hombro - 5},${arriba} ${50 + m.hombro + 5},${arriba} 50,${abajo + 2}" ${trazo}/>`;
    case "rectangulo":
      return `<rect x="${50 - m.hombro - 4}" y="${arriba}" width="${(m.hombro + 4) * 2}" height="${abajo - arriba}" ${trazo}/>`;
    case "reloj_de_arena": {
      const a = m.hombro + 4;
      const c = m.cintura + 1;
      return `<polygon points="${50 - a},${arriba} ${50 + a},${arriba} ${50 + c},100 ${50 + a},${abajo} ${50 - a},${abajo} ${50 - c},100" ${trazo}/>`;
    }
    case "manzana":
      return `<ellipse cx="50" cy="96" rx="${m.cintura + 7}" ry="47" ${trazo}/>`;
  }
}

function maniqui(s: Silueta, x: number, id: string, esLaSuya: boolean): string {
  const m = FORMAS[s];
  const cuerpo = contorno(m);
  const recorte = `${id}-${s}`;
  const tirantes = [
    [50 - m.busto + 6, 62, 50 - m.hombro * 0.55, 49],
    [50 + m.busto - 6, 62, 50 + m.hombro * 0.55, 49],
  ]
    .map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${m.traje}" stroke-width="2.4" stroke-linecap="round"/>`)
    .join("");
  const estrella = esLaSuya
    ? `<path transform="translate(50 252)" d="M0,-9 L2.6,-2.8 9,-2.8 3.9,1.2 5.8,7.6 0,3.8 -5.8,7.6 -3.9,1.2 -9,-2.8 -2.6,-2.8Z" fill="#db627f"/>`
    : "";
  return `<g transform="translate(${x} 0)">
    <rect x="0" y="0" width="100" height="214" rx="8" fill="${esLaSuya ? "#ffe9ee" : "#f4f1f2"}"/>
    <clipPath id="${recorte}"><path d="${cuerpo}"/></clipPath>
    <ellipse cx="50" cy="23" rx="10.5" ry="13.5" fill="#ffffff" stroke="#111111" stroke-opacity="0.12"/>
    <rect x="45.5" y="34" width="9" height="11" fill="#ffffff"/>
    <path d="${cuerpo}" fill="#ffffff" stroke="#111111" stroke-opacity="0.12"/>
    <g clip-path="url(#${recorte})">
      <polygon points="0,60 100,60 100,124 56,147 44,147 0,124" fill="${m.traje}"/>
    </g>
    ${tirantes}
    ${figuraGeometrica(s, m)}
    <text x="50" y="232" text-anchor="middle" font-size="10.5" font-weight="${esLaSuya ? 700 : 400}" fill="#111111" fill-opacity="${esLaSuya ? 1 : 0.6}">${m.corto}</text>
    ${estrella}
  </g>`;
}

/** Las cinco siluetas en fila, con la estrella bajo la suya. */
export function svgSiluetas(suya: Silueta | null, id = "silueta"): string {
  const ancho = 100;
  const espacio = 8;
  const total = ORDEN.length * ancho + (ORDEN.length - 1) * espacio;
  const titulo = suya ? `Las cinco siluetas; la tuya es ${SILUETAS[suya].label}` : "Las cinco siluetas";
  return `<svg viewBox="0 0 ${total} 266" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${titulo}" font-family="inherit">${ORDEN.map(
    (s, i) => maniqui(s, i * (ancho + espacio), id, s === suya)
  ).join("")}</svg>`;
}
