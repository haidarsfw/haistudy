"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { Bookmark, CalendarClock, CalendarPlus, Check, ChevronDown, ListPlus, Loader2, MapPin, Users } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { AgendaItem, GroupSession } from "@/lib/mentor/sessions";
import type { ScopeTuple } from "@/types/scope";
import { cn } from "@/lib/utils";
import { AgendaFromModules, type ModuleState } from "./agenda-from-modules";

/** For the agenda template: the period the group teaches and what it covered. */
interface AgendaPlan {
  scope: ScopeTuple;
  states: Map<string, ModuleState>;
}

/** "Sab, 11 Okt · 19.00–20.30" */
export function sessionWhen(s: Pick<GroupSession, "startsAt" | "durationMinutes">): string {
  const start = new Date(s.startsAt);
  const end = new Date(start.getTime() + s.durationMinutes * 60_000);
  return `${format(start, "EEE, d MMM · HH.mm", { locale: idLocale })}–${format(end, "HH.mm")}`;
}

const DURATIONS = [60, 90, 120, 180];

/**
 * A group's sessions. One component for both sides: a mentor schedules,
 * closes a session with its notes, or cancels it; a member reads.
 *
 * Upcoming first, then what already happened, newest first, because a member
 * opens this to know when the next one is and a mentor to write up the last.
 */
export function GroupSessions({
  groupId,
  canEdit: canEditProp,
  scope,
  readOnly = false,
}: {
  groupId: string;
  canEdit: boolean;
  /** The period the group teaches; gives the mentor the agenda template. */
  scope?: ScopeTuple;
  /** An archived group: the schedule and notes are history, no answers or edits. */
  readOnly?: boolean;
}) {
  const canEdit = canEditProp && !readOnly;
  const [sessions, setSessions] = useState<GroupSession[] | null>(null);
  const [adding, setAdding] = useState(false);
  // Read once when the list mounts: which sessions are still ahead is a
  // question about the moment the list is opened, not about every render.
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const r = await fetch(`/api/mentor/groups/${groupId}/sessions`, { credentials: "same-origin" });
    const body = await r.json().catch(() => ({}));
    setSessions(r.ok ? (body.sessions ?? []) : []);
  }, [groupId]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/mentor/groups/${groupId}/sessions`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((b) => alive && setSessions(b.sessions ?? []))
      .catch(() => alive && setSessions([]));
    return () => {
      alive = false;
    };
  }, [groupId]);

  if (sessions === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat jadwal
      </p>
    );
  }

  const upcoming = sessions.filter(
    (s) => s.status === "scheduled" && new Date(s.startsAt).getTime() + s.durationMinutes * 60_000 > now
  );
  const past = sessions
    .filter((s) => !upcoming.includes(s))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  // What the group already did with each module, for the agenda template.
  const states = new Map<string, ModuleState>();
  for (const s of sessions) {
    if (s.status === "cancelled") continue;
    for (const a of s.agenda) {
      if (!a.subjectId || !a.module) continue;
      const key = `${a.subjectId}/${a.module}`;
      if (s.status === "done") states.set(key, "done");
      else if (!states.has(key)) states.set(key, "scheduled");
    }
  }
  const plan: AgendaPlan | null = canEdit && scope ? { scope, states } : null;

  return (
    <div className="space-y-4">
      {canEdit && <ModuleRequests groupId={groupId} upcoming={upcoming} onAdded={load} />}
      {canEdit &&
        (adding ? (
          <SessionForm
            groupId={groupId}
            plan={plan}
            onDone={async (saved) => {
              setAdding(false);
              if (saved) await load();
            }}
          />
        ) : (
          <Button variant="outline" className="h-11 gap-2" onClick={() => setAdding(true)}>
            <CalendarPlus className="h-4 w-4" />
            Jadwalkan sesi
          </Button>
        ))}

      {upcoming.length === 0 && past.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {readOnly
            ? "Grup ini tidak punya sesi."
            : canEdit
              ? "Belum ada sesi. Jadwalkan yang pertama; anggota grup melihatnya di aplikasi dan diingatkan sehari sebelumnya."
              : "Mentormu belum menjadwalkan sesi."}
        </p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <ul className="space-y-2">
              {upcoming.map((s) => (
                <SessionRow key={s.id} s={s} groupId={groupId} canEdit={canEdit} readOnly={readOnly} onChange={load} now={now} plan={plan} />
              ))}
            </ul>
          )}
          {past.length > 0 && (
            <div>
              {/* Done, cancelled, or simply over: not "sudah lewat", since a
                  session cancelled for next week has not passed. */}
              <p className="mb-2 text-xs font-medium text-muted-foreground">Riwayat</p>
              <ul className="space-y-2">
                {past.map((s) => (
                  <SessionRow key={s.id} s={s} groupId={groupId} canEdit={canEdit} readOnly={readOnly} onChange={load} now={now} plan={plan} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SessionRow({
  s,
  groupId,
  canEdit,
  readOnly,
  onChange,
  now,
  plan,
}: {
  s: GroupSession;
  groupId: string;
  canEdit: boolean;
  readOnly: boolean;
  onChange: () => Promise<void>;
  plan: AgendaPlan | null;
  now: number;
}) {
  const [closing, setClosing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notes, setNotes] = useState(s.notes ?? "");
  const [busy, setBusy] = useState(false);
  const ended = new Date(s.startsAt).getTime() + s.durationMinutes * 60_000 < now;

  const patch = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/mentor/groups/${groupId}/sessions/${s.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(b.error ?? "Belum tersimpan. Coba lagi.");
        return;
      }
      toast.success(ok);
      setClosing(false);
      setConfirmCancel(false);
      await onChange();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li
      className={cn(
        "rounded-lg border border-border p-3",
        s.status === "cancelled" && "opacity-70"
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm font-semibold text-foreground">
          {s.title}
          {s.seriesId && <span className="ml-2 text-xs font-normal text-muted-foreground">Mingguan</span>}
          {s.status === "cancelled" && <span className="ml-2 text-xs font-medium text-destructive">Batal</span>}
          {s.status === "done" && <span className="ml-2 text-xs font-medium text-primary">Selesai</span>}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {sessionWhen(s)}
        </p>
      </div>
      {s.place && (
        <p className="mt-1 flex items-center gap-1 break-all text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {/^https?:\/\//.test(s.place) ? (
            <a href={s.place} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
              {s.place}
            </a>
          ) : (
            s.place
          )}
        </p>
      )}
      {s.agenda.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-foreground">
          {s.agenda.map((a, i) => (
            <li key={i}>{a.text}</li>
          ))}
        </ul>
      )}
      {s.prep && s.status === "scheduled" && (
        <div className="mt-2 rounded-md border border-border px-2.5 py-2">
          <p className="text-[10px] font-medium text-muted-foreground">Siapkan sebelum sesi</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{s.prep}</p>
        </div>
      )}
      {s.notes && !closing && (
        <div className="mt-2 rounded-md bg-muted/60 px-2.5 py-2">
          <p className="text-[10px] font-medium text-muted-foreground">Catatan sesi</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{s.notes}</p>
        </div>
      )}

      {!canEdit && !readOnly && s.status === "scheduled" && !ended && (
        <Rsvp groupId={groupId} sessionId={s.id} initial={s.myRsvp ?? null} />
      )}
      {canEdit && s.status !== "cancelled" && s.attendance && s.attendance.length > 0 && (
        <AttendanceList groupId={groupId} sessionId={s.id} rows={s.attendance} onChange={onChange} />
      )}

      {canEdit && s.status !== "cancelled" && (
        <div className="mt-3">
          {closing ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 4000))}
                rows={4}
                placeholder="Apa yang dibahas, apa yang perlu diulang, tugas untuk sesi berikutnya…"
                aria-label="Catatan sesi"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  className="h-11 gap-2"
                  disabled={busy}
                  onClick={() => void patch({ status: "done", notes }, "Catatan sesi tersimpan.")}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Simpan catatan
                </Button>
                <Button variant="ghost" className="h-11" onClick={() => setClosing(false)}>
                  Batal
                </Button>
              </div>
            </div>
          ) : editing ? (
            <SessionForm
              groupId={groupId}
              initial={s}
              plan={plan}
              onDone={async (saved) => {
                setEditing(false);
                if (saved) await onChange();
              }}
            />
          ) : confirmCancel ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-foreground">Batalkan sesi ini? Anggota akan melihatnya sebagai batal.</p>
              <Button
                variant="destructive"
                className="h-11"
                disabled={busy}
                onClick={() => void patch({ status: "cancelled" }, "Sesi dibatalkan.")}
              >
                {s.seriesId ? "Sesi ini saja" : "Ya, batalkan"}
              </Button>
              {s.seriesId && (
                <Button
                  variant="destructive"
                  className="h-11"
                  disabled={busy}
                  onClick={() => void patch({ status: "cancelled", series: true }, "Seri ini dibatalkan.")}
                >
                  Seri ini dan sesudahnya
                </Button>
              )}
              <Button variant="ghost" className="h-11" onClick={() => setConfirmCancel(false)}>
                Tidak
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(ended || s.status === "done") && (
                <Button variant="outline" className="h-11" onClick={() => setClosing(true)}>
                  {s.notes ? "Ubah catatan" : "Tulis catatan sesi"}
                </Button>
              )}
              {s.status === "scheduled" && !ended && (
                <Button variant="outline" className="h-11" onClick={() => setEditing(true)}>
                  Ubah
                </Button>
              )}
              {s.status === "scheduled" && (
                <Button variant="ghost" className="h-11 text-muted-foreground" onClick={() => setConfirmCancel(true)}>
                  Batalkan sesi
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** datetime-local value in the browser's own clock. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

/**
 * Schedule a session, or change one. Editing keeps the module links of agenda
 * points whose text did not change: a point that came from "Usulan anggota"
 * carries subjectId + module, and losing it on a reschedule would quietly
 * drop the module from "dijadwalkan".
 */
function SessionForm({
  groupId,
  initial,
  plan,
  onDone,
}: {
  groupId: string;
  initial?: GroupSession;
  plan: AgendaPlan | null;
  onDone: (saved: boolean) => void;
}) {
  const editing = Boolean(initial);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [when, setWhen] = useState(initial ? toLocalInput(initial.startsAt) : "");
  const [duration, setDuration] = useState(initial?.durationMinutes ?? 90);
  const [place, setPlace] = useState(initial?.place ?? "");
  const [agenda, setAgenda] = useState((initial?.agenda ?? []).map((a) => a.text).join("\n"));
  const [prep, setPrep] = useState(initial?.prep ?? "");
  const [repeat, setRepeat] = useState(1);
  const [busy, setBusy] = useState(false);
  // Points added from the module list, by their text: saving matches lines to
  // these the same way it keeps the links of points already on the agenda.
  const [links, setLinks] = useState<Map<string, AgendaItem>>(() => new Map());
  const [fromModules, setFromModules] = useState(false);

  const known = [...(initial?.agenda ?? []), ...links.values()];
  const taken = new Set(
    agenda
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => known.find((a) => a.text === t))
      .filter((a): a is AgendaItem => Boolean(a?.subjectId && a?.module))
      .map((a) => `${a.subjectId}/${a.module}`)
  );

  const save = async () => {
    if (!title.trim() || !when) {
      toast.error("Isi judul dan waktu sesinya dulu.");
      return;
    }
    const before = initial?.agenda ?? [];
    const items = agenda
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => before.find((a) => a.text === text) ?? links.get(text) ?? { text });
    setBusy(true);
    try {
      const r = await fetch(
        editing ? `/api/mentor/groups/${groupId}/sessions/${initial!.id}` : `/api/mentor/groups/${groupId}/sessions`,
        {
          method: editing ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            // datetime-local is the mentor's own clock; the server stores UTC.
            startsAt: new Date(when).toISOString(),
            durationMinutes: duration,
            place,
            agenda: items,
            prep,
            ...(editing ? {} : { repeatWeeks: repeat }),
          }),
        }
      );
      const b = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(b.error ?? "Sesi belum tersimpan.");
        return;
      }
      toast.success(
        editing ? "Sesi diperbarui." : repeat > 1 ? `${repeat} sesi mingguan dijadwalkan.` : "Sesi dijadwalkan."
      );
      onDone(true);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <label className="block text-xs font-medium text-foreground">
        Judul
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="Sesi 1: Statistik modul 1–2"
          className={cn(field, "mt-1 h-11")}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-foreground">
          Waktu mulai
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className={cn(field, "mt-1 h-11")}
          />
        </label>
        <label className="block text-xs font-medium text-foreground">
          Durasi
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={cn(field, "mt-1 h-11")}
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d % 60 === 0 ? `${d / 60} jam` : `${Math.floor(d / 60)} jam ${d % 60} menit`}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!editing && (
        <label className="block text-xs font-medium text-foreground">
          Ulangi
          <select value={repeat} onChange={(e) => setRepeat(Number(e.target.value))} className={cn(field, "mt-1 h-11")}>
            <option value={1}>Sekali saja</option>
            <option value={4}>Tiap minggu, 4 kali</option>
            <option value={8}>Tiap minggu, 8 kali</option>
            <option value={12}>Tiap minggu, 12 kali</option>
          </select>
        </label>
      )}
      <label className="block text-xs font-medium text-foreground">
        Tempat atau link (opsional)
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value.slice(0, 200))}
          placeholder="Ruang 301, atau link Zoom/Meet"
          className={cn(field, "mt-1 h-11")}
        />
      </label>
      <label className="block text-xs font-medium text-foreground">
        Agenda (satu poin per baris, opsional)
        <textarea
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          rows={3}
          placeholder={"Bahas soal latihan modul 1\nTanya jawab"}
          className={cn(field, "mt-1 py-2")}
        />
      </label>
      {plan &&
        (fromModules ? (
          <AgendaFromModules
            semester={plan.scope.semester}
            examPeriod={plan.scope.examPeriod}
            jurusan={plan.scope.jurusan}
            taken={taken}
            states={plan.states}
            onAdd={(items) => {
              setLinks((prev) => {
                const next = new Map(prev);
                for (const it of items) next.set(it.text, it);
                return next;
              });
              setAgenda((prev) => [prev.trim(), ...items.map((it) => it.text)].filter(Boolean).join("\n"));
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setFromModules(true)}
            className="flex min-h-11 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ListPlus className="h-4 w-4" />
            Ambil dari daftar modul
          </button>
        ))}
      <label className="block text-xs font-medium text-foreground">
        Persiapan untuk anggota (opsional)
        <textarea
          value={prep}
          onChange={(e) => setPrep(e.target.value.slice(0, 1000))}
          rows={2}
          placeholder="Baca rangkuman modul 3 dan coba Latihan Soal-nya sekali"
          className={cn(field, "mt-1 py-2")}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button className="h-11 gap-2" onClick={() => void save()} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Simpan perubahan" : "Simpan sesi"}
        </Button>
        <Button variant="ghost" className="h-11" onClick={() => onDone(false)}>
          Batal
        </Button>
      </div>
    </div>
  );
}

interface ModuleRequest {
  subjectId: string;
  subjectName: string;
  moduleId: string;
  moduleTitle: string;
  names: string[];
  count: number;
  scheduled: boolean;
}

/**
 * "Usulan anggota": the modules members marked "mau dibahas", most asked
 * first, each one tap away from an upcoming session's agenda. Putting it on an
 * agenda is what turns it into "dijadwalkan" for the members, and closing that
 * session turns it into "dibahas".
 */
function ModuleRequests({
  groupId,
  upcoming,
  onAdded,
}: {
  groupId: string;
  upcoming: GroupSession[];
  onAdded: () => Promise<void>;
}) {
  const [requests, setRequests] = useState<ModuleRequest[] | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/mentor/groups/${groupId}/module-requests`, { credentials: "same-origin" });
    const b = await r.json().catch(() => ({}));
    setRequests(r.ok ? (b.requests ?? []) : []);
  }, [groupId]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/mentor/groups/${groupId}/module-requests`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((b) => alive && setRequests(b.requests ?? []))
      .catch(() => alive && setRequests([]));
    return () => {
      alive = false;
    };
  }, [groupId]);

  if (!requests || requests.length === 0) return null;

  const addTo = async (req: ModuleRequest, session: GroupSession) => {
    setBusy(true);
    try {
      const agenda = [
        ...session.agenda,
        { text: `${req.subjectName} · ${req.moduleTitle}`, subjectId: req.subjectId, module: req.moduleId },
      ];
      const r = await fetch(`/api/mentor/groups/${groupId}/sessions/${session.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agenda }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(b.error ?? "Agenda belum tersimpan.");
        return;
      }
      toast.success(`Masuk agenda “${session.title}”.`);
      setPicking(null);
      await Promise.all([load(), onAdded()]);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Bookmark className="h-4 w-4 text-primary" /> Usulan anggota
      </h4>
      <p className="mt-0.5 text-xs text-muted-foreground">Modul yang ditandai “mau dibahas” oleh anggota grup.</p>
      <ul className="mt-2 space-y-2">
        {requests.map((req) => {
          const key = `${req.subjectId}/${req.moduleId}`;
          return (
            <li key={key} className="text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {req.subjectName} · {req.moduleTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.count} orang: {req.names.join(", ")}
                  </p>
                </div>
                {req.scheduled ? (
                  <span className="text-xs font-medium text-primary">Sudah di agenda</span>
                ) : upcoming.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Jadwalkan sesi dulu</span>
                ) : (
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => setPicking(picking === key ? null : key)}
                  >
                    Masukkan ke agenda
                  </Button>
                )}
              </div>
              {picking === key && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {upcoming.map((s) => (
                    <Button
                      key={s.id}
                      variant="secondary"
                      className="h-11"
                      disabled={busy}
                      onClick={() => void addTo(req, s)}
                    >
                      {s.title} · {sessionWhen(s)}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A member's answer for an upcoming session: hadir, or tidak bisa with a reason. */
function Rsvp({
  groupId,
  sessionId,
  initial,
}: {
  groupId: string;
  sessionId: string;
  initial: { rsvp: "going" | "not_going" | null; reason: string | null } | null;
}) {
  const [rsvp, setRsvp] = useState(initial?.rsvp ?? null);
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async (next: "going" | "not_going", why?: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/mentor/groups/${groupId}/sessions/${sessionId}/attendance`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rsvp: next, reason: why }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(b.error ?? "Jawaban belum tersimpan.");
        return;
      }
      setRsvp(next);
      setAsking(false);
      toast.success(next === "going" ? "Dicatat: kamu hadir." : "Dicatat. Mentormu akan tahu alasannya.");
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-md bg-muted/40 p-2.5">
      <p className="text-xs font-medium text-foreground">
        {rsvp === "going" ? "Kamu akan hadir." : rsvp === "not_going" ? `Kamu tidak bisa hadir${reason ? `: ${reason}` : "."}` : "Kamu hadir?"}
      </p>
      {asking ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 200))}
            placeholder="Alasannya (opsional)"
            aria-label="Alasan tidak hadir"
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          />
          <Button className="h-11" disabled={busy} onClick={() => void send("not_going", reason)}>
            Kirim
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant={rsvp === "going" ? "default" : "outline"}
            className="h-11"
            disabled={busy}
            onClick={() => void send("going")}
          >
            Hadir
          </Button>
          <Button
            variant={rsvp === "not_going" ? "default" : "outline"}
            className="h-11"
            disabled={busy}
            onClick={() => setAsking(true)}
          >
            Tidak bisa
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The mentor's attendance list for one session: what each member answered,
 * and a tap to record who actually came. Whoever is not marked present gets
 * the notes when the session is closed.
 */
function AttendanceList({
  groupId,
  sessionId,
  rows,
  onChange,
}: {
  groupId: string;
  sessionId: string;
  rows: NonNullable<GroupSession["attendance"]>;
  onChange: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const going = rows.filter((r) => r.rsvp === "going").length;
  const came = rows.filter((r) => r.attended === true).length;

  const mark = async (accountId: string, attended: boolean) => {
    setBusy(accountId);
    try {
      const r = await fetch(`/api/mentor/groups/${groupId}/sessions/${sessionId}/attendance`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId, attended }),
      });
      if (!r.ok) toast.error("Kehadiran belum tersimpan.");
      await onChange();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-9 items-center gap-1.5 text-xs font-medium text-foreground"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        Kehadiran · {going} bilang hadir{came ? ` · ${came} tercatat hadir` : ""}
      </button>
      {open && (
        <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
          {rows.map((r) => (
            <li key={r.accountId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.rsvp === "going"
                    ? "Bilang hadir"
                    : r.rsvp === "not_going"
                      ? `Tidak bisa${r.reason ? `: ${r.reason}` : ""}`
                      : "Belum menjawab"}
                </p>
              </div>
              <div className="flex gap-1.5" role="group" aria-label={`Kehadiran ${r.name}`}>
                <Button
                  variant={r.attended === true ? "default" : "outline"}
                  className="h-9 px-3 text-xs"
                  aria-pressed={r.attended === true}
                  disabled={busy === r.accountId}
                  onClick={() => void mark(r.accountId, true)}
                >
                  Hadir
                </Button>
                <Button
                  variant={r.attended === false ? "default" : "outline"}
                  className="h-9 px-3 text-xs"
                  aria-pressed={r.attended === false}
                  disabled={busy === r.accountId}
                  onClick={() => void mark(r.accountId, false)}
                >
                  Absen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
