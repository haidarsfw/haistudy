"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { supportMutesChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";

export function useSupportMutes() {
  const { session } = useSession();
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/support/mute");
      if (!res.ok) return;
      const data = (await res.json()) as {
        mutes: { conversationLk: string }[];
      };
      setMuted(new Set(data.mutes.map((m) => m.conversationLk)));
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime sync - other devices toggle mute, this one updates instantly
  useEffect(() => {
    if (!isSupabaseConfigured || !session) return;
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel(supportMutesChannel(scope, session.licenseKey))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_mutes",
          filter: scopeRealtimeFilter(scope),
        },
        (payload) => {
          // postgres_changes filters semester only — ignore other cohorts'
          // events (DELETE has empty new; falls through to a scoped refresh).
          const row = (payload.new ?? {}) as Record<string, unknown>;
          if (
            row.exam_period &&
            (row.exam_period !== scope.examPeriod || row.jurusan !== scope.jurusan)
          )
            return;
          refresh();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, refresh]);

  const isMuted = useCallback(
    (conversationLk: string) => muted.has(conversationLk),
    [muted]
  );

  const toggle = useCallback(
    async (conversationLk: string): Promise<boolean> => {
      const currentlyMuted = muted.has(conversationLk);
      // Optimistic
      setMuted((prev) => {
        const next = new Set(prev);
        if (currentlyMuted) next.delete(conversationLk);
        else next.add(conversationLk);
        return next;
      });
      try {
        if (currentlyMuted) {
          await fetch(
            `/api/support/mute?conversationLk=${encodeURIComponent(
              conversationLk
            )}`,
            { method: "DELETE" }
          );
        } else {
          await fetch("/api/support/mute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationLk }),
          });
        }
        return !currentlyMuted;
      } catch {
        // rollback on error
        setMuted((prev) => {
          const next = new Set(prev);
          if (currentlyMuted) next.add(conversationLk);
          else next.delete(conversationLk);
          return next;
        });
        return currentlyMuted;
      }
    },
    [muted]
  );

  return { muted, isMuted, toggle, loading, refresh };
}
