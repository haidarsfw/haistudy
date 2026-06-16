"use client";

import { Key, Monitor, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";

export function SessionInfo() {
  const { session } = useSession();
  const { t } = useTranslation();

  if (!session) return null;

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{t("settings.session_info")}</span>
      <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        {/* License key */}
        <div className="flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{t("settings.session_key")}</span>
          <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">
            {session.licenseKey.slice(0, 4)}***
          </code>
          {session.isAdmin && (
            <Badge variant="admin-outline" className="text-[9px]">
              {t("settings.admin_badge")}
            </Badge>
          )}
          {session.packageTier === "diamond" && (
            <Badge variant="diamond-outline" className="text-[9px]">
              Diamond
            </Badge>
          )}
          {session.packageTier === "vip" && (
            <Badge variant="vip-outline" className="text-[9px]">
              VIP
            </Badge>
          )}
          {session.isTester && (
            <Badge variant="tester-outline" className="text-[9px]">
              {t("settings.tester_badge")}
            </Badge>
          )}
        </div>

        {/* Name */}
        <div className="flex items-center gap-2">
          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{t("settings.session_name")}</span>
          <span>{session.name}</span>
        </div>

        {/* Class */}
        {session.selectedClass && (
          <div className="flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{t("settings.session_class")}</span>
            <span>{session.selectedClass}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {t("settings.manage_profile")}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
