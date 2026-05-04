"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BellOff,
  Volume2,
  Globe,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { useSettings } from "@/hooks/use-settings";
import { useWebPush } from "@/hooks/use-web-push";
import { useSession } from "@/components/providers/session-provider";
import { sounds, getSoundMuted, setSoundMuted } from "@/lib/sounds";
import { toast } from "sonner";

function PermissionBadge({ state }: { state: string }) {
  if (state === "granted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Diizinkan
      </span>
    );
  }
  if (state === "denied") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
        <AlertTriangle className="h-3 w-3" />
        Diblokir
      </span>
    );
  }
  if (state === "unsupported") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        Tidak didukung
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      Belum ditanya
    </span>
  );
}

interface Row {
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  title: string;
  desc: string;
  control: React.ReactNode;
  badge?: React.ReactNode;
}

function SettingRow({ icon: Icon, iconColor, title, desc, control, badge }: Row) {
  return (
    <motion.div
      variants={staggerItem}
      className="rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconColor ?? "text-muted-foreground"}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{title}</p>
              {badge}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="shrink-0">{control}</div>
      </div>
    </motion.div>
  );
}

export function NotificationsSettingsTab() {
  const { settings, updateSettings } = useSettings();
  const { session } = useSession();
  const {
    supported,
    permission,
    subscribed,
    busy,
    iosNeedsInstall,
    subscribe,
    unsubscribe,
    sendTest,
  } = useWebPush();

  const [soundOn, setSoundOn] = useState<boolean>(() => !getSoundMuted());
  const [testing, setTesting] = useState(false);

  const sound = settings.notifSoundEnabled ?? true;
  const browser = settings.notifBrowserEnabled ?? true;
  const push = settings.notifPushEnabled ?? true;
  const email = settings.notifEmailEnabled ?? true;

  const handleEnablePush = async () => {
    sounds.click();
    if (subscribed) {
      await unsubscribe();
      toast.success("Push notification dimatikan.");
      return;
    }
    const res = await subscribe();
    if (res.ok) {
      toast.success("Push notification aktif.");
    } else if (res.reason === "denied") {
      toast.error(
        "Permission ditolak. Aktifkan dari pengaturan browser → Site Settings."
      );
    } else if (res.reason === "no-vapid") {
      toast.error("VAPID key belum dikonfigurasi.");
    } else if (res.reason === "unsupported") {
      toast.error("Browser kamu belum support push notification.");
    } else {
      toast.error("Gagal mengaktifkan.");
    }
  };

  const handleTest = async () => {
    sounds.click();
    setTesting(true);
    try {
      const ok = await sendTest();
      if (ok) toast.success("Test push terkirim.");
      else toast.error("Tidak ada subscription aktif. Aktifkan dulu push.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div
      className="space-y-3"
      variants={staggerContainer(0.05)}
      initial="hidden"
      animate="visible"
    >
      <SettingRow
        icon={Volume2}
        title="Suara notifikasi"
        desc="Mainkan chime saat pesan baru tiba."
        control={
          <Switch
            checked={sound && soundOn}
            onCheckedChange={(v) => {
              updateSettings({ notifSoundEnabled: v });
              setSoundOn(v);
              setSoundMuted(!v);
              if (v) sounds.toggle();
            }}
          />
        }
      />

      <SettingRow
        icon={browser ? Bell : BellOff}
        title="Browser notification"
        desc="Tampil di pojok layar saat tab aktif/background."
        badge={<PermissionBadge state={permission} />}
        control={
          <Switch
            checked={browser}
            onCheckedChange={(v) => {
              updateSettings({ notifBrowserEnabled: v });
              if (v && permission === "default" && typeof Notification !== "undefined") {
                Notification.requestPermission();
              }
            }}
          />
        }
      />

      <SettingRow
        icon={Globe}
        title="Push notification (web)"
        desc={
          iosNeedsInstall
            ? "iOS: tap Share → Add to Home Screen di Safari, lalu kembali ke sini."
            : subscribed
            ? "Aktif. Pesan masuk meski tab tertutup."
            : "Bekerja saat browser ditutup. Bekerja di desktop + Android."
        }
        badge={
          subscribed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Aktif
            </span>
          ) : null
        }
        control={
          <div className="flex items-center gap-2">
            <Button
              variant={subscribed ? "outline" : "default"}
              size="sm"
              className="h-7 text-[11px]"
              disabled={!supported || iosNeedsInstall || busy}
              onClick={handleEnablePush}
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : subscribed ? (
                "Matikan"
              ) : (
                "Aktifkan"
              )}
            </Button>
            <Switch
              checked={push}
              onCheckedChange={(v) => updateSettings({ notifPushEnabled: v })}
              aria-label="Toggle push delivery"
            />
          </div>
        }
      />

      <SettingRow
        icon={Mail}
        title="Email backup"
        desc={
          session?.licenseKey
            ? "Dikirim jika kamu offline >5 menit dan pesan belum dibaca."
            : "Sign in untuk mengaktifkan email backup."
        }
        control={
          <Switch
            checked={email}
            onCheckedChange={(v) => updateSettings({ notifEmailEnabled: v })}
          />
        }
      />

      {iosNeedsInstall && (
        <motion.div
          variants={staggerItem}
          className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] leading-relaxed"
        >
          <div className="flex items-start gap-2">
            <Smartphone className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-700 dark:text-blue-300">
                Aktifkan di iPhone
              </p>
              <p className="text-muted-foreground mt-1">
                1. Buka di Safari (bukan Chrome).<br />
                2. Tap tombol <span className="font-semibold">Share</span>{" "}
                (kotak dengan panah).<br />
                3. Pilih <span className="font-semibold">Add to Home Screen</span>.<br />
                4. Buka haistudy dari home screen lalu aktifkan push di sini.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={staggerItem} className="pt-1">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "Kirim test notification"
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
