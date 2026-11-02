import type { NombreEvento } from "./eventos";

// =====================================================================
// Etiquetas (tags) de toda la experiencia
// =====================================================================
// Cada paso que da una persona en LoleardLola deja una etiqueta (un
// evento de lib/eventos.ts). Esta lista las agrupa por etapa del
// recorrido y dice cuándo sale cada una; /admin la muestra con cuántas
// veces y cuántas personas. Si se agrega una etiqueta nueva, va acá
// también: el tipo obliga a que exista en EVENTOS.
//
// Como en todo lo demás, no se guarda nada identificable: solo qué
// pasó y de qué cuenta o navegador (ver lib/eventos.ts).
// =====================================================================

export type Etiqueta = { evento: NombreEvento; cuando: string };
export type EtapaEtiquetas = { etapa: string; etiquetas: Etiqueta[] };

export const ETIQUETAS: EtapaEtiquetas[] = [
  {
    etapa: "1. Descubrir",
    etiquetas: [
      { evento: "inicio_visto", cuando: "Abre el inicio" },
      { evento: "cta_inicio_clic", cuando: "Toca \"Empezar a lolear\" o \"Armar mi clóset\" (props.boton)" },
      { evento: "servicio_clic", cuando: "Toca una opción de \"Todo LoleardLola, aquí\" (props.servicio)" },
      { evento: "otras_secciones_clic", cuando: "Toca \"¿A dónde quieres ir?\" al final de una página (props.destino)" },
      { evento: "preguntas_visto", cuando: "Abre las preguntas frecuentes" },
      { evento: "terminos_visto", cuando: "Abre los términos y condiciones" },
      { evento: "privacidad_visto", cuando: "Abre la política de privacidad" },
      { evento: "app_instalar_clic", cuando: "Toca \"Instalar la app\"" },
      { evento: "app_instalada", cuando: "Termina de instalar la app" },
      { evento: "app_abierta", cuando: "Abre la app instalada (no el navegador)" },
    ],
  },
  {
    etapa: "2. Entrar y crear cuenta",
    etiquetas: [
      { evento: "entrar_visto", cuando: "Abre la pantalla de entrar" },
      { evento: "ingreso_codigo_pedido", cuando: "Pide su código al correo" },
      { evento: "ingreso_ok", cuando: "Entra con el código" },
      { evento: "registro_ok", cuando: "Crea su cuenta (primera vez de ese correo)" },
      { evento: "nombre_puesto", cuando: "Dice cómo quiere que la llamemos" },
      { evento: "celular_puesto", cuando: "Pone su celular" },
      { evento: "ingreso_error", cuando: "No pudo entrar (código malo, correo que no llega)" },
    ],
  },
  {
    etapa: "3. Promociones",
    etiquetas: [
      { evento: "promociones_visto", cuando: "Abre Promociones" },
      { evento: "filtros_abiertos", cuando: "Abre el panel de Filtros" },
      { evento: "filtro_aplicado", cuando: "Cambia marcas, talla o tipo de prenda (props.filtro, props.cantidad)" },
      { evento: "promos_vista", cuando: "Cambia entre \"Solo promociones\" y \"Ver todo\"" },
      { evento: "promo_marca_abierta", cuando: "Abre todas las prendas de una marca" },
      { evento: "comercio_clic", cuando: "Toca una prenda y va a la tienda (props.origen)" },
      { evento: "seguimiento_creado", cuando: "Le da corazón a una prenda para que le avisemos si baja" },
      { evento: "push_suscrito", cuando: "Activa las notificaciones en su celular" },
      { evento: "aviso_rebaja_enviado", cuando: "Le mandamos un aviso de rebaja" },
      { evento: "comercio_sugerido", cuando: "Toca \"Escríbenos\" para sugerir una tienda" },
      { evento: "promo_bloqueada", cuando: "Se le acabó la prueba y ve el aviso de la membresía" },
    ],
  },
  {
    etapa: "4. Buscar un outfit",
    etiquetas: [
      { evento: "buscar_visto", cuando: "Abre Buscar" },
      { evento: "busqueda_iniciada", cuando: "Sube la foto o el link y empieza la búsqueda" },
      { evento: "busqueda_ok", cuando: "Recibe sus resultados" },
      { evento: "outfit_guardado", cuando: "Guarda el outfit" },
      { evento: "busqueda_error", cuando: "La búsqueda falló" },
      { evento: "outfit_error", cuando: "No se pudo guardar el outfit" },
    ],
  },
  {
    etapa: "5. Mi clóset",
    etiquetas: [
      { evento: "closet_visto", cuando: "Abre Mi clóset" },
      { evento: "prenda_subida", cuando: "Sube una prenda" },
      { evento: "combinacion_buscada", cuando: "Busca con qué combinar una prenda" },
      { evento: "prenda_error", cuando: "No se pudo subir la prenda" },
      { evento: "combinacion_error", cuando: "La combinación falló" },
    ],
  },
  {
    etapa: "6. Mi perfil y mi manual",
    etiquetas: [
      { evento: "perfil_visto", cuando: "Abre Mi perfil" },
      { evento: "perfil_guardado", cuando: "Guarda sus medidas y colores" },
      { evento: "personalidad_calculada", cuando: "Calculamos su estilo (props.fuente: foto o referencia)" },
      { evento: "manual_visto", cuando: "Abre Mi manual" },
      { evento: "manual_generado", cuando: "Genera su manual de estilo" },
      { evento: "perfil_error", cuando: "No se pudo guardar el perfil" },
      { evento: "personalidad_error", cuando: "No se pudo calcular el estilo" },
      { evento: "manual_error", cuando: "No se pudo generar el manual" },
    ],
  },
  {
    etapa: "7. Mis outfits",
    etiquetas: [{ evento: "outfits_visto", cuando: "Abre Mis outfits" }],
  },
  {
    etapa: "8. Membresía y pago",
    etiquetas: [
      { evento: "membresia_vista", cuando: "Abre la membresía" },
      { evento: "tope_alcanzado", cuando: "Llega a un límite de su plan (props.recurso)" },
      { evento: "pago_intentado", cuando: "Toca pagar (props.plan)" },
      { evento: "pago_abierto", cuando: "Se abre la ventana de pago" },
      { evento: "pago_aprobado", cuando: "Paga y se acredita" },
      { evento: "pago_rechazado", cuando: "El pago fue rechazado" },
      { evento: "pago_error", cuando: "No se pudo abrir el pago" },
    ],
  },
];
