import type { Metadata } from "next";
import Link from "next/link";

import { AccountPane } from "@/components/account/account-chrome";
import { UpgradeFlow, type UpgradeChoice } from "@/components/account/upgrade-flow";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { listAccountAccesses, type AccountAccess } from "@/lib/auth/account-access";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  PACKAGE_LABELS,
  computeUniqueAmount,
  packageMaxDevices,
  type PurchasablePackageId,
} from "@/lib/payments";
import { scopeLabel } from "@/lib/account/labels";
import { TIER_RANK, upgradeOptions } from "@/lib/upgrade";
import { tierBase } from "@/lib/exam/quota";
import { aiConversationLimit } from "@/lib/ai-limits";

export const metadata: Metadata = {
  title: "Naik paket",
  robots: { index: false, follow: false },
};

/**
 * What going up a tier actually changes, worked out from the same functions the
 * app enforces, so the page cannot promise a number the app does not give.
 * Claims the code does not back (a different AI model) are left out on purpose.
 */
function gainsFor(access: AccountAccess, to: PurchasablePackageId): UpgradeChoice["gains"] {
  const from = access.packageTier;
  const fromName = PACKAGE_LABELS[from];
  const out: UpgradeChoice["gains"] = [];
  const q0 = tierBase(false, from);
  const q1 = tierBase(false, to);
  if (q1 > q0) out.push({ text: `Latihan Soal ${q1}× per mata kuliah (${fromName}: ${q0}×)` });
  const d1 = packageMaxDevices(to);
  if (!access.unlimitedDevices && d1 > access.maxDevices) {
    out.push({ text: `Sampai ${d1} perangkat (sekarang ${access.maxDevices})` });
  }
  const a0 = aiConversationLimit(false, from);
  const a1 = aiConversationLimit(false, to);
  if (a1 > a0) out.push({ text: `${a1} percakapan AI tersimpan (${fromName}: ${a0})` });
  if (TIER_RANK[from] < TIER_RANK.vip) {
    out.push(
      { key: "pricing.feat_vip_lounge" },
      { key: "pricing.feat_dm" },
      { key: "pricing.feat_snippets" },
      { key: "pricing.feat_custom_accent" },
      { key: "pricing.feat_premium_fonts" }
    );
    if (to === "vip") out.push({ key: "pricing.feat_vip_badge" });
  }
  if (to === "diamond") out.push({ key: "pricing.feat_name_glow" }, { key: "pricing.feat_diamond_badge" });
  return out;
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</div>
      <Link
        href="/account/access"
        className="mt-5 inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Kembali ke Akses saya
      </Link>
    </div>
  );
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const account = await getOptionalAccount();
  if (!account) return null;
  const { key = "" } = await searchParams;
  const supabase = isSupabaseServerConfigured ? createServerClient()! : null;
  const accesses = supabase ? await listAccountAccesses(supabase, account.id) : [];
  const access = accesses.find((a) => a.licenseKey === key.trim().toUpperCase());

  let body: React.ReactNode;
  if (!access) {
    body = (
      <Notice title="Akses tidak ditemukan">
        Pilih akses yang mau dinaikkan dari halaman Akses saya.
      </Notice>
    );
  } else if (access.status !== "active") {
    body = (
      <Notice title="Akses ini sudah tidak aktif">
        Paket hanya bisa dinaikkan selama aksesnya masih berjalan. Untuk periode berikutnya, beli
        langsung paket yang kamu mau.
      </Notice>
    );
  } else if (access.isAdmin || upgradeOptions(access.packageTier).length === 0) {
    body = (
      <Notice title="Paketmu sudah yang tertinggi">
        {scopeLabel(access.scopeKey)} kamu sudah {PACKAGE_LABELS[access.packageTier]}.
      </Notice>
    );
  } else {
    const { data: open } = await supabase!
      .from("purchase_requests")
      .select("meta")
      .eq("license_key", access.licenseKey)
      .eq("package", "upgrade")
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    const waiting = (open?.meta as { toTier?: PurchasablePackageId } | null)?.toTier;
    if (open) {
      body = (
        <Notice title={`Pesanan naik ke ${waiting ? PACKAGE_LABELS[waiting] : "paket baru"} sedang diperiksa`}>
          Admin sedang mencocokkan pembayaranmu. Begitu disetujui, paketnya langsung naik dan kamu
          dapat kabar di aplikasi.
        </Notice>
      );
    } else {
      const choices: UpgradeChoice[] = upgradeOptions(access.packageTier).map((o) => ({
        to: o.to as UpgradeChoice["to"],
        label: PACKAGE_LABELS[o.to],
        price: o.price,
        amount: computeUniqueAmount(o.price, account.whatsapp),
        gains: gainsFor(access, o.to),
      }));
      body = (
        <UpgradeFlow
          licenseKey={access.licenseKey}
          currentLabel={`${scopeLabel(access.scopeKey)} · ${PACKAGE_LABELS[access.packageTier]}`}
          choices={choices}
        />
      );
    }
  }

  return (
    <AccountPane
      current="/account/access"
      title="Naik paket"
      description="Naikkan paket akses yang sedang berjalan, cukup bayar selisihnya."
    >
      {body}
    </AccountPane>
  );
}
