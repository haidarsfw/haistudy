"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { popupOverlay, popupPanel } from "@/lib/motion";
import {
  AlertTriangle,
  ArrowRight,
  Laptop,
  Loader2,
  MonitorSmartphone,
  Smartphone,
  Tablet,
} from "@/components/ui/icons";

import { looksLikePrivateTab } from "@/lib/incognito";
import { toast } from "@/components/ui/toast";

interface KnownDevice {
  id: string;
  label: string | null;
  deviceType: string;
  lastSeen: string | null;
}

interface ConfirmState {
  used: number;
  max: number | null;
  full: boolean;
  devices: KnownDevice[];
}

const ICON: Record<string, typeof Laptop> = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
};

function relative(iso: string | null): string {
  if (!iso) return "belum pernah";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 2) return "barusan";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

/**
 * Opens a purchased access.
 *
 * On a browser the account has used before this is one click. On a new one it
 * stops and shows what the click will cost — "1 dari 3, sisa 1" — because a
 * device slot silently disappearing is the single most common thing people
 * write in about. Nothing is spent until they say so.
 */
export function EnterAccessButton({
  licenseKey,
  label = "Masuk",
  autoEnter = false,
}: {
  licenseKey: string;
  label?: string;
  /** Sign-in already tried to open this and was told the browser is new. */
  autoEnter?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [privateTab, setPrivateTab] = useState(false);

  useEffect(() => {
    if (!confirm) return;
    void looksLikePrivateTab().then(setPrivateTab);
  }, [confirm]);

  // Sign-in bounced here because this browser is not recognised. Bring the
  // confirmation up by itself rather than making them find the button that
  // triggers the question they were already asked.
  useEffect(() => {
    if (!autoEnter) return;
    void enter(false);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnter]);

  const enter = async (confirmDevice = false) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey, confirmDevice }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        redirect?: string;
        error?: string;
        needsDeviceConfirm?: boolean;
      } & Partial<ConfirmState>;

      if (data.needsDeviceConfirm) {
        setConfirm({
          used: data.used ?? 0,
          max: data.max ?? null,
          full: data.full ?? false,
          devices: data.devices ?? [],
        });
        return;
      }

      if (!res.ok || !data.ok || !data.redirect) {
        toast.error(data.error ?? "Gagal membuka akses");
        return;
      }

      // Full navigation: the app shell reads the cookies this call just set.
      window.location.href = data.redirect;
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const release = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/account/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceRowId: id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Gagal mengeluarkan perangkat");
        return;
      }
      setConfirm((c) =>
        c
          ? {
              ...c,
              used: Math.max(0, c.used - 1),
              full: false,
              devices: c.devices.filter((d) => d.id !== id),
            }
          : c
      );
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => enter(false)}
        disabled={busy}
        className="brand-gradient-bg group inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {label}
        {!busy && (
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        )}
      </button>

      {confirm && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="device-confirm-title"
          variants={popupOverlay}
          initial="hidden"
          animate="visible"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !busy && setConfirm(null)}
        >
          <motion.div
            variants={popupPanel}
            initial="hidden"
            animate="visible"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* An icon and a centred heading, so the dialog reads as a decision
                rather than as a paragraph that happens to float. */}
            <div className="flex flex-col items-center px-6 pt-6 text-center">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  confirm.full
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <MonitorSmartphone className="h-5 w-5" />
              </span>
              <h2
                id="device-confirm-title"
                className="mt-3 font-display text-lg font-bold tracking-tight text-foreground"
              >
                {confirm.full ? "Jatah perangkat penuh" : "Perangkat baru"}
              </h2>
            </div>

            <div className="px-6 pb-6 pt-2">
            {confirm.full ? (
              <>
                <p className="text-center text-sm leading-relaxed text-muted-foreground">
                  {confirm.max !== null &&
                    `${confirm.used} dari ${confirm.max} perangkat terpakai. `}
                  Keluarkan salah satu dulu untuk masuk dari sini.
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {confirm.devices.map((d) => {
                    const Icon = ICON[d.deviceType] ?? Laptop;
                    return (
                      <li
                        key={d.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {d.label || d.deviceType}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Aktif {relative(d.lastSeen)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => release(d.id)}
                          disabled={busy}
                          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                        >
                          Keluarkan
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-center text-sm leading-relaxed text-muted-foreground">
                Melanjutkan akan memakai 1 jatah perangkat
                {confirm.max !== null && (
                  <>
                    {" "}
                    dari {confirm.max}. Sisa setelah ini{" "}
                    <span className="font-semibold text-foreground">
                      {Math.max(0, confirm.max - confirm.used - 1)}
                    </span>
                  </>
                )}
                .
              </p>
            )}

            {privateTab && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p className="text-xs leading-relaxed text-foreground">
                  Sepertinya kamu memakai <strong>incognito / private tab</strong>. Jatah
                  perangkat ini akan hangus begitu tab-nya ditutup, dan kamu harus memakai
                  jatah lagi lain kali. Sebaiknya masuk lewat tab biasa.
                </p>
              </div>
            )}

            {/* Stacked, full width, primary on top. Two pills side by side at
                different widths is what made this look improvised. */}
            <div className="mt-5 flex flex-col gap-2">
              {!confirm.full && (
                <button
                  type="button"
                  onClick={() => enter(true)}
                  disabled={busy}
                  className="brand-gradient-bg inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ya, ini perangkat saya
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {confirm.full ? "Tutup" : "Batal"}
              </button>
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
