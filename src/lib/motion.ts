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
