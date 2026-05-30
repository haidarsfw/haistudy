"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/providers/session-provider";
import type { UserProfile } from "@/types";

const STORAGE_KEY = "hs-profile";

const EMPTY: UserProfile = {
  email: null,
  phone: null,
  avatarUrl: null,
  bio: null,
  customStatus: null,
  customStatusEmoji: null,
};

export function useProfile() {
  const { session } = useSession();
  const [profile, setProfile] = useState<UserProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load from localStorage + backend
  useEffect(() => {
    if (!session?.licenseKey) {
      setLoading(false);
      return;
    }

    // Load cached first
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) setProfile({ ...EMPTY, ...JSON.parse(cached) });
    } catch {}

    // Fetch from backend
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profile?licenseKey=${session.licenseKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            const merged = { ...EMPTY, ...data.profile };
            setProfile(merged);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
        }
      } catch {
        // Use cached
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session?.licenseKey]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile> & { selectedClass?: string }) => {
      if (!session?.licenseKey) return;

      setSaving(true);
      try {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licenseKey: session.licenseKey,
            ...updates,
          }),
        });

        if (!res.ok) {
          // Surface the real server message so the UI can show why it failed
          // (invalid email, bio too long, etc.) instead of a generic string.
          let msg = "Failed to save profile";
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch {}
          throw new Error(msg);
        }

        setProfile((prev) => {
          const { selectedClass: _omit, ...profileUpdates } = updates;
          void _omit;
          const next = { ...prev, ...profileUpdates };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      } finally {
        setSaving(false);
      }
    },
    [session?.licenseKey]
  );

  return { profile, loading, saving, updateProfile };
}
