"use client";

import { useAvatars } from "@/hooks/use-avatars";
import { generateDefaultAvatar } from "@/lib/avatar";

interface UserAvatarProps {
  name: string | null | undefined;
  /** Pass a pre-resolved url (or null) when the caller already batched avatars. */
  avatarUrl?: string | null;
  /** Otherwise pass the license key and the component self-resolves the photo. */
  licenseKey?: string | null;
  /** Square px size (default 36). */
  size?: number;
  className?: string;
}

/**
 * Single source of truth for rendering a user's avatar anywhere: shows the
 * uploaded photo when present, else a deterministic initial avatar. Either pass
 * an already-resolved `avatarUrl` (best for lists — resolve once with
 * useAvatars), or pass a `licenseKey` to let this component resolve it.
 */
export function UserAvatar({
  name,
  avatarUrl,
  licenseKey,
  size = 36,
  className = "",
}: UserAvatarProps) {
  // Self-resolve only when the caller didn't already provide a url.
  const needResolve = avatarUrl === undefined && !!licenseKey;
  const map = useAvatars(needResolve ? [licenseKey as string] : []);
  const resolved =
    avatarUrl !== undefined
      ? avatarUrl
      : licenseKey
        ? map.get(licenseKey.toUpperCase()) ?? null
        : null;
  const src = resolved || generateDefaultAvatar(name, size * 2);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name ?? ""}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  );
}
