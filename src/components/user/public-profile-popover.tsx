"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Loader2, Send, Pencil } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { generateDefaultAvatar } from "@/lib/avatar";
import { useTranslation } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { canUseVipFeatures } from "@/lib/tier";
import { resolveRole, getRoleNameClass } from "@/lib/role-colors";
import { openDmTo, openProfileEditor } from "@/lib/events";
import type { PublicProfile } from "@/types";

interface PublicProfilePopoverProps {
  children: React.ReactElement;
  licenseKey?: string | null;
  // Fallbacks rendered immediately + when licenseKey is null (legacy rows).
  fallbackName: string;
  fallbackTier?: PublicProfile["packageTier"];
  fallbackIsAdmin?: boolean;
}

// Module-scope cache so re-opening a popover (or many authors sharing a key)
// doesn't refetch. Keyed by license_key.
const cache = new Map<string, PublicProfile>();

// Module-scope coordinator: only ONE popover may be open at a time. Opening any
// instance (via hover or click) closes the previously-open one, so two popovers
// can never be visible simultaneously.
let activeClose: (() => void) | null = null;

export function PublicProfilePopover({
  children,
  licenseKey,
  fallbackName,
  fallbackTier,
  fallbackIsAdmin,
}: PublicProfilePopoverProps) {
  const { t } = useTranslation();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  // Stable closer for the module-level coordinator (setOpen is stable).
  const closeRef = useRef(() => setOpen(false));
  const [profile, setProfile] = useState<PublicProfile | null>(
    licenseKey ? cache.get(licenseKey) ?? null : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !licenseKey || profile) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/profile/public?licenseKey=${encodeURIComponent(licenseKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const p: PublicProfile | null = d?.profile ?? null;
        if (p) {
          cache.set(licenseKey, p);
          setProfile(p);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, licenseKey, profile]);

  // If this instance owned the active slot when it unmounts, release it.
  useEffect(() => {
    const close = closeRef.current;
    return () => {
      if (activeClose === close) activeClose = null;
    };
  }, []);

  const name = profile?.name ?? fallbackName;
  const tier = profile?.packageTier ?? fallbackTier ?? null;
  const isAdmin = profile?.isAdmin ?? fallbackIsAdmin ?? false;
  const avatar = profile?.avatarUrl || generateDefaultAvatar(name, 80);

  // Issue 4d: DM button only when BOTH viewer and target are VIP+ (vip|diamond|admin).
  const viewerIsVipPlus = canUseVipFeatures(session);
  const targetIsVipPlus =
    isAdmin || tier === "vip" || tier === "diamond";
  const isSelf = !!licenseKey && session?.licenseKey?.toUpperCase() === licenseKey.toUpperCase();
  const showDmButton =
    viewerIsVipPlus && targetIsVipPlus && !!licenseKey && !isSelf;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          // Opening: close whoever else is open, then claim the slot.
          if (activeClose && activeClose !== closeRef.current) activeClose();
          activeClose = closeRef.current;
        } else if (activeClose === closeRef.current) {
          activeClose = null;
        }
        setOpen(next);
      }}
    >
      {/* openOnHover = desktop hover (delay 300ms); base-ui ignores hover for
          touch input, so mobile still opens on tap. */}
      <PopoverTrigger openOnHover delay={300} render={children} />
      <PopoverContent className="w-52 p-0" align="start" sideOffset={6}>
        <div className="flex items-center gap-3 p-3">
          <Image
            src={avatar}
            alt={name}
            width={40}
            height={40}
            unoptimized
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-semibold ${getRoleNameClass(resolveRole({ isAdmin, packageTier: tier }))}`}>{name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              {isAdmin && (
                <Badge variant="admin-outline" className="px-1 py-0 text-[9px]">
                  Admin
                </Badge>
              )}
              {tier === "diamond" && (
                <Badge variant="diamond-outline" className="px-1 py-0 text-[9px]">
                  Diamond
                </Badge>
              )}
              {(tier === "vip" || tier === "diamond") && (
                <Badge variant="vip-outline" className="px-1 py-0 text-[9px]">
                  VIP
                </Badge>
              )}
              {profile?.selectedClass && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {profile.selectedClass}
                </span>
              )}
            </div>
          </div>
          {loading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {(profile?.customStatus || profile?.bio) && (
          <>
            <Separator />
            <div className="space-y-1.5 p-3">
              {profile.customStatus && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("profile.label_status")}
                  </p>
                  <p className="text-[11px] text-foreground/90">
                    {profile.customStatus}
                  </p>
                </div>
              )}
              {profile.bio && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("profile.label_bio")}
                  </p>
                  <p className="whitespace-pre-wrap text-[11px] text-muted-foreground">
                    {profile.bio}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {showDmButton && (
          <>
            <Separator />
            <div className="p-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openDmTo(licenseKey!);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Send className="h-3.5 w-3.5" />
                {t("profile.send_dm")}
              </button>
            </div>
          </>
        )}

        {isSelf && (
          <div className="hidden sm:block">
            <Separator />
            <div className="p-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openProfileEditor();
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit profil
              </button>
            </div>
          </div>
        )}

        {!licenseKey && (
          <>
            <Separator />
            <p className="px-3 py-2 text-[10px] text-muted-foreground">
              {t("profile.public_unavailable")}
            </p>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
