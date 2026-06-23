import type { ThemeOption, FontOption } from "@/types";

// ============================================
// App Constants
// ============================================

export const APP_NAME = "haistudy";
// Bump on every release. Drives the patch-notes popup (src/data/patch-notes.ts
// must have a matching top entry). Rule: new feature ⇒ bump middle (2.1.0);
// light fixes only ⇒ bump last (2.0.x).
export const APP_VERSION = "2.3.4";
export const APP_DESCRIPTION = "Platform belajar all-in-one untuk mahasiswa BINUS. Materi, quiz, AI, dan komunitas.";

// Classes (label/tag only - same content for all)
export const CLASSES = [
  "LA86",
  "LB86",
  "LC86",
  "LD86",
  "LE86",
  "Other",
] as const;

// Theme options
export const THEMES: ThemeOption[] = [
  { id: "ocean", name: "Ocean", color: "#0ea5a0" },
  { id: "scholarly", name: "Scholarly", color: "#5148d7" },
  { id: "espresso", name: "Espresso", color: "#7c6a3a" },
  { id: "forest", name: "Forest", color: "#5b8a5a" },
  { id: "midnight", name: "Midnight", color: "#3d5a80" },
  { id: "rosewood", name: "Rosewood", color: "#b85c5c" },
  { id: "stone", name: "Stone", color: "#708090" },
  { id: "rose", name: "Rose", color: "#e0699f" },
];

// Font options. Free fonts ship in the bundle via next/font (layout.tsx).
// VIP fonts are lazy-injected from Google Fonts only when selected
// (see src/lib/lazy-fonts.ts) so the free-user bundle stays unchanged.
export const FONTS: FontOption[] = [
  { id: "jakarta", name: "Jakarta Sans" },
  { id: "inter", name: "Inter" },
  { id: "poppins", name: "Poppins" },
  { id: "lora", name: "Lora", vip: true, googleFamily: "Lora:wght@400;500;600;700", cssVar: "--font-lora" },
  { id: "jetbrains", name: "JetBrains Mono", vip: true, googleFamily: "JetBrains+Mono:wght@400;500;700", cssVar: "--font-jetbrains" },
  { id: "quicksand", name: "Quicksand", vip: true, googleFamily: "Quicksand:wght@400;500;600;700", cssVar: "--font-quicksand" },
  { id: "merriweather", name: "Merriweather", vip: true, googleFamily: "Merriweather:wght@400;700", cssVar: "--font-merriweather" },
  // Times New Roman ships with every OS - no webfont needed, so no googleFamily.
  { id: "times", name: "Times New Roman", vip: true },
];

// Rate limiting
export const RATE_LIMITS = {
  LOGIN_MAX_ATTEMPTS: 3,
  LOGIN_LOCKOUT_MS: 60_000, // 1 minute
  LOGIN_LOCKOUT_TIER2_MS: 300_000, // 5 minutes
  LOGIN_LOCKOUT_TIER3_MS: 1_800_000, // 30 minutes
  CHAT_COOLDOWN_MS: 2_000,
  COMMENT_COOLDOWN_MS: 10_000,
  REPLY_COOLDOWN_MS: 5_000,
  THREAD_COOLDOWN_MS: 30_000, // 30 seconds between thread creation
  POLL_COOLDOWN_MS: 60_000, // 60 seconds between poll creation
  HIDE_STATUS_COOLDOWN_MS: 3_600_000, // 1 hour
  REMINDER_TEST_COOLDOWN_MS: 60_000, // 1 minute
} as const;

// Session
export const SESSION_TIMEOUT_MS = 1_800_000; // 30 minutes
export const SESSION_WARNING_MS = 1_500_000; // 25 minutes (5 min before timeout)
// Heartbeat cadence — widened to cut presence write/WAL churn (top Disk IO
// source). Online-list poll is 120s, so a 120s visible beat keeps it accurate.
export const PRESENCE_HEARTBEAT_VISIBLE_MS = 120_000; // 120 seconds (was 60s)
export const PRESENCE_HEARTBEAT_HIDDEN_MS = 600_000; // 10 minutes (was 5m)
export const MAX_DEVICES = 2;

// Chat
export const CHAT_MAX_MESSAGES = 100;
export const MAX_PINNED_MESSAGES = 3;

// Support chat (v2)
export const SUPPORT_EDIT_WINDOW_MS = 900_000;          // 15 min
export const SUPPORT_REACTION_RATE_LIMIT_MS = 167;      // ~6/sec
export const SUPPORT_EDIT_RATE_LIMIT_MS = 2_000;
export const SUPPORT_TYPING_DEBOUNCE_MS = 1_500;
export const SUPPORT_TYPING_CLEAR_MS = 3_000;
export const SUPPORT_MAX_IMAGES = 5;
export const SUPPORT_MAX_AUDIO_SECONDS = 120;
export const SUPPORT_GROUP_WINDOW_MS = 5 * 60_000;      // consecutive grouping
export const SUPPORT_PRESENCE_STALE_MS = 150_000;
export const SUPPORT_DEFAULT_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"] as const;

// Quiz
export const MAX_POINTS_PER_SUBJECT = 100;
export const QUIZ_TIMER_SECONDS = 20;

// SoundCloud Lofi playlist for music player
export const SOUNDCLOUD_PLAYLIST_URL =
  "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/545610837&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&show_playcount=false";

// Default user settings
export const DEFAULT_SETTINGS = {
  darkMode: true,
  theme: "forest" as const,
  font: "jakarta" as const,
  language: "id" as const,
  selectedClass: "",
  reminder: null,
  hideStatus: false,
  hideStatusChangedAt: null,
  darkModeSchedule: {
    enabled: false,
    start: "18:00",
    end: "06:00",
  },
  progress: {},
  countdownDetailed: true,
};
