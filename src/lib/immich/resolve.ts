import "server-only";
import { getAppSettings } from "@/lib/settings/store";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Löst die Immich-Verbindung fürs Bild-Widget auf (#16).
 *   source="view"  → Immich-Daten aus dem Wallpaper dieses Views
 *                    (dashboard.wallpaper); Fallback auf global, wenn leer.
 *   source="global"→ globale Verbindung (Settings → Integrationen).
 * Credentials bleiben immer server-seitig.
 */
export async function resolveImmich(
  source: string | null,
  dashboardId: string | null,
): Promise<{ url: string; key: string }> {
  if (source === "view" && dashboardId) {
    try {
      const dash = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
      const wp = dash?.wallpaper as any;
      if (wp?.immichUrl && wp?.immichApiKey) {
        return { url: wp.immichUrl, key: wp.immichApiKey };
      }
    } catch {
      /* Fallback auf global */
    }
  }
  const s = await getAppSettings();
  return { url: s.immichUrl, key: s.immichApiKey };
}
