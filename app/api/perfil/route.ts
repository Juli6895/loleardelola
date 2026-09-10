import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { inferirSiluetaPorMedidas } from "@/lib/image-consulting/morfologia";

async function getUserId(pinterestId: string | undefined): Promise<string | null> {
  if (!pinterestId) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("id")
    .eq("pinterest_id", pinterestId)
    .maybeSingle();
  return data?.id ?? null;
}

// GET /api/perfil → medidas y silueta guardadas de la usuaria autenticada
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = await getUserId(session?.pinterestId);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select(
      "bust_cm, waist_cm, hip_cm, height_cm, silueta, personalidad, personalidad_secundaria, personalidad_fuente"
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
  const session = await getServerSession(authOptions);
  const userId = await getUserId(session?.pinterestId);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .update({
      bust_cm: bustCm,
      waist_cm: waistCm,
      hip_cm: hipCm,
      height_cm: heightCm,
      silueta,
    })
    .eq("id", userId)
    .select(
      "bust_cm, waist_cm, hip_cm, height_cm, silueta, personalidad, personalidad_secundaria, personalidad_fuente"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ perfil: data });
}
