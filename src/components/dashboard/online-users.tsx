"use client";

import { motion } from "framer-motion";
import { Users, Monitor, Smartphone, Tablet, Lock } from "lucide-react";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { ROLE_COLORS, resolveRole } from "@/lib/role-colors";

const deviceIcons: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

// Human labels for non-subject routes. Subject IDs resolve via getSubjectById.
const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  subjects: "Subjects",
  bookmarks: "Bookmarks",
  notes: "Catatan",
  analytics: "Analytics",
  feedback: "Feedback",
  voice: "Voice",
  admin: "Admin",
  settings: "Settings",
  "jadwal-uts": "Jadwal UTS",
};

export function OnlineUsers() {
  const { t } = useTranslation();
  const { users } = useOnlineUsers();
  const { session } = useSession();

  const isAdmin = session?.isAdmin ?? false;
  const myLicenseKey = session?.licenseKey ?? "";
  // Check if the current user has hide status enabled (from their own presence entry)
  const myHideStatus = users.find((u) => u.licenseKey === myLicenseKey)?.hideStatus ?? false;
  const visibleUsers = users;
  const { subjects } = useScopedData();
  const subjectMap = new Map(subjects.map((s) => [s.id, s] as const));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-heading font-semibold">{t("dashboard.online")}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {visibleUsers.length} {t("dashboard.people")}
        </span>
      </div>

      {visibleUsers.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground text-center">
          {t("dashboard.nobody_online")}
        </p>
      ) : (
        <motion.div
          className={`mt-3 ${
            visibleUsers.length >= 9
              ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
              : "flex flex-col gap-2"
          }`}
          variants={staggerContainer(0.04)}
          initial="hidden"
          animate="visible"
        >
          {visibleUsers.slice(0, 12).map((user, idx) => {
            const devices = user.deviceTypes || [user.deviceType];
            const subject = user.currentSubject
              ? subjectMap.get(user.currentSubject) ?? null
              : null;
            // Subjects: visible to all (preserves existing UX).
            // Page labels (dashboard, forum, etc.): admin-only - others don't
            // need to know what non-subject page a user is viewing.
            const locationText =
              subject?.name ||
              (isAdmin && user.currentSubject
                ? PAGE_LABELS[user.currentSubject]
                : null) ||
              null;
            const isSelf = user.licenseKey === myLicenseKey;
            // Masking logic:
            // - Admin: always sees real names
            // - Self (hidden): sees own name as "Name (hidden)"
            // - Hidden user viewing others: ALL others show as "Hidden User"
            // - Non-hidden user viewing hidden user: shows "Hidden User"
            const masked = !isAdmin && !isSelf && (user.hideStatus || myHideStatus);

            let displayName: string;
            if (isAdmin) {
              displayName = user.userName || "Anonymous";
            } else if (isSelf && user.hideStatus) {
              displayName = `${user.userName || "Anonymous"} (hidden)`;
            } else if (masked) {
              displayName = "Hidden User";
            } else {
              displayName = user.userName || "Anonymous";
            }

            return (
              <motion.div
                key={`${user.id}:${user.licenseKey || "anon"}:${idx}`}
                className="flex items-center gap-2 text-xs"
                variants={staggerItem}
              >
                {/* Online dot */}
                <div className={`h-2 w-2 rounded-full shrink-0 ${masked ? "bg-zinc-400" : "bg-emerald-500"}`} />

                {/* Name + device count */}
                <span
                  className={`truncate flex-1 font-semibold ${
                    user.hideStatus && isAdmin ? "text-muted-foreground" : ""
                  } ${masked ? "italic text-muted-foreground" : ""} ${
                    !masked && !(user.hideStatus && isAdmin)
                      ? ROLE_COLORS[
                          resolveRole({
                            isAdmin: user.isAdmin,
                            isTester: user.isTester,
                            packageTier: user.packageTier ?? null,
                          })
                        ].text
                      : ""
                  }`}
                >
                  {displayName}
                  {!masked && user.deviceCount > 1 && (
                    <span className="text-muted-foreground font-normal ml-1">({user.deviceCount})</span>
                  )}
                </span>

                {/* Lock icon for hidden users (admin view) */}
                {user.hideStatus && isAdmin && (
                  <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                )}

                {/* Location badge - subject name or page label */}
                {locationText && !masked && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">
                    {locationText}
                  </span>
                )}

                {/* Device icons */}
                {!masked && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {devices.map((dt, i) => {
                      const Icon = deviceIcons[dt] || Monitor;
                      return <Icon key={`${dt}-${i}`} className="h-3 w-3 text-muted-foreground" />;
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}

          {visibleUsers.length > 12 && (
            <p className="text-[10px] text-muted-foreground text-center col-span-full">
              +{visibleUsers.length - 12} {t("dashboard.others")}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
