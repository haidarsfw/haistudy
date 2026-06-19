"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import { PWA_EVENTS } from "@/lib/pwa-version";
import { PATCH_NOTES, type PatchNote } from "@/data/patch-notes";

const READ_KEY = "hs-patch-read"; // JSON string[] of versions the user dismissed
const POPUP_SEEN_KEY = "hs-patch-popup-seen"; // latest version the popup ran for
const PATCH_READ_EVENT = "hs:patch-read"; // cross-tab / cross-instance sync

const LATEST = PATCH_NOTES[0]?.version ?? "";

function readArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

// Entries the popup should announce, given the last version it ran for.
function computePopupNotes(seen: string | null): PatchNote[] {
  if (seen === LATEST) return []; // already shown for the newest version
  return PATCH_NOTES.slice(0, 1); // only show the single newest version patch note in the popup
}

export interface UsePatchNotesValue {
  notes: PatchNote[];
  unread: PatchNote[];
  unreadCount: number;
  markRead: (version: string) => void;
  markAllRead: () => void;
  isRead: (version: string) => boolean;
  popupNotes: PatchNote[];
  dismissPopup: () => void;
}

/**
 * Client-only patch-notes state. Content lives in src/data/patch-notes.ts (so it
 * never disappears); only the per-device "read" + "popup seen" markers live in
 * localStorage. The popup is gated on onboarding completion so it never stacks
 * on the first-run tutorial.
 */
export function usePatchNotes(): UsePatchNotesValue {
  const { session } = useSession();
  const [readVersions, setReadVersions] = useState<Set<string>>(new Set());
  const [popupSeen, setPopupSeen] = useState<string | null>(LATEST); // assume seen until loaded → no flash
  const [loaded, setLoaded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  // Mirror the read set so mutation handlers compute the next value WITHOUT
  // doing side effects inside a setState updater (an updater runs during render;
  // dispatching there would setState sibling hook instances → React warning).
  const readRef = useRef(readVersions);
  readRef.current = readVersions;

  const onboardingKey = session?.licenseKey
    ? `hs-onboarding-${session.licenseKey}`
    : "hs-onboarding-complete";

  // Load markers from localStorage once the session is known.
  useEffect(() => {
    if (!session) return;
    let rawRead: string | null = null;
    try {
      rawRead = localStorage.getItem(READ_KEY);
    } catch {
      rawRead = null;
    }
    if (rawRead === null) {
      // First run: mark everything except the newest release as already seen, so
      // the bell only flags genuinely new updates (not the historical baseline).
      const seed = PATCH_NOTES.slice(1).map((p) => p.version);
      try {
        localStorage.setItem(READ_KEY, JSON.stringify(seed));
      } catch {
        /* ignore */
      }
      setReadVersions(new Set(seed));
    } else {
      setReadVersions(new Set(readArray(READ_KEY)));
    }
    try {
      setPopupSeen(localStorage.getItem(POPUP_SEEN_KEY));
    } catch {
      setPopupSeen(null);
    }
    try {
      setOnboardingDone(Boolean(localStorage.getItem(onboardingKey)));
    } catch {
      setOnboardingDone(false);
    }
    setLoaded(true);
  }, [session, onboardingKey]);

  // A brand-new user who finishes onboarding in-session should then be eligible
  // for the popup (without a reload).
  useEffect(() => {
    const onDone = () => setOnboardingDone(true);
    window.addEventListener(PWA_EVENTS.ONBOARDING_DONE, onDone);
    return () => window.removeEventListener(PWA_EVENTS.ONBOARDING_DONE, onDone);
  }, []);

  // Cross-tab / cross-instance sync of the read set. Only ever runs from a real
  // event (handler / storage), never during render.
  useEffect(() => {
    const sync = () => {
      const next = new Set(readArray(READ_KEY));
      readRef.current = next;
      setReadVersions(next);
    };
    window.addEventListener(PATCH_READ_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PATCH_READ_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // All side effects live here (handler scope), never inside a setState updater.
  const commitRead = useCallback((versions: string[]) => {
    const next = new Set(versions);
    readRef.current = next;
    setReadVersions(next);
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(PATCH_READ_EVENT));
  }, []);

  const markRead = useCallback(
    (version: string) => {
      if (readRef.current.has(version)) return;
      commitRead([...readRef.current, version]);
    },
    [commitRead]
  );

  const markAllRead = useCallback(() => {
    commitRead(PATCH_NOTES.map((p) => p.version));
  }, [commitRead]);

  const dismissPopup = useCallback(() => {
    setPopupSeen(LATEST);
    try {
      localStorage.setItem(POPUP_SEEN_KEY, LATEST);
    } catch {
      /* ignore */
    }
  }, []);

  const isRead = useCallback(
    (version: string) => readVersions.has(version),
    [readVersions]
  );

  const unread = loaded ? PATCH_NOTES.filter((p) => !readVersions.has(p.version)) : [];
  const popupNotes =
    loaded && onboardingDone ? computePopupNotes(popupSeen) : [];

  return {
    notes: PATCH_NOTES,
    unread,
    unreadCount: unread.length,
    markRead,
    markAllRead,
    isRead,
    popupNotes,
    dismissPopup,
  };
}
