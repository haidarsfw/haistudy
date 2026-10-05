"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Users } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";

interface GroupInfo {
  code: string;
  groupId: string;
  name: string;
  mentor: string;
  period: string;
}

export type GroupJoinState =
  | { kind: "invalid" }
  | ({ kind: "signed-out"; full: boolean } & GroupInfo)
  | ({ kind: "can-join" } & GroupInfo)
  | ({ kind: "member" } & GroupInfo)
  | ({ kind: "pending" } & GroupInfo)
  | ({ kind: "full" } & GroupInfo);

/**
 * The join page's one decision, per visitor.
 *
 * Every state names the group and the mentor first, because "who is inviting me
 * and to what" is the question someone arriving from a link has before any
 * other. Then exactly one thing to do next.
 */
export function GroupJoin({ state }: { state: GroupJoinState }) {
  const [phase, setPhase] = useState<"idle" | "joining" | "joined" | "asked" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (state.kind === "invalid") {
    return (
      <section className="mt-10 max-w-lg">
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Undangan ini sudah tidak berlaku
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Mungkin grupnya sudah ditutup, atau kodenya salah ketik. Minta link baru ke mentormu.
        </p>
      </section>
    );
  }

  const join = async () => {
    setPhase("joining");
    setMessage(null);
    try {
      const res = await fetch("/api/mentor/join", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: state.code }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPhase("error");
        setMessage(body.error ?? "Belum berhasil bergabung. Coba lagi.");
        return;
      }
      setPhase("joined");
    } catch {
      setPhase("error");
      setMessage("Koneksi terputus. Coba lagi.");
    }
  };

  // Entry path #3 from here: the group is full, so ask the mentor for a seat
  // instead of being turned away. They answer from their own page.
  const ask = async () => {
    setPhase("joining");
    setMessage(null);
    try {
      const res = await fetch(`/api/mentor/groups/${state.groupId}/request`, {
        method: "POST",
        credentials: "same-origin",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; state?: string };
      if (body.state === "member") return setPhase("joined");
      if (!res.ok) {
        setPhase("error");
        setMessage(body.error ?? "Permintaan belum terkirim. Coba lagi.");
        return;
      }
      setPhase("asked");
    } catch {
      setPhase("error");
      setMessage("Koneksi terputus. Coba lagi.");
    }
  };

  const next = encodeURIComponent(`/grup/${state.code}`);
  const joined = state.kind === "member" || phase === "joined";
  const asked = state.kind === "pending" || phase === "asked";

  return (
    <section className="mt-10 max-w-lg">
      {/* Icon beside the title (audit no. 27), without a box: one title
          pattern across the app, and boxes mark icon buttons only. */}
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {state.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Dipandu {state.mentor}
            {state.period ? ` · ${state.period}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {joined ? (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Check className="h-4 w-4 text-primary" />
              Kamu sudah di grup ini.
            </p>
            <Link
              href="/account"
              className="mt-4 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Buka akun haistudy
            </Link>
          </div>
        ) : asked ? (
          <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Permintaanmu sudah sampai ke {state.mentor}. Begitu disetujui, kamu langsung masuk grup.
          </p>
        ) : state.kind === "full" ? (
          <div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Grup ini sudah penuh. Kalau kamu memang bagian dari kelasnya, minta tempat ke{" "}
              {state.mentor}. Dia yang memutuskan.
            </p>
            <Button onClick={ask} disabled={phase === "joining"} className="mt-4 h-11 gap-2 px-5">
              {phase === "joining" && <Loader2 className="h-4 w-4 animate-spin" />}
              {phase === "joining" ? "Mengirim…" : "Minta tempat"}
            </Button>
            {phase === "error" && message && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {message}
              </p>
            )}
          </div>
        ) : state.kind === "signed-out" && state.full ? (
          <div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Grup ini sudah penuh. Kalau kamu memang bagian dari kelasnya, masuk dulu lalu minta
              tempat ke {state.mentor}.
            </p>
            <a
              href={`/login?next=${next}`}
              className="mt-4 inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Masuk
            </a>
          </div>
        ) : state.kind === "signed-out" ? (
          <div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Daftar dulu untuk bergabung. Lewat tombol ini kode {state.mentor} ikut terpasang,
              dan kamu dapat potongan Rp5.000 di pembelian pertamamu.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                // A plain <a>, not <Link>: /daftar is a route handler that sets
                // the mentor's referral and redirects, which client-side
                // navigation cannot follow. Someone who arrived with the
                // six-letter code has no referral yet; this attaches it.
                href={`/grup/${state.code}/daftar`}
                className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Daftar untuk bergabung
              </a>
              <a
                href={`/login?next=${next}`}
                className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sudah punya akun? Masuk
              </a>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              Setelah bergabung, {state.mentor} bisa melihat progres belajarmu di periode ini,
              supaya sesinya membahas yang kamu perlukan.
            </p>
            <Button onClick={join} disabled={phase === "joining"} className="h-11 gap-2 px-5">
              {phase === "joining" && <Loader2 className="h-4 w-4 animate-spin" />}
              {phase === "joining" ? "Bergabung…" : "Gabung grup"}
            </Button>
            {phase === "error" && message && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {message}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
