"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useSession } from "@/components/providers/session-provider";
import { MODAL_SPENT_KEY } from "@/lib/interruptions";

/**
 * One queue for everything that interrupts someone on the way in.
 *
 * Six surfaces used to decide for themselves: the tutorial, two forms after
 * it, the announcement popup, the install prompt and the "what's new" notice.
 * Each one was reasonable alone and each one gated itself correctly. Stacked,
 * they were six screens between a person and the thing they paid for, and the
 * feedback was that people stopped reading and just wanted out.
 *
 * Nobody decides alone any more. A surface says what it has and how much it
 * matters; this decides whether now is the moment.
 *
 * Two lanes, because a dialog and a strip under the header are not the same
 * kind of intrusion:
 *
 *   modal  — one per entry. Whoever wins shows; everyone else waits for the
 *            next time the person comes in. This is the actual fix.
 *   banner — one at a time. A thin inline strip blocks nothing, so when the
 *            top one is dismissed the next may take its place.
 */

export type InterruptionLane = "modal" | "banner";

export interface InterruptionClaim {
  id: string;
  lane: InterruptionLane;
  /** Higher wins. Settled list in `INTERRUPTION_PRIORITY`. */
  priority: number;
}

interface InterruptionApi {
  holders: Record<InterruptionLane, string | null>;
  claim: (claim: InterruptionClaim) => void;
  withdraw: (id: string) => void;
  release: (id: string) => void;
}

const InterruptionContext = createContext<InterruptionApi | null>(null);

/**
 * The three actions on their own, in a context whose value never changes.
 *
 * The slot hook's effects depend on these. Depending on the whole api object
 * instead meant every change of holder handed every surface a new object, and
 * every surface then withdrew and re-claimed in response — harmless only
 * because React happened to batch the two, which is not something to lean on.
 */
type InterruptionActions = Pick<InterruptionApi, "claim" | "withdraw" | "release">;
const InterruptionActionsContext = createContext<InterruptionActions | null>(null);

/**
 * The order, in one place, so it can be read as a sentence: a first-run
 * tutorial outranks a maintenance notice, which outranks a release note,
 * which outranks an install prompt.
 */
export const INTERRUPTION_PRIORITY = {
  onboarding: 100,
  announcement: 80,
  patchNotes: 50,
  /**
   * Di atas ajakan pasang aplikasi karena jauh lebih jarang: hanya untuk yang
   * sudah membeli, dan paling cepat 14 hari sekali. Yang jarang harus menang,
   * atau ia tidak pernah mendapat giliran sama sekali.
   */
  inviteNudge: 35,
  install: 30,
  /** A standing welcome notice is wallpaper; it yields to a live nudge. */
  announcementInfo: 20,
  enableNotifications: 40,
} as const;

/*
 * sessionStorage, deliberately: reloading the page you are already on is not a
 * new entry and must not bring the popup back. What it stores is WHICH licence
 * spent its entry — see `src/lib/interruptions.ts` for why a bare flag was not
 * enough.
 */

/**
 * Everyone registers within a few frames of mount, but not in a fixed order —
 * one waits on a fetch, another on a realtime list. Granting the lane to
 * whoever arrives first would make the order depend on network latency. So the
 * first grant waits for the field to fill. Long enough to collect the claims,
 * short enough that nothing appears to hesitate.
 */
const SETTLE_MS = 400;

const LANES: InterruptionLane[] = ["modal", "banner"];

export function InterruptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const who = session?.licenseKey ?? "";
  const whoRef = useRef(who);
  useEffect(() => {
    whoRef.current = who;
  }, [who]);
  const [claims, setClaims] = useState<InterruptionClaim[]>([]);
  const [settled, setSettled] = useState(false);
  const [modalSpent, setModalSpent] = useState(false);
  const [holders, setHolders] = useState<Record<InterruptionLane, string | null>>({
    modal: null,
    banner: null,
  });

  // Mirrored so `release` can read the current holder from handler scope: the
  // alternative is a setState inside another updater, which runs during render.
  // Release always arrives from a click, long after the grant has committed, so
  // syncing in an effect is close enough and keeps render pure.
  const holdersRef = useRef(holders);
  useEffect(() => {
    holdersRef.current = holders;
  }, [holders]);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  // Re-read whenever the person changes: a different licence on the same tab
  // has not spent anything yet.
  useEffect(() => {
    if (!who) return;
    try {
      setModalSpent(sessionStorage.getItem(MODAL_SPENT_KEY) === who);
    } catch {
      // Private mode / blocked storage: every entry gets its one interruption.
    }
  }, [who]);

  useEffect(() => {
    if (!settled) return;
    setHolders((prev) => {
      const next = { ...prev };
      for (const lane of LANES) {
        // The MODAL lane keeps its holder until that holder lets go. Without
        // this, an announcement arriving over realtime could pull a dialog out
        // from under someone halfway through reading it.
        //
        // The banner lane does not. A strip under the header can be swapped
        // without interrupting anything, and it must be: holding it would let
        // the "aktifkan notifikasi" nudge sit on top of a maintenance warning
        // that arrived a minute later, for the whole session.
        const current = prev[lane];
        if (lane === "modal" && current && claims.some((c) => c.id === current)) continue;
        if (lane === "modal" && modalSpent) {
          next[lane] = null;
          continue;
        }
        const best = claims
          .filter((c) => c.lane === lane)
          .sort((a, b) => b.priority - a.priority)[0];
        next[lane] = best?.id ?? null;
      }
      if (next.modal === prev.modal && next.banner === prev.banner) return prev;
      return next;
    });
  }, [claims, settled, modalSpent]);

  const claim = useCallback((entry: InterruptionClaim) => {
    setClaims((prev) => {
      const existing = prev.find((c) => c.id === entry.id);
      if (
        existing &&
        existing.lane === entry.lane &&
        existing.priority === entry.priority
      ) {
        return prev;
      }
      return [...prev.filter((c) => c.id !== entry.id), entry];
    });
  }, []);

  /** "I have nothing to show." Frees the lane without using up the entry. */
  const withdraw = useCallback((id: string) => {
    setClaims((prev) =>
      prev.some((c) => c.id === id) ? prev.filter((c) => c.id !== id) : prev
    );
  }, []);

  /** "I showed, and the person is done with me." Uses up the modal lane. */
  const release = useCallback((id: string) => {
    const current = holdersRef.current;
    if (current.modal === id) {
      try {
        sessionStorage.setItem(MODAL_SPENT_KEY, whoRef.current || "?");
      } catch {
        // Unwritable storage degrades to one interruption per page load.
      }
      setModalSpent(true);
      setHolders((prev) => ({ ...prev, modal: null }));
    } else if (current.banner === id) {
      setHolders((prev) => ({ ...prev, banner: null }));
    }
    setClaims((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const api = useMemo<InterruptionApi>(
    () => ({ holders, claim, withdraw, release }),
    [holders, claim, withdraw, release]
  );
  const actions = useMemo<InterruptionActions>(
    () => ({ claim, withdraw, release }),
    [claim, withdraw, release]
  );

  return (
    <InterruptionActionsContext.Provider value={actions}>
      <InterruptionContext.Provider value={api}>{children}</InterruptionContext.Provider>
    </InterruptionActionsContext.Provider>
  );
}

export interface InterruptionSlot {
  /** True when this surface is the one allowed to show right now. */
  granted: boolean;
  /** Call when the person dismisses it. On the modal lane, that is the entry spent. */
  release: () => void;
}

/**
 * Ask for the lane. `ready` means "I have something to show" — not that it is
 * showing, which is what `granted` answers.
 *
 * Call it before any early return: a surface that bails out before the hook
 * runs changes the hook order between renders.
 *
 * Mounted outside the provider (a landing page, a test harness) it grants
 * everything, so a surface can live in both trees without knowing.
 */
export function useInterruptionSlot(
  id: string,
  opts: { lane: InterruptionLane; priority: number; ready: boolean }
): InterruptionSlot {
  const api = useContext(InterruptionContext);
  const actions = useContext(InterruptionActionsContext);
  const { lane, priority, ready } = opts;

  useEffect(() => {
    if (!actions) return;
    if (ready) actions.claim({ id, lane, priority });
    else actions.withdraw(id);
  }, [actions, id, lane, priority, ready]);

  // Leaving the page is not a dismissal: withdraw, never spend.
  useEffect(() => {
    if (!actions) return;
    return () => actions.withdraw(id);
  }, [actions, id]);

  const release = useCallback(() => {
    actions?.release(id);
  }, [actions, id]);

  return {
    granted: api ? api.holders[lane] === id : true,
    release,
  };
}
