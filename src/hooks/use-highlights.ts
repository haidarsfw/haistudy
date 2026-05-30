"use client";

import { useCallback, useMemo } from "react";
import { useSettings } from "@/hooks/use-settings";
import type { HighlightColor, UserHighlight } from "@/types";

// Highlights persist in settings.highlights, keyed by
// `${scopeKey}:${subjectId}:${moduleKey}`. Each highlight anchors to a
// data-tts-line element index + char offsets within that line's text, so
// it survives re-render (parseRangkuman emits stable data-tts-line indices).

function makeKey(scopeKey: string, subjectId: string, moduleKey: string): string {
  return `${scopeKey}:${subjectId}:${moduleKey}`;
}

export function useHighlights(
  scopeKey: string,
  subjectId: string,
  moduleKey: string | null
) {
  const { settings, updateSettings } = useSettings();

  const storageKey = moduleKey ? makeKey(scopeKey, subjectId, moduleKey) : null;

  const highlights = useMemo<UserHighlight[]>(() => {
    if (!storageKey) return [];
    return settings.highlights?.[storageKey] ?? [];
  }, [settings.highlights, storageKey]);

  const addHighlight = useCallback(
    (input: {
      text: string;
      color: HighlightColor;
      ttsLine: number;
      startOffset: number;
      endOffset: number;
    }) => {
      if (!storageKey) return;
      const next: UserHighlight = {
        id: crypto.randomUUID(),
        text: input.text,
        color: input.color,
        ttsLine: input.ttsLine,
        startOffset: input.startOffset,
        endOffset: input.endOffset,
        createdAt: new Date().toISOString(),
      };
      const all = { ...(settings.highlights ?? {}) };
      const existing = all[storageKey] ?? [];
      all[storageKey] = [...existing, next];
      updateSettings({ highlights: all });
      return next;
    },
    [storageKey, settings.highlights, updateSettings]
  );

  const removeHighlight = useCallback(
    (id: string) => {
      if (!storageKey) return;
      const all = { ...(settings.highlights ?? {}) };
      const existing = all[storageKey] ?? [];
      const filtered = existing.filter((h) => h.id !== id);
      if (filtered.length === 0) {
        delete all[storageKey];
      } else {
        all[storageKey] = filtered;
      }
      updateSettings({ highlights: all });
    },
    [storageKey, settings.highlights, updateSettings]
  );

  const clearAll = useCallback(() => {
    if (!storageKey) return;
    const all = { ...(settings.highlights ?? {}) };
    if (!all[storageKey]) return;
    delete all[storageKey];
    updateSettings({ highlights: all });
  }, [storageKey, settings.highlights, updateSettings]);

  return { highlights, addHighlight, removeHighlight, clearAll };
}
