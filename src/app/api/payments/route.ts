import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { scopeColumns } from "@/lib/auth/scope-check";
import { parseScopeKey, isPurchasableScope, scopeKey, scopeFullLabel } from "@/lib/scope";
import { rateLimit } from "@/lib/support/server";
import { PACKAGE_LABELS, computeUniqueAmount, effectiveBasePrice, formatIDR, type PurchasablePackageId } from "@/lib/payments";
import {
  availableDiscounts,
  consumeRefereeDiscount,
  spendReferralBalance,
} from "@/lib/referral/rewards";
import { consumeFeedbackDiscount } from "@/lib/referral/feedback-discount";
import { classDiscountFor } from "@/lib/referral/class-discount";
import {
  pickBestDiscount,
  type DiscountOption,
} from "@/lib/referral/discount-pricing";
import { recordActivity } from "@/lib/admin/activity";
import { notifyAdminsOnPurchase } from "@/lib/notifications/purchase-alert";
import { sendPurchaseInvoiceEmail } from "@/lib/notifications/email";
import { verifyUrl } from "@/lib/notifications/account-email";
import { normalizeNickname, validateNickname } from "@/lib/account/nickname";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { firstWord, capitalizeFirst } from "@/lib/name";
import { AccountError } from "@/lib/auth/account";
import { requireAccount } from "@/lib/auth/account-session";

// ─── POST /api/payments - on-site purchase submission (signed in) ───
// multipart/form-data.
//
// The buyer must have an account. Access lands on that account, so identity is
// read from the session rather than from the payload — a forged body cannot
// attach a purchase to an address the sender does not own. Credentials are no
// longer created here at all: the account already exists by the time anyone
// reaches this route.
//
// scope-exempt: they are buying access TO a scope, not acting inside one, so
// there is no hs-scope cookie to require. Scope comes from the submitted value
// and is validated against isPurchasableScope() below (mirrors
// /api/webhooks/purchase). Every row written still carries scopeColumns(scope),
// so nothing lands unscoped.
//
// Activation stays MANUAL: admin verifies in the Purchase Queue, then approves.

const ALLOWED_PACKAGES = new Set<PurchasablePackageId>(["share", "normal", "vip", "diamond"]);
const ALLOWED_METHODS = new Set(["bca", "ewallet", "qris"]);
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // server cap (client compresses to <500KB)

function getStr(fd: FormData, key: string, max: number): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function asUpload(v: FormDataEntryValue | null): Blob | null {
  if (
    v &&
    typeof v === "object" &&
    "arrayBuffer" in v &&
    typeof (v as Blob).size === "number" &&
    (v as Blob).size > 0
  ) {
    return v as Blob;
  }
  return null;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  try {
    // Rate limit: 5 submissions / 10 min / IP.
    const ip = clientIp(request);
    if (!rateLimit(`payments:${ip}`, 10 * 60_000, 5)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
    }

    // Who is buying. From the session, never from the payload.
    const account = await requireAccount();
    const email = account.email;

    const fd = await request.formData();

    const name = getStr(fd, "name", 100);
    const nickname = getStr(fd, "nickname", 24);
    const whatsapp = getStr(fd, "whatsapp", 30);
    const pkg = getStr(fd, "package", 20) as PurchasablePackageId;
    const scopeRaw = getStr(fd, "scope", 24);
    const classCode = getStr(fd, "classCode", 60);
    const campus = getStr(fd, "campus", 60);
    const university = getStr(fd, "university", 20);
    const angkatan = getStr(fd, "angkatan", 16);
    const deviceLimitRaw = parseInt(getStr(fd, "deviceLimit", 3) || "2", 10);
    const paymentMethod = getStr(fd, "paymentMethod", 20);
    const source = getStr(fd, "source", 80);
    const shareMethod = getStr(fd, "shareMethod", 12);

    // ── Validation ──
    if (!name || whatsapp.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Nama dan WhatsApp wajib diisi." }, { status: 400 });
    }
    // The name everyone else sees. One word, letters and digits, and nobody
    // else's. The browser checks all of this too; this is the copy that counts,
    // because a form can be skipped entirely.
    const cleanNickname = normalizeNickname(nickname);
    const nicknameProblem = validateNickname(cleanNickname);
    if (nicknameProblem) {
      return NextResponse.json({ error: `Nama panggilan: ${nicknameProblem}.` }, { status: 400 });
    }
    if (!ALLOWED_PACKAGES.has(pkg)) {
      return NextResponse.json({ error: "Paket tidak valid." }, { status: 400 });
    }
    if (!ALLOWED_METHODS.has(paymentMethod)) {
      return NextResponse.json({ error: "Metode pembayaran tidak valid." }, { status: 400 });
    }
    if (!classCode || !campus || !source || !angkatan) {
      return NextResponse.json({ error: "Lengkapi semua field wajib." }, { status: 400 });
    }

    const deviceLimit = Number.isFinite(deviceLimitRaw) ? Math.min(3, Math.max(1, deviceLimitRaw)) : 2;

    // Purchasable, not merely known: a period that exists but has no material
    // in it must not be sellable even to a hand-crafted request. The picker
    // greys those out; this is the half that cannot be edited from a browser.
    const scope = parseScopeKey(scopeRaw);
    if (!scope || !isPurchasableScope(scope)) {
      return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
    }
    const sk = scopeKey(scope);

    // ── Files ──
    const paymentProof = asUpload(fd.get("paymentProof"));
    const shareProof = asUpload(fd.get("shareProof"));
    const shareProof2 = asUpload(fd.get("shareProof2"));
    if (!paymentProof) {
      return NextResponse.json({ error: "Bukti pembayaran wajib diunggah." }, { status: 400 });
    }
    if (pkg === "share" && !shareProof) {
      return NextResponse.json({ error: "Bukti share wajib diunggah." }, { status: 400 });
    }
    if (pkg === "share" && shareMethod !== "broadcast" && shareMethod !== "story") {
      return NextResponse.json({ error: "Metode berbagi tidak valid." }, { status: 400 });
    }
    for (const f of [paymentProof, shareProof, shareProof2]) {
      if (!f) continue;
      if (f.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "Ukuran file terlalu besar." }, { status: 400 });
      }
      if (!(f.type || "").startsWith("image/")) {
        return NextResponse.json({ error: "File harus berupa gambar." }, { status: 400 });
      }
    }

    const listPrice = effectiveBasePrice(pkg);

    // Dev mode (no Supabase): accept as a no-op success.
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true, id: crypto.randomUUID() });
    }

    const supabase = createServerClient()!;

    // Priced HERE, never taken from the browser. The unique transfer amount is
    // what the admin matches the incoming payment against, so a client that
    // could name its own discount could name its own price.
    //
    // Discounts do not stack: the largest is applied and the rest are left
    // untouched, still spendable next period.
    const accountDiscounts = await availableDiscounts(supabase, account, listPrice);
    // The class promo is evaluated here rather than in availableDiscounts
    // because it depends on the order, not the account: which class was typed,
    // which period is being bought, which package. Same two pure functions the
    // checkout screen ran, so the two cannot name a different winner.
    const { option: classOption, promoClass } = await classDiscountFor(
      supabase,
      scope,
      classCode,
      pkg,
      listPrice
    );

    // The second broadcast proof is the promo class's side of the bargain, so
    // it is required exactly when the promo applies. It used to be pinned to
    // the string "LE86", which would have kept demanding it of a class that no
    // longer gets anything.
    if (pkg === "share" && shareMethod === "broadcast" && promoClass && !shareProof2) {
      return NextResponse.json(
        { error: "Bukti broadcast kedua wajib untuk kelas yang dapat promo." },
        { status: 400 }
      );
    }

    const { best: discountUsed, amount: discountApplied } = pickBestDiscount(
      [accountDiscounts.best, ...accountDiscounts.others, classOption].filter(
        Boolean
      ) as DiscountOption[],
      listPrice
    );
    const discount = discountApplied;
    const basePrice = Math.max(0, listPrice - discount);
    const uniqueAmount = computeUniqueAmount(basePrice, whatsapp);

    // Whatever the buyer just filled in that their account did not already
    // hold gets written back, so the next purchase asks for none of it. Fields
    // the account already had arrive unchanged, making this a no-op for a
    // returning buyer. Class is included deliberately: it changes every
    // semester and is only kept to prefill the next checkout.
    //
    // Checked BEFORE the order is written. If the nickname were saved after,
    // a clash would leave a paid order attached to a name the account does not
    // actually carry — and the buyer would never be told.
    const { error: profileErr } = await supabase
      .from("accounts")
      .update({
        full_name: name,
        nickname: cleanNickname,
        whatsapp,
        campus,
        angkatan: angkatan.toUpperCase(),
        class_code: classCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (profileErr) {
      // 23505 = someone claimed the name between the live check and this
      // submit. Rare, and worth naming precisely: "server error" would send
      // them looking in the wrong place.
      if (profileErr.code === "23505") {
        return NextResponse.json(
          {
            error: `Nama panggilan "${cleanNickname}" baru saja dipakai orang lain. Ganti sedikit lalu kirim lagi.`,
            field: "nickname",
          },
          { status: 409 }
        );
      }
      throw profileErr;
    }

    // Upload proofs to the PRIVATE payment-proofs bucket (service_role).
    const uploadOne = async (blob: Blob, suffix: string): Promise<string> => {
      const path = `${sk}/${crypto.randomUUID()}-${suffix}.jpg`;
      const buffer = Buffer.from(await blob.arrayBuffer());
      const { error } = await supabase.storage
        .from("payment-proofs")
        .upload(path, buffer, { contentType: blob.type || "image/jpeg", upsert: false });
      if (error) throw error;
      return path;
    };

    const paymentPath = await uploadOne(paymentProof, "pay");
    const sharePath = shareProof ? await uploadOne(shareProof, "share") : null;
    const sharePath2 = shareProof2 ? await uploadOne(shareProof2, "share2") : null;

    // Invoice number is assigned at APPROVE (admin Purchase Queue), not here, so
    // unverified / rejected submissions never burn a number. See the PATCH
    // handler in /api/admin/purchase (calls next_scope_invoice → meta.orderNo).

    const meta = {
      classCode,
      campus,
      ...(university ? { university } : {}),
      angkatan: angkatan.toUpperCase(),
      deviceLimit,
      paymentMethod,
      uniqueAmount,
      basePrice,
      source,
      // How the buyer signs in, carried for the admin's approval message. It
      // describes an account that already exists rather than one to be made.
      loginMethod: account.authProvider,
      loginEmail: account.emailLower,
      scopeKey: sk,
      nickname: cleanNickname,
      ...(pkg === "share" ? { shareMethod } : {}),
    };

    const { data: inserted, error: insErr } = await supabase
      .from("purchase_requests")
      .insert({
        name,
        whatsapp,
        email,
        // The link that makes approval trivial: the admin no longer has to
        // match an address by hand, and no credentials have to be parked
        // anywhere waiting to be moved.
        account_id: account.id,
        package: pkg,
        status: "pending",
        ...scopeColumns(scope),
        meta,
        payment_proof_path: paymentPath,
        share_proof_path: sharePath,
        share_proof_path_2: sharePath2,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // Spent only once the order exists, and only the ONE that was applied.
    // Marked here rather than at approval because the discount is already
    // baked into the amount they were told to transfer, so a second order must
    // not quote it again. Whatever lost the comparison is deliberately left
    // alone — it is still theirs next period.
    if (discountUsed?.id === "referee") {
      await consumeRefereeDiscount(supabase, account.id, discount);
    } else if (discountUsed?.id === "referral_balance") {
      await spendReferralBalance(
        supabase,
        account.id,
        discount,
        inserted.id as string
      );
    } else if (discountUsed?.id === "feedback") {
      await consumeFeedbackDiscount(
        supabase,
        account.emailLower,
        account.id,
        discount
      );
    }

    // Audit → admin Activity Logs (low-freq, high-value student event).
    await recordActivity(supabase, {
      action: "purchase_request",
      userName: name,
      details: `${PACKAGE_LABELS[pkg] ?? pkg} • ${scopeFullLabel(scope)}`,
      ip: clientIp(request),
      scope,
    });

    // Background: alert admins (push + email). Never blocks the buyer response.
    waitUntil(
      notifyAdminsOnPurchase({
        requestId: (inserted?.id as string) ?? null,
        name,
        packageLabel: PACKAGE_LABELS[pkg] ?? pkg,
        uniqueAmount,
        scopeLabel: scopeFullLabel(scope),
        whatsapp,
        loginMethod: account.authProvider,
      }).catch((e) => console.error("[payments] admin alert failed", e))
    );

    // Background: email the buyer their invoice (received & verifying). /payments only.
    //
    // An unconfirmed address gets a fresh confirmation link folded into the
    // invoice. The invoice is the mail they are certain to open, and it lands
    // in the same inbox as the link they need — sending them hunting for an
    // older message would put the friction in the worst possible place. The
    // token is minted here rather than reusing an old one because an old one
    // may well have expired by now.
    if (email) {
      waitUntil(
        (async () => {
          let verifyLink: string | null = null;
          if (!account.emailVerifiedAt) {
            try {
              const token = await issueAccountToken(
                supabase,
                account.id,
                "verify",
                clientIp(request)
              );
              verifyLink = verifyUrl(token);
            } catch (e) {
              // A missing link must never cost the buyer their invoice.
              console.error("[payments] verify token for invoice failed", e);
            }
          }
          await sendPurchaseInvoiceEmail({
            to: email,
            buyerName: capitalizeFirst(cleanNickname || firstWord(name)),
            scopeLabel: scopeFullLabel(scope),
            packageLabel: PACKAGE_LABELS[pkg] ?? pkg,
            amount: formatIDR(uniqueAmount),
            whatsapp,
            loginMethod: account.authProvider,
            verifyUrl: verifyLink,
          });
        })().catch((e) => console.error("[payments] buyer invoice email failed", e))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Signed out mid-checkout: say so plainly so the form can send them to
    // sign in again rather than showing a generic server error.
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Payments POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
