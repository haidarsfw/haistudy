"use client";

import { useEffect, useState } from "react";
import type { Announcement } from "@/types";

/**
 * Shared, de-duplicated announcements source. The banner and the modal (and any
 * future consumer) all read from this ONE cache, so `/api/announcements` is hit
 * once per session instead of once per component — a free Vercel invocation
 * saving with zero behavior change (announcements are load-only, not realtime,
 * so a session cache matches the previous per-mount fetch).
 */
let cache: Announcement[] | null = null;
let inFlight: Promise<Announcement[]> | null = null;
const subscribers = new Set<(a: Announcement[]) => void>();

function load(): Promise<Announcement[]> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;
  inFlight = fetch("/api/announcements")
    .then((r) => r.json())
    .then((data) => {
      cache = (data?.announcements ?? []) as Announcement[];
      subscribers.forEach((fn) => fn(cache!));
      return cache;
    })
    .catch(() => [] as Announcement[]) // don't cache failures → a later mount can retry
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function useAnnouncements(): Announcement[] {
  const [items, setItems] = useState<Announcement[]>(cache ?? []);

  useEffect(() => {
    let active = true;
    const update = (a: Announcement[]) => {
      if (active) setItems(a);
    };
    subscribers.add(update);
    if (cache) update(cache);
    else load();
    return () => {
      active = false;
      subscribers.delete(update);
    };
  }, []);

  return items;
}
