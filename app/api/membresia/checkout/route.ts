import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioActual } from "@/lib/sesion";
import { armarBoton, llaveDeCobroCorrecta } from "@/lib/bold";
import { esPaquete, precioDe, type Producto } from "@/lib/planes";
import { esAdmin } from "@/lib/admin-correos";
import { contextoDe, registrar } from "@/lib/eventos";

// POST /api/membresia/checkout  { plan: "mensual" | "anual" | "paquete20" }
//
// Prepara el cobro: guarda la orden como pendiente y devuelve los datos
// firmados para el botón de Bold. La firma se calcula acá y nunca en el
// navegador — si se hiciera allá, la llave secreta quedaría a la vista.
//
// Exige sesión: sin correo no hay a quién activarle la membresía.
export async function POST(req: Request) {
  const usuario = await usuarioActual(req);
  if (!usuario?.conSesion || !usuario.email) {
    return NextResponse.json(
      { error: "Entra con tu correo antes de pagar." },
      { status: 401 }
    );
  }

  const body = await req.json();
  // Con la membresía las búsquedas no tienen tope: los paquetes ya no se
  // venden. Una pantalla vieja todavía puede pedirlos.
  if (esPaquete(body.plan)) {
    return NextResponse.json({ error: "Las búsquedas ahora son ilimitadas con la membresía. Recarga la página." }, { status: 409 });
  }
  const plan: Producto = esPaquete(body.plan) ? body.plan : body.plan === "anual" ? "anual" : "mensual";

  // Los paquetes de búsquedas son para quien ya tiene la membresía: son
  // para cuando se le acaban las del mes.
  if (esPaquete(plan) && usuario.plan !== "membresia" && !esAdmin(usuario.email)) {
    return NextResponse.json(
      { error: "Los paquetes de búsquedas son para quienes tienen la membresía." },
      { status: 402 }
    );
  }

  // Mejor no cobrar que cobrarle a la clienta hacia la cuenta equivocada.
  // BotonPago anota este mensaje en Errores del tablero (pago_error).
  if (!llaveDeCobroCorrecta()) {
    console.error("[checkout] cobro bloqueado: la llave de Bold no es la de LoleardLola");
    return NextResponse.json(
      { error: "No podemos abrir el pago en este momento. Escríbenos a hola@loleardlola.com (código: LLAVE-BOLD)." },
      { status: 503 }
    );
  }

  const origen = new URL(req.url).origin;
  const boton = armarBoton(usuario.id, plan, origen);
  if (!boton) {
    return NextResponse.json(
      { error: "El pago todavía no está configurado." },
      { status: 503 }
    );
  }

  // La orden se guarda ANTES de mandarla a pagar. Así, cuando vuelva,
  // sabemos de quién era y por cuánto — sin creerle nada al navegador.
  const { error } = await supabaseAdmin().from("pagos").insert({
    order_id: boton.orden,
    user_id: usuario.id,
    plan,
    monto_cop: precioDe(plan),
    estado: "pendiente",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Paso 3 del embudo: el checkout quedó listo. Si hay muchos de
  // estos y pocos pago_aprobado, la gente se está cayendo EN Bold, no
  // en nuestra página — que es una conclusión muy distinta.
  registrar("pago_abierto", contextoDe(req, usuario.id), { plan, monto: precioDe(plan) });
  return NextResponse.json({ boton });
}
