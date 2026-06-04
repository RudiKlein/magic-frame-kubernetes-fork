import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

// Sicherer Bild-Proxy fürs Bild-Widget: holt das Asset server-seitig über die
// globale Immich-Verbindung (API-Key bleibt server-side, nie im <img src>).
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return new NextResponse("Bad id", { status: 400 });
  }
  const s = await getAppSettings();
  if (!s.immichUrl || !s.immichApiKey) {
    return new NextResponse("Immich not configured", { status: 400 });
  }
  const base = s.immichUrl.replace(/\/+$/, "");
  try {
    const imgRes = await fetch(`${base}/api/assets/${id}/thumbnail?size=preview`, {
      headers: { "x-api-key": s.immichApiKey },
      signal: AbortSignal.timeout(10000),
    });
    if (!imgRes.ok) return new NextResponse("Proxy error", { status: imgRes.status });
    const h = new Headers();
    h.set("Content-Type", imgRes.headers.get("content-type") || "image/jpeg");
    h.set("Cache-Control", "public, max-age=604800, immutable");
    return new NextResponse(imgRes.body, { status: 200, headers: h });
  } catch {
    return new NextResponse("Internal error", { status: 500 });
  }
}
