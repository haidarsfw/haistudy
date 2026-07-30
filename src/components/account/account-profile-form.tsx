"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Camera, Check, Loader2, Trash2, User } from "lucide-react";

// The same circular cropper the in-app profile uses. Lazy so react-easy-crop
// never reaches anyone who does not open it.
const AvatarCropper = dynamic(() => import("@/components/profile/avatar-cropper"), {
  ssr: false,
});

import { AuthField } from "@/components/account/auth-field";
import {
  NicknameAdornment,
  NicknameHint,
  useNicknameCheck,
} from "@/components/account/nickname-status";
import { NICKNAME_MAX } from "@/lib/account/nickname";
import { Dropdown } from "@/components/payments/fields/dropdown";
import { ANGKATAN_OPTIONS } from "@/data/landing/angkatan";
import { CAMPUS_OPTIONS, OTHER_LOCATION } from "@/data/landing/campus";
import { compressImageToBudget, heicToJpeg, isHeic } from "@/lib/image";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { refreshAccount } from "@/hooks/use-account";
import { toast } from "@/components/ui/toast";

export interface ProfileValues {
  fullName: string;
  nickname: string;
  whatsapp: string;
  campus: string;
  angkatan: string;
  avatarUrl: string | null;
}

// Photos here are avatars, never wallpaper. Anything past this is bytes nobody
// will ever see at 64 pixels wide.
const AVATAR_TARGET_BYTES = 300 * 1024;

/**
 * Data diri.
 *
 * These are exactly the fields checkout prefills, which is the entire point of
 * the account layer: fill them once and never type them again, however many
 * exam periods you buy.
 *
 * Kelas is deliberately absent. It changes every semester, so it belongs to a
 * purchase rather than to a person, and /payments owns it. Two places able to
 * write it would be two places that can disagree.
 */
export function AccountProfileForm({
  initial,
  nicknameChangesLeft,
}: {
  initial: ProfileValues;
  /** Renames still owed. Tops up by one every time they buy a period. */
  nicknameChangesLeft: number;
}) {
  const [values, setValues] = useState(initial);

  // The name as the server currently holds it, and what it costs to move away
  // from it. Both are tracked locally so the field tells the truth immediately
  // after a save — the props come from a server render that is not going to
  // happen again until the page is reloaded.
  const [savedNickname, setSavedNickname] = useState(initial.nickname);
  const [changesLeft, setChangesLeft] = useState(nicknameChangesLeft);
  const nickCheck = useNicknameCheck(savedNickname);

  // Locked only when they HAVE a name and no allowance left. Someone who has
  // never been to checkout has neither, and locking them out of a field they
  // have not filled in yet would be nonsense.
  const locked = Boolean(savedNickname) && changesLeft <= 0;
  // "Jatah ganti habis" was shown to people who had never renamed anything.
  // A Google signup arrives with a nickname taken from their Google name and a
  // budget of zero — the budget is only granted by a purchase — so the very
  // first visit accused them of spending an allowance they never had. The
  // wording now states the rule instead of a tally, which is true either way.
  const nicknameHint = !savedNickname
    ? "Maksimal dua kata, huruf saja"
    : locked
      ? "Bisa diganti sekali tiap beli akses. Butuh ganti sekarang? Hubungi admin"
      : `Bisa diganti ${changesLeft}x lagi`;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The same locations checkout offers, plus its "Lainnya" escape. This used to
  // read a separate CAMPUSES list ending in the literal "Other", a token no
  // other screen understands: picking it stored "Other", and the next checkout
  // matched it against neither the location list nor "Lainnya" and silently
  // blanked the field. A campus already on the account is always kept as an
  // option too, so an existing value can never render as an empty dropdown.
  const campusOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const c of CAMPUS_OPTIONS) {
      for (const loc of c.locations) {
        if (seen.has(loc)) continue;
        seen.add(loc);
        opts.push({ value: loc, label: loc });
      }
    }
    if (values.campus && !seen.has(values.campus) && values.campus !== OTHER_LOCATION) {
      opts.push({ value: values.campus, label: values.campus });
    }
    opts.push({ value: OTHER_LOCATION, label: OTHER_LOCATION });
    return opts;
  }, [values.campus]);

  const set = <K extends keyof ProfileValues>(k: K, v: ProfileValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setSaved(false);
  };

  const dirty =
    values.fullName !== initial.fullName ||
    values.nickname !== initial.nickname ||
    values.whatsapp !== initial.whatsapp ||
    values.campus !== initial.campus ||
    values.angkatan !== initial.angkatan;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setErrors({});

    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // The nickname is sent ONLY when it actually changed. Sending it
        // always meant an account whose nickname is still blank — every
        // e-mail+password signup — failed the whole save on a field the person
        // had not touched, taking their name and WhatsApp down with it.
        body: JSON.stringify({
          fullName: values.fullName,
          ...(values.nickname !== savedNickname ? { nickname: values.nickname } : {}),
          whatsapp: values.whatsapp,
          campus: values.campus,
          angkatan: values.angkatan,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        fields?: Record<string, string>;
      };

      if (!res.ok || !data.ok) {
        if (data.fields) setErrors(data.fields);
        else toast.error(data.error ?? "Gagal menyimpan");
        return;
      }

      // A rename actually went through, so the allowance is one lower and the
      // new name is the one to measure the next edit against.
      if (values.nickname.toLowerCase() !== savedNickname.toLowerCase()) {
        setChangesLeft((n) => Math.max(0, n - 1));
        setSavedNickname(values.nickname);
        nickCheck.reset();
      }

      setSaved(true);
      // The header greets people by nickname, so it has to catch up.
      refreshAccount();
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Step one of two: normalise the file and hand it to the cropper.
   *
   * Uploading the raw photo straight through is what produced avatars framed
   * on somebody's shoulder — a phone photo is portrait and the avatar is a
   * circle, so without a crop step the browser picks the middle and hopes.
   */
  const pickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      // iPhones hand over HEIC, which nothing else can display.
      const normalised = isHeic(file) ? await heicToJpeg(file) : file;
      setCropSrc(URL.createObjectURL(normalised));
    } catch {
      toast.error("Gagal membaca foto. Coba foto lain.");
    }
  };

  /** Step two: the cropped circle comes back, gets shrunk, and is stored. */
  const applyCrop = async (blob: Blob) => {
    closeCropper();
    setUploading(true);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const small = await compressImageToBudget(file, { maxBytes: AVATAR_TARGET_BYTES });
      const url = await uploadToCloudinary(small);
      if (!url) throw new Error("upload failed");

      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (!res.ok) throw new Error("save failed");

      set("avatarUrl", url);
      refreshAccount();
      // The photo is stored the moment it is cropped — it does not wait for
      // the Simpan button, which is why that button stays disabled afterwards.
      // Without saying so, a silent success looks exactly like a failure.
      toast.success("Foto profil tersimpan");
    } catch {
      toast.error("Gagal mengunggah foto. Coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  const closeCropper = () => {
    setCropSrc((src) => {
      // The object URL is ours to release; leaving it pins the whole file in
      // memory for as long as the tab lives.
      if (src) URL.revokeObjectURL(src);
      return null;
    });
  };

  const removeAvatar = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: "" }),
      });
      if (!res.ok) throw new Error();
      set("avatarUrl", null);
      refreshAccount();
      toast.success("Foto profil dihapus");
    } catch {
      toast.error("Gagal menghapus foto. Coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={save} className="rounded-2xl border border-border bg-card p-5" noValidate>
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
            {values.avatarUrl ? (
              <Image
                src={values.avatarUrl}
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <User className="h-7 w-7" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Ganti foto profil"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={pickAvatar}
            className="hidden"
          />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Foto profil</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Dipakai di komunitas kelas. Opsional.
          </p>
          {values.avatarUrl && (
            <button
              type="button"
              onClick={removeAvatar}
              disabled={uploading}
              className="mt-1.5 inline-flex items-center gap-1 rounded text-xs text-destructive underline-offset-4 hover:underline disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Hapus foto
            </button>
          )}
        </div>
      </div>

      {cropSrc && (
        <AvatarCropper src={cropSrc} onCancel={closeCropper} onApply={applyCrop} />
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <AuthField
            id="acc-fullname"
            label="Nama lengkap"
            value={values.fullName}
            onChange={(v) => set("fullName", v)}
            placeholder="Nama asli sesuai data kampus"
            hint="Nama asli, bukan nama akun"
            autoComplete="name"
            error={errors.fullName}
            maxLength={100}
          />
        </div>

        {/* The one field here with a budget on it. Everyone in the class knows
            this person by it, so it is not free to change — but it is never
            frozen either, because a typo made at a first checkout should not
            follow someone around for a year. */}
        <div className="flex flex-col gap-1.5">
          <AuthField
            id="acc-nickname"
            label="Panggilan"
            value={values.nickname}
            onChange={(v) => {
              set("nickname", v);
              nickCheck.check(v);
            }}
            placeholder="Nama panggilanmu"
            hint={nicknameHint}
            error={errors.nickname}
            maxLength={NICKNAME_MAX}
            disabled={locked}
            trailing={<NicknameAdornment state={nickCheck.state} />}
          />
          <NicknameHint
            state={nickCheck.state}
            reason={nickCheck.reason}
            suggestions={nickCheck.suggestions}
            onPick={(v) => {
              set("nickname", v);
              nickCheck.check(v);
            }}
          />
        </div>

        <AuthField
          id="acc-whatsapp"
          label="WhatsApp"
          value={values.whatsapp}
          onChange={(v) => set("whatsapp", v)}
          placeholder="08..."
          autoComplete="tel"
          hint="Untuk konfirmasi pembayaran"
          error={errors.whatsapp}
          maxLength={30}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="acc-campus" className="text-xs font-medium text-muted-foreground">
            Kampus
          </label>
          <Dropdown
            id="acc-campus"
            value={values.campus}
            onChange={(v) => set("campus", v)}
            options={campusOptions}
            placeholder="Pilih kampus"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="acc-angkatan" className="text-xs font-medium text-muted-foreground">
              Angkatan
            </label>
            <span className="text-[11px] text-muted-foreground/70">Tetap tiap semester</span>
          </div>
          {/* A list, not a text box: typed by hand the same intake arrives as
              B29, b29 and "angkatan 29", and nothing can group those later. */}
          <Dropdown
            id="acc-angkatan"
            value={values.angkatan}
            onChange={(v) => set("angkatan", v)}
            options={ANGKATAN_OPTIONS.map((a) => ({ value: a, label: a }))}
            placeholder="Pilih angkatan"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !dirty}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {saved && !dirty && (
          <span className="inline-flex items-center gap-1.5 text-sm text-primary">
            <Check className="h-4 w-4" />
            Tersimpan
          </span>
        )}
      </div>
    </form>
  );
}
