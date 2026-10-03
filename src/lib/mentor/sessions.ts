/** A mentoring session (table group_sessions, migration 086). */
export interface AgendaItem {
  text: string;
  /** Reserved for phase 2 (module markers feeding the agenda). */
  subjectId?: string;
  module?: string;
}

export type SessionStatus = "scheduled" | "done" | "cancelled";

export interface GroupSession {
  id: string;
  groupId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  place: string | null;
  agenda: AgendaItem[];
  notes: string | null;
  status: SessionStatus;
  createdAt: string;
  /** The caller's own answer (members). */
  myRsvp?: { rsvp: "going" | "not_going" | null; reason: string | null } | null;
  /** Everyone's answers and attendance (mentors only). */
  attendance?: {
    accountId: string;
    name: string;
    rsvp: "going" | "not_going" | null;
    reason: string | null;
    attended: boolean | null;
  }[];
}

export const SESSION_COLUMNS =
  "id, group_id, title, starts_at, duration_minutes, place, agenda, notes, status, created_at";

export function toGroupSession(row: Record<string, unknown>): GroupSession {
  return {
    id: row.id as string,
    groupId: row.group_id as string,
    title: row.title as string,
    startsAt: row.starts_at as string,
    durationMinutes: (row.duration_minutes as number) ?? 90,
    place: (row.place as string | null) ?? null,
    agenda: Array.isArray(row.agenda) ? (row.agenda as AgendaItem[]) : [],
    notes: (row.notes as string | null) ?? null,
    status: (row.status as SessionStatus) ?? "scheduled",
    createdAt: row.created_at as string,
  };
}

/**
 * Agenda from untrusted input: at most 20 points of at most 200 characters.
 * A point may name the module it covers (subjectId + module id), which is how
 * a module becomes "dijadwalkan" and later "dibahas" for the group.
 */
export function cleanAgenda(raw: unknown): AgendaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: AgendaItem[] = [];
  for (const item of raw.slice(0, 20)) {
    const o = (item ?? {}) as { text?: unknown; subjectId?: unknown; module?: unknown };
    const text = String(typeof item === "string" ? item : o.text ?? "").trim().slice(0, 200);
    if (!text) continue;
    const subjectId = typeof o.subjectId === "string" ? o.subjectId.trim().slice(0, 60) : "";
    const moduleKey = typeof o.module === "string" ? o.module.trim().slice(0, 80) : "";
    out.push(subjectId && moduleKey ? { text, subjectId, module: moduleKey } : { text });
  }
  return out;
}

/**
 * Validate a session's editable fields. Returns the clean values or an error
 * sentence for the mentor. `partial` allows leaving fields out (an edit).
 */
export function parseSessionInput(
  body: Record<string, unknown>,
  partial: boolean
): { ok: true; values: Record<string, unknown> } | { ok: false; error: string } {
  const v: Record<string, unknown> = {};
  if (!partial || body.title !== undefined) {
    const title = String(body.title ?? "").trim().slice(0, 80);
    if (!title) return { ok: false, error: "Judul sesi wajib diisi." };
    v.title = title;
  }
  if (!partial || body.startsAt !== undefined) {
    const t = Date.parse(String(body.startsAt ?? ""));
    if (Number.isNaN(t)) return { ok: false, error: "Tanggal dan jam sesi belum benar." };
    // A year either way is generous for a semester; anything outside it is a typo.
    if (Math.abs(t - Date.now()) > 366 * 24 * 3600_000) {
      return { ok: false, error: "Tanggal sesi terlalu jauh. Cek lagi tahunnya." };
    }
    v.starts_at = new Date(t).toISOString();
  }
  if (!partial || body.durationMinutes !== undefined) {
    const d = Math.round(Number(body.durationMinutes ?? 90));
    if (!Number.isFinite(d) || d < 15 || d > 480) {
      return { ok: false, error: "Durasi sesi 15 menit sampai 8 jam." };
    }
    v.duration_minutes = d;
  }
  if (body.place !== undefined) v.place = String(body.place ?? "").trim().slice(0, 200) || null;
  if (body.agenda !== undefined) v.agenda = cleanAgenda(body.agenda);
  if (body.notes !== undefined) v.notes = String(body.notes ?? "").trim().slice(0, 4000) || null;
  if (body.status !== undefined) {
    const s = String(body.status);
    if (s !== "scheduled" && s !== "done" && s !== "cancelled") {
      return { ok: false, error: "Status sesi tidak dikenal." };
    }
    v.status = s;
  }
  return { ok: true, values: v };
}

export type Rsvp = "going" | "not_going";

/** One member's answer and attendance for a session, as the mentor sees it. */
export interface AttendanceRow {
  accountId: string;
  name: string;
  rsvp: Rsvp | null;
  reason: string | null;
  attended: boolean | null;
}
