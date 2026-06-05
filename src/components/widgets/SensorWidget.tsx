"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

// Sensor-Kachel (#20): zeigt EINE Home-Assistant-Entity als großen Wert +
// Einheit + Label. Bewusst fokussiert — kein Multi-Entity-Control-Grid (dafür
// gibt es das HomeAssistant-Widget bzw. ein echtes HA-Dashboard). Pollt
// /api/ha/state alle 15 s; robust gegen unavailable/unknown.
export default function SensorWidget({ config }: { config?: any }) {
  const t = useT();
  const entityId: string = config?.entityId ?? "";
  const labelOverride: string = (config?.label ?? "").trim();
  const unitOverride: string = (config?.unit ?? "").trim();
  const decimals: number | null =
    typeof config?.decimals === "number" ? config.decimals : null;

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!entityId) {
      setData(null);
      return;
    }
    let cancelled = false;
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/ha/state?ids=${encodeURIComponent(entityId)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HA ${res.status}`);
        const dict = await res.json();
        if (!cancelled) {
          setData(dict?.[entityId] ?? null);
          setError("");
        }
      } catch {
        if (!cancelled) setError("Verbindung fehlgeschlagen");
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [entityId]);

  if (!entityId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/40 text-[0.8em] gap-2 text-center p-2">
        <Activity size={18} className="opacity-60" />
        {t("Keine Entity gewählt — im Inspector einstellen.")}
      </div>
    );
  }

  const attrs = data?.attributes ?? {};
  const rawState = data?.state;
  const label = labelOverride || attrs.friendly_name || entityId;
  const unit = unitOverride || attrs.unit_of_measurement || "";

  // Wert aufbereiten: Zahlen optional runden, unavailable/unknown → „—".
  let value = "—";
  if (rawState != null && rawState !== "unavailable" && rawState !== "unknown") {
    const num = parseFloat(rawState);
    value =
      decimals !== null && !isNaN(num) ? num.toFixed(decimals) : String(rawState);
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center gap-[0.15em] px-[0.4em] overflow-hidden">
      {error && !data ? (
        <span className="text-red-400/70 text-[0.7em]">{t(error)}</span>
      ) : (
        <>
          <div className="flex items-baseline justify-center gap-[0.12em] max-w-full">
            <span className="font-semibold leading-none truncate" style={{ fontSize: "2.4em" }}>
              {value}
            </span>
            {unit && (
              <span className="opacity-60 leading-none" style={{ fontSize: "1.1em" }}>
                {unit}
              </span>
            )}
          </div>
          <div className="opacity-55 uppercase tracking-wider truncate max-w-full" style={{ fontSize: "0.7em" }}>
            {label}
          </div>
        </>
      )}
    </div>
  );
}
