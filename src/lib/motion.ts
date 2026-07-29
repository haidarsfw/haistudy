import type { Transition, Variants } from "framer-motion";

// ─── Spring presets ───
export const springSmooth: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 17,
};

export const springGentle: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 24,
};

// ─── Duration presets ───
export const durationFast: Transition = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1],
};

export const durationSmooth: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

// ─── Entrance variants ───
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: springSmooth },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: springSmooth },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: springSmooth },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: springSmooth },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: springSmooth },
};

// ─── Stagger containers ───
export function staggerContainer(staggerDelay = 0.06): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: springSmooth },
};

// ─── Interactive ───
export const tapScale = { scale: 0.97 };
export const hoverLift = { y: -4, transition: springSmooth };

// ─── Shake (wrong answer) ───
export const shakeX = {
  x: [0, -8, 8, -4, 4, 0],
  transition: { duration: 0.4 },
};

// ─── Pop (correct answer) ───
export const popScale = {
  scale: [1, 1.15, 1],
  transition: { duration: 0.3 },
};

// ─── Loading shimmer/pulse ───
export const pulseAnimation: Variants = {
  hidden: { opacity: 0.5 },
  visible: {
    opacity: [0.5, 1, 0.5],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
};

// ─── Tab crossfade ───
export const tabCrossfade: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// ─── Notification entrance (spring) ───
export const notificationSpring: Variants = {
  hidden: { opacity: 0, y: -20, x: 20, scale: 0.9 },
  visible: { opacity: 1, y: 0, x: 0, scale: 1, transition: springBouncy },
  exit: { opacity: 0, x: 100, transition: durationFast },
};

// ─── Card hover (consistent lift + shadow hint) ───
export const hoverCard = {
  y: -2,
  transition: springGentle,
};

// ─── Button universal hover ───
export const hoverButton = {
  scale: 1.02,
  transition: { duration: 0.2, ease: "easeOut" },
};

// ═══════════════════════════════════════════════════════════════════
// Navigation motion contract
// ═══════════════════════════════════════════════════════════════════
//
// One set of numbers for every "the content just changed" moment — a route
// change, a tab, a step in the checkout wizard. They differ only in how far
// things travel, so the whole product reads as one thing rather than a pile of
// screens that each picked their own timing.
//
// Two rules hold everywhere:
//
//   1. Transform and opacity ONLY. Both are composited, so nothing here can
//      trigger layout or paint, and nothing here can shove the page around
//      while a field is focused.
//   2. Leaving is faster than arriving. Symmetric timings leave a hole in the
//      middle where neither the old nor the new content is readable, which is
//      exactly what makes a transition feel slow.

/** Fast start, soft landing. The house curve for anything arriving. */
export const easeEnter = [0.16, 1, 0.3, 1] as const;
/** Anything leaving. Gets out of the way instead of lingering. */
export const easeExit = [0.4, 0, 1, 1] as const;

export const NAV = {
  /** Arriving. Long enough to notice, short enough not to wait on. */
  enter: 0.24,
  /** Leaving. */
  exit: 0.14,
  /** Everything collapses to this when the OS asks for less motion. */
  reduced: 0.09,
  /** Travel distance, by surface size. */
  distance: { page: 8, tab: 12, step: 16 },
} as const;

/**
 * A route change.
 *
 * Enter only, deliberately. In the App Router the outgoing page is gone before
 * the incoming one renders, so there is nothing left to animate out — a
 * "proper" exit needs the experimental View Transitions flag, which is not
 * worth turning on across a live site for 140ms of polish.
 */
export function pageEnter(flat: boolean | null): Variants {
  const transition = {
    duration: flat ? NAV.reduced : NAV.enter,
    ease: easeEnter,
  };
  // `y` is left out entirely rather than set to 0. Animating TO zero still
  // makes the element carry `transform: translateY(0px)` forever after, and a
  // transformed ancestor becomes the containing block for `position: fixed`
  // children — which would strand the landing header mid-page for good. A
  // crossfade has to mean no transform at all, not a transform worth nothing.
  if (flat) {
    return { hidden: { opacity: 0 }, visible: { opacity: 1, transition } };
  }
  return {
    hidden: { opacity: 0, y: NAV.distance.page },
    visible: { opacity: 1, y: 0, transition },
  };
}

/**
 * Tabs and wizard steps: direction-aware, and reversible because of it.
 *
 * `custom` carries the direction (+1 forward, -1 back), so going back is the
 * exact mirror of going forward rather than a second forward animation. That
 * mirroring is the whole reason a wizard feels like it has a place you are
 * moving through instead of a stack of unrelated screens.
 *
 * Under reduced motion the sideways travel disappears entirely and only the
 * crossfade survives — direction stops mattering when nothing moves.
 */
export function directionalPanel(
  distance: number = NAV.distance.tab,
  reduced: boolean | null = false
): Variants {
  const d = reduced ? 0 : distance;
  return {
    hidden: (dir: number) => ({ opacity: 0, x: d * (dir || 1) }),
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: reduced ? NAV.reduced : 0.22,
        ease: easeEnter,
      },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: -d * (dir || 1),
      transition: {
        duration: reduced ? NAV.reduced : 0.13,
        ease: easeExit,
      },
    }),
  };
}

/** The sliding marker under an active tab. Springs, so it settles rather than stops. */
export const tabIndicator: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
};
