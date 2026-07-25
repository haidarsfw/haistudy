"use client";

import { useState } from "react";
import { Check, Laptop, Loader2, Smartphone, Tablet } from "lucide-react";

import { AuthField, PasswordChecklist } from "@/components/account/auth-field";
import { isPasswordStrong } from "@/lib/auth/password-rules";
import { toast } from "@/components/ui/toast";
import type { AccountDevice, DeviceSlots } from "@/lib/auth/account-devices";

const ICON: Record<string, typeof Laptop> = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
};

function relative(iso: string | null): string {
  if (!iso) return "belum pernah";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return "barusan";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export function AccountSecurity({
  authProvider,
  devices: initialDevices,
  slots,
}: {
  authProvider: "google" | "password";
  devices: AccountDevice[];
  slots: DeviceSlots[];
}) {
  const [devices, setDevices] = useState(initialDevices);

  return (
    <div className="flex flex-col gap-4">
      {authProvider === "password" ? (
        <ChangePassword />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Cara masuk</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Akun ini masuk lewat Google, jadi tidak punya password yang perlu diatur.
            Keamanannya mengikuti akun Google kamu.
          </p>
        </div>
      )}

      <DeviceList devices={devices} slots={slots} onChange={setDevices} />
      <SignOutOthers />
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setErrors({});

    const local: Record<string, string> = {};
    if (!current) local.currentPassword = "Isi password sekarang";
    if (!isPasswordStrong(next)) local.newPassword = "Password belum memenuhi syarat";
    if (confirm !== next) local.confirm = "Passwordnya belum sama";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; field?: string };

      if (!res.ok || !data.ok) {
        if (data.field) setErrors({ [data.field]: data.error ?? "Tidak valid" });
        else toast.error(data.error ?? "Gagal mengubah password");
        return;
      }

      // A confirmation, not a silent success. Changing a password is a security
      // action, and the part where every other device was signed out is worth
      // saying out loud rather than leaving someone to guess.
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Check className="h-4 w-4 text-primary" />
          Password berhasil diubah
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Perangkat ini tetap masuk. Semua perangkat lain sudah dikeluarkan dari akunmu.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Ubah lagi
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5" noValidate>
      <p className="text-sm font-semibold text-foreground">Ganti password</p>

      <div className="mt-4 flex flex-col gap-4">
        <AuthField
          id="sec-current"
          label="Password sekarang"
          type="password"
          value={current}
          onChange={setCurrent}
          placeholder="Password lamamu"
          autoComplete="current-password"
          error={errors.currentPassword}
        />

        <div className="flex flex-col gap-2">
          <AuthField
            id="sec-new"
            label="Password baru"
            type="password"
            value={next}
            onChange={setNext}
            placeholder="Password baru"
            autoComplete="new-password"
            error={errors.newPassword}
          />
          <PasswordChecklist password={next} />
        </div>

        <AuthField
          id="sec-confirm"
          label="Ulangi password baru"
          type="password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Ketik ulang"
          autoComplete="new-password"
          error={errors.confirm}
        />
      </div>

      <button
        type="submit"
        disabled={saving || !isPasswordStrong(next) || confirm !== next || !current}
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? "Menyimpan..." : "Simpan password baru"}
      </button>
    </form>
  );
}

function DeviceList({
  devices,
  slots,
  onChange,
}: {
  devices: AccountDevice[];
  slots: DeviceSlots[];
  onChange: (d: AccountDevice[]) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const release = async (id: string) => {
    if (busy) return;
    setBusy(id);
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
      onChange(devices.filter((d) => d.id !== id));
      toast.success("Perangkat dikeluarkan");
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-foreground">Perangkat yang terdaftar</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Keluarkan perangkat yang sudah tidak kamu pakai untuk membebaskan jatah. Pelepasan
        berikutnya baru bisa 12 jam setelahnya.
      </p>

      {slots.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {slots.map((s) => (
            <li
              key={s.licenseKey}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              <span className="uppercase">{s.scopeKey.replace(/-/g, " ")}</span>
              {" · "}
              {s.unlimited ? "tanpa batas" : `${s.used} dari ${s.max} perangkat`}
            </li>
          ))}
        </ul>
      )}

      {devices.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Belum ada perangkat yang tercatat.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {devices.map((d) => {
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
                  disabled={busy === d.id}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  {busy === d.id ? "..." : "Keluarkan"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SignOutOthers() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signout-others" }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      toast.error("Gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Keluar dari perangkat lain</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Mengakhiri sesi di semua perangkat selain yang kamu pakai sekarang. Jatah
          perangkat tidak berubah.
        </p>
      </div>
      {done ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-primary">
          <Check className="h-4 w-4" />
          Selesai
        </span>
      ) : (
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="shrink-0 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {busy ? "..." : "Keluarkan semua"}
        </button>
      )}
    </div>
  );
}
