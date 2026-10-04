import type { Transition, Variants } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════
// WATAK GERAK: "halus tanpa pantul"
// ═══════════════════════════════════════════════════════════════════════════
//
// Pilihan pemilik 4 Oktober 2026, menggantikan watak "Pegas" (dipilih di
// /gerak, 12 Agustus) yang melewati tujuannya ~5% lalu balik. Wataknya kini:
// benda datang cepat, melambat, dan berhenti TEPAT di tujuan. Tidak ada yang
// melewati tujuannya, termasuk pegas: semua pegas di sini teredam kritis
// (damping >= 2 * sqrt(stiffness * mass)), jadi tetap terasa hidup tanpa goyang.
//
// Padanan CSS-nya ada di blok WATAK GERAK di `src/app/globals.css`
// (`--ease-pop`, `--ease-pop-out`, 260ms masuk / 130ms keluar). Dua-duanya
// harus bergerak bersama: kalau salah satu diubah, ubah yang lain.
//
// Diukur sebelum dipakai: 0 frame jatuh dari 931, bahkan saat CPU dilambatkan
// 4×. Sebabnya semua di berkas ini cuma menggerakkan transform + opacity.
// Jangan pernah memasukkan width, height, box-shadow, atau filter ke sini —
// animasi seperti itu terukur menjatuhkan 2,6% frame.

/** Pegas rumah. Dipakai untuk apa pun yang DATANG. */
export const springPop: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 39,
  mass: 0.9,
};

/** Untuk benda kecil yang harus terasa lebih ringan: lencana, ikon, centang. */
export const springPopSnappy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 38,
  mass: 0.7,
};

/** Untuk benda besar: panel, lembar, kartu lebar. Lebih berat, lebih tenang. */
export const springPopHeavy: Transition = {
  type: "spring",
  stiffness: 340,
  damping: 37,
  mass: 1,
};

// ─── Nama lama, tetap hidup ───
// Puluhan komponen sudah memanggil tiga nama di bawah ini. Menghapusnya berarti
// menyentuh semuanya dalam satu tebasan; menyambungnya ke pegas rumah membuat
// semuanya seragam tanpa satu pun callsite berubah.
export const springSmooth: Transition = springPop;
export const springBouncy: Transition = springPopSnappy;
export const springGentle: Transition = springPopHeavy;

// ─── Duration presets ───
// Untuk yang tidak bisa memakai pegas — apa pun yang menganimasikan warna atau
// tinggi, karena pegas pada nilai non-transform berakhir menghitung ratusan
// langkah tak berguna. Kurvanya tetap kurva rumah supaya rasanya menyambung.
export const durationFast: Transition = {
  duration: 0.13,
  ease: [0.16, 1, 0.3, 1],
};

export const durationSmooth: Transition = {
  duration: 0.26,
  ease: [0.16, 1, 0.3, 1],
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

/**
 * The house curve for anything arriving: fast start, long soft landing, and it
 * stops exactly on its target. The CSS twin of `springPop`, and the same
 * numbers as `--ease-pop` in globals.css. Used where a real spring cannot go.
 */
export const easeEnter = [0.16, 1, 0.3, 1] as const;
/** Anything leaving. Gets out of the way instead of lingering, and never
 *  overshoots: a thing on its way out has no target to settle onto. */
export const easeExit = [0.4, 0, 1, 1] as const;

/**
 * For the few things that must animate SIZE — a disclosure opening, a panel
 * growing. Fast start, soft landing, and **never overshoots**.
 *
 * Kept apart from `easeEnter` on purpose: when the house curve still overshot
 * (the "Pegas" character, August to October 2026), a HEIGHT that overshot grew
 * the box taller than its content and snapped back, so the text inside jumped.
 * That happened to the "Hapus akun" card. Size keeps its own curve so a future
 * change to the house curve can never do that again.
 *
 * Height is layout, not transform, so every frame reflows everything below it.
 * Use this sparingly and only where there is no honest alternative.
 */
export const easeSize = [0.22, 1, 0.36, 1] as const;

export const NAV = {
  /** Arriving. Long enough to notice, short enough not to wait on. */
  enter: 0.26,
  /** Leaving. */
  exit: 0.13,
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
        duration: reduced ? NAV.reduced : NAV.enter,
        ease: easeEnter,
      },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: -d * (dir || 1),
      transition: {
        duration: reduced ? NAV.reduced : NAV.exit,
        ease: easeExit,
      },
    }),
  };
}

/** The sliding marker under an active tab. Springs, so it settles rather than stops. */
export const tabIndicator: Transition = springPop;

// ═══════════════════════════════════════════════════════════════════════════
// Popups that cannot use `ui/dialog.tsx`
// ═══════════════════════════════════════════════════════════════════════════
//
// Six of them exist — the exam modals, the announcement, the survey, the
// device confirmation. They are hand-rolled for real reasons (the exam ones
// must survive the exam player's own focus handling), and each had invented
// its own timing: springs at 400/30 and 360/32, tweens at 0.18 and 0.22, three
// different start scales, two different travel distances.
//
// They are not converted to the shared Dialog — that is a structural change
// with a focus-trap risk that buys nothing the eye can see. They are pointed at
// the same two variants instead, which is what "seragam" actually requires.
//
// Anything NEW that needs a popup should use `ui/dialog.tsx`. These exist
// because they already did.

/** The dark behind a popup. Faster than the panel: the leap belongs to the card. */
export const popupOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: easeEnter } },
  exit: { opacity: 0, transition: { duration: NAV.exit, ease: easeExit } },
};

/** The popup itself. Springs in, then leaves on a tween — a thing on its way
 *  out has no target to settle onto, so a spring there only costs time. */
export const popupPanel: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springPop },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: NAV.exit, ease: easeExit },
  },
};
