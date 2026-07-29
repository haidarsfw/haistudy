import { parseScopeKey, scopeFullLabel } from "@/lib/scope";

/**
 * Shared wording for the account pages.
 *
 * Split out when `/account` became six routes: three of them print a status
 * badge or a date, and three copies of the same map is three chances for
 * "Selesai" to become "Sukses" on one page only.
 */

export const ACCESS_STATUS = {
  active: { label: "Aktif", className: "border-primary/40 bg-primary/10 text-primary" },
  expired: { label: "Sudah habis", className: "border-border bg-muted text-muted-foreground" },
  suspended: {
    label: "Ditangguhkan",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
} as const;

export const PURCHASE_STATUS = {
  pending: { label: "Menunggu konfirmasi", className: "text-warning" },
  approved: { label: "Selesai", className: "text-primary" },
  rejected: { label: "Ditolak", className: "text-destructive" },
} as const;

/**
 * "s2-uas-bm" → "Semester 2: UAS Business Management".
 *
 * Spelled out, always. "S2 UAS BM" is shorthand the person who built it can
 * read; a buyer cannot.
 */
export function scopeLabel(key: string): string {
  const tuple = parseScopeKey(key);
  return tuple ? scopeFullLabel(tuple) : key.replace(/-/g, " ").toUpperCase();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The "chat admin" link, pre-filled with who is asking. */
export function supportHref(waAdmin: string, displayName: string, email: string): string {
  return `https://api.whatsapp.com/send?phone=${waAdmin}&text=${encodeURIComponent(
    `Halo admin, saya${displayName ? ` ${displayName}` : ""} (${email}) butuh bantuan soal akun saya.`
  )}`;
}
