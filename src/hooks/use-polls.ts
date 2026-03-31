"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import { RATE_LIMITS } from "@/lib/constants";
import { getDeviceId } from "@/lib/auth/device";
import type { ForumPoll } from "@/types";

export function usePolls(subjectId: string) {
  const { session } = useSession();
  const [polls, setPolls] = useState<ForumPoll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastPollTime = useRef(0);
  const deviceIdRef = useRef<string | null>(null);

  const fetchPolls = useCallback(async () => {
    try {
      if (!deviceIdRef.current) {
        deviceIdRef.current = await getDeviceId();
      }
      const res = await fetch(
        `/api/forum/polls?subjectId=${encodeURIComponent(subjectId)}&voterId=${encodeURIComponent(deviceIdRef.current)}`
      );
      const data = await res.json();
      if (data.polls) setPolls(data.polls);
    } catch (error) {
      console.error("Failed to fetch polls:", error);
    } finally {
      setIsLoading(false);
    }
  }, [subjectId]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchPolls();
  }, [fetchPolls]);

  const createPoll = useCallback(
    async (question: string, options: string[]) => {
      if (!session) return;

      const now = Date.now();
      if (now - lastPollTime.current < RATE_LIMITS.POLL_COOLDOWN_MS) {
        throw new Error("Tunggu sebentar sebelum membuat poll baru");
      }

      if (!deviceIdRef.current) {
        deviceIdRef.current = await getDeviceId();
      }

      const res = await fetch("/api/forum/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          question,
          options,
          authorId: deviceIdRef.current,
          authorName: session.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuat poll");
      }

      lastPollTime.current = Date.now();
      await fetchPolls();
    },
    [session, subjectId, fetchPolls]
  );

  const votePoll = useCallback(
    async (pollId: string, optionIndex: number) => {
      if (!deviceIdRef.current) {
        deviceIdRef.current = await getDeviceId();
      }

      // Optimistic update
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p;
          const newOptions = p.options.map((opt, i) =>
            i === optionIndex ? { ...opt, votes: opt.votes + 1 } : opt
          );
          return {
            ...p,
            options: newOptions,
            totalVotes: p.totalVotes + 1,
            userVote: optionIndex,
          };
        })
      );

      try {
        const res = await fetch("/api/forum/polls/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pollId,
            voterId: deviceIdRef.current,
            optionIndex,
          }),
        });

        if (!res.ok) {
          // Revert optimistic update
          await fetchPolls();
          const err = await res.json();
          throw new Error(err.error || "Gagal memilih");
        }
      } catch (error) {
        await fetchPolls();
        throw error;
      }
    },
    [fetchPolls]
  );

  const deletePoll = useCallback(
    async (pollId: string) => {
      if (!session) return;
      if (!deviceIdRef.current) {
        deviceIdRef.current = await getDeviceId();
      }

      const res = await fetch("/api/forum/polls", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          requesterId: deviceIdRef.current,
          isAdmin: session.isAdmin,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus poll");
      }

      setPolls((prev) => prev.filter((p) => p.id !== pollId));
    },
    [session]
  );

  return { polls, isLoading, createPoll, votePoll, deletePoll };
}
