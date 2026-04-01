"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/providers/session-provider";
import type { UserProfile } from "@/types";

const STORAGE_KEY = "hs-profile";

export function useProfile() {
  const { session } = useSession();
  const [profile, setProfile] = useState<UserProfile>({ email: null, phone: null });
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
      if (cached) setProfile(JSON.parse(cached));
    } catch {}

    // Fetch from backend
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profile?licenseKey=${session.licenseKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.profile));
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

        if (!res.ok) throw new Error("Failed to save profile");

        const newProfile = {
          email: updates.email ?? profile.email,
          phone: updates.phone ?? profile.phone,
        };
        setProfile(newProfile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      } finally {
        setSaving(false);
      }
    },
    [session?.licenseKey, profile]
  );

  return { profile, loading, saving, updateProfile };
}
