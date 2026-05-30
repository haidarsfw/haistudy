"use client";

import { useEffect } from "react";
import { toast } from "@/components/ui/toast";
import { Crown } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

// Listens for the `hs:vip-online` event dispatched by useOnlineUsers when a
// VIP/admin user transitions to online. Shows a small Crown toast once per
// licenseKey per browser session (sessionStorage dedup) so refreshing the
// online list does not re-toast the same person.
//
// Free / normal-tier and hideStatus users never reach this listener - the
// dispatch in use-online-users.ts already filters them out.

interface VipOnlineDetail {
  licenseKey: string;
  name: string;
  isAdmin: boolean;
}

const SEEN_KEY = "hs-vip-welcome-seen";

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // sessionStorage unavailable (private mode) - dedup degrades gracefully
  }
}

export function VipWelcomeListener() {
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<VipOnlineDetail>).detail;
      if (!detail?.licenseKey) return;

      const seen = loadSeen();
      if (seen.has(detail.licenseKey)) return;
      seen.add(detail.licenseKey);
      persistSeen(seen);

      const name = detail.name || "VIP";
      toast(t("vip.welcome_online").replace("{name}", name), {
        icon: <Crown className="h-4 w-4 text-amber-500" />,
        duration: 2500,
      });
    };

    window.addEventListener("hs:vip-online", handler as EventListener);
    return () => window.removeEventListener("hs:vip-online", handler as EventListener);
  }, [t]);

  return null;
}
