"use client";

import React from "react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import HAEntityInput from "../_components/HAEntityInput";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

const INPUT =
  "w-full bg-black border border-white/10 text-white text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";

export function SensorInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  const entityId: string = cfg.entityId ?? "";
  const label: string = cfg.label ?? "";
  const unit: string = cfg.unit ?? "";
  const decimals: string = typeof cfg.decimals === "number" ? String(cfg.decimals) : "auto";

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-white/80 block mb-2">{t("Entity (Sensor)")}</label>
        <HAEntityInput
          value={entityId}
          onChange={(id) => updateConfig(widget.i, "entityId", id)}
          placeholder="sensor.pool_temperature"
          clearable
        />
        <p className="text-xs text-white/40 mt-1.5 px-1">
          {t("Zeigt den Wert einer HA-Entity als große Kachel — z.B. eine Temperatur.")}
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-white/80 block mb-2">{t("Label (leer = HA-Name)")}</label>
        <input
          type="text"
          value={label}
          onChange={(e) => updateConfig(widget.i, "label", e.target.value)}
          placeholder={t("z.B. Pool")}
          className={INPUT}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-white/80 block mb-2">{t("Einheit (leer = HA)")}</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => updateConfig(widget.i, "unit", e.target.value)}
            placeholder="°C"
            className={INPUT}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-white/80 block mb-2">{t("Nachkommastellen")}</label>
          <select
            value={decimals}
            onChange={(e) =>
              updateConfig(widget.i, "decimals", e.target.value === "auto" ? undefined : parseInt(e.target.value))
            }
            className={INPUT}
          >
            <option value="auto">{t("Auto")}</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </div>
      </div>
    </div>
  );
}
