"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

type Album = { id: string; albumName: string; assetCount: number };

const INPUT =
  "w-full bg-black border border-white/10 text-white text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";

export function ImageInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  const albumId: string = cfg.immichAlbumId ?? "";
  const fit: string = cfg.fit ?? "cover";
  const intervalSec: number = cfg.intervalSec ?? 30;

  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function loadAlbums() {
    setLoading(true);
    setError("");
    fetch("/api/immich-widget?mode=albums", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.albums)) setAlbums(d.albums);
        else setError(d.error || "Fehler beim Laden");
      })
      .catch(() => setError("Verbindung fehlgeschlagen"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAlbums();
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white/60 leading-relaxed">
        {t("Nutzt die globale Immich-Verbindung (Einstellungen → Integrationen).")}
      </div>

      <div>
        <label className="text-sm font-medium text-white/80 mb-2 flex items-center justify-between">
          <span>{t("Album")}</span>
          <button
            type="button"
            onClick={loadAlbums}
            disabled={loading}
            className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {t("Neu laden")}
          </button>
        </label>
        {albums && albums.length > 0 ? (
          <select
            value={albumId}
            onChange={(e) => updateConfig(widget.i, "immichAlbumId", e.target.value)}
            className={INPUT}
          >
            <option value="">{t("— Album wählen —")}</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.albumName} ({a.assetCount} {t("Fotos")})
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-white/40 px-1">
            {loading
              ? t("Lade Alben…")
              : error
                ? t(error)
                : t("Keine Alben gefunden — ist Immich global konfiguriert?")}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-white/80 block mb-2">{t("Bildanzeige")}</label>
        <select
          value={fit}
          onChange={(e) => updateConfig(widget.i, "fit", e.target.value)}
          className={INPUT}
        >
          <option value="cover">{t("Füllen (Ausschnitt, Standard)")}</option>
          <option value="contain">{t("Einpassen (ganzes Bild)")}</option>
          <option value="fill">{t("Strecken (verzerrt)")}</option>
          <option value="none">{t("Zentriert (Originalgröße)")}</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-white/80 mb-2 flex justify-between">
          <span>{t("Bildwechsel Intervall (Sekunden)")}</span>
          <span className="text-blue-400">{intervalSec}s</span>
        </label>
        <input
          type="range"
          min="5"
          max="600"
          step="5"
          value={intervalSec}
          onChange={(e) => updateConfig(widget.i, "intervalSec", parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-white/10"
        />
      </div>
    </div>
  );
}
