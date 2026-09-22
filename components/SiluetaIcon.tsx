import type { Silueta } from "@/types";

// =====================================================================
// Figura femenina — la misma mujer con cinco proporciones distintas
// =====================================================================
// Lo único que cambia entre siluetas son cuatro anchos: hombro, busto,
// cintura y cadera. Todo lo demás (cabeza, pelo, brazos, piernas) es
// idéntico, para que al comparar dos siluetas salte a la vista qué es
// lo que de verdad las diferencia.
//
// Proporciones de figurín de moda: unas 8 cabezas de alto, que es como
// se dibuja en asesoría de imagen. Una figura "realista" de 7 cabezas
// se ve pesada al tamaño chiquito en que esto se muestra.
//
// Todo en medias anchuras (del eje al borde), sobre un lienzo de
// 140 x 340 con el eje del cuerpo en x = 70.
// =====================================================================

const EJE = 70;

// Alturas compartidas por todas las siluetas.
const Y = {
  coronilla: 12,
  menton: 46,
  cuello: 52,
  hombro: 68,
  busto: 92,
  cintura: 124,
  cadera: 162,
  entrepierna: 192,
  rodilla: 248,
  pantorrilla: 274,
  tobillo: 308,
  piso: 318,
  muneca: 186,
};

const CABEZA = { cx: EJE, cy: 29, rx: 12.5, ry: 17 };

type Medidas = {
  hombro: number;
  busto: number;
  cintura: number;
  cadera: number;
  muslo: number;
};

const MEDIDAS: Record<Silueta, Medidas> = {
  // Hombro y cadera parejos, cintura muy marcada.
  reloj_de_arena: { hombro: 26, busto: 28, cintura: 15, cadera: 28, muslo: 23 },
  // Cadera claramente más ancha que el hombro.
  pera: { hombro: 21, busto: 22, cintura: 18, cadera: 32, muslo: 27 },
  // El medio es la parte más ancha; hombros y piernas más finos.
  manzana: { hombro: 25, busto: 27, cintura: 29, cadera: 24, muslo: 20 },
  // Los tres anchos casi iguales: la línea cae recta.
  rectangulo: { hombro: 24, busto: 23, cintura: 22, cadera: 24, muslo: 20 },
  // Hombro ancho, cadera angosta.
  triangulo_invertido: { hombro: 32, busto: 29, cintura: 20, cadera: 21, muslo: 18 },
};

const iz = (w: number) => EJE - w;
const de = (w: number) => EJE + w;

/** Elipse como path, para que todo el dibujo sean paths iguales. */
function elipse(cx: number, cy: number, rx: number, ry: number): string {
  const k = 0.5523; // constante para aproximar un arco con una cúbica
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
 * Melena hasta el hombro. No es adorno: es lo que hace que la figura se
 * lea como una mujer de una, sin tener que dibujarle la cara.
 *
 * Son tres piezas sueltas y no un solo contorno. Dibujarla de un trazo
 * obligaba a rodear la cabeza y volver, y en el cruce quedaba un pico
 * feo justo en la coronilla. Tres formas que se superponen no tienen
 * ese problema: como van en el mismo grupo y con el mismo color, se ven
 * como una sola.
 */
function cabello(): string[] {
  const { cx, cy, rx, ry } = CABEZA;
  // Casquete: la misma cabeza, un poco más grande y subida.
  const casquete = elipse(cx, cy - 1.5, rx + 3.5, ry + 2.5);

  // Un mechón que cae por el costado hasta el hombro.
  const mechon = (lado: -1 | 1) => {
    const x = (w: number) => cx + lado * w;
    return [
      `M ${x(rx + 3)} ${cy - 2}`,
      `C ${x(rx + 4)} ${cy + 14} ${x(rx + 3)} ${Y.cuello + 2} ${x(rx + 1)} ${Y.hombro + 3}`,
      `L ${x(rx - 5)} ${Y.hombro + 1}`,
      `C ${x(rx - 3)} ${Y.cuello} ${x(rx - 2)} ${cy + 12} ${x(rx - 2)} ${cy - 2}`,
      "Z",
    ].join(" ");
  };

  return [casquete, mechon(-1), mechon(1)];
}

/** Cuello, ligeramente más angosto arriba que abajo. */
function cuello(): string {
  return [
    `M ${iz(4.5)} ${Y.menton - 4}`,
    `L ${de(4.5)} ${Y.menton - 4}`,
    `C ${de(5)} ${Y.cuello + 2} ${de(7)} ${Y.cuello + 4} ${de(8)} ${Y.cuello + 8}`,
    `L ${iz(8)} ${Y.cuello + 8}`,
    `C ${iz(7)} ${Y.cuello + 4} ${iz(5)} ${Y.cuello + 2} ${iz(4.5)} ${Y.menton - 4}`,
    "Z",
  ].join(" ");
}

/**
 * Contorno del torso, del cuello al arranque de los muslos.
 *
 * Se recorre en seis tramos en vez de cuatro: el pecho y el bajo busto
 * van aparte del hombro y de la cintura. Con menos tramos la curva se
 * "pasaba de largo" y el busto se comía la cintura, que es justo lo que
 * hay que poder ver.
 */
function torso(m: Medidas): string {
  const lado = (f: (w: number) => number) =>
    [
      // Trapecio: del cuello a la punta del hombro
      `C ${f(9)} ${Y.cuello + 8} ${f(m.hombro - 9)} ${Y.hombro - 8} ${f(m.hombro)} ${Y.hombro}`,
      // Hombro → busto
      `C ${f(m.hombro + 1)} ${Y.hombro + 10} ${f(m.busto)} ${Y.busto - 10} ${f(m.busto)} ${Y.busto}`,
      // Busto → bajo busto (empieza a entrar)
      `C ${f(m.busto)} ${Y.busto + 9} ${f((m.busto + m.cintura) / 2 + 1)} ${Y.busto + 14} ${f((m.busto + m.cintura) / 2)} ${Y.cintura - 14}`,
      // Bajo busto → cintura
      `C ${f(m.cintura + 1)} ${Y.cintura - 7} ${f(m.cintura)} ${Y.cintura - 3} ${f(m.cintura)} ${Y.cintura}`,
      // Cintura → cadera
      `C ${f(m.cintura)} ${Y.cintura + 13} ${f(m.cadera - 1)} ${Y.cadera - 16} ${f(m.cadera)} ${Y.cadera}`,
      // Cadera → muslo
      `C ${f(m.cadera)} ${Y.cadera + 14} ${f(m.muslo + 3)} ${Y.entrepierna - 12} ${f(m.muslo)} ${Y.entrepierna}`,
    ].join(" ");

  // El lado derecho es el mismo recorrido al revés: los mismos puntos
  // en orden inverso, que para una cúbica es intercambiar los dos
  // puntos de control.
  const vuelta = [
    `C ${de(m.muslo + 3)} ${Y.entrepierna - 12} ${de(m.cadera)} ${Y.cadera + 14} ${de(m.cadera)} ${Y.cadera}`,
    `C ${de(m.cadera - 1)} ${Y.cadera - 16} ${de(m.cintura)} ${Y.cintura + 13} ${de(m.cintura)} ${Y.cintura}`,
    `C ${de(m.cintura)} ${Y.cintura - 3} ${de(m.cintura + 1)} ${Y.cintura - 7} ${de((m.busto + m.cintura) / 2)} ${Y.cintura - 14}`,
    `C ${de((m.busto + m.cintura) / 2 + 1)} ${Y.busto + 14} ${de(m.busto)} ${Y.busto + 9} ${de(m.busto)} ${Y.busto}`,
    `C ${de(m.busto)} ${Y.busto - 10} ${de(m.hombro + 1)} ${Y.hombro + 10} ${de(m.hombro)} ${Y.hombro}`,
    `C ${de(m.hombro - 9)} ${Y.hombro - 8} ${de(9)} ${Y.cuello + 8} ${de(7)} ${Y.cuello + 6}`,
  ].join(" ");

  return [
    `M ${iz(7)} ${Y.cuello + 6}`,
    lado(iz),
    `L ${de(m.muslo)} ${Y.entrepierna}`,
    vuelta,
    "Z",
  ].join(" ");
}

/**
 * Una pierna. `lado` es -1 (izquierda) o 1 (derecha).
 *
 * Se define por el eje de la pierna y su grosor a cuatro alturas, no
 * por sus dos bordes: así el tobillo no queda en punta. La pantorrilla
 * va aparte de la rodilla porque sin ella la pierna se ve como un palo
 * que se adelgaza parejo, que es lo que se veía feo.
 */
function pierna(m: Medidas, lado: -1 | 1): string {
  const x = (w: number) => EJE + lado * w;
  const eje = {
    muslo: m.muslo * 0.5,
    rodilla: m.muslo * 0.43,
    pantorrilla: m.muslo * 0.4,
    tobillo: m.muslo * 0.34,
  };
  const gr = {
    muslo: m.muslo * 0.48,
    rodilla: m.muslo * 0.23,
    pantorrilla: m.muslo * 0.27,
    tobillo: m.muslo * 0.12,
  };

  return [
    // Borde externo, de la cadera al tobillo
    `M ${x(eje.muslo + gr.muslo)} ${Y.entrepierna - 12}`,
    `C ${x(eje.muslo + gr.muslo)} ${Y.entrepierna + 22} ${x(eje.rodilla + gr.rodilla + 1)} ${Y.rodilla - 22} ${x(eje.rodilla + gr.rodilla)} ${Y.rodilla}`,
    `C ${x(eje.pantorrilla + gr.pantorrilla)} ${Y.rodilla + 12} ${x(eje.pantorrilla + gr.pantorrilla)} ${Y.pantorrilla} ${x(eje.tobillo + gr.tobillo)} ${Y.tobillo}`,
    // Pie
    `C ${x(eje.tobillo + gr.tobillo)} ${Y.piso - 3} ${x(eje.tobillo + gr.tobillo + 3)} ${Y.piso} ${x(eje.tobillo + gr.tobillo + 2)} ${Y.piso}`,
    `L ${x(eje.tobillo - gr.tobillo - 1)} ${Y.piso}`,
    // Borde interno, de vuelta hacia arriba
    `C ${x(eje.tobillo - gr.tobillo)} ${Y.pantorrilla + 10} ${x(eje.pantorrilla - gr.pantorrilla)} ${Y.pantorrilla} ${x(eje.rodilla - gr.rodilla)} ${Y.rodilla}`,
    `C ${x(eje.rodilla - gr.rodilla - 1)} ${Y.rodilla - 22} ${x(eje.muslo - gr.muslo)} ${Y.entrepierna + 22} ${x(eje.muslo - gr.muslo)} ${Y.entrepierna - 12}`,
    "Z",
  ].join(" ");
}

/** Los anchos que definen por dónde cae el brazo. */
function anchosBrazo(m: Medidas) {
  // El codo y la muñeca se miden contra la parte MÁS ancha del cuerpo,
  // no contra el hombro. Si no, en la manzana —donde lo ancho es el
  // medio— el brazo se lo tragaba el torso y la figura quedaba sin
  // brazos. Y en el reloj de arena el brazo tapaba la cintura, que es
  // justo lo que hay que poder ver.
  const masAncho = Math.max(m.hombro, m.cintura, m.cadera);
  return {
    hombro: m.hombro - 1,
    codo: masAncho + 4,
    muneca: masAncho + 10,
  };
}

/**
 * Un brazo, con una leve flexión en el codo. Cae por fuera del cuerpo a
 * propósito: pegado al costado taparía la cintura, que es justo lo que
 * distingue una silueta de otra.
 */
function brazo(m: Medidas, lado: -1 | 1): string {
  const x = (w: number) => EJE + lado * w;
  const a = anchosBrazo(m);
  const grHombro = 6.5;
  const grCodo = 4.5;
  const grMuneca = 3;

  return [
    `M ${x(a.hombro - grHombro)} ${Y.hombro - 3}`,
    // Borde externo: hombro → codo → muñeca
    `C ${x(a.hombro + grHombro)} ${Y.hombro - 1} ${x(a.codo + grCodo)} ${Y.cintura - 22} ${x(a.codo + grCodo)} ${Y.cintura + 2}`,
    `C ${x(a.codo + grCodo)} ${Y.cintura + 24} ${x(a.muneca + grMuneca)} ${Y.muneca - 22} ${x(a.muneca + grMuneca)} ${Y.muneca}`,
    // Mano
    `C ${x(a.muneca + grMuneca)} ${Y.muneca + 9} ${x(a.muneca - grMuneca)} ${Y.muneca + 9} ${x(a.muneca - grMuneca)} ${Y.muneca}`,
    // Borde interno, de vuelta al hombro
    `C ${x(a.muneca - grMuneca)} ${Y.muneca - 22} ${x(a.codo - grCodo)} ${Y.cintura + 24} ${x(a.codo - grCodo)} ${Y.cintura + 2}`,
    `C ${x(a.codo - grCodo)} ${Y.cintura - 22} ${x(a.hombro - grHombro)} ${Y.hombro + 20} ${x(a.hombro - grHombro)} ${Y.hombro - 3}`,
    "Z",
  ].join(" ");
}

/**
 * El borde interno del brazo, como línea abierta. Se usa de recorte:
 * trazado en negro dentro de una máscara, abre un hueco transparente
 * entre el brazo y el torso. Hace falta porque en algunas siluetas el
 * brazo roza el cuerpo y sin esa separación se ven pegados.
 *
 * Arranca por debajo del hombro para que el brazo siga unido ahí.
 */
function bordeBrazo(m: Medidas, lado: -1 | 1): string {
  const x = (w: number) => EJE + lado * w;
  const a = anchosBrazo(m);
  return [
    `M ${x(a.hombro - 6.5)} ${Y.hombro + 12}`,
    `C ${x(a.codo - 4.5)} ${Y.cintura - 18} ${x(a.codo - 4.5)} ${Y.cintura + 24} ${x(a.muneca - 3)} ${Y.muneca}`,
  ].join(" ");
}

/** Todas las piezas rellenas, en orden de dibujo. */
export function partes(m: Medidas): string[] {
  return [
    ...cabello(),
    elipse(CABEZA.cx, CABEZA.cy, CABEZA.rx, CABEZA.ry),
    cuello(),
    torso(m),
    pierna(m, -1),
    pierna(m, 1),
    brazo(m, -1),
    brazo(m, 1),
  ];
}

/** Líneas que se recortan del dibujo (ver bordeBrazo). */
export function recortes(m: Medidas): string[] {
  return [bordeBrazo(m, -1), bordeBrazo(m, 1)];
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
  // El id se deriva de la silueta y no de un contador: si en una misma
  // página hay dos figuras iguales comparten máscara, que es idéntica,
  // y dos siluetas distintas nunca chocan.
  const mascara = `silueta-corte-${silueta}`;
  return (
    <svg viewBox="0 0 140 340" className={className} aria-hidden>
      <mask id={mascara}>
        <rect width="140" height="340" fill="white" />
        {recortes(m).map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="black"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </mask>
      {/* La opacidad va en el grupo, no en cada parte: si fuera por
          parte, los brazos y las piernas dejarían costuras más oscuras
          donde se montan sobre el torso. */}
      <g fill="currentColor" opacity="0.9" mask={`url(#${mascara})`}>
        {partes(m).map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
