export type UserRole = "admin" | "vip" | "diamond" | "tester" | "normal";

export const ROLE_COLORS: Record<
  UserRole,
  {
    text: string;
    border: string;
    bg: string;
    label: string;
  }
> = {
  admin: {
    text: "text-red-500 dark:text-red-400",
    border: "border-red-500/60 dark:border-red-400/50",
    bg: "bg-red-500/5",
    label: "Admin",
  },
  vip: {
    text: "text-amber-500 dark:text-amber-300",
    border: "border-amber-400/60 dark:border-amber-300/50",
    bg: "bg-amber-500/5",
    label: "VIP",
  },
  diamond: {
    text: "text-sky-500 dark:text-sky-300",
    border: "border-sky-400/70 dark:border-sky-300/60",
    bg: "bg-sky-500/5",
    label: "Diamond",
  },
  tester: {
    text: "text-emerald-500 dark:text-emerald-400",
    border: "border-emerald-500/60 dark:border-emerald-400/50",
    bg: "bg-emerald-500/5",
    label: "Tester",
  },
  normal: {
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-500/50 dark:border-slate-400/40",
    bg: "bg-slate-500/5",
    label: "Normal",
  },
};

export function resolveRole(flags: {
  isAdmin?: boolean | null;
  isTester?: boolean | null;
  packageTier?: "share" | "normal" | "vip" | "diamond" | null;
}): UserRole {
  if (flags.isAdmin) return "admin";
  if (flags.packageTier === "diamond") return "diamond";
  if (flags.packageTier === "vip") return "vip";
  if (flags.isTester) return "tester";
  return "normal";
}

export function getRoleTextClass(role: UserRole): string {
  return ROLE_COLORS[role].text;
}
