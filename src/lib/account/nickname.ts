// ============================================
// Nickname rules
// ============================================
//
// The nickname is the name everyone else sees — in chat, in the forum, on the
// leaderboard — and it is what the personal referral code is built from. That
// gives it three jobs at once, and each one narrows what it is allowed to be:
//
//   Read by people      up to two words, so "Fathan Rizqi" is possible and a
//                       sentence is not.
//   Says who you are    unique, or two people in one class chat share a name
//                       and either can be mistaken for the other.
//   Becomes a code      letters only, so it survives being typed out of a
//                       WhatsApp message by hand.
//
// No digits, anywhere. Two people called Fathan are told apart by their own
// second name — "Fathan R", "Fathan Rizqi" — never by a counter. A number says
// nothing true about a person and reads like a queue ticket.
//
// ASCII only, deliberately. Allowing Unicode invites homoglyph impersonation:
// "Fathan" written with a Cyrillic а is a different string that no uniqueness
// check will catch and no human will notice.

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;

/** One word, or two, letters only. */
const SHAPE = /^[A-Za-z]+( [A-Za-z]+)?$/;

/**
 * Whatever they typed, in the one casing the product uses.
 *
 * Every word gets a capital: "fathan rizqi" and "FATHAN RIZQI" are the same
 * person's intent, and rejecting either would be pedantry. Runs of spaces
 * collapse to one, because a double space is a slip rather than a decision.
 */
export function normalizeNickname(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** The reason it cannot be used, or null. Written to be shown as-is. */
export function validateNickname(raw: string): string | null {
  const value = normalizeNickname(raw);
  if (!value) return "Nama panggilan wajib diisi";
  if (/[0-9]/.test(value)) return "Tanpa angka, huruf saja";
  if (value.split(" ").length > 2) return "Maksimal dua kata";
  if (!SHAPE.test(value)) return "Huruf saja, tanpa tanda baca";
  if (value.length < NICKNAME_MIN) return `Minimal ${NICKNAME_MIN} huruf`;
  if (value.length > NICKNAME_MAX) return `Maksimal ${NICKNAME_MAX} huruf`;
  return null;
}

/** Words of a full name, punctuation and digits dropped, empties removed. */
function nameWords(fullName: string): string[] {
  return String(fullName ?? "")
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);
}

/**
 * Alternatives to offer when the name they wanted is taken.
 *
 * Built entirely from their OWN full name, in the order a person would think
 * of them: the initial of the name that follows, then a little more of it,
 * then the whole thing. "Fathan Umari" is offered Fathan U, then Fathan Um,
 * then Fathan Umari — each one still true about them.
 *
 * The initial comes from the name that FOLLOWS the one they picked, not
 * blindly from the second word: someone called "Muhammad Fathan Umari" asking
 * for "Fathan" is offered Fathan U, never Fathan M.
 *
 * Returns nothing at all when the full name has nothing left to give — a
 * single-word name whose owner wants exactly that word. The caller has to say
 * so rather than inventing something; there is no number to fall back on and
 * that is the point.
 *
 * Availability is not checked here — that needs the database, and this has to
 * stay usable from the browser.
 */
export function suggestNicknames(desired: string, fullName: string): string[] {
  const base = normalizeNickname(desired);
  if (!base) return [];

  const first = base.split(" ")[0];
  const words = nameWords(fullName);
  const at = words.findIndex((w) => w.toLowerCase() === first.toLowerCase());
  // Names they have left over after the one they chose. When the nickname is
  // not one of their names at all, everything after the first name is fair game.
  const rest = at >= 0 ? words.slice(at + 1) : words.slice(1);

  const out: string[] = [];
  const push = (candidate: string) => {
    const v = normalizeNickname(candidate);
    if (validateNickname(v)) return;
    if (v.toLowerCase() === base.toLowerCase()) return;
    if (!out.some((existing) => existing.toLowerCase() === v.toLowerCase())) {
      out.push(v);
    }
  };

  // Growing prefixes of the next name: R, Ri, Riz, Rizqi. Short first, because
  // a shorter name is the one people actually use.
  for (const word of rest.slice(0, 2)) {
    for (let len = 1; len <= word.length; len++) {
      push(`${first} ${word.slice(0, len)}`);
      if (out.length >= 6) break;
    }
    if (out.length >= 6) break;
  }

  return out.slice(0, 6);
}
