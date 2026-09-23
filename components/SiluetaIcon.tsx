import type { Silueta } from "@/types";

// =====================================================================
// Figura femenina — un solo contorno por mitad, no piezas pegadas
// =====================================================================
// Los intentos anteriores armaban el cuerpo con piezas sueltas (torso,
// brazos, piernas como formas independientes) y usaban una máscara para
// separar el brazo del torso donde se encimaban. El resultado se veía
// como partes pegadas, no como un cuerpo.
//
// Este va distinto: EL TORSO Y LAS PIERNAS SON UN SOLO CONTORNO
// CERRADO, de hombro a tobillo, igual que se dibuja un figurín de moda
// a mano — una sola línea continua por lado. Eso es lo que hace que se
// lea como un cuerpo y no como una silueta armada con recortes.
//
// Los brazos SÍ son una pieza aparte, pero sin máscara: cuelgan a un
// costado con un espacio natural respecto al torso (como cuelga un
// brazo real, que no toca las costillas de axila a muñeca), así que no
// hace falta recortar nada — el espacio ya existe en las coordenadas.
//
// Proporción de figurín (~8.5 cabezas), sobre un lienzo de 130 x 320
// con el eje del cuerpo en x = 65.
// =====================================================================

const EJE = 65;

// El torso ocupa un poco menos y las piernas un poco más que la
// proporción real — es el mismo alargamiento que usa cualquier figurín
// de moda, y es lo que hace que una figura se vea elegante en vez de
// achaparrada.
const Y = {
  coronilla: 10,
  menton: 40,
  cuello: 45,
  hombro: 60,
  busto: 84,
  cintura: 124,
  cadera: 158,
  entrepierna: 172,
  rodilla: 236,
  tobillo: 300,
  piso: 312,
  codo: 152,
  muneca: 190,
};

const CABEZA = { cx: EJE, cy: 26, rx: 12, ry: 16 };

type Medidas = {
  hombro: number;
  busto: number;
  cintura: number;
  cadera: number;
  muslo: number;
};

// Los cuatro anchos que distinguen cada silueta. El muslo se deriva de
// la cadera (más angosto), no se pregunta aparte.
const MEDIDAS: Record<Silueta, Medidas> = {
  reloj_de_arena: { hombro: 25, busto: 27, cintura: 15, cadera: 27, muslo: 15 },
  pera: { hombro: 20, busto: 21, cintura: 17, cadera: 30, muslo: 17 },
  manzana: { hombro: 24, busto: 26, cintura: 27, cadera: 23, muslo: 13 },
  rectangulo: { hombro: 23, busto: 22, cintura: 21, cadera: 23, muslo: 13 },
  triangulo_invertido: { hombro: 30, busto: 27, cintura: 19, cadera: 20, muslo: 12 },
};

const iz = (w: number) => EJE - w;
const de = (w: number) => EJE + w;

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
 * Cabeza simple, sin mechones sueltos. Se intentó varias veces dibujar
 * pelo con tiras aparte y siempre terminaba viéndose como manchas
 * flotando junto a la cara — vale más una forma limpia que una con
 * partes que no se leen bien. La silueta entera es de un solo color,
 * así que el pelo no se puede diferenciar por color de todos modos;
 * solo quedaría bien si fuera un volumen claramente de peinado (una
 * cola, un moño), y eso es más ruido del que vale la pena para este
 * ícono pequeño.
 */
function cabello(): string[] {
  return [];
}

/** Cuello con un borde curvo, no un trapecio de esquinas duras. */
function cuello(): string {
  return [
    `M ${iz(4)} ${Y.menton - 2}`,
    `C ${iz(4)} ${Y.cuello - 2} ${iz(6)} ${Y.cuello} ${iz(7)} ${Y.cuello + 7}`,
    `L ${de(7)} ${Y.cuello + 7}`,
    `C ${de(6)} ${Y.cuello} ${de(4)} ${Y.cuello - 2} ${de(4)} ${Y.menton - 2}`,
    "Z",
  ].join(" ");
}

/**
 * El torso: de hombro a cadera, como un solo contorno cerrado con el
 * borde de abajo recto (de una pierna a la otra). Antes esto seguía
 * hasta el tobillo en un solo trazo, y la única forma de "salir" y
 * "volver a entrar" para las dos piernas era subir por la entrepierna
 * — pero un trazo que sube y baja sigue siendo UNA superficie rellena:
 * el espacio entre las piernas quedaba pintado en vez de vacío.
 *
 * Por eso el torso para acá, en una línea recta a la altura de la
 * entrepierna, y las piernas son dos piezas aparte (ver pierna()) que
 * arrancan un poco MÁS ARRIBA de esa línea para solaparse con el
 * torso — mismo color, así que el solape no se nota, y evita que quede
 * una costura blanca si algún punto no calza exacto.
 */
function torso(m: Medidas, ejePiernaIz: number, ejePiernaDe: number, anchoMuslo: number): string {
  const solape = 6;
  return [
    `M ${iz(6)} ${Y.cuello + 4}`,
    `C ${iz(9)} ${Y.cuello + 10} ${iz(m.hombro - 8)} ${Y.hombro - 10} ${iz(m.hombro)} ${Y.hombro}`,
    `C ${iz(m.hombro + 2)} ${Y.hombro + 14} ${iz(m.busto)} ${Y.busto - 16} ${iz(m.busto)} ${Y.busto}`,
    `C ${iz(m.busto)} ${Y.busto + 20} ${iz(m.cintura + 3)} ${Y.cintura - 18} ${iz(m.cintura)} ${Y.cintura}`,
    `C ${iz(m.cintura)} ${Y.cintura + 16} ${iz(m.cadera)} ${Y.cadera - 20} ${iz(m.cadera)} ${Y.cadera}`,
    `C ${iz(m.cadera)} ${Y.cadera + 10} ${ejePiernaIz - anchoMuslo} ${Y.entrepierna - solape - 6} ${ejePiernaIz - anchoMuslo} ${Y.entrepierna + solape}`,
    `L ${ejePiernaDe + anchoMuslo} ${Y.entrepierna + solape}`,
    `C ${ejePiernaDe + anchoMuslo} ${Y.entrepierna - solape - 6} ${de(m.cadera)} ${Y.cadera + 10} ${de(m.cadera)} ${Y.cadera}`,
    `C ${de(m.cadera)} ${Y.cadera - 20} ${de(m.cintura)} ${Y.cintura + 16} ${de(m.cintura)} ${Y.cintura}`,
    `C ${de(m.cintura + 3)} ${Y.cintura - 18} ${de(m.busto)} ${Y.busto + 20} ${de(m.busto)} ${Y.busto}`,
    `C ${de(m.busto)} ${Y.busto - 16} ${de(m.hombro + 2)} ${Y.hombro + 14} ${de(m.hombro)} ${Y.hombro}`,
    `C ${de(m.hombro - 8)} ${Y.hombro - 10} ${de(9)} ${Y.cuello + 10} ${de(6)} ${Y.cuello + 4}`,
    "Z",
  ].join(" ");
}

/**
 * Una pierna, de la cadera al pie. Arranca un poco más arriba de la
 * línea de entrepierna para solaparse con el torso (ver torso() arriba)
 * y se angosta hacia el tobillo por su PROPIO eje, no por el eje del
 * cuerpo — así se puede inclinar o angostar sin romper el contorno.
 */
function pierna(eje: number, anchoMuslo: number, lado: -1 | 1): string {
  const x = (w: number) => eje + w; // ya viene con el signo aplicado
  const anchoRodilla = anchoMuslo * 0.62;
  const anchoTobillo = anchoMuslo * 0.42;
  const solape = 6;

  return [
    `M ${x(-anchoMuslo)} ${Y.entrepierna - solape}`,
    `C ${x(-anchoMuslo)} ${Y.entrepierna + 30} ${x(-anchoRodilla)} ${Y.rodilla - 24} ${x(-anchoRodilla)} ${Y.rodilla}`,
    `C ${x(-anchoRodilla)} ${Y.rodilla + 26} ${x(-anchoTobillo)} ${Y.tobillo - 18} ${x(-anchoTobillo)} ${Y.tobillo}`,
    // Pie: un óvalo achatado, no una punta — un pie real es redondeado.
    `C ${x(-anchoTobillo)} ${Y.piso - 5} ${x(-anchoTobillo - 5)} ${Y.piso} ${x(-anchoTobillo + 2)} ${Y.piso}`,
    `L ${x(anchoTobillo + 3)} ${Y.piso}`,
    `C ${x(anchoTobillo + 5)} ${Y.piso} ${x(anchoTobillo)} ${Y.piso - 6} ${x(anchoTobillo)} ${Y.tobillo}`,
    `C ${x(anchoTobillo)} ${Y.tobillo - 18} ${x(anchoRodilla)} ${Y.rodilla + 26} ${x(anchoRodilla)} ${Y.rodilla}`,
    `C ${x(anchoRodilla)} ${Y.rodilla - 24} ${x(anchoMuslo)} ${Y.entrepierna + 30} ${x(anchoMuslo)} ${Y.entrepierna - solape}`,
    "Z",
  ].join(" ");
}

/**
 * Un brazo colgando al costado, con una leve flexión en el codo. Cuelga
 * SEPARADO del torso a propósito —de axila a muñeca un brazo real no
 * toca las costillas— así que no hace falta ninguna máscara: el espacio
 * ya sale de las coordenadas.
 */
function brazo(m: Medidas, lado: -1 | 1): string {
  const x = (w: number) => EJE + lado * w;
  // Sale un poco por fuera del hombro y se aleja del cuerpo hacia abajo.
  const salida = m.hombro - 3;
  const codo = m.hombro + 10;
  const muneca = m.hombro + 6;
  const grHombro = 6;
  const grCodo = 4.3;
  const grMuneca = 3.2;

  return [
    `M ${x(salida - grHombro)} ${Y.hombro - 2}`,
    `C ${x(salida + grHombro)} ${Y.hombro} ${x(codo + grCodo)} ${Y.codo - 26} ${x(codo + grCodo)} ${Y.codo}`,
    `C ${x(codo + grCodo)} ${Y.codo + 20} ${x(muneca + grMuneca)} ${Y.muneca - 16} ${x(muneca + grMuneca)} ${Y.muneca}`,
    `C ${x(muneca + grMuneca)} ${Y.muneca + 10} ${x(muneca - grMuneca)} ${Y.muneca + 10} ${x(muneca - grMuneca)} ${Y.muneca}`,
    `C ${x(muneca - grMuneca)} ${Y.muneca - 16} ${x(codo - grCodo)} ${Y.codo + 20} ${x(codo - grCodo)} ${Y.codo}`,
    `C ${x(codo - grCodo)} ${Y.codo - 26} ${x(salida - grHombro)} ${Y.hombro} ${x(salida - grHombro)} ${Y.hombro - 2}`,
    "Z",
  ].join(" ");
}

export function partes(m: Medidas): string[] {
  const anchoMuslo = m.muslo;
  // Cada pierna nace un poco hacia adentro de donde termina la cadera,
  // para que las dos quepan sin encimarse ni dejar un vacío raro entre
  // el borde de la cadera y el arranque del muslo.
  const ejePiernaIz = EJE - Math.max(m.cadera * 0.42, anchoMuslo * 0.75);
  const ejePiernaDe = EJE + Math.max(m.cadera * 0.42, anchoMuslo * 0.75);

  return [
    ...cabello(),
    elipse(CABEZA.cx, CABEZA.cy, CABEZA.rx, CABEZA.ry),
    cuello(),
    torso(m, ejePiernaIz, ejePiernaDe, anchoMuslo),
    pierna(ejePiernaIz, anchoMuslo, -1),
    pierna(ejePiernaDe, anchoMuslo, 1),
    brazo(m, -1),
    brazo(m, 1),
  ];
}

export { MEDIDAS };

// Silueta ilustrada, usada en el manual de asesoría y en el perfil de la
// usuaria — y más adelante, como base del Avatar.
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
      <g fill="currentColor" opacity="0.9">
        {partes(m).map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
