"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import { getDeviceId } from "@/lib/auth/device";
import { LogOut, Save, Loader2, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { APP_EVENTS } from "@/lib/events";
import { isCropLocked } from "@/lib/crop-lock";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/components/providers/session-provider";
import { useProfile } from "@/hooks/use-profile";
import { generateDefaultAvatar } from "@/lib/avatar";
import { isHeic, heicToJpeg } from "@/lib/image";
import { resolveRole, getRoleNameClass } from "@/lib/role-colors";
import { toast } from "@/components/ui/toast";

// Lazy-load the cropper (keeps react-easy-crop out of the initial bundle).
const AvatarCropper = dynamic(() => import("@/components/profile/avatar-cropper"), { ssr: false });

interface UserProfilePopoverProps {
  children: React.ReactElement;
}

export function UserProfilePopover({ children }: UserProfilePopoverProps) {
  const router = useRouter();
  const { session, logout } = useSession();
  const { profile, saving, updateProfile } = useProfile();
  const [open, setOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when popover opens
  useEffect(() => {
    if (open) {
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setBio(profile.bio || "");
      // Status is a single field now; merge any legacy emoji + text on load.
      setCustomStatus(
        [profile.customStatusEmoji, profile.customStatus].filter(Boolean).join(" ")
      );
    }
  }, [open, profile]);

  // Open from the chat self-preview "Edit profil" action (desktop sidebar).
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(APP_EVENTS.OPEN_PROFILE, onOpen);
    return () => window.removeEventListener(APP_EVENTS.OPEN_PROFILE, onOpen);
  }, []);

  const handleAvatarPick = () => fileInputRef.current?.click();

  // Pick → (HEIC convert) → open cropper. Upload waits for a confirmed crop, so
  // this entry now gets the same crop UX as Settings (was a raw upload before).
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/") && !isHeic(file)) {
      toast.error("File harus berupa gambar");
      return;
    }
    let f = file;
    if (isHeic(f)) {
      setAvatarUploading(true);
      try {
        f = await heicToJpeg(f);
      } catch {
        toast.error("Gagal mengunggah foto");
        setAvatarUploading(false);
        return;
      }
      setAvatarUploading(false);
    }
    setPendingSrc(URL.createObjectURL(f));
  };

  const handleCropped = async (blob: Blob) => {
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(null);
    setAvatarUploading(true);
    try {
      const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
      const url = await uploadToCloudinary(file, "image");
      await updateProfile({ avatarUrl: url });
      if (session?.licenseKey) {
        window.dispatchEvent(
          new CustomEvent("hs:avatar-updated", {
            detail: { licenseKey: session.licenseKey.toUpperCase(), avatarUrl: url },
          })
        );
      }
      toast.success("Foto profil diperbarui");
    } catch {
      toast.error("Gagal mengunggah foto");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCropCancel = () => {
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(null);
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        email: email || null,
        phone: phone || null,
        bio: bio || null,
        customStatus: customStatus || null,
        customStatusEmoji: null,
      });
      toast.success("Profil disimpan");
      setOpen(false);
    } catch {
      toast.error("Gagal menyimpan profil");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: session?.licenseKey, deviceId: getDeviceId() }),
      });
    } catch {
      // Continue anyway
    }
    logout();
    router.push("/");
  };

  if (!session) return null;

  return (
    <>
    <Popover open={open} onOpenChange={(o) => { if (!o && isCropLocked()) return; setOpen(o); }}>
      <PopoverTrigger render={children} />
      <PopoverContent className="w-72 p-0" align="end" sideOffset={8}>
        {/* User header */}
        <div className="flex items-center gap-3 p-4">
          <button
            type="button"
            onClick={handleAvatarPick}
            disabled={avatarUploading}
            aria-label="Ganti foto profil"
            className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border"
          >
            <Image
              src={profile.avatarUrl || generateDefaultAvatar(session.shortName, 80)}
              alt={session.shortName}
              width={40}
              height={40}
              unoptimized
              className="h-10 w-10 rounded-full object-cover"
            />
            <span
              className={`absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity ${
                avatarUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {avatarUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Camera className="h-4 w-4 text-white" />
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold truncate ${getRoleNameClass(resolveRole({ isAdmin: session.isAdmin, isTester: session.isTester, packageTier: session.packageTier }))}`}>{session.shortName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <code className="text-[10px] text-muted-foreground font-mono">
                {session.licenseKey.slice(0, 4)}***
              </code>
              {session.isAdmin && (
                <Badge variant="admin-outline" className="text-[9px] px-1 py-0">Admin</Badge>
              )}
              {session.packageTier === "diamond" && (
                <Badge variant="diamond-outline" className="text-[9px] px-1 py-0">Diamond</Badge>
              )}
              {session.packageTier === "vip" && (
                <Badge variant="vip-outline" className="text-[9px] px-1 py-0">VIP</Badge>
              )}
              {session.isTester && (
                <Badge variant="tester-outline" className="text-[9px] px-1 py-0">Tester</Badge>
              )}
            </div>
          </div>
        </div>

        {(profile.customStatus || profile.bio) && (
          <div className="px-4 pb-3 -mt-1 space-y-1">
            {profile.customStatus && (
              <p className="text-xs text-foreground/90 flex items-center gap-1.5">
                {profile.customStatusEmoji && <span>{profile.customStatusEmoji}</span>}
                <span className="truncate">{profile.customStatus}</span>
              </p>
            )}
            {profile.bio && (
              <p className="text-[11px] text-muted-foreground line-clamp-2">{profile.bio}</p>
            )}
          </div>
        )}

        <Separator />

        {/* Editable fields */}
        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="profile-email" className="text-xs">
              Email
            </Label>
            <Input
              id="profile-email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-phone" className="text-xs">
              No. HP
            </Label>
            <Input
              id="profile-phone"
              type="tel"
              placeholder="08xxxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-status" className="text-xs">
              Status
            </Label>
            <Input
              id="profile-status"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="lagi belajar UAS..."
              maxLength={80}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-bio" className="text-xs">
              Bio
            </Label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ceritakan sedikit tentang dirimu"
              maxLength={200}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <Button
            size="sm"
            className="w-full"
            onClick={handleSave}
            disabled={saving || avatarUploading}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Simpan
          </Button>
        </div>

        <Separator />

        {/* Logout */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </PopoverContent>
    </Popover>

    {/* Circular cropper (lazy). Portals above this popover; crop-lock keeps the
        popover open while cropping. */}
    <AnimatePresence>
      {pendingSrc && (
        <AvatarCropper
          src={pendingSrc}
          onApply={handleCropped}
          onCancel={handleCropCancel}
        />
      )}
    </AnimatePresence>
    </>
  );
}
