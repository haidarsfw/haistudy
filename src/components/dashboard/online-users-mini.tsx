"use client";

import { useState } from "react";
import { Users, ChevronDown, Monitor, Smartphone, Tablet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerItem } from "@/lib/motion";

const DOT_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
];

const deviceIcons: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export function OnlineUsersMini() {
  const { t } = useTranslation();
  const { users } = useOnlineUsers();
  const [expanded, setExpanded] = useState(false);

  const visibleUsers = users.filter((u) => !u.hideStatus);

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-xl border border-border bg-card p-4 transition-colors light-card-shadow"
    >
      {/* Header + count — clickable to expand */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {t("dashboard.online")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold tabular-nums">
            {visibleUsers.length}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Avatar row (always visible) */}
      {visibleUsers.length > 0 && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex -space-x-1.5">
            {visibleUsers.slice(0, 5).map((user, i) => (
              <div
                key={user.id}
                className={`h-6 w-6 rounded-full border-2 border-card flex items-center justify-center text-[9px] font-bold text-white ${DOT_COLORS[i % DOT_COLORS.length]}`}
                title={user.userName || "?"}
              >
                {(user.userName || "?").charAt(0).toUpperCase()}
              </div>
            ))}
            {visibleUsers.length > 5 && (
              <div className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                +{visibleUsers.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {visibleUsers.length === 0 && (
        <p className="text-[11px] text-muted-foreground mt-2">
          {t("dashboard.nobody_online")}
        </p>
      )}

      {/* Expandable user list */}
      <AnimatePresence>
        {expanded && visibleUsers.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-border pt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {visibleUsers.map((user) => {
                const DeviceIcon = deviceIcons[user.deviceType] || Monitor;
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-medium truncate flex-1">
                      {user.userName || "Anonymous"}
                    </span>
                    <DeviceIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
