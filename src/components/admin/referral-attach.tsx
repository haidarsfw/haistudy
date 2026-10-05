"use client";

import { useState } from "react";
import { Link2 } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";

/**
 * Attach a mentee to their mentor by hand: attribution net #4.
 *
 * For the mentee who forgot the code at sign-up, when the mentor brings proof.
 * Kept small and below the partner list, because it is the exception — the
 * link, the QR and the group link are meant to make it unnecessary.
 */
export function ReferralAttach() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [creditLatest, setCreditLatest] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    if (!email.trim() || !code.trim()) {
      setResult({ ok: false, text: "Email pembeli dan kode atau nama partner wajib diisi." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/referral/attach", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ buyerEmail: email, code, creditLatest }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        reward?: string;
      };
      if (!res.ok) {
        setResult({ ok: false, text: body.error ?? "Gagal memasang kode." });
        return;
      }
      setResult({ ok: true, text: `Kode ${body.code} terpasang. ${capitalize(body.reward ?? "")}.` });
      setEmail("");
      setCode("");
    } catch {
      setResult({ ok: false, text: "Koneksi terputus. Coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        Pasang kode secara manual
      </h3>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        Untuk mentee yang lupa memakai kode saat daftar, kalau mentornya membawa bukti. Hanya untuk
        akun yang belum terikat ke kode mana pun; ikatannya permanen.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Email pembeli
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="email@contoh.com"
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Kode atau nama panggilan partner
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PUTRA atau kodenya"
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <label className="mt-3 flex min-h-9 items-center gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={creditLatest}
          onChange={(e) => setCreditLatest(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Sekalian catat komisi untuk pembelian terakhirnya yang sudah disetujui
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={submit} disabled={busy}>
          {busy ? "Memasang…" : "Pasang kode"}
        </Button>
        {result && (
          <p role="status" className={`text-xs ${result.ok ? "text-foreground" : "text-destructive"}`}>
            {result.text}
          </p>
        )}
      </div>
    </section>
  );
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
