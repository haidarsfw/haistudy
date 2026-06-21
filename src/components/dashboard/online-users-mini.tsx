"use client";

import { useState, useMemo } from "react";
import { Users, ChevronDown, Monitor, Smartphone, Tablet, Lock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useAvatars } from "@/hooks/use-avatars";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PublicProfilePopover } from "@/components/user/public-profile-popover";
import type { OnlineUser } from "@/types";

const DOT_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
];

const deviceIconMap: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const MAX_VISIBLE_EXPANDED = 2;

function UserRow({ user, index, isAdmin, masked, displayName, avatarUrl = null, popover = true, showAvatar = true }: { user: OnlineUser; index: number; isAdmin: boolean; masked: boolean; displayName: string; avatarUrl?: string | null; popover?: boolean; showAvatar?: boolean }) {
  const devices = user.deviceTypes || [user.deviceType];
  return (
    <div className="flex items-center gap-2 text-xs">
      {showAvatar && (
        <div className="relative shrink-0">
          <UserAvatar name={displayName} avatarUrl={masked ? null : avatarUrl} size={20} className="h-5 w-5" />
          <span className={`absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-card ${masked ? "bg-zinc-400" : "bg-emerald-500"}`} />
        </div>
      )}
      {masked || !popover ? (
        <span className={`font-medium truncate flex-1 ${user.hideStatus && isAdmin ? "text-muted-foreground" : ""} ${masked ? "italic text-muted-foreground" : ""}`}>
          {displayName}
          {!masked && user.deviceCount > 1 && (
            <span className="text-muted-foreground font-normal ml-1">({user.deviceCount})</span>
          )}
        </span>
      ) : (
        <PublicProfilePopover
          licenseKey={user.licenseKey}
          fallbackName={user.userName || displayName}
          fallbackIsAdmin={user.isAdmin}
          fallbackTier={user.packageTier ?? null}
        >
          <button
            type="button"
            className={`min-w-0 font-medium truncate flex-1 text-left hover:underline ${user.hideStatus && isAdmin ? "text-muted-foreground" : ""}`}
          >
            {displayName}
            {user.deviceCount > 1 && (
              <span className="text-muted-foreground font-normal ml-1">({user.deviceCount})</span>
            )}
          </button>
        </PublicProfilePopover>
      )}
      {user.hideStatus && isAdmin && (
        <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
      )}
      {/* Device icons */}
      {!masked && (
        <div className="flex items-center gap-0.5 shrink-0">
          {devices.map((dt, i) => {
            const Icon = deviceIconMap[dt] || Monitor;
            return <Icon key={`${dt}-${i}`} className="h-3 w-3 text-muted-foreground" />;
          })}
        </div>
      )}
    </div>
  );
}

export function OnlineUsersMini() {
  const { t } = useTranslation();
  const { users } = useOnlineUsers();
  const { session } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const isAdmin = session?.isAdmin ?? false;
  const myLicenseKey = session?.licenseKey ?? "";
  const myHideStatus = users.find((u) => u.licenseKey === myLicenseKey)?.hideStatus ?? false;
  const visibleUsers = users;

  // Batch-resolve real avatars (cached cross-surface). Masked users render the
  // anonymized placeholder regardless, so we only need keys for unmasked rows.
  const avatarKeys = useMemo(
    () => users.map((u) => u.licenseKey).filter(Boolean) as string[],
    [users]
  );
  const avatarMap = useAvatars(avatarKeys);

  // Helper to compute display name for a user
  const getDisplayName = (user: OnlineUser): string => {
    const isSelf = user.licenseKey === myLicenseKey;
    if (isAdmin) return user.userName || "Anonymous";
    if (isSelf && user.hideStatus) return `${user.userName || "Anonymous"} (hidden)`;
    if (!isSelf && (user.hideStatus || myHideStatus)) return "Hidden User";
    return user.userName || "Anonymous";
  };
  const isMasked = (user: OnlineUser): boolean => {
    const isSelf = user.licenseKey === myLicenseKey;
    return !isAdmin && !isSelf && (user.hideStatus || myHideStatus);
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 transition-colors light-card-shadow">
        {/* Header + count - clickable to expand */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? "Sembunyikan daftar user online" : "Tampilkan daftar user online"}
          aria-expanded={expanded}
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
              {visibleUsers.slice(0, 5).map((user, i) => {
                const masked = isMasked(user);
                const avatarUrl = !masked && user.licenseKey
                  ? avatarMap.get(user.licenseKey.toUpperCase()) ?? null
                  : null;
                const avatarClass = `h-6 w-6 overflow-hidden rounded-full border-2 border-card flex items-center justify-center text-[9px] font-bold text-white ${masked ? "bg-zinc-500" : DOT_COLORS[i % DOT_COLORS.length]}`;
                const title = masked ? "Hidden User" : `${user.userName || "?"}${user.deviceCount > 1 ? ` (${user.deviceCount})` : ""}`;
                const inner = avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={user.userName || "?"} className="h-full w-full object-cover" />
                ) : masked ? (
                  "?"
                ) : (
                  (user.userName || "?").charAt(0).toUpperCase()
                );
                // Masked users get NO popover (privacy); everyone else is hoverable.
                if (masked) {
                  return (
                    <div key={`${user.id}-${i}`} className={avatarClass} title={title}>
                      {inner}
                    </div>
                  );
                }
                return (
                  <PublicProfilePopover
                    key={`${user.id}-${i}`}
                    licenseKey={user.licenseKey}
                    fallbackName={user.userName || "?"}
                    fallbackIsAdmin={user.isAdmin}
                    fallbackTier={user.packageTier ?? null}
                  >
                    <button
                      type="button"
                      className={`${avatarClass} cursor-pointer transition-transform hover:z-10 hover:scale-110`}
                      title={title}
                    >
                      {inner}
                    </button>
                  </PublicProfilePopover>
                );
              })}
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

        {/* Expandable user list - max 2 users */}
        <AnimatePresence>
          {expanded && visibleUsers.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 border-t border-border pt-2 space-y-1.5">
                {visibleUsers.slice(0, MAX_VISIBLE_EXPANDED).map((user, i) => {
                  const masked = isMasked(user);
                  return (
                    <UserRow key={`${user.licenseKey || user.id}-${i}`} user={user} index={i} isAdmin={isAdmin} masked={masked} displayName={getDisplayName(user)} avatarUrl={masked || !user.licenseKey ? null : avatarMap.get(user.licenseKey.toUpperCase()) ?? null} showAvatar={false} />
                  );
                })}

                {/* "Lihat Semuanya" button when more than 2 */}
                {visibleUsers.length > MAX_VISIBLE_EXPANDED && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
                    className="w-full mt-1 py-1.5 text-[11px] font-medium text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                  >
                    Lihat Semuanya ({visibleUsers.length})
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full user list modal */}
      <AnimatePresence>
        {showAll && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              onClick={() => setShowAll(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-xl border border-border bg-card shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Online Users</h3>
                  <span className="text-xs text-muted-foreground">({visibleUsers.length})</span>
                </div>
                <button
                  onClick={() => setShowAll(false)}
                  aria-label="Tutup daftar user online"
                  className="rounded-lg p-2 hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                {visibleUsers.map((user, i) => {
                  const masked = isMasked(user);
                  return (
                    <UserRow
                      key={`${user.id}:${user.licenseKey || "anon"}:${i}`}
                      user={user}
                      index={i}
                      isAdmin={isAdmin}
                      masked={masked}
                      displayName={getDisplayName(user)}
                      avatarUrl={masked || !user.licenseKey ? null : avatarMap.get(user.licenseKey.toUpperCase()) ?? null}
                    />
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
