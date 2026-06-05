"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import HAEntityInput from "../_components/HAEntityInput";
import IconPicker from "../_components/IconPicker";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

type Slot = { entityId?: string; icon?: string; label?: string; unit?: string; decimals?: number };

const INPUT =
  "w-full bg-black border border-white/10 text-white text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";

export function SensorInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  const design: string = cfg.design === "grid" ? "grid" : "cards";
  const slots: Slot[] = Array.isArray(cfg.entities) ? cfg.entities : [];

  const setSlots = (next: Slot[]) => updateConfig(widget.i, "entities", next);
  const addSlot = () => setSlots([...slots, { entityId: "" }]);
  const removeSlot = (idx: number) => setSlots(slots.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, key: keyof Slot, value: any) =>
    setSlots(slots.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-white/80 block mb-2">{t("Darstellung")}</label>
        <select
          value={design}
          onChange={(e) => updateConfig(widget.i, "design", e.target.value)}
          className={INPUT}
        >
          <option value="cards">{t("Cards (Zeilen)")}</option>
          <option value="grid">{t("Kacheln (Grid)")}</option>
        </select>
      </div>

      <div className="space-y-3">
        {slots.length === 0 && (
          <p className="text-xs text-white/40 px-1">{t("Noch keine Sensoren — unten hinzufügen.")}</p>
        )}
        {slots.map((slot, idx) => (
          <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-white/40">
                {t("Sensor")} {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeSlot(idx)}
                className="text-white/40 hover:text-red-400 transition-colors"
                aria-label={t("Entfernen")}
              >
                <Trash2 size={14} />
              </button>
            </div>

            <HAEntityInput
              value={slot.entityId || ""}
              onChange={(v) => updateSlot(idx, "entityId", v)}
              placeholder="sensor.pool_temperature"
              clearable
            />

            <IconPicker
              label={t("Icon")}
              value={slot.icon || ""}
              onChange={(iconId) => updateSlot(idx, "icon", iconId)}
              placeholder="mdi:gauge"
              defaultPrefix="mdi"
            />

            <input
              type="text"
              value={slot.label || ""}
              onChange={(e) => updateSlot(idx, "label", e.target.value)}
              placeholder={t("Label (leer = HA-Name)")}
              className={INPUT}
            />

            <div>
              <label className="text-xs text-white/50 block mb-1.5">{t("Einheit / Nachkommastellen")}</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={slot.unit || ""}
                  onChange={(e) => updateSlot(idx, "unit", e.target.value)}
                  placeholder="°C"
                  className={INPUT}
                />
                <select
                  value={typeof slot.decimals === "number" ? String(slot.decimals) : "auto"}
                  onChange={(e) =>
                    updateSlot(idx, "decimals", e.target.value === "auto" ? undefined : parseInt(e.target.value))
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
        ))}
      </div>

      <button
        type="button"
        onClick={addSlot}
        className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        <Plus size={16} /> {t("Sensor hinzufügen")}
      </button>
    </div>
  );
}
