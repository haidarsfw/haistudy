"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface Broadcast {
  id: string;
  body: string;
  recipients: number;
  createdAt: string;
}

/**
 * The owner's message to every current mentor: a notification for each, and
 * the "Dari haistudy" card on their /partner page. In-app only (no e-mail),
 * as the owner chose. Sending asks once more: it cannot be taken back.
 */
export function MentorBroadcastAdmin() {
  const [data, setData] = useState<{ mentors: number; broadcasts: Broadcast[] } | null>(null);
  const [text, setText] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/mentor-broadcasts", { credentials: "same-origin" });
    if (r.ok) setData(await r.json());
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/mentor-broadcasts", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const send = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/mentor-broadcasts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });
      const b = (await r.json().catch(() => ({}))) as { error?: string; recipients?: number };
      if (!r.ok) {
        toast.error(b.error ?? "Belum terkirim.");
        return;
      }
      toast.success(`Terkirim ke ${b.recipients} mentor.`);
      setText("");
      setConfirm(false);
      await load();
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const mentors = data?.mentors ?? 0;
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Pesan ke semua mentor</h3>
        <p className="text-xs text-muted-foreground">
          Masuk sebagai notifikasi di aplikasi tiap mentor dan tetap terbaca di halaman /partner mereka.
          {data ? ` Sekarang ada ${mentors} mentor aktif.` : ""}
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value.slice(0, 2000));
          setConfirm(false);
        }}
        rows={3}
        aria-label="Pesan untuk semua mentor"
        placeholder="Mis. Jadwal UTS B30 sudah keluar, tolong cek agenda sesi minggu depan."
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      />
      {confirm ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <p className="flex-1 text-sm text-foreground">Kirim ke {mentors} mentor sekarang? Pesan yang terkirim tidak bisa ditarik.</p>
          <Button size="sm" disabled={busy} onClick={() => void send()} className="gap-1.5">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Ya, kirim
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
            Batal
          </Button>
        </div>
      ) : (
        <Button size="sm" disabled={!text.trim() || mentors === 0} onClick={() => setConfirm(true)}>
          {mentors === 0 ? "Belum ada mentor aktif" : `Kirim ke ${mentors} mentor`}
        </Button>
      )}
      {data && data.broadcasts.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {data.broadcasts.map((b) => (
            <li key={b.id} className="px-4 py-2.5">
              <p className="text-xs text-muted-foreground">
                {new Date(b.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}{" "}
                · ke {b.recipients} mentor
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{b.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
