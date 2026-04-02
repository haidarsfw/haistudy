"use client";

import { motion } from "framer-motion";
import { Users, Monitor, Smartphone, Tablet, Lock } from "lucide-react";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { getSubjectById } from "@/data/subjects";
import { staggerContainer, staggerItem } from "@/lib/motion";

const deviceIcons: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export function OnlineUsers() {
  const { t } = useTranslation();
  const { users } = useOnlineUsers();
  const { session } = useSession();

  const isAdmin = session?.isAdmin ?? false;
  // All users are always shown; hidden users are masked for non-admin
  const visibleUsers = users;

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
          {visibleUsers.slice(0, 12).map((user) => {
            const devices = user.deviceTypes || [user.deviceType];
            const subject = user.currentSubject
              ? getSubjectById(user.currentSubject)
              : null;
            const masked = user.hideStatus && !isAdmin;

            return (
              <motion.div
                key={user.id}
                className="flex items-center gap-2 text-xs"
                variants={staggerItem}
              >
                {/* Online dot */}
                <div className={`h-2 w-2 rounded-full shrink-0 ${masked ? "bg-zinc-400" : "bg-emerald-500"}`} />

                {/* Name + device count */}
                <span className={`font-medium truncate flex-1 ${user.hideStatus && isAdmin ? "text-muted-foreground" : ""} ${masked ? "italic text-muted-foreground" : ""}`}>
                  {masked ? "People (hide)" : (user.userName || "Anonymous")}
                  {user.deviceCount > 1 && (
                    <span className="text-muted-foreground font-normal ml-1">({user.deviceCount})</span>
                  )}
                </span>

                {/* Lock icon for hidden users (admin view) */}
                {user.hideStatus && isAdmin && (
                  <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                )}

                {/* Subject badge */}
                {subject && !masked && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                    {subject.name}
                  </span>
                )}

                {/* Device icons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {devices.map((dt, i) => {
                    const Icon = deviceIcons[dt] || Monitor;
                    return <Icon key={`${dt}-${i}`} className="h-3 w-3 text-muted-foreground" />;
                  })}
                </div>
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
