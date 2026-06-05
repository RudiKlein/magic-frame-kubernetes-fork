"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Activity } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

// Sensor-Widget (#20): Anzeige-Pendant zum HA-Widget. Zeigt MEHRERE
// Home-Assistant-Entities als gut lesbare Werte (Icon + kurzer Name + großer
// Wert), nicht als Control-Surface. Cards- oder Grid-Layout. Pollt
// /api/ha/state (eine Anfrage für alle Entities), robust gegen unavailable.
type Slot = { entityId?: string; icon?: string; label?: string; color?: string; unit?: string; decimals?: number };

function formatValue(rawState: any, decimals?: number): string {
  if (rawState == null || rawState === "unavailable" || rawState === "unknown") return "—";
  const num = parseFloat(rawState);
  if (typeof decimals === "number" && !isNaN(num)) return num.toFixed(decimals);
  return String(rawState);
}

export default function SensorWidget({ config }: { config?: any }) {
  const t = useT();
  const slots: Slot[] = Array.isArray(config?.entities) ? config.entities : [];
  const design: string = config?.design === "grid" ? "grid" : "cards";
  const ids = slots.map((s) => s.entityId).filter(Boolean) as string[];

  const [statesDict, setStatesDict] = useState<Record<string, any>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (ids.length === 0) {
      setStatesDict({});
      return;
    }
    let cancelled = false;
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/ha/state?ids=${encodeURIComponent(ids.join(","))}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HA ${res.status}`);
        const dict = await res.json();
        if (!cancelled) {
          setStatesDict(dict ?? {});
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  if (ids.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/40 text-[0.8em] gap-2 text-center p-2">
        <Activity size={18} className="opacity-60" />
        {t("Keine Sensoren gewählt — im Inspector hinzufügen.")}
      </div>
    );
  }

  const rows = slots
    .filter((s) => s.entityId)
    .map((s) => {
      const st = statesDict[s.entityId!];
      const attrs = st?.attributes ?? {};
      return {
        key: s.entityId!,
        icon: s.icon || attrs.icon || "mdi:gauge",
        color: (s.color ?? "").trim(),
        label: (s.label ?? "").trim() || attrs.friendly_name || s.entityId!,
        value: formatValue(st?.state, s.decimals),
        unit: (s.unit ?? "").trim() || attrs.unit_of_measurement || "",
      };
    });

  if (error && Object.keys(statesDict).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400/70 text-[0.7em] text-center p-3">
        {t(error)}
      </div>
    );
  }

  if (design === "grid") {
    return (
      <div
        className="w-full h-full grid gap-[0.5em] p-[0.2em]"
        style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(rows.length, 1), 2)}, minmax(0,1fr))` }}
      >
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex flex-col items-center justify-center text-center bg-white/5 rounded-[0.8em] p-[0.6em] gap-[0.3em] overflow-hidden"
          >
            <Icon icon={r.icon} style={{ fontSize: "1.3em", color: r.color || undefined }} className={r.color ? "" : "opacity-60"} />
            <div className="flex items-baseline gap-[0.1em] max-w-full">
              <span className="font-semibold leading-none truncate" style={{ fontSize: "1.7em" }}>
                {r.value}
              </span>
              {r.unit && <span className="opacity-60 leading-none" style={{ fontSize: "0.85em" }}>{r.unit}</span>}
            </div>
            <div className="opacity-55 uppercase tracking-wide truncate max-w-full" style={{ fontSize: "0.6em" }}>
              {r.label}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // cards (default)
  return (
    <div className="w-full h-full flex flex-col gap-[0.4em] p-[0.2em] overflow-y-auto [&::-webkit-scrollbar]:hidden">
      {rows.map((r) => (
        <div
          key={r.key}
          className="flex items-center gap-[0.6em] bg-white/5 rounded-[0.8em] px-[0.7em] py-[0.5em] overflow-hidden"
        >
          <Icon icon={r.icon} style={{ fontSize: "1.5em", color: r.color || undefined }} className={`shrink-0 ${r.color ? "" : "opacity-70"}`} />
          <span className="opacity-70 text-[0.82em] truncate flex-1">{r.label}</span>
          <div className="flex items-baseline gap-[0.1em] shrink-0">
            <span className="font-semibold leading-none" style={{ fontSize: "1.5em" }}>{r.value}</span>
            {r.unit && <span className="opacity-60" style={{ fontSize: "0.75em" }}>{r.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
