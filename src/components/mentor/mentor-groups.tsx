"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, ChevronDown, Copy, Loader2, MessageCircle, Trash2, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GroupSessions } from "@/components/mentor/group-sessions";
import { toast } from "@/components/ui/toast";
import { parseScopeKey, scopeFullLabel } from "@/lib/scope";
import { cn } from "@/lib/utils";

interface GroupSummary {
  id: string;
  name: string;
  scopeKey: string;
  inviteCode: string;
  memberCount: number;
  maxMembers: number | null;
}

interface Detail {
  referralCode: string | null;
  members: { memberId: string; name: string; role: string; status: string; isYou: boolean }[];
  invites: { id: string; kind: "email" | "whatsapp"; value: string; joined: boolean }[];
}

/**
 * "Grup kamu" — what a mentor opens this page for most days.
 *
 * Above the money on purpose: a mentor shares the group link and checks who has
 * joined far more often than they check what they are owed. Renders nothing
 * for someone who holds no group, so the partner page stays what it was for
 * everyone else.
 */
export function MentorGroups() {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/mentor/groups", { credentials: "same-origin" });
        if (!res.ok) return;
        const body = (await res.json()) as { mentoring: GroupSummary[] };
        if (alive) setGroups(body.mentoring ?? []);
      } catch {
        // Not shown on failure: the partner section below still works, and a
        // broken box here would push it down for nothing.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!groups || groups.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold tracking-tight text-foreground">Grup kamu</h2>
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <GroupCard key={g.id} g={g} />
        ))}
      </div>
    </section>
  );
}

function GroupCard({ g }: { g: GroupSummary }) {
  const [open, setOpen] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [copied, setCopied] = useState(false);
  const scope = parseScopeKey(g.scopeKey);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  // The referral code, not the nickname: a two-word nickname does not resolve
  // as a handle, and this link is the one a whole class will tap.
  const link = detail?.referralCode ? `${origin}/@${detail.referralCode}/grup` : `${origin}/grup/${g.inviteCode}`;

  const load = useCallback(async () => {
    const res = await fetch(`/api/mentor/groups/${g.id}`, { credentials: "same-origin" });
    if (res.ok) setDetail((await res.json()) as Detail);
  }, [g.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Browser menolak menyalin. Salin manual dari kolomnya.");
    }
  };

  const waText = encodeURIComponent(
    `Halo! Gabung grup belajar "${g.name}" di haistudy lewat link ini: ${link}`
  );

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{g.name}</h3>
          <p className="text-xs text-muted-foreground">{scope ? scopeFullLabel(scope) : g.scopeKey}</p>
        </div>
        <p className="text-sm text-foreground">
          {/* Live once the detail is in, so an approval shows up in the count. */}
          {detail ? detail.members.filter((m) => m.status === "active").length : g.memberCount}
          {g.maxMembers ? ` / ${g.maxMembers}` : ""} anggota
        </p>
      </header>

      {detail && <Requests groupId={g.id} members={detail.members} onChange={load} />}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg border border-border bg-muted px-3 py-2.5 font-mono text-xs text-foreground">
          {link.replace(/^https?:\/\//, "")}
        </code>
        <Button variant="outline" className="h-11 shrink-0 gap-2" onClick={copy}>
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {copied ? "Tersalin" : "Salin"}
        </Button>
        <a
          href={`https://wa.me/?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <MessageCircle className="h-4 w-4" />
          Bagikan ke WA
        </a>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Untuk dibacakan di kelas: kode <span className="font-mono font-semibold text-foreground">{g.inviteCode}</span>{" "}
        di haistudy.site/grup/{g.inviteCode}
      </p>

      <button
        type="button"
        onClick={() => setSchedule((v) => !v)}
        aria-expanded={schedule}
        className="mt-3 flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", schedule && "rotate-180")} />
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        Jadwal sesi
      </button>
      {schedule && (
        <div className="mt-2">
          <GroupSessions groupId={g.id} canEdit />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        Anggota &amp; undangan
      </button>

      {open && (
        <div className="mt-2 space-y-5">
          {!detail ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat
            </p>
          ) : (
            <>
              <Members members={detail.members} />
              <Invites groupId={g.id} invites={detail.invites} onChange={load} />
            </>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Requests to join, outside the folded list on purpose: they are the one thing
 * on this card that waits for the mentor. One tap each, and the row leaves.
 */
function Requests({
  groupId,
  members,
  onChange,
}: {
  groupId: string;
  members: Detail["members"];
  onChange: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const pending = members.filter((m) => m.status === "pending");
  if (!pending.length) return null;

  const answer = async (memberId: string, action: "approve" | "decline") => {
    setBusy(memberId);
    try {
      const res = await fetch(`/api/mentor/groups/${groupId}/requests`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, action }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) toast.error(body.error ?? "Jawaban belum tersimpan. Coba lagi.");
      else toast.success(action === "approve" ? "Disetujui, sudah masuk grup." : "Ditolak.");
      await onChange();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <UserPlus className="h-4 w-4 text-primary" />
        {pending.length === 1 ? "1 orang minta gabung" : `${pending.length} orang minta gabung`}
      </h4>
      <ul className="mt-2 space-y-2">
        {pending.map((m) => (
          <li key={m.memberId} className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm text-foreground">{m.name}</span>
            <span className="flex shrink-0 gap-2">
              <Button
                size="sm"
                className="h-11 px-4"
                disabled={busy !== null}
                onClick={() => void answer(m.memberId, "approve")}
              >
                {busy === m.memberId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Setujui"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-11 px-4"
                disabled={busy !== null}
                onClick={() => void answer(m.memberId, "decline")}
              >
                Tolak
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Members({ members }: { members: Detail["members"] }) {
  const label: Record<string, string> = { active: "", invited: "diundang" };
  // Requests have their own box above; this list is who is in or invited.
  const listed = members.filter((m) => m.status !== "pending");
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Users className="h-4 w-4 text-muted-foreground" /> Anggota
      </h4>
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
        {listed.map((m, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-foreground">
              {m.name}
              {m.isYou ? " (kamu)" : ""}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {m.role === "mentor" ? "mentor" : label[m.status] ?? ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Invites({
  groupId,
  invites,
  onChange,
}: {
  groupId: string;
  invites: Detail["invites"];
  onChange: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const add = async () => {
    if (!text.trim()) {
      setNote({ ok: false, text: "Tempel dulu email atau nomor WhatsApp mentee-mu." });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/mentor/groups/${groupId}/invites`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: text }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        added?: number;
        alreadyHaveAccount?: number;
        invalid?: string[];
      };
      if (!res.ok) {
        setNote({ ok: false, text: body.error ?? "Gagal menyimpan undangan." });
        return;
      }
      const parts = [`${body.added ?? 0} undangan baru`];
      if (body.alreadyHaveAccount) parts.push(`${body.alreadyHaveAccount} sudah punya akun dan langsung diundang ke grup`);
      if (body.invalid?.length) parts.push(`${body.invalid.length} tidak terbaca: ${body.invalid.slice(0, 3).join(", ")}`);
      setNote({ ok: true, text: parts.join(". ") + "." });
      setText("");
      await onChange();
    } catch {
      setNote({ ok: false, text: "Koneksi terputus. Coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (inviteId: string) => {
    const res = await fetch(`/api/mentor/groups/${groupId}/invites?inviteId=${inviteId}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) toast.error("Gagal menghapus undangan.");
    await onChange();
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">Undang dari daftar kelas</h4>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        Tempel email atau nomor WhatsApp mentee, satu per baris. Yang mendaftar dengan kontak ini
        otomatis masuk grupmu dan terhitung sebagai ajakanmu.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={"budi@gmail.com\n0812xxxxxxxx"}
        className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={add} disabled={busy} className="h-9">
          {busy ? "Menyimpan…" : "Simpan undangan"}
        </Button>
        {note && (
          <p role="status" className={cn("text-xs", note.ok ? "text-foreground" : "text-destructive")}>
            {note.text}
          </p>
        )}
      </div>

      {invites.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {invites.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
              <span className="min-w-0 truncate font-mono text-foreground">
                {v.kind === "whatsapp" ? `+${v.value}` : v.value}
              </span>
              {v.joined ? (
                <span className="shrink-0 text-primary">sudah bergabung</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void remove(v.id)}
                  aria-label={`Hapus undangan ${v.value}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
