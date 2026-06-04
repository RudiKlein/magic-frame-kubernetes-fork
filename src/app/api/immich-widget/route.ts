import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

// Bild-Widget — nutzt die GLOBALE Immich-Verbindung (Settings → Integrationen),
// entkoppelt von der Wallpaper-Config. (#16, step 2)
//   mode=albums              → Albenliste (für den Inspector)
//   mode=playlist&albumId=X  → gemischte Asset-Liste mit Proxy-URLs
export async function GET(req: NextRequest) {
  const s = await getAppSettings();
  if (!s.immichUrl || !s.immichApiKey) {
    return NextResponse.json(
      { error: "Immich nicht konfiguriert (Einstellungen → Integrationen)." },
      { status: 400 },
    );
  }
  const base = s.immichUrl.replace(/\/+$/, "");
  const headers = { "x-api-key": s.immichApiKey, Accept: "application/json" };
  const mode = req.nextUrl.searchParams.get("mode") || "albums";

  try {
    if (mode === "albums") {
      const res = await fetch(`${base}/api/albums`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return NextResponse.json({ error: `Immich ${res.status}` }, { status: 502 });
      const data = await res.json();
      const albums = (Array.isArray(data) ? data : [])
        .map((a: any) => ({
          id: String(a.id),
          albumName: a.albumName ?? "(ohne Name)",
          assetCount: typeof a.assetCount === "number" ? a.assetCount : (a.assets?.length ?? 0),
        }))
        .sort((a: any, b: any) => a.albumName.localeCompare(b.albumName, "de"));
      return NextResponse.json({ albums });
    }

    // mode=playlist
    const albumId = req.nextUrl.searchParams.get("albumId");
    if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
    const res = await fetch(`${base}/api/albums/${encodeURIComponent(albumId)}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return NextResponse.json({ error: `Immich ${res.status}` }, { status: 502 });
    const data = await res.json();
    const assets = (data.assets || []) as any[];
    // Mischen (Fisher-Yates) + auf 200 begrenzen.
    for (let i = assets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [assets[i], assets[j]] = [assets[j], assets[i]];
    }
    const playlist = assets.slice(0, 200).map((a) => ({
      id: a.id,
      url: `/api/immich-widget/image?id=${encodeURIComponent(a.id)}`,
    }));
    return NextResponse.json({ playlist });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
