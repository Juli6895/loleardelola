import { COMISION_BOLD, type ServicioIA } from "./costos";
import { PRECIOS } from "./planes";

// =====================================================================
// Rentabilidad por tipo de usuaria (sección del admin)
// =====================================================================
// La misma tabla que armó Juliana en Excel (noviembre de 2026), con datos
// reales: por cada tipo de usuaria (sin registro, con registro, membresía
// mensual y anual), cuántas consultas de cada servicio se hicieron,
// cuántas personas, lo que costó, lo que entró y la utilidad.
//
//   Por persona          = consultas ÷ personas
//   Costo por persona    = por persona × costo de una consulta
//   Costo total          = consultas × costo de una consulta
//   Comisión de Bold     = $900 + 2,89% del precio
//   Utilidad por persona = precio − comisión de Bold − costo por persona
//   Ingresos             = lo pagado en el periodo − comisión de Bold
//   Utilidad             = ingresos − costo total
//
// Cada persona se clasifica por lo que es HOY: si tiene membresía activa,
// por el plan de su último pago; si no, con o sin registro según tenga
// cuenta con correo. Las personas son las que entraron en el periodo.
// =====================================================================

export type Segmento = "sinRegistro" | "conRegistro" | "mensual" | "anual";

export const SEGMENTOS: Array<{ clave: Segmento; nombre: string }> = [
  { clave: "sinRegistro", nombre: "Sin registro" },
  { clave: "conRegistro", nombre: "Con registro" },
  { clave: "mensual", nombre: "Membresía mensual" },
  { clave: "anual", nombre: "Membresía anual" },
];

type ServicioRentabilidad = {
  nombre: string;
  // Los eventos que cuentan como una consulta de este servicio.
  eventos: string[];
  // El costo de IA que usa; null = no llama a la IA ($0).
  ia: ServicioIA | null;
  // Para personalidad: props.fuente del evento.
  fuente?: string;
};

export const SERVICIOS_RENTABILIDAD: ServicioRentabilidad[] = [
  { nombre: "Buscar outfit", eventos: ["busqueda_ok"], ia: "busqueda" },
  { nombre: "Guardar un outfit", eventos: ["outfit_guardado"], ia: null },
  { nombre: "Subir una prenda al clóset", eventos: ["prenda_subida"], ia: "prenda_closet" },
  { nombre: "Buscar combinación de una prenda", eventos: ["combinacion_buscada"], ia: "combinacion" },
  // Pasar un manual viejo al formato nuevo también lo vuelve a escribir la IA.
  { nombre: "Generar manual de estilo", eventos: ["manual_generado", "manual_formato_nuevo"], ia: "manual" },
  { nombre: "Ver promociones", eventos: ["promociones_visto"], ia: null },
  { nombre: "Dar me gusta (corazón) a una prenda", eventos: ["seguimiento_creado"], ia: null },
  { nombre: "Avisar cuando baja de precio", eventos: ["aviso_rebaja_enviado"], ia: null },
  { nombre: "Personalidad de estilo por foto", eventos: ["personalidad_calculada"], ia: "personalidad_foto", fuente: "foto" },
  {
    nombre: "Personalidad de estilo por referencia",
    eventos: ["personalidad_calculada"],
    ia: "personalidad_referencia",
    fuente: "referencia",
  },
];

export type EventoRentabilidad = {
  nombre: string;
  props: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
  device_id: string | null;
};

export type PagoRentabilidad = { plan: string; monto_cop: number | null; acreditado_at: string | null };

export type FilaRentabilidad = {
  servicio: string;
  unitarioCop: number;
  consultas: number;
  porPersona: number;
  costoPorPersonaCop: number;
  costoTotalCop: number;
};

export type SegmentoRentabilidad = {
  clave: Segmento;
  nombre: string;
  personas: number;
  filas: FilaRentabilidad[];
  costoPorPersonaCop: number;
  costoTotalCop: number;
  // Solo las membresías.
  precioCop: number | null;
  boldFijoCop: number | null;
  boldPorcentajeCop: number | null;
  utilidadPorPersonaCop: number | null;
  margen: number | null;
  pagos: number;
  ingresosCop: number;
  utilidadCop: number;
};

export type Rentabilidad = {
  segmentos: SegmentoRentabilidad[];
  total: { personas: number; ingresosCop: number; costoCop: number; utilidadCop: number };
};

/** Comisión de Bold de un pago: fija + porcentaje. */
export function comisionBold(monto: number): { fijo: number; porcentaje: number } {
  return { fijo: COMISION_BOLD.fijoCop, porcentaje: monto * COMISION_BOLD.porcentaje };
}

export function calcularRentabilidad(args: {
  eventos: EventoRentabilidad[];
  personaDe: (e: EventoRentabilidad) => string;
  segmentoDe: (persona: string) => Segmento;
  unitarioDe: (ia: ServicioIA) => number;
  pagos: PagoRentabilidad[];
  // null = desde siempre.
  desde: Date | null;
}): Rentabilidad {
  const { personaDe, segmentoDe, unitarioDe, desde } = args;
  const enPeriodo = (cuando: string | null) => !!cuando && (!desde || new Date(cuando) >= desde);
  const eventos = args.eventos.filter((e) => enPeriodo(e.created_at));

  // Personas: las que entraron en el periodo. Lo que anota el servidor
  // sin saber de quién es (consumo_ia) no es una visita.
  const personas = new Map<Segmento, Set<string>>(SEGMENTOS.map((s) => [s.clave, new Set<string>()]));
  for (const e of eventos) {
    if (e.nombre === "consumo_ia" || (!e.user_id && !e.device_id)) continue;
    const p = personaDe(e);
    personas.get(segmentoDe(p))!.add(p);
  }

  const consultas = new Map<string, number>();
  for (const e of eventos) {
    for (const s of SERVICIOS_RENTABILIDAD) {
      if (!s.eventos.includes(e.nombre)) continue;
      if (s.fuente && e.props?.fuente !== s.fuente) continue;
      const clave = `${segmentoDe(personaDe(e))}|${s.nombre}`;
      consultas.set(clave, (consultas.get(clave) ?? 0) + 1);
    }
  }

  const pagosEn = args.pagos.filter((p) => enPeriodo(p.acreditado_at));

  const segmentos = SEGMENTOS.map(({ clave, nombre }): SegmentoRentabilidad => {
    const n = personas.get(clave)!.size;
    const filas = SERVICIOS_RENTABILIDAD.map((s): FilaRentabilidad => {
      const unitarioCop = s.ia ? unitarioDe(s.ia) : 0;
      const c = consultas.get(`${clave}|${s.nombre}`) ?? 0;
      const porPersona = n ? c / n : 0;
      return {
        servicio: s.nombre,
        unitarioCop,
        consultas: c,
        porPersona: Math.round(porPersona * 10) / 10,
        costoPorPersonaCop: Math.round(porPersona * unitarioCop),
        costoTotalCop: c * unitarioCop,
      };
    });
    const costoTotalCop = filas.reduce((a, f) => a + f.costoTotalCop, 0);
    const costoPorPersonaCop = n ? Math.round(costoTotalCop / n) : 0;

    const esMembresia = clave === "mensual" || clave === "anual";
    const precioCop = esMembresia ? PRECIOS[clave] : null;
    const bold = precioCop != null ? comisionBold(precioCop) : null;
    const utilidadPorPersonaCop =
      precioCop != null && bold ? Math.round(precioCop - bold.fijo - bold.porcentaje - costoPorPersonaCop) : null;

    const pagosDelPlan = esMembresia ? pagosEn.filter((p) => p.plan === clave) : [];
    const ingresosCop = Math.round(
      pagosDelPlan.reduce((a, p) => {
        const monto = p.monto_cop ?? 0;
        const c = comisionBold(monto);
        return a + monto - c.fijo - c.porcentaje;
      }, 0)
    );

    return {
      clave,
      nombre,
      personas: n,
      filas,
      costoPorPersonaCop,
      costoTotalCop,
      precioCop,
      boldFijoCop: bold ? bold.fijo : null,
      boldPorcentajeCop: bold ? Math.round(bold.porcentaje) : null,
      utilidadPorPersonaCop,
      margen: precioCop && utilidadPorPersonaCop != null ? Math.round((utilidadPorPersonaCop / precioCop) * 100) : null,
      pagos: pagosDelPlan.length,
      ingresosCop,
      utilidadCop: ingresosCop - costoTotalCop,
    };
  });

  const ingresosCop = segmentos.reduce((a, s) => a + s.ingresosCop, 0);
  const costoCop = segmentos.reduce((a, s) => a + s.costoTotalCop, 0);
  return {
    segmentos,
    total: {
      personas: segmentos.reduce((a, s) => a + s.personas, 0),
      ingresosCop,
      costoCop,
      utilidadCop: ingresosCop - costoCop,
    },
  };
}
