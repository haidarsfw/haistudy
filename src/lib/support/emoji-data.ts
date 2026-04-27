/**
 * Lightweight curated emoji set for support chat.
 * No dep, ~120 emojis across 6 categories.
 */

export interface EmojiCategory {
  id: string;
  labelKey: string; // i18n key
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    labelKey: "support.emoji_category_smileys",
    emojis: [
      "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇",
      "🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
      "😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥳",
      "🤩","😏","😒","😞","😔","😟","😕","🙁","☹️","😣",
      "😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬",
    ],
  },
  {
    id: "gestures",
    labelKey: "support.emoji_category_gestures",
    emojis: [
      "👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👈","👉",
      "👆","👇","☝️","👋","🤚","🖐️","✋","🖖","👏","🙌",
      "🙏","💪","🤝","✊","👊",
    ],
  },
  {
    id: "hearts",
    labelKey: "support.emoji_category_hearts",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
      "❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️",
    ],
  },
  {
    id: "animals",
    labelKey: "support.emoji_category_animals",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
      "🦁","🐮","🐷","🐸","🐵","🦄","🐔","🐧","🐦","🐤",
    ],
  },
  {
    id: "food",
    labelKey: "support.emoji_category_food",
    emojis: [
      "🍎","🍊","🍌","🍉","🍇","🍓","🍑","🍒","🥝","🍍",
      "🥑","🍕","🍔","🍟","🌭","🍿","🍦","🍩","🍪","🎂",
      "☕","🍵","🥤","🧋","🍺","🍷",
    ],
  },
  {
    id: "objects",
    labelKey: "support.emoji_category_objects",
    emojis: [
      "🔥","⭐","🌟","✨","💯","✅","❌","⚠️","💡","🎉",
      "🎊","🎁","🏆","🎯","🎵","🎶","💌","📌","📎","🔒",
      "🔑","🛒","💰","💵","💸","🚀",
    ],
  },
];

export const ALL_EMOJIS: string[] = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

export const RECENTLY_USED_KEY = "hs-support-emoji-recent";

export function loadRecentEmojis(limit = 20): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTLY_USED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, limit);
  } catch {
    return [];
  }
}

export function pushRecentEmoji(emoji: string, limit = 20): void {
  if (typeof localStorage === "undefined") return;
  try {
    const cur = loadRecentEmojis(limit);
    const next = [emoji, ...cur.filter((e) => e !== emoji)].slice(0, limit);
    localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
