import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/pinterest/boards → lista los boards del usuario autenticado
// Docs API v5: https://developers.pinterest.com/docs/api/v5/#operation/boards/list
export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const res = await fetch(
      "https://api.pinterest.com/v5/boards?page_size=25",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Pinterest API: ${err}` },
        { status: res.status }
      );
    }
    const json = await res.json();
    const boards = (json.items ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      pin_count: b.pin_count,
      image_cover_url: b.media?.image_cover_url,
    }));
    return NextResponse.json({ boards });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Error consultando Pinterest" },
      { status: 500 }
    );
  }
}
