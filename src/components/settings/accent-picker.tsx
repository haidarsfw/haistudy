"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Crown, Check } from "lucide-react";
import type { CustomAccent } from "@/types";
import { useTranslation } from "@/components/providers/language-provider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { sounds } from "@/lib/sounds";

interface AccentPickerProps {
  value: CustomAccent | null;
  locked: boolean;
  onChange: (accent: CustomAccent | null) => void;
}

const DEFAULT_ACCENT: CustomAccent = { h: 200, s: 70, l: 50 };
const WHEEL_SIZE = 168; // px

function hsl({ h, s, l }: CustomAccent): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

export function AccentPicker({ value, locked, onChange }: AccentPickerProps) {
  const { t } = useTranslation();
  const enabled = value !== null;

  // Draft lives locally; Save commits it. Live swatch preview reflects the
  // draft without touching the persisted/applied accent until Save.
  const [draft, setDraft] = useState<CustomAccent>(value ?? DEFAULT_ACCENT);

  // Sync draft when an external value lands (e.g. settings refetch on open).
  useEffect(() => {
    if (value) setDraft(value);
  }, [value]);

  const dirty =
    !value ||
    value.h !== draft.h ||
    value.s !== draft.s ||
    value.l !== draft.l;

  const toggle = (next: boolean) => {
    if (locked) return;
    sounds.click();
    if (next) {
      // Turn on → commit current draft immediately so the accent applies.
      onChange(draft);
    } else {
      onChange(null);
    }
  };

  const save = () => {
    if (locked) return;
    sounds.click();
    onChange(draft);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm font-medium">
          {t("settings.custom_accent")}
          <Crown className="h-3 w-3 text-amber-500" />
          {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
        </label>
        <Switch
          checked={enabled}
          disabled={locked}
          onCheckedChange={toggle}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {locked ? t("vip.accent_locked") : t("settings.custom_accent_desc")}
      </p>

      {enabled && !locked && (
        <div className="flex w-full min-w-0 flex-col items-center gap-4">
          <div className="max-w-full">
            <ColorWheel
              accent={draft}
              onChange={(part) => setDraft((d) => ({ ...d, ...part }))}
            />
          </div>

          <div className="flex w-full min-w-0 max-w-[280px] flex-col gap-3">
            {/* Live swatch preview */}
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                {t("settings.accent_preview")}
              </p>
              <div className="flex items-center gap-3">
                <span
                  className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-border"
                  style={{ backgroundColor: hsl(draft) }}
                />
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: hsl(draft) }}
                  tabIndex={-1}
                >
                  {t("settings.accent_sample")}
                </button>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {Math.round(draft.h)}° {Math.round(draft.s)}% {Math.round(draft.l)}%
                </span>
              </div>
            </div>

            {/* Lightness slider - wheel covers hue + saturation only */}
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-16 shrink-0">{t("settings.accent_lightness")}</span>
              <input
                type="range"
                min={20}
                max={80}
                value={draft.l}
                onChange={(e) => setDraft((d) => ({ ...d, l: Number(e.target.value) }))}
                className="h-1.5 flex-1 cursor-pointer accent-primary"
              />
              <span className="w-8 shrink-0 text-right tabular-nums">
                {Math.round(draft.l)}
              </span>
            </label>

            <Button
              size="sm"
              onClick={save}
              disabled={!dirty}
              className="gap-1.5 self-start"
            >
              <Check className="h-3.5 w-3.5" />
              {t("settings.accent_save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * HSL color wheel: hue = angle around the ring, saturation = radial distance
 * from center (0 at center → 100 at edge). Lightness is controlled separately.
 * Pure CSS gradient render + pointer math - no canvas, no dependency.
 */
function ColorWheel({
  accent,
  onChange,
}: {
  accent: CustomAccent;
  onChange: (part: Partial<CustomAccent>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const radius = WHEEL_SIZE / 2;

  const updateFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const h = (angle + 360) % 360;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const s = Math.min(dist / radius, 1) * 100;
      onChange({ h, s });
    },
    [onChange, radius]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromPoint(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromPoint(e.clientX, e.clientY);
  };
  const endDrag = () => {
    draggingRef.current = false;
  };

  // Thumb position from current h,s.
  const rad = (accent.h * Math.PI) / 180;
  const r = (accent.s / 100) * radius;
  const thumbX = radius + Math.cos(rad) * r;
  const thumbY = radius + Math.sin(rad) * r;

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      className="relative shrink-0 cursor-crosshair touch-none rounded-full ring-1 ring-border"
      style={{
        width: WHEEL_SIZE,
        height: WHEEL_SIZE,
        background: `radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%), conic-gradient(from 90deg, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))`,
      }}
    >
      <span
        className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/30"
        style={{
          left: thumbX,
          top: thumbY,
          backgroundColor: hsl(accent),
        }}
      />
    </div>
  );
}
