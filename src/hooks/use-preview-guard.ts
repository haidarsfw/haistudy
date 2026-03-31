"use client";

import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { toast } from "sonner";

export function usePreviewGuard() {
  const { session } = useSession();
  const { t } = useTranslation();
  const isPreview = !!session?.isPreview;

  const guard = (messageKey?: string): boolean => {
    if (isPreview) {
      toast.error(t("preview.action_blocked"), {
        description: t(messageKey || "preview.buy_access_desc"),
      });
      return false;
    }
    return true;
  };

  return { isPreview, guard };
}
