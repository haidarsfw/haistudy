"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { Loader2, MapPin } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { SLOT_BATCH_MAX, SLOT_CANCEL_LEAD_MS, SLOT_DURATIONS, type GroupSlot } from "@/lib/mentor/slots";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

function slotWhen(s: Pick<GroupSlot, "startsAt" | "durationMinutes">): string {
  const start = new Date(s.startsAt);
  const end = new Date(start.getTime() + s.durationMinutes * 60_000);
  return `${format(start, "EEE, d MMM · HH.mm", { locale: idLocale })}–${format(end, "HH.mm")}`;
}

/**
 * 1-on-1 with the mentor. The mentor opens short slots (several back to back
 * at once) and sees who booked what and why; a member picks one, says what it
 * is about, and can give it back up to an hour before.
 */
export function GroupSlots({
  groupId,
  canEdit,
  readOnly = false,
}: {
  groupId: string;
  canEdit: boolean;
  /** An archived group: what was booked stays readable, nothing changes. */
  readOnly?: boolean;
}) {
  const [slots, setSlots] = useState<GroupSlot[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const r = await fetch(`/api/mentor/groups/${groupId}/slots`, { credentials: "same-origin" });
    const b = (await r.json().catch(() => ({}))) as { slots?: GroupSlot[] };
    setSlots(r.ok ? (b.slots ?? []) : []);
  }, [groupId]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/mentor/groups/${groupId}/slots`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((b: { slots?: GroupSlot[] }) => alive && setSlots(b.slots ?? []))
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [groupId]);

  const act = async (slotId: string, payload: Record<string, unknown>, done: string) => {
    try {
      const r = await fetch(`/api/mentor/groups/${groupId}/slots/${slotId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const b = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) toast.error(b.error ?? "Belum tersimpan. Coba lagi.");
      else toast.success(done);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    }
    await load();
  };

  if (slots === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat slot 1-on-1
      </p>
    );
  }

  const upcoming = slots.filter((s) => Date.parse(s.startsAt) + s.durationMinutes * 60_000 > now);
  const past = slots.filter((s) => !upcoming.includes(s));

  if (canEdit) {
    return (
      <div className="space-y-3">
        {!readOnly &&
          (adding ? (
            <OpenSlots
              groupId={groupId}
              onDone={async (saved) => {
                setAdding(false);
                if (saved) await load();
              }}
            />
          ) : (
            <Button variant="outline" className="h-11" onClick={() => setAdding(true)}>
              Buka slot 1-on-1
            </Button>
          ))}
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada slot ke depan. Buka beberapa sekaligus, misalnya empat slot 20 menit; anggota memilih satu dan
            menulis apa yang mau dibahas.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((s) => (
              <MentorSlotRow key={s.id} s={s} readOnly={readOnly} onCancel={() => act(s.id, { action: "cancel" }, "Slot dibatalkan.")} />
            ))}
          </ul>
        )}
        {past.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Seminggu terakhir</p>
            <ul className="space-y-1">
              {past.map((s) => (
                <li key={s.id} className="text-xs text-muted-foreground">
                  {slotWhen(s)} · {s.status === "booked" ? `${s.bookedBy}${s.topic ? `: ${s.topic}` : ""}` : s.status === "cancelled" ? "dibatalkan" : "tidak dipesan"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const mine = upcoming.find((s) => s.mine && s.status === "booked") ?? null;
  const open = upcoming.filter((s) => s.status === "open");
  return (
    <div className="space-y-3">
      {mine && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary">Jadwal 1-on-1-mu</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{slotWhen(mine)}</p>
          {mine.place && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {mine.place}
            </p>
          )}
          {mine.topic && <p className="mt-1 text-sm text-foreground">“{mine.topic}”</p>}
          {!readOnly &&
            (Date.parse(mine.startsAt) - now >= SLOT_CANCEL_LEAD_MS ? (
              <Button
                variant="ghost"
                className="mt-1 h-9 px-2 text-xs"
                onClick={() => void act(mine.id, { action: "unbook" }, "Jadwalmu dibatalkan, slotnya terbuka lagi.")}
              >
                Batalkan
              </Button>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Kurang dari satu jam lagi: kalau berhalangan, kabari mentormu di chat grup.
              </p>
            ))}
        </div>
      )}
      {!readOnly &&
        (open.length === 0 ? (
          !mine && <p className="text-sm text-muted-foreground">Mentormu belum membuka slot 1-on-1.</p>
        ) : (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {mine ? "Slot lain yang masih kosong" : "Slot yang masih kosong"}
            </p>
            <ul className="space-y-2">
              {open.map((s) => (
                <BookRow key={s.id} s={s} disabled={Boolean(mine)} onBook={(topic) => act(s.id, { action: "book", topic }, "Slot dipesan. Mentormu sudah diberi tahu.")} />
              ))}
            </ul>
            {mine && <p className="mt-1 text-xs text-muted-foreground">Satu jadwal per orang. Batalkan yang lama dulu kalau mau pindah.</p>}
          </div>
        ))}
    </div>
  );
}

function MentorSlotRow({ s, readOnly, onCancel }: { s: GroupSlot; readOnly: boolean; onCancel: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <li className={cn("rounded-lg border p-2.5", s.status === "booked" ? "border-primary/40" : "border-border")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{slotWhen(s)}</p>
          <p className="text-xs text-muted-foreground">
            {s.status === "booked"
              ? `Dipesan ${s.bookedBy ?? "anggota"}`
              : s.status === "cancelled"
                ? "Dibatalkan"
                : "Kosong"}
            {s.place ? ` · ${s.place}` : ""}
          </p>
          {s.status === "booked" && s.topic && <p className="mt-0.5 text-sm text-foreground">“{s.topic}”</p>}
        </div>
        {!readOnly && s.status !== "cancelled" && !confirm && (
          <Button variant="ghost" className="h-9 px-2 text-xs" onClick={() => setConfirm(true)}>
            Batalkan
          </Button>
        )}
      </div>
      {confirm && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-destructive/5 px-2 py-1.5">
          <p className="flex-1 text-xs text-foreground">
            {s.status === "booked"
              ? `Batalkan? ${s.bookedBy ?? "Anggota"} akan diberi tahu.`
              : "Batalkan slot kosong ini?"}
          </p>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onCancel();
              setBusy(false);
              setConfirm(false);
            }}
          >
            Batalkan slot
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
            Kembali
          </Button>
        </div>
      )}
    </li>
  );
}

function BookRow({ s, disabled, onBook }: { s: GroupSlot; disabled: boolean; onBook: (topic: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <li className="rounded-lg border border-border p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{slotWhen(s)}</p>
          {s.place && <p className="text-xs text-muted-foreground">{s.place}</p>}
        </div>
        {!open && (
          <Button variant="outline" className="h-9" disabled={disabled} onClick={() => setOpen(true)}>
            Pesan
          </Button>
        )}
      </div>
      {open && (
        <div className="mt-2 space-y-2">
          <label className="block text-xs font-medium text-foreground">
            Mau membahas apa? (opsional)
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 300))}
              placeholder="Soal no. 3 latihan modul 4"
              className={cn(field, "mt-1 h-11")}
            />
          </label>
          <div className="flex gap-2">
            <Button
              className="h-11 gap-2"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onBook(topic.trim());
                setBusy(false);
                setOpen(false);
              }}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Pesan slot ini
            </Button>
            <Button variant="ghost" className="h-11" onClick={() => setOpen(false)}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function OpenSlots({ groupId, onDone }: { groupId: string; onDone: (saved: boolean) => void }) {
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(20);
  const [count, setCount] = useState(4);
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!when) {
      toast.error("Isi waktu mulainya dulu.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/mentor/groups/${groupId}/slots`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startsAt: new Date(when).toISOString(), durationMinutes: duration, count, place }),
      });
      const b = (await r.json().catch(() => ({}))) as { error?: string; created?: number };
      if (!r.ok) {
        toast.error(b.error ?? "Slot belum tersimpan.");
        return;
      }
      toast.success(`${b.created ?? count} slot dibuka.`);
      onDone(true);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-medium text-foreground sm:col-span-3">
          Mulai slot pertama
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={cn(field, "mt-1 h-11")} />
        </label>
        <label className="block text-xs font-medium text-foreground">
          Durasi tiap slot
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={cn(field, "mt-1 h-11")}>
            {SLOT_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} menit
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-foreground">
          Jumlah slot berurutan
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={cn(field, "mt-1 h-11")}>
            {Array.from({ length: SLOT_BATCH_MAX }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-foreground">
          Tempat atau link
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value.slice(0, 200))}
            placeholder="Link Meet"
            className={cn(field, "mt-1 h-11")}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <Button className="h-11 gap-2" disabled={busy} onClick={() => void save()}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Buka slot
        </Button>
        <Button variant="ghost" className="h-11" onClick={() => onDone(false)}>
          Batal
        </Button>
      </div>
    </div>
  );
}
