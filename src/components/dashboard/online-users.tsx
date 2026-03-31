"use client";

import { motion } from "framer-motion";
import { Users, Monitor, Smartphone, Tablet } from "lucide-react";
import { useOnlineUsers } from "@/hooks/use-online-users";
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

  const visibleUsers = users.filter((u) => !u.hideStatus);

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
            const DeviceIcon = deviceIcons[user.deviceType] || Monitor;
            const subject = user.currentSubject
              ? getSubjectById(user.currentSubject)
              : null;

            return (
              <motion.div
                key={user.id}
                className="flex items-center gap-2 text-xs"
                variants={staggerItem}
              >
                {/* Online dot */}
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />

                {/* Name */}
                <span className="font-medium truncate flex-1">
                  {user.userName || "Anonymous"}
                </span>

                {/* Subject badge */}
                {subject && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                    {subject.name}
                  </span>
                )}

                {/* Device icon */}
                <DeviceIcon className="h-3 w-3 text-muted-foreground shrink-0" />
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
