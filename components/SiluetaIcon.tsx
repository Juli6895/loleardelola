import type { Silueta } from "@/types";

// =====================================================================
// Figura femenina completa — cabeza, brazos y piernas incluidos.
// =====================================================================
// Antes era solo un torso abstracto y no se entendía qué se estaba
// mirando. Ahora se dibuja una mujer de cuerpo entero y lo único que
// cambia entre siluetas son cuatro anchos: hombro, busto, cintura y
// cadera. Así la diferencia entre un reloj de arena y una pera se ve de
// una, porque es la misma figura con otras proporciones.
//
// Los brazos van separados del torso a propósito: pegados al cuerpo
// taparían justo la cintura, que es lo que hay que poder ver.
//
// Todo está en medias anchuras (del eje al borde), sobre un lienzo de
// 120 x 300 con el eje del cuerpo en x = 60.

const EJE = 60;

// Alturas compartidas por todas las siluetas.
const Y = {
  cuello: 48,
  hombro: 72,
  busto: 92,
  cintura: 134,
  cadera: 164,
  muslo: 196,
  muneca: 178,
  tobillo: 288,
};

type Medidas = {
  hombro: number;
  busto: number;
  cintura: number;
  cadera: number;
  muslo: number;
};

const MEDIDAS: Record<Silueta, Medidas> = {
  // Hombro y cadera parejos, cintura muy marcada.
  reloj_de_arena: { hombro: 27, busto: 28, cintura: 15, cadera: 28, muslo: 24 },
  // Cadera claramente más ancha que el hombro.
  pera: { hombro: 21, busto: 21, cintura: 18, cadera: 32, muslo: 28 },
  // El medio es la parte más ancha; hombros y piernas más finos.
  manzana: { hombro: 25, busto: 26, cintura: 29, cadera: 24, muslo: 21 },
  // Los tres anchos casi iguales: la línea baja recta.
  rectangulo: { hombro: 24, busto: 23, cintura: 22, cadera: 24, muslo: 21 },
  // Hombro ancho, cadera angosta.
  triangulo_invertido: {
    hombro: 33,
    busto: 30,
    cintura: 20,
    cadera: 21,
    muslo: 19,
  },
};

const iz = (w: number) => EJE - w;
const de = (w: number) => EJE + w;

/** Contorno del torso: del cuello al arranque de los muslos. */
function torso(m: Medidas): string {
  const lado = (f: (w: number) => number) =>
    [
      // Hombro
      `C ${f(10)} ${Y.cuello + 8} ${f(m.hombro - 9)} ${Y.hombro - 12} ${f(m.hombro)} ${Y.hombro}`,
      // Busto → cintura
      `C ${f(m.busto)} ${Y.busto} ${f(m.busto)} ${Y.busto + 10} ${f(m.cintura)} ${Y.cintura}`,
      // Cintura → cadera
      `C ${f(m.cintura)} ${Y.cintura + 12} ${f(m.cadera)} ${Y.cadera - 14} ${f(m.cadera)} ${Y.cadera}`,
      // Cadera → muslo
      `C ${f(m.cadera)} ${Y.cadera + 16} ${f(m.muslo + 2)} ${Y.muslo - 12} ${f(m.muslo)} ${Y.muslo}`,
    ].join(" ");

  // El lado derecho es el mismo recorrido al revés: se listan los
  // mismos puntos en orden inverso, que para una curva cúbica es
  // intercambiar los dos puntos de control.
  const vuelta = [
    `C ${de(m.muslo + 2)} ${Y.muslo - 12} ${de(m.cadera)} ${Y.cadera + 16} ${de(m.cadera)} ${Y.cadera}`,
    `C ${de(m.cadera)} ${Y.cadera - 14} ${de(m.cintura)} ${Y.cintura + 12} ${de(m.cintura)} ${Y.cintura}`,
    `C ${de(m.busto)} ${Y.busto + 10} ${de(m.busto)} ${Y.busto} ${de(m.hombro)} ${Y.hombro}`,
    `C ${de(m.hombro - 9)} ${Y.hombro - 12} ${de(10)} ${Y.cuello + 8} ${de(6)} ${Y.cuello}`,
  ].join(" ");

  return [
    `M ${iz(6)} ${Y.cuello}`,
    lado(iz),
    `L ${de(m.muslo)} ${Y.muslo}`,
    vuelta,
    "Z",
  ].join(" ");
}

/**
 * Una pierna. `lado` es -1 (izquierda) o 1 (derecha).
 *
 * Se define por el eje de la pierna y su grosor a tres alturas, en vez
 * de por los dos bordes: así el tobillo nunca queda en punta, que es lo
 * que pasaba cuando el borde de afuera se estrechaba y el de adentro no.
 */
function pierna(m: Medidas, lado: -1 | 1): string {
  const x = (w: number) => EJE + lado * w;
  const ejeMuslo = m.muslo * 0.5;
  const ejeRodilla = m.muslo * 0.42;
  const ejeTobillo = m.muslo * 0.34;
  const grMuslo = m.muslo * 0.48;
  const grRodilla = m.muslo * 0.27;
  const grTobillo = m.muslo * 0.17;
  const rodilla = 238;

  return [
    // Borde externo, de la cadera al tobillo
    `M ${x(ejeMuslo + grMuslo)} ${Y.muslo - 10}`,
    `C ${x(ejeMuslo + grMuslo)} 214 ${x(ejeRodilla + grRodilla)} 224 ${x(ejeRodilla + grRodilla)} ${rodilla}`,
    `C ${x(ejeRodilla + grRodilla)} 262 ${x(ejeTobillo + grTobillo)} 272 ${x(ejeTobillo + grTobillo)} ${Y.tobillo}`,
    // Pie
    `L ${x(ejeTobillo - grTobillo)} ${Y.tobillo}`,
    // Borde interno, de vuelta hacia arriba
    `C ${x(ejeTobillo - grTobillo)} 272 ${x(ejeRodilla - grRodilla)} 262 ${x(ejeRodilla - grRodilla)} ${rodilla}`,
    `C ${x(ejeRodilla - grRodilla)} 224 ${x(ejeMuslo - grMuslo)} 214 ${x(ejeMuslo - grMuslo)} ${Y.muslo - 10}`,
    "Z",
  ].join(" ");
}

/** Los cuatro anchos que definen por dónde cae el brazo. */
function anchosBrazo(m: Medidas) {
  return {
    dentroArriba: m.hombro - 3,
    fueraArriba: m.hombro + 6,
    // Abajo se abre pasando la parte MÁS ancha del cuerpo, no solo el
    // hombro. Si no, en la manzana —donde lo ancho es el medio— el brazo
    // se lo tragaba el torso y la figura quedaba sin brazos.
    dentroAbajo: Math.max(m.hombro, m.cintura, m.cadera) + 7,
    fueraAbajo: Math.max(m.hombro, m.cintura, m.cadera) + 15,
  };
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
  const { dentroArriba, dentroAbajo } = anchosBrazo(m);
  return [
    `M ${x(dentroArriba)} ${Y.hombro + 14}`,
    `C ${x(dentroArriba + 2)} ${Y.cintura - 8} ${x(dentroAbajo - 1)} ${Y.muneca - 10} ${x(dentroAbajo)} ${Y.muneca + 2}`,
  ].join(" ");
}

/**
 * Un brazo, colgando al costado. Va por fuera de la línea del hombro a
 * propósito: pegado al cuerpo taparía la cintura, que es justo lo que
 * distingue una silueta de otra.
 */
function brazo(m: Medidas, lado: -1 | 1): string {
  const x = (w: number) => EJE + lado * w;
  // El brazo baja abriéndose un poco hacia afuera. Si cayera recto
  // pegado al costado taparía la cintura, y la cintura es justo lo que
  // diferencia una silueta de otra.
  const { dentroArriba, fueraArriba, dentroAbajo, fueraAbajo } =
    anchosBrazo(m);

  return [
    `M ${x(dentroArriba)} ${Y.hombro - 6}`,
    `C ${x(fueraArriba)} ${Y.hombro - 4} ${x(fueraArriba + 3)} ${Y.cintura - 20} ${x(fueraAbajo - 1)} ${Y.cintura + 10}`,
    `C ${x(fueraAbajo)} ${Y.muneca - 18} ${x(fueraAbajo)} ${Y.muneca - 8} ${x(fueraAbajo - 2)} ${Y.muneca}`,
    `L ${x(dentroAbajo)} ${Y.muneca}`,
    `C ${x(dentroAbajo - 1)} ${Y.muneca - 10} ${x(dentroArriba + 2)} ${Y.cintura - 14} ${x(dentroArriba)} ${Y.hombro - 6}`,
    "Z",
  ].join(" ");
}

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
    <svg viewBox="0 0 120 300" className={className} aria-hidden>
      <mask id={mascara}>
        <rect width="120" height="300" fill="white" />
        <path
          d={bordeBrazo(m, -1)}
          stroke="black"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={bordeBrazo(m, 1)}
          stroke="black"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      </mask>
      {/* La opacidad va en el grupo, no en cada parte: si fuera por
          parte, los brazos y las piernas dejarían costuras más oscuras
          donde se montan sobre el torso. */}
      <g fill="currentColor" opacity="0.9" mask={`url(#${mascara})`}>
        <ellipse cx={EJE} cy={26} rx={13} ry={16} />
        <path d={`M ${iz(5)} 36 L ${de(5)} 36 L ${de(7)} ${Y.cuello + 4} L ${iz(7)} ${Y.cuello + 4} Z`} />
        <path d={torso(m)} />
        <path d={pierna(m, -1)} />
        <path d={pierna(m, 1)} />
        <path d={brazo(m, -1)} />
        <path d={brazo(m, 1)} />
      </g>
    </svg>
  );
}
