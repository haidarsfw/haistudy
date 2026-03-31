"use client";

import { EyeOff, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RATE_LIMITS } from "@/lib/constants";
import { useTranslation } from "@/components/providers/language-provider";
import { toast } from "sonner";
import { sounds } from "@/lib/sounds";

interface PrivacyToggleProps {
  hideStatus: boolean;
  hideStatusChangedAt: string | null;
  isAdmin: boolean;
  onChange: (hide: boolean) => void;
}

export function PrivacyToggle({
  hideStatus,
  hideStatusChangedAt,
  isAdmin,
  onChange,
}: PrivacyToggleProps) {
  const { t } = useTranslation();

  const handleToggle = (checked: boolean) => {
    // Check cooldown (admin bypass)
    if (!isAdmin && hideStatusChangedAt) {
      const elapsed = Date.now() - new Date(hideStatusChangedAt).getTime();
      if (elapsed < RATE_LIMITS.HIDE_STATUS_COOLDOWN_MS) {
        const remaining = Math.ceil(
          (RATE_LIMITS.HIDE_STATUS_COOLDOWN_MS - elapsed) / 60_000
        );
        toast.error(t("settings.cooldown_wait").replace("{minutes}", String(remaining)));
        return;
      }
    }
    sounds.toggle();
    onChange(checked);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {hideStatus ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-primary" />
        )}
        <div>
          <Label htmlFor="hide-status">{t("settings.hide_status")}</Label>
          <p className="text-[11px] text-muted-foreground">
            {t("settings.hide_status_desc")}
          </p>
        </div>
      </div>
      <Switch
        id="hide-status"
        checked={hideStatus}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}
