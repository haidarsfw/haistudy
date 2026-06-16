"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
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
import { isHeic, heicToJpeg } from "@/lib/image";
import { sounds } from "@/lib/sounds";

// Lazy-load the cropper so react-easy-crop stays out of the initial bundle - it
// only loads the first time a user picks a photo.
const AvatarCropper = dynamic(() => import("./avatar-cropper"), { ssr: false });

const BIO_MAX = 200;
const STATUS_MAX = 80;
// Reject absurdly large picks before we even decode them (25MB).
const MAX_FILE_BYTES = 25 * 1024 * 1024;

interface ProfileEditorProps {
  // Called after a successful save so the surrounding container (chat dialog,
  // settings modal) can dismiss itself.
  onSaved?: () => void;
}

export function ProfileEditor({ onSaved }: ProfileEditorProps) {
  const { t } = useTranslation();
  const { session } = useSession();
  const { profile, loading, saving, updateProfile } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const seeded = useRef(false);
  // Set the moment the user edits anything. Guards against the async profile
  // fetch resolving AFTER an upload and clobbering the fresh avatar back to
  // null (the bug that left every avatar_url null in the DB).
  const dirty = useRef(false);

  const [bio, setBio] = useState(profile.bio ?? "");
  const [status, setStatus] = useState(profile.customStatus ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  // Object URL of the picked image fed to the cropper. Non-null = cropper open.
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);

  // Profile loads async; seed the form once when the backend value arrives so
  // we don't clobber edits the user makes after that. If the user already
  // touched the form (e.g. uploaded an avatar while the fetch was in flight),
  // skip seeding entirely.
  useEffect(() => {
    if (loading || seeded.current) return;
    seeded.current = true;
    if (dirty.current) return;
    setBio(profile.bio ?? "");
    setStatus(profile.customStatus ?? "");
    setAvatarUrl(profile.avatarUrl ?? null);
  }, [loading, profile]);

  // Revoke the cropper's object URL on unmount (and whenever it changes) so we
  // don't leak blobs.
  useEffect(() => {
    return () => {
      if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    };
  }, [pendingSrc]);

  const shown = avatarUrl || generateDefaultAvatar(session?.shortName, 96);
  const busy = uploading || converting;

  const handlePick = () => {
    sounds.click();
    fileRef.current?.click();
  };

  // Pick → (HEIC convert) → open cropper. No upload happens here; that waits
  // for the user to confirm a crop.
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    let file = picked;
    if (!file.type.startsWith("image/") && !isHeic(file)) {
      toast.error(t("profile.upload_error"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t("profile.upload_error"));
      return;
    }
    // iPhone HEIC/HEIF can't decode into an <img> in most browsers - convert to
    // JPEG first so the cropper (and every downstream canvas) can render it.
    if (isHeic(file)) {
      setConverting(true);
      try {
        file = await heicToJpeg(file);
      } catch {
        toast.error(t("profile.upload_error"));
        setConverting(false);
        return;
      }
      setConverting(false);
    }
    setPendingSrc(URL.createObjectURL(file));
  };

  // Cropper confirmed → upload the square crop to Cloudinary.
  const handleCropped = async (blob: Blob) => {
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(null);
    setUploading(true);
    dirty.current = true;
    try {
      const f = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
      const url = await uploadToCloudinary(f, "image");
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

  const handleCropCancel = () => {
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(null);
  };

  const handleRemoveAvatar = () => {
    sounds.click();
    dirty.current = true;
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
      // Broadcast so every avatar surface (chat bubbles, dashboard online list,
      // voice participants) invalidates its cached avatar for this key and
      // re-renders without a full reload. Consumed by use-avatars.ts.
      if (session?.licenseKey) {
        window.dispatchEvent(
          new CustomEvent("hs:avatar-updated", {
            detail: {
              licenseKey: session.licenseKey.toUpperCase(),
              avatarUrl: avatarUrl || null,
            },
          })
        );
      }
      sounds.correct();
      toast.success(t("profile.saved"));
      // Dismiss the surrounding container (chat edit-profile dialog / settings
      // modal) now that the save succeeded.
      onSaved?.();
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
          {busy && (
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
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="mr-1.5 h-3.5 w-3.5" />
              )}
              {converting
                ? t("profile.converting")
                : uploading
                  ? t("profile.uploading")
                  : t("profile.upload_avatar")}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemoveAvatar}
                disabled={busy}
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
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/heic,image/heif,image/*"
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
          onChange={(e) => {
            dirty.current = true;
            setBio(e.target.value);
          }}
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
          onChange={(e) => {
            dirty.current = true;
            setStatus(e.target.value);
          }}
          className="h-9 w-full text-sm"
        />
      </div>

      <Button size="sm" className="w-full" onClick={handleSave} disabled={saving || busy}>
        {saving ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="mr-1.5 h-3.5 w-3.5" />
        )}
        {t("profile.save")}
      </Button>

      {/* Circular cropper overlay (lazy). Mounts above the settings modal. */}
      <AnimatePresence>
        {pendingSrc && (
          <AvatarCropper
            src={pendingSrc}
            onApply={handleCropped}
            onCancel={handleCropCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
