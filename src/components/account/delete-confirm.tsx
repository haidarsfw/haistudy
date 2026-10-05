"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert } from "@/components/ui/icons";

import { easeEnter, NAV } from "@/lib/motion";
import { Wordmark } from "@/components/landing/logo";

/**
 * The two pages an e-mail link can land on.
 *
 * Both need a button. Following the link must not be the action itself — mail
 * clients and link scanners fetch URLs on their own, and a page that schedules
 * or cancels a deletion just by being loaded would be triggered by software.
 */
type State = "idle" | "busy" | "done" | "error";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-5 py-12">
      {/* Say whose site this is.
          These two pages are reached by clicking a link in an e-mail about
          deleting an account — the single most suspicious message we ever send.
          They arrived at a bare card floating on a dark background with no mark
          on it anywhere, which is exactly what a phishing page looks like. */}
      <Link
        href="/"
        className="mb-4 self-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Wordmark className="text-sm" />
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: NAV.enter, ease: easeEnter }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        {children}
      </motion.div>
    </div>
  );
}

/** "Yes, schedule it." */
export function DeleteConfirm({ token }: { token: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOn, setDeleteOn] = useState<string>("");

  const confirm = async () => {
    if (state === "busy") return;
    setState("busy");
    setMessage(null);
    try {
      const res = await fetch("/api/account/delete/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        deleteOn?: string;
      };
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "Gagal menjadwalkan penghapusan.");
        return;
      }
      setDeleteOn(data.deleteOn ?? "");
      setState("done");
    } catch {
      setState("error");
      setMessage("Koneksi bermasalah. Coba lagi.");
    }
  };

  if (state === "done") {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
          </span>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              Penghapusan dijadwalkan
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {deleteOn
                ? `Akunmu akan dihapus pada ${deleteOn}.`
                : "Akunmu akan dihapus dalam 7 hari."}{" "}
              Sampai tanggal itu semuanya masih jalan seperti biasa.
            </p>
          </div>
          <p className="rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            Kami kirim email berisi tautan untuk membatalkan. Simpan emailnya —
            itu jalan pulangnya kalau kamu berubah pikiran.
          </p>
          <Link
            href="/account"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Kembali ke akun
          </Link>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex flex-col gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-5 w-5 text-destructive" />
        </span>
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">
            Hapus akun haistudy kamu?
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Kalau kamu lanjut, akunmu dijadwalkan dihapus <strong>7 hari</strong> dari
            sekarang. Selama 7 hari itu akunmu masih bisa dipakai, termasuk akses yang
            sudah kamu beli, dan kamu masih bisa membatalkannya.
          </p>
        </div>

        {message && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={state === "busy"}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
          >
            {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />}
            Ya, jadwalkan penghapusan
          </button>
          <Link
            href="/account"
            className="inline-flex h-10 items-center justify-center rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Batal, kembali ke akun
          </Link>
        </div>
      </div>
    </Frame>
  );
}

/** "Actually, no." */
export function DeleteCancel({ token }: { token: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const cancel = async () => {
    if (state === "busy") return;
    setState("busy");
    setMessage(null);
    try {
      const res = await fetch("/api/account/delete/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "Gagal membatalkan.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setMessage("Koneksi bermasalah. Coba lagi.");
    }
  };

  if (state === "done") {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </span>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              Penghapusan dibatalkan
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Akunmu tetap ada. Tidak ada yang terhapus.
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Buka akun
          </Link>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">
            Batalkan penghapusan akun?
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Akunmu tidak akan dihapus, dan semuanya kembali seperti sebelumnya.
          </p>
        </div>

        {message && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <button
          type="button"
          onClick={cancel}
          disabled={state === "busy"}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />}
          Ya, batalkan penghapusan
        </button>
      </div>
    </Frame>
  );
}
