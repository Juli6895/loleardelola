import type { Silueta } from "@/types";

// =====================================================================
// Figurín de moda
// =====================================================================
// Las versiones anteriores eran una mancha de un solo color, armada con
// curvas ajustadas a mano: salían rígidas (brazos como tubos, piernas
// como columnas, pies cuadrados) y se leían como maniquí, no como
// ilustración.
//
// Esta se dibuja como un figurín: contorno fino, relleno suave y el
// pelo en otro tono. Las curvas no se ajustan a mano: cada borde es una
// lista de puntos por los que pasa una curva suave (Catmull-Rom), así
// que mover una medida mueve la curva entera sin quiebres.
//
// Proporción de figurín (~9 cabezas), lienzo de 130 x 320 con el eje
// del cuerpo en x = 65. Todas las x de abajo son distancia al eje.
// =====================================================================

const EJE = 65;

type Medidas = {
  hombro: number;
  busto: number;
  cintura: number;
  cadera: number;
  muslo: number;
};

// Lo que distingue cada silueta: el ancho (medio) de hombro, busto,
// cintura y cadera, y el grosor del muslo.
const MEDIDAS: Record<Silueta, Medidas> = {
  reloj_de_arena: { hombro: 24, busto: 25, cintura: 14.5, cadera: 26, muslo: 14 },
  pera: { hombro: 20.5, busto: 20, cintura: 15.5, cadera: 29, muslo: 16 },
  manzana: { hombro: 23, busto: 24.5, cintura: 24, cadera: 22.5, muslo: 12.5 },
  rectangulo: { hombro: 22, busto: 21.5, cintura: 19.5, cadera: 22, muslo: 12.5 },
  triangulo_invertido: { hombro: 28, busto: 25, cintura: 17.5, cadera: 19.5, muslo: 11.5 },
};

type Punto = [number, number];

/**
 * Curva suave que pasa por todos los puntos (Catmull-Rom convertida a
 * Bézier). Devuelve solo los tramos "C", para encadenarla a un "M" o a
 * otra curva.
 */
function curva(puntos: Punto[]): string {
  let d = "";
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;
    const c1: Punto = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Punto = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

const f = (n: number) => Math.round(n * 100) / 100;
const derecha = ([x, y]: Punto): Punto => [EJE + x, y];
const izquierda = ([x, y]: Punto): Punto => [EJE - x, y];

// ---------------------------------------------------------------------
// El cuerpo: un solo contorno, del cuello a los pies
// ---------------------------------------------------------------------
// Baja por el borde de afuera del lado derecho hasta el pie, sube por
// el borde de adentro de esa pierna hasta la entrepierna, baja por el
// de adentro de la otra y sube por fuera hasta el cuello. El espacio
// entre las piernas queda FUERA del contorno, así que se ve vacío.

/** Borde de afuera, del cuello al tobillo. */
function bordeExterior(m: Medidas): Punto[] {
  const caderaAlta = m.cintura + (m.cadera - m.cintura) * 0.6;
  const k = rodilla(m);
  return [
    [4.6, 36],
    [4.4, 43],
    [5.6, 49],
    [12, 54],
    [m.hombro - 3, 57.5],
    [m.hombro, 62],
    [m.hombro - 1.2, 69],
    [m.busto - 1.6, 76],
    [m.busto, 86],
    [m.busto - 1.8, 97],
    [m.cintura, 117],
    [caderaAlta, 134],
    [m.cadera, 150],
    [m.cadera - 1.2, 164],
    [entreMuslos(m) + m.muslo * 1.2, 202],
    [k.centro + k.medio, 236],
    [k.centro + k.medio * 1.12, 256],
    [9.4, 289],
    [8.8, 299],
  ];
}

/** El pie, en punta (como un figurín de moda con tacón), del tobillo de afuera al de adentro. */
function pie(): Punto[] {
  return [
    [8.8, 299],
    [8.9, 306],
    [7, 314.5],
    [5.2, 315.5],
    [3.8, 310],
    [3.4, 300],
  ];
}

/** Borde de adentro de la pierna, del tobillo a la entrepierna. */
function bordeInterior(m: Medidas): Punto[] {
  const k = rodilla(m);
  return [
    [3.4, 300],
    [3.6, 290],
    [4.6, 264],
    [k.centro - k.medio, 238],
    [entreMuslos(m), 204],
    [1.6, 180],
    [0, 175.5],
  ];
}

/** Dónde queda el borde de adentro del muslo: casi tocando la otra pierna. */
function entreMuslos(m: Medidas): number {
  return Math.max(1.6, m.cadera * 0.5 - m.muslo * 0.72);
}

function rodilla(m: Medidas) {
  const medio = 4.9 + m.muslo * 0.09;
  return { medio, centro: 2.6 + medio };
}

function cuerpo(m: Medidas): string {
  const exterior = bordeExterior(m);
  const bajada = [...exterior, ...pie().slice(1), ...bordeInterior(m).slice(1)];
  const derechaD = bajada.map(derecha);
  const izquierdaD = [...bajada].reverse().map(izquierda);
  const inicio = derechaD[0];
  return `M ${f(inicio[0])} ${f(inicio[1])}${curva(derechaD)}${curva(izquierdaD)} Z`;
}

// ---------------------------------------------------------------------
// Los brazos: cuelgan con aire alrededor de la cintura y la cadera
// ---------------------------------------------------------------------
// Van DETRÁS del cuerpo, así el hombro los tapa donde se unen. Su
// recorrido depende de la silueta: en una pera la mano se abre para
// pasar por fuera de la cadera, en una manzana el codo se aparta de la
// cintura. Un brazo que atraviesa el torso se ve dibujado encima.
function brazo(m: Medidas): Punto[] {
  const borde = bordeExterior(m);
  // Ancho del torso a una altura, leyendo el mismo borde que dibuja el cuerpo.
  const torso = (y: number) => {
    for (let i = 0; i < borde.length - 1; i++) {
      const [x1, y1] = borde[i];
      const [x2, y2] = borde[i + 1];
      if (y >= y1 && y <= y2) return x1 + ((x2 - x1) * (y - y1)) / (y2 - y1);
    }
    return borde[borde.length - 1][0];
  };
  const masAnchoHasta = (y: number) =>
    Math.max(...borde.filter(([, by]) => by >= 60 && by <= y).map(([bx]) => bx));

  // Un brazo real cuelga casi recto: no se mete hacia la cintura aunque
  // la cintura sea angosta, así que su borde de adentro no baja de lo
  // más ancho que el cuerpo tuvo más arriba (menos lo que se afina).
  // Los brazos se abren apenas del cuerpo, como en las guías de tipos
  // de cuerpo: si cuelgan pegados, tapan justo la cintura y la cadera,
  // que es lo que esta figura existe para mostrar.
  const tramos: Array<[number, number, number]> = [
    // [y, aire respecto al torso, grosor del brazo]
    [82, -0.4, 7.4],
    [102, 2.2, 6.8],
    [123, 4.4, 6],
    [147, 6.2, 5.2],
    [167, 7.4, 4.3],
  ];
  let anterior = 0;
  const adentroDe = tramos.map(([y, aire, grosor]) => {
    // Nunca se mete hacia adentro al bajar: un brazo no sigue la curva
    // de la cintura.
    const x = Math.max(torso(y) + aire, masAnchoHasta(y) - 1.5, anterior - 0.6);
    anterior = x;
    return { y, x, grosor };
  });

  const muneca = adentroDe[adentroDe.length - 1];
  const afuera: Punto[] = [
    [m.hombro - 2.5, 57.5],
    [m.hombro + 2.2, 64.5],
    ...adentroDe.map(({ y, x, grosor }): Punto => [x + grosor, y]),
    [muneca.x + muneca.grosor + 0.8, 179],
    [muneca.x + muneca.grosor * 0.55, 191],
  ];
  const adentro: Punto[] = [
    [muneca.x + 0.4, 190.5],
    [muneca.x - 0.5, 180],
    ...[...adentroDe].reverse().map(({ y, x }): Punto => [x, y]),
    [torso(70) - 3.5, 70],
    [m.hombro - 2.5, 57.5],
  ];
  return [...afuera, ...adentro];
}

function brazoD(m: Medidas, lado: typeof derecha): string {
  const p = brazo(m).map(lado);
  return `M ${f(p[0][0])} ${f(p[0][1])}${curva(p)} Z`;
}

/** Una línea suave bajo el busto, a cada lado: sin ella el torso se lee plano. */
function busto(m: Medidas, lado: typeof derecha): string {
  const p: Punto[] = [
    [m.busto - 3.2, 86],
    [m.busto - 6.5, 92.5],
    [m.busto * 0.45, 94],
    [3.2, 91.5],
  ].map((q) => lado(q as Punto));
  return `M ${f(p[0][0])} ${f(p[0][1])}${curva(p)}`;
}

// ---------------------------------------------------------------------
// Cabeza y peinado
// ---------------------------------------------------------------------
const CABEZA = { cx: EJE, cy: 24, rx: 10.5, ry: 13.5 };

function elipse(cx: number, cy: number, rx: number, ry: number): string {
  const k = 0.5523;
  return [
    `M ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - ry * k} ${cx - rx * k} ${cy - ry} ${cx} ${cy - ry}`,
    `C ${cx + rx * k} ${cy - ry} ${cx + rx} ${cy - ry * k} ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + ry * k} ${cx + rx * k} ${cy + ry} ${cx} ${cy + ry}`,
    `C ${cx - rx * k} ${cy + ry} ${cx - rx} ${cy + ry * k} ${cx - rx} ${cy}`,
    "Z",
  ].join(" ");
}

/**
 * Pelo recogido con raya al lado: cubre la parte de arriba de la cabeza
 * y baja por las sienes. Un recogido se lee femenino y elegante sin
 * competir con lo que importa, que es la forma del cuerpo.
 */
function peinado(): string {
  const { cx, cy } = CABEZA;
  const borde: Punto[] = [
    [cx - 11.4, cy + 4],
    [cx - 11.8, cy - 5],
    [cx - 7.5, cy - 13],
    [cx + 1, cy - 15.4],
    [cx + 8.6, cy - 12],
    [cx + 11.8, cy - 4],
    [cx + 11.2, cy + 5],
  ];
  const nacimiento: Punto[] = [
    [cx + 11.2, cy + 5],
    [cx + 9.2, cy - 2],
    [cx + 4.5, cy - 8.2],
    [cx - 2.5, cy - 9.6],
    [cx - 8.6, cy - 5.5],
    [cx - 10, cy + 1.5],
    [cx - 11.4, cy + 4],
  ];
  return `M ${cx - 11.4} ${cy + 4}${curva(borde)}${curva(nacimiento)} Z`;
}

/** El moño, detrás de la cabeza. */
function mono(): string {
  const { cx, cy } = CABEZA;
  return elipse(cx + 3, cy - 15.5, 6.6, 5.4);
}

export { MEDIDAS };

// Silueta ilustrada, usada en el perfil de la usuaria — y más adelante,
// como base del Avatar.
export default function SiluetaIcon({
  silueta,
  className,
}: {
  silueta: Silueta;
  className?: string;
}) {
  const m = MEDIDAS[silueta];
  return (
    <svg viewBox="0 0 130 320" className={className} aria-hidden>
      <g stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
        {/* Cada pieza se pinta primero en blanco y encima el tono suave:
            así el torso tapa al brazo donde se cruzan, en vez de dejarlo
            ver a través. */}
        {[brazoD(m, derecha), brazoD(m, izquierda), cuerpo(m)].map((d, i) => (
          <g key={i}>
            <path d={d} fill="white" stroke="none" />
            <path d={d} fill="currentColor" fillOpacity={0.2} />
          </g>
        ))}
        <g fill="none" strokeOpacity={0.45} strokeWidth={1}>
          <path d={busto(m, derecha)} />
          <path d={busto(m, izquierda)} />
        </g>
        <path d={mono()} fill="currentColor" />
        <path d={elipse(CABEZA.cx, CABEZA.cy, CABEZA.rx, CABEZA.ry)} fill="white" stroke="none" />
        <path
          d={elipse(CABEZA.cx, CABEZA.cy, CABEZA.rx, CABEZA.ry)}
          fill="currentColor"
          fillOpacity={0.2}
        />
        <path d={peinado()} fill="currentColor" />
      </g>
    </svg>
  );
}
