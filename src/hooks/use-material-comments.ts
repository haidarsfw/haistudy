"use client";

import { useCallback, useEffect, useState } from "react";

import type { CommentAnchor, CommentVisibility, MaterialComment } from "@/lib/comments";

interface Loaded {
  comments: MaterialComment[];
  groups: { id: string; name: string }[];
  canComment: boolean;
}

const EMPTY: Loaded = { comments: [], groups: [], canComment: false };

/**
 * Comments on one module: read when the module opens and again after each
 * change. No Realtime: a module's comments are read where they are written,
 * and every published table costs the free tier WAL decoding.
 */
export function useMaterialComments(subjectId: string, moduleId: string | null) {
  const [data, setData] = useState<Loaded>(EMPTY);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = moduleId ? `${subjectId}/${moduleId}` : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    setData(EMPTY);
  }

  const fetchNow = useCallback(async () => {
    if (!moduleId) return;
    const r = await fetch(
      `/api/comments?subjectId=${encodeURIComponent(subjectId)}&moduleId=${encodeURIComponent(moduleId)}`,
      { credentials: "same-origin" }
    );
    if (r.ok) setData((await r.json()) as Loaded);
  }, [subjectId, moduleId]);

  useEffect(() => {
    if (!moduleId) return;
    let alive = true;
    fetch(
      `/api/comments?subjectId=${encodeURIComponent(subjectId)}&moduleId=${encodeURIComponent(moduleId)}`,
      { credentials: "same-origin" }
    )
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((d: Loaded) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [subjectId, moduleId]);

  /** Every action resolves to an error sentence, or null when it worked. */
  const call = useCallback(
    async (url: string, method: string, body: unknown): Promise<string | null> => {
      try {
        const r = await fetch(url, {
          method,
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const b = (await r.json().catch(() => ({}))) as { error?: string };
        if (!r.ok) return b.error ?? "Belum tersimpan. Coba lagi.";
        await fetchNow();
        return null;
      } catch {
        return "Koneksi terputus. Coba lagi.";
      }
    },
    [fetchNow]
  );

  const create = useCallback(
    (input: { body: string; visibility: CommentVisibility; groupId?: string | null; anchor: CommentAnchor }) =>
      call("/api/comments", "POST", { subjectId, moduleId, ...input }),
    [call, subjectId, moduleId]
  );
  const reply = useCallback((parentId: string, body: string) => call("/api/comments", "POST", { parentId, body }), [call]);
  const edit = useCallback((id: string, body: string) => call(`/api/comments/${id}`, "PATCH", { body }), [call]);
  const resolve = useCallback((id: string, resolved: boolean) => call(`/api/comments/${id}`, "PATCH", { resolved }), [call]);
  const remove = useCallback((id: string) => call(`/api/comments/${id}`, "DELETE", {}), [call]);
  const react = useCallback((id: string, emoji: string) => call(`/api/comments/${id}/reactions`, "POST", { emoji }), [call]);

  return { ...data, create, reply, edit, resolve, remove, react };
}
