"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Laptop, Loader2, Smartphone, Tablet } from "lucide-react";

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
}: {
  licenseKey: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [privateTab, setPrivateTab] = useState(false);

  useEffect(() => {
    if (!confirm) return;
    void looksLikePrivateTab().then(setPrivateTab);
  }, [confirm]);

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
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {label}
        {!busy && <ArrowRight className="h-4 w-4" />}
      </button>

      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !busy && setConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-base font-bold text-foreground">
              Perangkat baru
            </h2>

            {confirm.full ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Jatah perangkatmu sudah penuh
                  {confirm.max !== null && ` (${confirm.used} dari ${confirm.max})`}.
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
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Melanjutkan akan memakai 1 jatah perangkat
                {confirm.max !== null && (
                  <>
                    {" "}
                    dari {confirm.max}. Sisa setelah ini:{" "}
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

            <div className="mt-5 flex flex-wrap gap-2">
              {!confirm.full && (
                <button
                  type="button"
                  onClick={() => enter(true)}
                  disabled={busy}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ya, ini perangkat saya
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {confirm.full ? "Tutup" : "Batal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
