"use client";

import { useState, useEffect } from "react";
import { LogOut, Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

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

  // Sync form state when popover opens
  useEffect(() => {
    if (open) {
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setSelectedClass(session?.selectedClass || "");
    }
  }, [open, profile, session?.selectedClass]);

  const handleSave = async () => {
    try {
      await updateProfile({
        email: email || null,
        phone: phone || null,
        selectedClass,
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
        body: JSON.stringify({ licenseKey: session?.licenseKey }),
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
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
            {session.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{session.name}</p>
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

          <Button
            size="sm"
            className="w-full"
            onClick={handleSave}
            disabled={saving}
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
