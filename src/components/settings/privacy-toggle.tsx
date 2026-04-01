"use client";

import { useState, useCallback } from "react";
import { EyeOff, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [showConfirm, setShowConfirm] = useState(false);

  // Calculate cooldown remaining (for display)
  const cooldownRemaining = (() => {
    if (isAdmin || !hideStatusChangedAt) return 0;
    const elapsed = Date.now() - new Date(hideStatusChangedAt).getTime();
    const remaining = RATE_LIMITS.HIDE_STATUS_COOLDOWN_MS - elapsed;
    return remaining > 0 ? Math.ceil(remaining / 60_000) : 0;
  })();

  const handleToggle = useCallback((checked: boolean) => {
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

    // Non-admin turning ON hide status → show confirmation popup
    if (!isAdmin && checked) {
      setShowConfirm(true);
      return;
    }

    sounds.toggle();
    onChange(checked);
  }, [isAdmin, hideStatusChangedAt, onChange, t]);

  const handleConfirm = useCallback(() => {
    sounds.toggle();
    onChange(true);
    setShowConfirm(false);
  }, [onChange]);

  return (
    <>
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
            {cooldownRemaining > 0 && (
              <p className="text-[10px] text-amber-500 mt-0.5">
                Cooldown: {cooldownRemaining} menit tersisa
              </p>
            )}
          </div>
        </div>
        <Switch
          id="hide-status"
          checked={hideStatus}
          onCheckedChange={handleToggle}
        />
      </div>

      {/* Confirmation popup for non-admin users */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleConfirm();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Sembunyikan Status Online?</AlertDialogTitle>
            <AlertDialogDescription>
              Jika kamu menyembunyikan status online: kamu tidak bisa melihat nama user online (hanya jumlahnya), nama dan avatar user lain akan ditampilkan sebagai &quot;?&quot;, dan ada cooldown 1 jam sebelum bisa mengubah lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Ya, Sembunyikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
