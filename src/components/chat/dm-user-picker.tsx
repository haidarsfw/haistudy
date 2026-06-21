"use client";

import { useState, useMemo } from "react";
import { Search, ArrowLeft, Crown, ShieldCheck, Gem } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { useAvatars } from "@/hooks/use-avatars";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { DmDirectoryUser } from "@/types";

interface DmUserPickerProps {
  directory: DmDirectoryUser[];
  isLoading: boolean;
  onPick: (licenseKey: string) => void;
  onBack: () => void;
}

export function DmUserPicker({
  directory,
  isLoading,
  onPick,
  onBack,
}: DmUserPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  // Resolve real photos for everyone in the directory (cached cross-surface).
  const avatarKeys = useMemo(
    () => directory.map((u) => u.licenseKey).filter(Boolean) as string[],
    [directory]
  );
  const avatars = useAvatars(avatarKeys);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? directory.filter((u) => u.name.toLowerCase().includes(q))
      : directory;
    // Rank: admin -> diamond -> vip -> rest, then by name.
    const rank = (u: DmDirectoryUser): number =>
      u.isAdmin ? 0 : u.packageTier === "diamond" ? 1 : u.packageTier === "vip" ? 2 : 3;
    return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [directory, search]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Picker header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          onClick={onBack}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{t("dm.new")}</span>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dm.search_users")}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="skeleton h-9 w-9 shrink-0 !rounded-full" />
                <div className="skeleton h-3.5 w-32" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("dm.no_users")}
          </p>
        ) : (
          <ul className="py-1">
            {filtered.map((u) => (
              <li key={u.licenseKey}>
                <button
                  onClick={() => onPick(u.licenseKey)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      name={u.name}
                      avatarUrl={avatars.get(u.licenseKey.toUpperCase()) ?? null}
                      size={36}
                      className="h-9 w-9"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                        u.online ? "bg-emerald-500" : "bg-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{u.name}</span>
                      {u.isAdmin ? (
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                      ) : u.packageTier === "diamond" ? (
                        <Gem className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      ) : (
                        <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {u.online ? t("dm.online") : t("dm.offline")}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
