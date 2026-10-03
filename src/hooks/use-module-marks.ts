"use client";

import { useCallback, useEffect, useState } from "react";

import type { GroupModuleState, MarkStatus } from "@/lib/mentor/modules";

/**
 * Your markers for one subject, and your group's state per module. One read
 * per subject; a change is shown at once and written behind it, rolled back
 * if the write fails.
 */
export function useModuleMarks(subjectId: string) {
  const [marks, setMarks] = useState<Map<string, MarkStatus>>(new Map());
  const [group, setGroup] = useState<Map<string, GroupModuleState>>(new Map());
  const [inGroup, setInGroup] = useState(false);
  // Until the first read lands nothing is known, which is not the same as
  // "belum dibahas": showing that for a split second told people who had
  // marked a module that their mark was gone.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/modules/marks?subjectId=${encodeURIComponent(subjectId)}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (!alive || !b) return;
        setMarks(new Map((b.marks ?? []).map((m: { moduleId: string; status: MarkStatus }) => [m.moduleId, m.status])));
        setGroup(new Map((b.group ?? []).map((g: GroupModuleState) => [g.moduleId, g])));
        setInGroup(Boolean(b.inGroup));
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [subjectId]);

  const setMark = useCallback(
    async (moduleId: string, moduleTitle: string, status: MarkStatus | null): Promise<boolean> => {
      const before = marks.get(moduleId) ?? null;
      setMarks((prev) => {
        const next = new Map(prev);
        if (status) next.set(moduleId, status);
        else next.delete(moduleId);
        return next;
      });
      try {
        const r = await fetch("/api/modules/marks", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subjectId, moduleId, moduleTitle, status }),
        });
        if (r.ok) return true;
      } catch {
        /* fall through to the rollback */
      }
      setMarks((prev) => {
        const next = new Map(prev);
        if (before) next.set(moduleId, before);
        else next.delete(moduleId);
        return next;
      });
      return false;
    },
    [marks, subjectId]
  );

  return { marks, group, inGroup, loaded, setMark };
}
