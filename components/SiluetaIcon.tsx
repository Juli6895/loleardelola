import { useId } from "react";
import type { Silueta, TonoPiel } from "@/types";

// =====================================================================
// La figura de la usuaria
// =====================================================================
// Un cuerpo humano, no un figurín ni un maniquí: proporciones reales
// (unas 8 cabezas), su tono de piel, su color y largo de pelo, y —si
// dio sus medidas— el ancho de SU busto, cintura y cadera. Va vestida
// con ropa ajustada (top de tiras, leggings, zapato bajo) para que se
// lea la forma del cuerpo sin mostrar de más.
//
// Las curvas no se ajustan a mano: cada borde es una lista de puntos
// por los que pasa una curva suave (Catmull-Rom), así una medida más
// ancha o más angosta mueve el contorno entero sin quiebres.
//
// Lienzo de 150 x 340 con el eje del cuerpo en x = 75. Todas las x de
// abajo son distancia al eje.
// =====================================================================

const EJE = 75;
const ANCHO = 150;
const ALTO = 340;

// Alturas del cuerpo (de la coronilla al piso son ~314 unidades).
const Y = {
  cabeza: 29,
  menton: 49,
  cuello: 58,
  hombro: 67,
  axila: 85,
  busto: 98,
  bajoBusto: 108,
  cintura: 131,
  caderaAlta: 147,
  cadera: 163,
  entrepierna: 178,
  rodilla: 245,
  pantorrilla: 267,
  tobillo: 306,
  piso: 322,
};

type Anchos = {
  hombro: number;
  busto: number;
  cintura: number;
  cadera: number;
  muslo: number;
};

// La mitad del ancho de frente de cada parte, en proporción humana. Se
// usan cuando no hay medidas, y para sacar hombro y muslo cuando sí.
const PROPORCIONES: Record<Silueta, Anchos> = {
  reloj_de_arena: { hombro: 30, busto: 31, cintura: 22, cadera: 33, muslo: 17 },
  pera: { hombro: 27.5, busto: 27, cintura: 23, cadera: 36, muslo: 19 },
  manzana: { hombro: 30.5, busto: 32, cintura: 31, cadera: 30.5, muslo: 16 },
  rectangulo: { hombro: 29.5, busto: 29, cintura: 27, cadera: 29.5, muslo: 16 },
  triangulo_invertido: { hombro: 34.5, busto: 32, cintura: 25, cadera: 28, muslo: 15 },
};

export type MedidasCm = {
  busto: number | null;
  cintura: number | null;
  cadera: number | null;
  estatura: number | null;
};

const entre = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Con medidas, el ancho sale de SU contorno: de frente, un torso mide
 * ~0.36 veces su circunferencia (no es un círculo, es más ancho que
 * hondo). La estatura escala todo: con el mismo contorno, una mujer más
 * alta se ve más estilizada.
 */
function anchosDe(silueta: Silueta, cm?: MedidasCm | null): Anchos {
  const base = PROPORCIONES[silueta];
  if (!cm?.busto || !cm.cintura || !cm.cadera) return base;
  const u = 314 / entre(cm.estatura ?? 160, 140, 195);
  const busto = entre(cm.busto * 0.177 * u, 22, 42);
  const cintura = entre(cm.cintura * 0.183 * u, 16, 42);
  const cadera = entre(cm.cadera * 0.185 * u, 24, 46);
  return {
    busto,
    cintura,
    cadera,
    hombro: entre(busto * (base.hombro / base.busto), 24, 40),
    muslo: entre(cadera * (base.muslo / base.cadera), 13, 23),
  };
}

// ---------------------------------------------------------------------
// Colores
// ---------------------------------------------------------------------
// Piel: el tono base y uno más hondo para el contorno y las sombras.
const PIEL: Record<TonoPiel, { base: string; sombra: string; labios: string }> = {
  blanca: { base: "#f4d9c6", sombra: "#d9ad93", labios: "#d7837f" },
  canela: { base: "#dcaa80", sombra: "#b98158", labios: "#bf6f64" },
  morena: { base: "#b27a52", sombra: "#8c5a39", labios: "#9e5548" },
  negra: { base: "#734a32", sombra: "#553421", labios: "#7d4036" },
};

const PELO: Record<string, string> = {
  negro: "#231c19",
  "castaño oscuro": "#3f2a1f",
  "castaño claro": "#7b5436",
  rubio: "#d6b26e",
  cobrizo: "#a4502c",
  canoso: "#b7b3ad",
  teñido: "#b0476f",
};

// La ropa, en tonos que conviven con cualquier piel: el rosado de la
// marca arriba y un gris carbón cálido abajo.
const ROPA = { top: "#eba7b8", topSombra: "#d9859b", leggings: "#3f3a44", zapatos: "#8b6b5c" };
const TRAZO = "rgba(58, 38, 34, 0.55)";

// ---------------------------------------------------------------------
// Curvas
// ---------------------------------------------------------------------
type Punto = [number, number];

/** Curva suave que pasa por todos los puntos (Catmull-Rom a Bézier). */
function curva(puntos: Punto[]): string {
  let d = "";
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;
    const c1: Punto = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Punto = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d;
}

const r = (n: number) => Math.round(n * 100) / 100;
const der = ([x, y]: Punto): Punto => [EJE + x, y];
const izq = ([x, y]: Punto): Punto => [EJE - x, y];

/** Un contorno cerrado que pasa por los puntos. */
function cerrado(puntos: Punto[]): string {
  return `M ${r(puntos[0][0])} ${r(puntos[0][1])}${curva(puntos)} Z`;
}

/** Un contorno simétrico: se da la mitad derecha, de arriba al eje de abajo. */
function simetrico(mitad: Punto[]): string {
  const d = mitad.map(der);
  const i = [...mitad].reverse().map(izq);
  return cerrado([...d, ...i.slice(1)]);
}

// ---------------------------------------------------------------------
// El cuerpo: un solo contorno, del cuello a los pies
// ---------------------------------------------------------------------
// Baja por fuera del lado derecho hasta el pie, sube por dentro de esa
// pierna hasta la entrepierna y hace lo mismo del otro lado. El espacio
// entre las piernas queda fuera del contorno, así que se ve vacío.
function entreMuslos(a: Anchos): number {
  return Math.max(1.8, a.cadera * 0.5 - a.muslo * 0.66);
}

function bordeExterior(a: Anchos): Punto[] {
  const rodilla = 6.3 + a.muslo * 0.13;
  return [
    [6.2, Y.menton - 6],
    [6, Y.cuello - 3],
    [7.6, Y.cuello + 2],
    [15, Y.cuello + 6.5],
    [a.hombro - 4, Y.hombro - 2.5],
    [a.hombro, Y.hombro + 2],
    [a.hombro - 1.2, Y.hombro + 10],
    [a.busto - 1.8, Y.axila],
    [a.busto, Y.busto],
    [a.busto - 2, Y.bajoBusto],
    [a.cintura, Y.cintura],
    [a.cintura + (a.cadera - a.cintura) * 0.62, Y.caderaAlta],
    [a.cadera, Y.cadera],
    [a.cadera - 1.4, Y.entrepierna],
    [entreMuslos(a) + a.muslo * 1.25, 208],
    [3.2 + rodilla * 2, Y.rodilla],
    [3.2 + rodilla * 2.05, Y.pantorrilla],
    [10.6, 295],
    [9.8, Y.tobillo],
  ];
}

function pie(): Punto[] {
  return [
    [9.8, Y.tobillo],
    [10.4, 313],
    [9.4, 320],
    [6.6, Y.piso + 0.6],
    [3.9, 319],
    [3.7, Y.tobillo + 2],
  ];
}

function bordeInterior(a: Anchos): Punto[] {
  return [
    [3.7, Y.tobillo + 2],
    [3.9, 295],
    [4.4, Y.pantorrilla],
    [3.2, Y.rodilla + 1],
    [entreMuslos(a), 208],
    [1.4, Y.entrepierna + 5],
    [0, Y.entrepierna],
  ];
}

function cuerpo(a: Anchos): string {
  return simetrico([...bordeExterior(a), ...pie().slice(1), ...bordeInterior(a).slice(1)]);
}

/** Ancho del torso a una altura, leyendo el mismo borde que dibuja el cuerpo. */
function torsoEn(a: Anchos, y: number): number {
  const b = bordeExterior(a);
  for (let i = 0; i < b.length - 1; i++) {
    const [x1, y1] = b[i];
    const [x2, y2] = b[i + 1];
    if (y >= y1 && y <= y2) return x1 + ((x2 - x1) * (y - y1)) / (y2 - y1);
  }
  return b[b.length - 1][0];
}

// ---------------------------------------------------------------------
// Los brazos
// ---------------------------------------------------------------------
// Van detrás del cuerpo y cuelgan casi rectos, apenas abiertos: no se
// meten hacia la cintura aunque sea angosta (un brazo no sigue esa
// curva), y pasan por fuera de la cadera. La punta de los dedos queda a
// media altura del muslo, como en un cuerpo real.
function brazo(a: Anchos): Punto[] {
  const tramos: Array<[number, number, number]> = [
    // [y, aire respecto al torso, grosor]
    [Y.axila, -0.6, 9.4],
    [108, 1, 8.6],
    [Y.cintura + 5, 2.2, 7.4],
    [160, 3, 6.3],
    [Y.entrepierna - 2, 3.4, 5.2],
  ];
  // Un cuerpo más lleno tiene brazos más llenos.
  const escala = entre((a.busto + a.cadera) / 64, 0.85, 1.45);
  let masAncho = 0;
  let anterior = 0;
  const pasos = tramos.map(([y, aire, g]) => {
    const grosor = g * escala;
    masAncho = Math.max(masAncho, torsoEn(a, y));
    const x = Math.max(torsoEn(a, y) + aire, masAncho - 3.5, anterior - 0.5);
    anterior = x;
    return { y, x, grosor };
  });
  const m = pasos[pasos.length - 1];
  const afuera: Punto[] = [
    [a.hombro - 3.5, Y.hombro - 3],
    [a.hombro + 3, Y.hombro + 6],
    ...pasos.map(({ y, x, grosor }): Punto => [x + grosor, y]),
    // Mano: un poco más ancha que la muñeca, con los dedos juntos.
    [m.x + m.grosor + 1.2, Y.entrepierna + 10],
    [m.x + m.grosor * 0.6, Y.entrepierna + 21],
    [m.x + m.grosor * 0.25, Y.entrepierna + 23],
  ];
  const adentro: Punto[] = [
    [m.x - 0.2, Y.entrepierna + 19],
    // El pulgar, que asoma hacia adelante.
    [m.x - 1.6, Y.entrepierna + 10],
    [m.x - 0.4, Y.entrepierna + 3],
    ...[...pasos].reverse().map(({ y, x }): Punto => [x, y]),
    [torsoEn(a, 74) - 4, 74],
    [a.hombro - 3.5, Y.hombro - 3],
  ];
  return [...afuera, ...adentro];
}

// ---------------------------------------------------------------------
// La ropa: zonas que se recortan con la forma del cuerpo
// ---------------------------------------------------------------------
/** El top de tiras: del escote al comienzo de la cadera. */
function zonaTop(a: Anchos): string {
  const tira = (a.hombro + 7) / 2;
  const mitad: Punto[] = [
    [0, Y.busto - 16],
    [6, Y.busto - 17],
    [tira - 3.4, Y.busto - 22],
    // La tira sube por el hombro, a mitad de camino entre el cuello y el borde.
    [tira - 2.2, Y.cuello - 4],
    [tira + 2.2, Y.cuello - 4],
    [tira + 2.8, Y.hombro + 2],
    [a.hombro - 5, Y.hombro + 12],
    [torsoEn(a, Y.axila) + 6, Y.axila + 1],
    [60, Y.axila + 2],
    [60, Y.caderaAlta + 2],
    [0, Y.caderaAlta + 4],
  ];
  const d = mitad.map(der);
  const i = [...mitad].reverse().map(izq);
  // Rectas: es un recorte, la curva la pone el cuerpo.
  return `M ${[...d, ...i.slice(1)].map(([x, y]) => `${r(x)} ${r(y)}`).join(" L ")} Z`;
}

function zonaEntre(desde: number, hasta: number): string {
  return `M 0 ${desde} L ${ANCHO} ${desde} L ${ANCHO} ${hasta} L 0 ${hasta} Z`;
}

/** Sombra suave bajo el busto, sobre la tela. */
function sombraBusto(a: Anchos, lado: typeof der): string {
  const p: Punto[] = [
    [a.busto - 3.5, Y.busto - 3],
    [a.busto - 7, Y.busto + 5],
    [a.busto * 0.5, Y.busto + 7.5],
    [3, Y.busto + 3.5],
  ].map((q) => lado(q as Punto));
  return `M ${r(p[0][0])} ${r(p[0][1])}${curva(p)}`;
}

// ---------------------------------------------------------------------
// Cabeza, cara y pelo
// ---------------------------------------------------------------------
const CARA = { cx: EJE, cy: Y.cabeza };

/** Cara ovalada: frente más ancha que la mandíbula, mentón suave. */
function cara(): string {
  const { cy } = CARA;
  return simetrico([
    [0, cy - 19.5],
    [9, cy - 17.5],
    [14.2, cy - 9],
    [14.6, cy + 1],
    [12.8, cy + 10],
    [8.6, cy + 16.6],
    [0, cy + 20.2],
  ]);
}

function orejas(): string[] {
  const { cx, cy } = CARA;
  return [-1, 1].map((l) => {
    const x = cx + l * 14.2;
    return `M ${x} ${cy - 1} C ${x + l * 3.6} ${cy - 3} ${x + l * 3.8} ${cy + 5.5} ${x} ${cy + 6} Z`;
  });
}

/** Rasgos sencillos: lo justo para que se lea como una persona. */
function rasgos(piel: (typeof PIEL)[TonoPiel], pelo: string) {
  const { cx, cy } = CARA;
  return (
    <g>
      {[-1, 1].map((l) => (
        <g key={l}>
          <ellipse cx={cx + l * 5.2} cy={cy + 1.8} rx={1.55} ry={1.05} fill="#2a1f1b" />
          <path
            d={`M ${cx + l * 2.6} ${cy - 2.6} Q ${cx + l * 5.4} ${cy - 4.6} ${cx + l * 8.2} ${cy - 2.9}`}
            stroke={pelo}
            strokeWidth={1.15}
            fill="none"
            strokeLinecap="round"
          />
          <circle cx={cx + l * 8} cy={cy + 8} r={3} fill="#db627f" opacity={0.14} />
        </g>
      ))}
      <path
        d={`M ${cx - 0.3} ${cy + 3.5} Q ${cx - 1.6} ${cy + 8} ${cx + 0.2} ${cy + 8.7}`}
        stroke={piel.sombra}
        strokeWidth={0.9}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - 3.8} ${cy + 12.2} Q ${cx} ${cy + 10.6} ${cx + 3.8} ${cy + 12.2} Q ${cx} ${cy + 14.8} ${cx - 3.8} ${cy + 12.2} Z`}
        fill={piel.labios}
      />
    </g>
  );
}

type Largo = "muy corto" | "corto" | "media melena" | "largo" | "muy largo";

// Hasta dónde cae el pelo, según el largo del perfil.
const HASTA: Record<Largo, number> = {
  "muy corto": Y.menton - 14,
  corto: Y.menton + 3,
  "media melena": Y.hombro + 6,
  largo: Y.busto + 4,
  "muy largo": Y.cintura - 2,
};

/** La masa de pelo de atrás: se ve a los lados del cuello y los hombros. */
function peloAtras(largo: Largo): string | null {
  if (largo === "muy corto") return null;
  const { cy } = CARA;
  const hasta = HASTA[largo];
  const ancho = largo === "corto" ? 17.5 : 19.5;
  return simetrico([
    [0, cy - 22.5],
    [11, cy - 20],
    [17.4, cy - 9],
    [ancho, cy + 6],
    [ancho + (largo === "corto" ? 0 : 1.5), hasta - 10],
    [ancho - 2.5, hasta],
    [8, hasta - (largo === "corto" ? 2 : 4)],
    [0, hasta - 6],
  ]);
}

/**
 * El pelo de adelante: la parte de arriba de la cabeza con raya al
 * lado, que enmarca la cara. En los largos, dos mechones caen por
 * delante de los hombros — sin ellos, de frente el pelo largo no se ve.
 */
function peloAdelante(largo: Largo): string[] {
  const { cx, cy } = CARA;
  const cap = cerrado([
    [cx - 15.6, cy + 4],
    [cx - 16.2, cy - 8],
    [cx - 10.5, cy - 19],
    [cx + 1, cy - 22.8],
    [cx + 11.5, cy - 19],
    [cx + 16.4, cy - 7],
    [cx + 15.8, cy + 6],
    [cx + 13.4, cy - 3],
    [cx + 8.5, cy - 11.2],
    [cx - 1.5, cy - 13.2],
    [cx - 9.5, cy - 9],
    [cx - 13.6, cy - 1],
  ]);
  if (largo === "muy corto" || largo === "corto") return [cap];
  const hasta = HASTA[largo];
  const afuera = largo === "media melena" ? 20 : 22.5;
  const mechones = [-1, 1].map((l) =>
    cerrado([
      [cx + l * 13.5, cy - 4],
      [cx + l * 16.8, cy + 2],
      [cx + l * 18.6, cy + 16],
      [cx + l * afuera, hasta - 6],
      [cx + l * (afuera - 2.5), hasta + 1],
      [cx + l * (afuera - 9), hasta - 4],
      [cx + l * 12.4, Y.menton + 8],
      [cx + l * 12.6, cy + 12],
      [cx + l * 13.2, cy + 2],
    ])
  );
  return [cap, ...mechones];
}

function normalizarLargo(largo?: string | null): Largo {
  const valido: Largo[] = ["muy corto", "corto", "media melena", "largo", "muy largo"];
  return valido.includes(largo as Largo) ? (largo as Largo) : "media melena";
}

export default function SiluetaIcon({
  silueta,
  tonoPiel,
  colorCabello,
  largoCabello,
  medidas,
  className,
}: {
  silueta: Silueta;
  tonoPiel?: TonoPiel | null;
  colorCabello?: string | null;
  largoCabello?: string | null;
  medidas?: MedidasCm | null;
  className?: string;
}) {
  const a = anchosDe(silueta, medidas);
  const piel = PIEL[tonoPiel ?? "canela"];
  const pelo = PELO[colorCabello ?? ""] ?? PELO["castaño oscuro"];
  const largo = normalizarLargo(largoCabello);
  // Único por figura: con un id fijo, dos figuras en la misma página
  // recortarían la ropa con la forma de la primera.
  const idRecorte = `cuerpo-${useId().replace(/:/g, "")}`;
  const cuerpoD = cuerpo(a);
  const atras = peloAtras(largo);

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className={className} aria-hidden>
      <defs>
        <clipPath id={idRecorte}>
          <path d={cuerpoD} />
        </clipPath>
      </defs>
      <g stroke={TRAZO} strokeWidth={0.9} strokeLinejoin="round">
        {atras && <path d={atras} fill={pelo} stroke="none" />}
        {[brazo(a).map(der), brazo(a).map(izq)].map((p, i) => (
          <path key={i} d={cerrado(p)} fill={piel.base} />
        ))}
        <path d={cuerpoD} fill={piel.base} />
        <g clipPath={`url(#${idRecorte})`} stroke="none">
          <path d={zonaEntre(Y.caderaAlta - 1, Y.tobillo + 1)} fill={ROPA.leggings} />
          <path d={zonaEntre(Y.tobillo + 1, ALTO)} fill={ROPA.zapatos} />
          <path d={zonaTop(a)} fill={ROPA.top} />
          {/* Sombra bajo el mentón, para que la cabeza no se vea pegada. */}
          <ellipse cx={EJE} cy={Y.menton + 1} rx={8} ry={4} fill={piel.sombra} opacity={0.55} />
        </g>
        <g fill="none" stroke={ROPA.topSombra} strokeWidth={1}>
          <path d={sombraBusto(a, der)} />
          <path d={sombraBusto(a, izq)} />
        </g>
        {/* Se repasa el borde del cuerpo encima de la ropa. */}
        <path d={cuerpoD} fill="none" />
        {orejas().map((d, i) => (
          <path key={i} d={d} fill={piel.base} />
        ))}
        <path d={cara()} fill={piel.base} />
        <g stroke="none">{rasgos(piel, pelo)}</g>
        {peloAdelante(largo).map((d, i) => (
          <path key={i} d={d} fill={pelo} stroke="none" />
        ))}
      </g>
    </svg>
  );
}
