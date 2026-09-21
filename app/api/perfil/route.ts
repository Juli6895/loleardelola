import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrCreateUserId } from "@/lib/device-user";
import { inferirSiluetaPorMedidas } from "@/lib/image-consulting/morfologia";
import {
  inferirContraste,
  inferirEstacion,
} from "@/lib/image-consulting/colorimetria";
import type { Subtono, TonoPiel } from "@/types";

// GET /api/perfil → medidas y silueta guardadas de este dispositivo
export async function GET(req: Request) {
  const userId = await getOrCreateUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Falta el id de dispositivo" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select(
      "bust_cm, waist_cm, hip_cm, height_cm, peso_kg, silueta, tono_piel, color_cabello, largo_cabello, subtono, contraste, estacion, personalidad, personalidad_secundaria, personalidad_fuente"
    )
    .eq("id", userId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ perfil: data });
}

// POST /api/perfil → guarda medidas (cm) y calcula la silueta
// Body: { bustCm, waistCm, hipCm, heightCm? }
export async function POST(req: Request) {
  const userId = await getOrCreateUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Falta el id de dispositivo" }, { status: 400 });
  }

  const body = await req.json();
  const bustCm = Number(body.bustCm);
  const waistCm = Number(body.waistCm);
  const hipCm = Number(body.hipCm);
  const heightCm =
    body.heightCm != null && body.heightCm !== "" ? Number(body.heightCm) : null;

  const medidasValidas = [bustCm, waistCm, hipCm].every(
    (n) => Number.isFinite(n) && n > 30 && n < 200
  );
  if (!medidasValidas) {
    return NextResponse.json(
      { error: "Revisa las medidas de busto, cintura y cadera (en cm)." },
      { status: 400 }
    );
  }

  const silueta = inferirSiluetaPorMedidas(bustCm, waistCm, hipCm);

  // Colorimetría (Pilar 1 del manual): la estación sale del subtono y el
  // contraste. Solo se calcula si la usuaria respondió las dos cosas —
  // si dejó alguna en blanco, se guarda null en vez de adivinar.
  const SUBTONOS_VALIDOS: Subtono[] = ["frio", "calido", "neutro"];
  const TONOS_VALIDOS: TonoPiel[] = ["blanca", "canela", "morena", "negra"];
  const subtono = SUBTONOS_VALIDOS.includes(body.subtono)
    ? (body.subtono as Subtono)
    : null;
  const tonoPiel = TONOS_VALIDOS.includes(body.tonoPiel)
    ? (body.tonoPiel as TonoPiel)
    : null;
  const colorCabello =
    typeof body.colorCabello === "string" && body.colorCabello.trim()
      ? body.colorCabello.trim()
      : null;

  // El contraste ya no se pregunta: se deduce del tono de piel y el
  // color de cabello. La estación sale de subtono + contraste.
  const contraste = inferirContraste(tonoPiel, colorCabello);
  const estacion = subtono && contraste ? inferirEstacion(subtono, contraste) : null;

  const pesoKg =
    body.pesoKg != null && body.pesoKg !== "" && Number.isFinite(Number(body.pesoKg))
      ? Number(body.pesoKg)
      : null;

  const texto = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .update({
      bust_cm: bustCm,
      waist_cm: waistCm,
      hip_cm: hipCm,
      height_cm: heightCm,
      peso_kg: pesoKg,
      silueta,
      tono_piel: tonoPiel,
      color_cabello: colorCabello,
      largo_cabello: texto(body.largoCabello),
      subtono,
      contraste,
      estacion,
    })
    .eq("id", userId)
    .select(
      "bust_cm, waist_cm, hip_cm, height_cm, peso_kg, silueta, tono_piel, color_cabello, largo_cabello, subtono, contraste, estacion, personalidad, personalidad_secundaria, personalidad_fuente"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ perfil: data });
}
