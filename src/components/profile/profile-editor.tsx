"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/providers/session-provider";
import { useProfile } from "@/hooks/use-profile";
import { useTranslation } from "@/components/providers/language-provider";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { generateDefaultAvatar } from "@/lib/avatar";
import { sounds } from "@/lib/sounds";

const BIO_MAX = 200;
const STATUS_MAX = 80;

export function ProfileEditor() {
  const { t } = useTranslation();
  const { session } = useSession();
  const { profile, loading, saving, updateProfile } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const seeded = useRef(false);

  const [bio, setBio] = useState(profile.bio ?? "");
  const [status, setStatus] = useState(profile.customStatus ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);

  // Profile loads async; seed the form once when the backend value arrives so
  // we don't clobber edits the user makes after that.
  useEffect(() => {
    if (loading || seeded.current) return;
    seeded.current = true;
    setBio(profile.bio ?? "");
    setStatus(profile.customStatus ?? "");
    setAvatarUrl(profile.avatarUrl ?? null);
  }, [loading, profile]);

  const shown = avatarUrl || generateDefaultAvatar(session?.name, 96);

  const handlePick = () => {
    sounds.click();
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("profile.upload_error"));
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "image");
      if (!url) {
        toast.error(t("profile.upload_error"));
        return;
      }
      setAvatarUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("profile.upload_error"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    sounds.click();
    setAvatarUrl(null);
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        bio: bio.trim() || null,
        customStatus: status.trim() || null,
        customStatusEmoji: null,
        avatarUrl: avatarUrl || null,
      });
      sounds.correct();
      toast.success(t("profile.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("profile.save_error"));
    }
  };

  return (
    <div className="space-y-4">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <Image
            src={shown}
            alt={t("profile.avatar")}
            width={64}
            height={64}
            unoptimized
            className="h-16 w-16 rounded-full object-cover ring-1 ring-border"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePick}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="mr-1.5 h-3.5 w-3.5" />
              )}
              {uploading ? t("profile.uploading") : t("profile.upload_avatar")}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemoveAvatar}
                disabled={uploading}
                className="text-muted-foreground"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {t("profile.remove_avatar")}
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("profile.avatar_hint")}</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="profile-bio" className="text-xs">
            {t("profile.bio")}
          </Label>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {bio.length}/{BIO_MAX}
          </span>
        </div>
        <Textarea
          id="profile-bio"
          value={bio}
          maxLength={BIO_MAX}
          placeholder={t("profile.bio_placeholder")}
          onChange={(e) => setBio(e.target.value)}
          className="min-h-16 text-sm"
        />
      </div>

      {/* Status + emoji */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="profile-status" className="text-xs">
            {t("profile.status")}
          </Label>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {status.length}/{STATUS_MAX}
          </span>
        </div>
        <Input
          id="profile-status"
          value={status}
          maxLength={STATUS_MAX}
          placeholder={t("profile.status_placeholder")}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 w-full text-sm"
        />
      </div>

      <Button size="sm" className="w-full" onClick={handleSave} disabled={saving || uploading}>
        {saving ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="mr-1.5 h-3.5 w-3.5" />
        )}
        {t("profile.save")}
      </Button>
    </div>
  );
}
