"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ChevronDown, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { AVAILABLE_SCOPES, scopeFullLabel, scopeKey } from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";
import { cn } from "@/lib/utils";

interface AdminGroup {
  id: string;
  name: string;
  scopeKey: string;
  scope: ScopeTuple;
  inviteCode: string;
  inviteOpen: boolean;
  status: "active" | "archived";
  maxMembers: number | null;
  note: string | null;
  createdAt: string;
  owner: { name: string; email: string } | null;
  memberCount: number;
}

interface AdminMember {
  accountId: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  joinedAt: string | null;
}

const field =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

const STATUS_LABEL: Record<string, string> = {
  active: "aktif",
  pending: "minta gabung",
  invited: "diundang",
  left: "keluar",
  declined: "ditolak",
};

function partnerNote(status: string | undefined): string {
  if (status === "paused") return "Partner orang ini sedang dijeda, jadi tidak diaktifkan.";
  if (status === "gagal") return "Aktivasi partner gagal; setujui manual di daftar partner di atas.";
  return "Mentornya sekarang partner aktif.";
}

/**
 * Grup mentoring, sisi pemilik: grup hanya dibuat dari sini (memegang grup
 * berjalan adalah definisi "mentor"), lalu empat keputusan yang memang milik
 * pemilik: batas anggota, link undangan, serah terima, dan arsip. Mentornya
 * sendiri menjalankan sisanya dari /partner.
 */
export function MentorGroupAdmin() {
  const [groups, setGroups] = useState<AdminGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mentor-groups", { credentials: "same-origin" });
      const body = (await res.json().catch(() => ({}))) as { groups?: AdminGroup[]; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Gagal memuat grup.");
        return;
      }
      setError(null);
      setGroups(body.groups ?? []);
    } catch {
      setError("Koneksi terputus.");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/mentor-groups", { credentials: "same-origin" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { groups?: AdminGroup[]; error?: string };
        if (!alive) return;
        if (!res.ok) setError(body.error ?? "Gagal memuat grup.");
        else setGroups(body.groups ?? []);
      })
      .catch(() => alive && setError("Koneksi terputus."));
    return () => {
      alive = false;
    };
  }, []);

  const running = (groups ?? []).filter((g) => g.status !== "archived");
  const archived = (groups ?? []).filter((g) => g.status === "archived");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Grup mentor</h3>
          <p className="text-xs text-muted-foreground">
            Grup hanya dibuat dari sini. Mentornya otomatis jadi partner dan menjalankan grupnya dari /partner.
          </p>
        </div>
        {!creating && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            Buat grup
          </Button>
        )}
      </div>

      {creating && (
        <CreateGroup
          onDone={async (made) => {
            setCreating(false);
            if (made) await load();
          }}
        />
      )}

      {error ? (
        <div className="rounded-xl border border-border bg-card px-5 py-6 text-center">
          <AlertCircle className="mx-auto h-5 w-5 text-destructive" />
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => void load()}>
            Coba muat ulang
          </Button>
        </div>
      ) : !groups ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat grup
        </p>
      ) : groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">
          Belum ada grup. Buat satu untuk tiap mentor, dengan periode yang dia AJARKAN.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {running.map((g) => (
              <GroupRow key={g.id} g={g} all={groups} onChange={load} />
            ))}
          </div>
          {archived.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                aria-expanded={showArchived}
                className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", showArchived && "rotate-180")} />
                Diarsipkan ({archived.length})
              </button>
              {showArchived && (
                <div className="mt-2 space-y-2">
                  {archived.map((g) => (
                    <GroupRow key={g.id} g={g} all={groups} onChange={load} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CreateGroup({ onDone }: { onDone: (made: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [scope, setScope] = useState(scopeKey(AVAILABLE_SCOPES[0]));
  const [max, setMax] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !name.trim()) {
      toast.error("Isi email mentor dan nama grupnya.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/mentor-groups", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerEmail: email.trim(),
          name: name.trim(),
          scope,
          maxMembers: max.trim() ? Number(max) : null,
          note: note.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; partnerStatus?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Grup belum dibuat.");
        return;
      }
      toast.success(`Grup dibuat. ${partnerNote(body.partnerStatus)}`);
      onDone(true);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-foreground">
          Email akun mentor
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mentor@contoh.com"
            className={cn(field, "mt-1")}
          />
        </label>
        <label className="block text-xs font-medium text-foreground">
          Nama grup
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 60))}
            placeholder="B30 Kelas LA86"
            className={cn(field, "mt-1")}
          />
        </label>
        <label className="block text-xs font-medium text-foreground">
          Periode yang diajarkan
          <select value={scope} onChange={(e) => setScope(e.target.value)} className={cn(field, "mt-1")}>
            {AVAILABLE_SCOPES.map((s) => (
              <option key={scopeKey(s)} value={scopeKey(s)}>
                {scopeFullLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-foreground">
          Batas anggota (kosongkan = tanpa batas)
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className={cn(field, "mt-1")}
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-foreground">
        Catatan untuk diri sendiri (opsional)
        <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} className={cn(field, "mt-1")} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button className="h-11 gap-2" disabled={busy} onClick={() => void submit()}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Buat grup
        </Button>
        <Button variant="ghost" className="h-11" onClick={() => onDone(false)}>
          Batal
        </Button>
      </div>
    </div>
  );
}

function GroupRow({ g, all, onChange }: { g: AdminGroup; all: AdminGroup[]; onChange: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const archived = g.status === "archived";

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{g.name}</p>
          <p className="text-xs text-muted-foreground">
            {scopeFullLabel(g.scope)} · {g.owner ? `${g.owner.name || "Tanpa nama"} (${g.owner.email})` : "mentor tidak ditemukan"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {g.memberCount}
            {g.maxMembers ? ` / ${g.maxMembers}` : ""} orang termasuk mentor · kode {g.inviteCode}
            {!g.inviteOpen && " · link ditutup"}
            {archived && " · diarsipkan"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Tutup" : "Kelola"}
        </Button>
      </div>
      {open && <GroupManage g={g} all={all} onChange={onChange} />}
    </article>
  );
}

function GroupManage({ g, all, onChange }: { g: AdminGroup; all: AdminGroup[]; onChange: () => Promise<void> }) {
  const archived = g.status === "archived";
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [max, setMax] = useState(g.maxMembers ? String(g.maxMembers) : "");
  const [handoverEmail, setHandoverEmail] = useState("");
  const [confirm, setConfirm] = useState<"archive" | "handover" | null>(null);
  const [busy, setBusy] = useState(false);
  const [moveTo, setMoveTo] = useState<Record<string, string>>({});

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/admin/mentor-groups/${g.id}`, { credentials: "same-origin" });
    const body = (await res.json().catch(() => ({}))) as { members?: AdminMember[] };
    setMembers(res.ok ? (body.members ?? []) : []);
  }, [g.id]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/mentor-groups/${g.id}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((b: { members?: AdminMember[] }) => alive && setMembers(b.members ?? []))
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
  }, [g.id]);

  const patch = async (payload: Record<string, unknown>, done: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/mentor-groups/${g.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; note?: string | null; partnerStatus?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Belum tersimpan.");
        return;
      }
      toast.success(
        [done, body.note, payload.action === "handover" ? partnerNote(body.partnerStatus) : null].filter(Boolean).join(" ")
      );
      setConfirm(null);
      await Promise.all([onChange(), loadMembers()]);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const move = async (accountId: string) => {
    const toGroupId = moveTo[accountId];
    if (!toGroupId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/mentor-groups/${g.id}/move`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId, toGroupId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; note?: string | null };
      if (!res.ok) {
        toast.error(body.error ?? "Belum dipindah.");
        return;
      }
      toast.success(["Sudah dipindah.", body.note].filter(Boolean).join(" "));
      await Promise.all([onChange(), loadMembers()]);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  // Moving only makes sense between running groups that teach the same period.
  const targets = all.filter((o) => o.id !== g.id && o.status === "active" && o.scopeKey === g.scopeKey);
  const current = (members ?? []).filter((m) => m.status !== "left" && m.status !== "declined");
  const history = (members ?? []).filter((m) => m.status === "left" || m.status === "declined");

  return (
    <div className="mt-3 space-y-4 border-t border-border pt-3">
      {!archived && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground">
              Batas anggota (kosong = tanpa batas)
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className={cn(field, "mt-1")}
              />
            </label>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={busy}
              onClick={() => void patch({ action: "limit", maxMembers: max.trim() ? Number(max) : null }, "Batas tersimpan.")}
            >
              Simpan batas
            </Button>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Link undangan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {g.inviteOpen ? "Terbuka: siapa pun dengan link atau kode bisa masuk." : "Ditutup: link dan kode tidak menerima orang baru."}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={busy}
              onClick={() =>
                void patch({ action: "invite", inviteOpen: !g.inviteOpen }, g.inviteOpen ? "Link ditutup." : "Link dibuka.")
              }
            >
              {g.inviteOpen ? "Tutup link" : "Buka link"}
            </Button>
          </div>
        </div>
      )}

      {!archived && (
        <div>
          <label className="block text-xs font-medium text-foreground">
            Serahkan ke mentor lain (email akunnya)
            <input
              type="email"
              value={handoverEmail}
              onChange={(e) => {
                setHandoverEmail(e.target.value);
                if (confirm === "handover") setConfirm(null);
              }}
              placeholder="mentor.baru@contoh.com"
              className={cn(field, "mt-1")}
            />
          </label>
          {confirm === "handover" ? (
            <div className="mt-2 rounded-lg bg-muted px-3 py-2">
              <p className="text-sm text-foreground">
                Grup ini pindah ke {handoverEmail.trim()}. Mentor sekarang keluar dari grup; chat, jadwal, dan catatan
                sesinya tetap di grup. Komisi yang sudah tercatat tidak berubah.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={() => void patch({ action: "handover", email: handoverEmail }, "Grup sudah diserahkan.")}>
                  Ya, serahkan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={busy || !handoverEmail.trim()}
              onClick={() => setConfirm("handover")}
            >
              Serahkan
            </Button>
          )}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-foreground">Anggota</p>
        {!members ? (
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat
          </p>
        ) : current.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Belum ada anggota.</p>
        ) : (
          <ul className="mt-1 divide-y divide-border">
            {current.map((m) => (
              <li key={m.accountId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {m.name}
                    {m.role === "mentor" && <span className="text-xs text-muted-foreground"> · mentor</span>}
                    {m.status !== "active" && (
                      <span className="text-xs text-muted-foreground"> · {STATUS_LABEL[m.status] ?? m.status}</span>
                    )}
                  </p>
                  {m.email && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
                </div>
                {!archived && m.role === "member" && m.status === "active" && targets.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Pindahkan ${m.name} ke grup`}
                      value={moveTo[m.accountId] ?? ""}
                      onChange={(e) => setMoveTo((prev) => ({ ...prev, [m.accountId]: e.target.value }))}
                      className="h-9 max-w-[12rem] rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                    >
                      <option value="">Pindahkan ke…</option>
                      {targets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !moveTo[m.accountId]}
                      onClick={() => void move(m.accountId)}
                    >
                      Pindah
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {history.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Riwayat: {history.map((m) => `${m.name} (${STATUS_LABEL[m.status] ?? m.status})`).join(", ")}
          </p>
        )}
      </div>

      <div className="border-t border-border pt-3">
        {archived ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void patch({ action: "unarchive" }, "Grup aktif lagi.")}>
            Aktifkan lagi
          </Button>
        ) : confirm === "archive" ? (
          <div className="rounded-lg bg-muted px-3 py-2">
            <p className="text-sm text-foreground">
              Grup jadi hanya-baca untuk mentor dan anggotanya: chat, jadwal, dan catatannya tetap terbaca, tapi tidak bisa
              ditambah. Perk mentor berhenti kalau ini satu-satunya grup yang dia pegang.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => void patch({ action: "archive" }, "Grup diarsipkan.")}>
                Ya, arsipkan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setConfirm("archive")}>
            Arsipkan grup
          </Button>
        )}
      </div>
    </div>
  );
}
