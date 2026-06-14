"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/components/providers/session-provider";
import { useProfile } from "@/hooks/use-profile";
import { CLASSES } from "@/lib/constants";
import { generateDefaultAvatar } from "@/lib/avatar";
import { resolveRole, getRoleNameClass } from "@/lib/role-colors";
import { toast } from "@/components/ui/toast";

interface UserProfilePopoverProps {
  children: React.ReactElement;
}

export function UserProfilePopover({ children }: UserProfilePopoverProps) {
  const router = useRouter();
  const { session, logout, updateSession } = useSession();
  const { profile, saving, updateProfile } = useProfile();
  const [open, setOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [bio, setBio] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [statusEmoji, setStatusEmoji] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when popover opens
  useEffect(() => {
    if (open) {
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setSelectedClass(session?.selectedClass || "");
      setBio(profile.bio || "");
      setCustomStatus(profile.customStatus || "");
      setStatusEmoji(profile.customStatusEmoji || "");
    }
  }, [open, profile, session?.selectedClass]);

  // Open from the chat self-preview "Edit profil" action (desktop sidebar).
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(APP_EVENTS.OPEN_PROFILE, onOpen);
    return () => window.removeEventListener(APP_EVENTS.OPEN_PROFILE, onOpen);
  }, []);

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    setAvatarUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      await updateProfile({ avatarUrl: url });
      toast.success("Foto profil diperbarui");
    } catch {
      toast.error("Gagal mengunggah foto");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        email: email || null,
        phone: phone || null,
        selectedClass,
        bio: bio || null,
        customStatus: customStatus || null,
        customStatusEmoji: statusEmoji || null,
      });

      // Update session class if changed
      if (selectedClass !== session?.selectedClass) {
        updateSession({ selectedClass });
      }

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
    <Popover open={open} onOpenChange={setOpen}>
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
              src={profile.avatarUrl || generateDefaultAvatar(session.name, 80)}
              alt={session.name}
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
            <p className={`text-sm font-semibold truncate ${getRoleNameClass(resolveRole({ isAdmin: session.isAdmin, isTester: session.isTester, packageTier: session.packageTier }))}`}>{session.name}</p>
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
              {(session.packageTier === "vip" || session.packageTier === "diamond") && (
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
            <Label htmlFor="profile-class" className="text-xs">
              Kelas
            </Label>
            <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v || "")}>
              <SelectTrigger id="profile-class" className="h-8 text-sm">
                <SelectValue placeholder="Pilih kelas" />
              </SelectTrigger>
              <SelectContent>
                {CLASSES.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <div className="flex gap-1.5">
              <Input
                value={statusEmoji}
                onChange={(e) => setStatusEmoji(e.target.value)}
                placeholder="🙂"
                maxLength={8}
                className="h-8 w-12 text-center text-sm"
                aria-label="Emoji status"
              />
              <Input
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="lagi belajar UAS..."
                maxLength={80}
                className="h-8 flex-1 text-sm"
                aria-label="Status"
              />
            </div>
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
  );
}
