import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope } from "@/lib/auth/admin-scope";
import { ScopeError } from "@/lib/auth/scope-check";
import type { PurchaseRequest, PurchaseMeta } from "@/types";

function scopeErrorResponse(error: unknown) {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Response) return error;
  return null;
}

// ─── Mock store ───
const mockPurchases = new Map<string, PurchaseRequest>();

// Seed
if (mockPurchases.size === 0) {
  const id1 = crypto.randomUUID();
  const id2 = crypto.randomUUID();
  mockPurchases.set(id1, {
    id: id1,
    name: "Ahmad Farhan",
    whatsapp: "081234567890",
    email: "ahmad@binus.ac.id",
    package: "discount",
    status: "pending",
    licenseKey: null,
    approvedAt: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    semester: 2,
    examPeriod: "uts",
    jurusan: "bm",
  });
  mockPurchases.set(id2, {
    id: id2,
    name: "Dewi Lestari",
    whatsapp: "082345678901",
    email: null,
    package: "normal",
    status: "pending",
    licenseKey: null,
    approvedAt: null,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    semester: 2,
    examPeriod: "uts",
    jurusan: "bm",
  });
}

function mapRow(row: Record<string, unknown>): PurchaseRequest {
  return {
    id: row.id as string,
    name: row.name as string,
    whatsapp: row.whatsapp as string,
    email: (row.email as string) || null,
    package: row.package as PurchaseRequest["package"],
    status: row.status as "pending" | "approved" | "rejected",
    licenseKey: (row.license_key as string) || null,
    approvedAt: (row.approved_at as string) || null,
    createdAt: row.created_at as string,
    semester: (row.semester as number) ?? 2,
    examPeriod: (row.exam_period as "uts" | "uas") ?? "uts",
    jurusan: (row.jurusan as string) ?? "bm",
    meta: (row.meta as PurchaseMeta) ?? undefined,
    paymentProofUrl: null,
    shareProofUrl: null,
    shareProofUrl2: null,
  };
}

// Build short-lived signed URLs for the private payment-proofs bucket so the
// admin can preview proofs without making the bucket public.
async function signProofs(
  supabase: ReturnType<typeof createServerClient>,
  rows: Record<string, unknown>[]
): Promise<PurchaseRequest[]> {
  return Promise.all(
    rows.map(async (row) => {
      const pr = mapRow(row);
      if (!supabase) return pr;
      const payPath = (row.payment_proof_path as string) || null;
      const sharePath = (row.share_proof_path as string) || null;
      if (payPath) {
        const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(payPath, 3600);
        pr.paymentProofUrl = data?.signedUrl ?? null;
      }
      if (sharePath) {
        const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(sharePath, 3600);
        pr.shareProofUrl = data?.signedUrl ?? null;
      }
      const sharePath2 = (row.share_proof_path_2 as string) || null;
      if (sharePath2) {
        const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(sharePath2, 3600);
        pr.shareProofUrl2 = data?.signedUrl ?? null;
      }
      return pr;
    })
  );
}

// ─── GET /api/admin/purchase?status=pending&scope=...|allPeriods=1 ───
export async function GET(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const wantPendingCount = searchParams.get("count") === "pending";

    if (!isSupabaseServerConfigured) {
      let purchases = Array.from(mockPurchases.values());
      if (resolved.mode === "scoped") {
        purchases = purchases.filter(
          (p) =>
            p.semester === resolved.scope.semester &&
            p.examPeriod === resolved.scope.examPeriod &&
            p.jurusan === resolved.scope.jurusan
        );
      }
      if (wantPendingCount) {
        return NextResponse.json({
          pendingCount: purchases.filter((p) => p.status === "pending").length,
        });
      }
      if (status) {
        purchases = purchases.filter((p) => p.status === status);
      }
      purchases.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return NextResponse.json({ purchases });
    }

    // Lightweight pending-count (red-dot badge) — head query, no rows fetched.
    if (wantPendingCount) {
      const supabase = createServerClient()!;
      let cq = supabase
        .from("purchase_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (resolved.mode === "scoped") {
        cq = cq
          .eq("semester", resolved.scope.semester)
          .eq("exam_period", resolved.scope.examPeriod)
          .eq("jurusan", resolved.scope.jurusan);
      }
      const { count, error: cErr } = await cq;
      if (cErr) throw cErr;
      return NextResponse.json({ pendingCount: count ?? 0 });
    }

    const supabase = createServerClient()!;
    let query = supabase
      .from("purchase_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (resolved.mode === "scoped") {
      query = query
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const purchases = await signProofs(supabase, (data || []) as Record<string, unknown>[]);
    return NextResponse.json({ purchases });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin purchase GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/purchase - Approve or reject ───
export async function PATCH(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);

    const body = await request.json();
    const { id, status, licenseKey } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (!isSupabaseServerConfigured) {
      const purchase = mockPurchases.get(id);
      if (!purchase) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (
        resolved.mode === "scoped" &&
        (purchase.semester !== resolved.scope.semester ||
          purchase.examPeriod !== resolved.scope.examPeriod ||
          purchase.jurusan !== resolved.scope.jurusan)
      ) {
        return NextResponse.json({ error: "Purchase tidak ada di scope ini" }, { status: 404 });
      }
      purchase.status = status;
      if (status === "approved") {
        purchase.licenseKey = licenseKey || null;
        purchase.approvedAt = now;
      }
      return NextResponse.json({ purchase });
    }

    const supabase = createServerClient()!;
    const updates: Record<string, unknown> = { status };
    if (status === "approved") {
      // Only set license_key when one is provided (access-purchase flow passes
      // the freshly-minted key). For exam-quota top-ups the body has NO licenseKey
      // and the row already carries the buyer's key — overwriting it with null
      // here was nulling the grant target so the quota was never added.
      if (licenseKey) updates.license_key = licenseKey;
      updates.approved_at = now;
    }

    let q = supabase
      .from("purchase_requests")
      .update(updates)
      .eq("id", id);
    if (resolved.mode === "scoped") {
      q = q
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }
    const { data, error } = await q.select().single();

    if (error) throw error;

    // ── Exam-quota top-up (package='exam_quota'): on approval, add the bought
    // attempts as bonus credits + send an in-app confirmation. Skips the invoice
    // counter + contact propagation (those are for access purchases). ──
    const meta0 = (data?.meta as PurchaseMeta) ?? {};
    if (status === "approved" && data && meta0.kind === "exam_quota") {
      const lk = (data.license_key as string) || "";
      const sk = meta0.scopeKey || "";
      const subjectId = meta0.subjectId || "";
      const qty = Number(meta0.quotaQty) || 0;
      if (lk && sk && subjectId && qty > 0) {
        const { data: ov } = await supabase
          .from("exam_quota_overrides")
          .select("bonus")
          .eq("license_key", lk)
          .eq("scope_key", sk)
          .eq("subject_id", subjectId)
          .maybeSingle();
        const newBonus = Math.max(0, ((ov?.bonus as number) ?? 0) + qty);
        const { error: ovErr } = await supabase.from("exam_quota_overrides").upsert(
          {
            license_key: lk,
            scope_key: sk,
            subject_id: subjectId,
            bonus: newBonus,
            updated_at: now,
            updated_by: "purchase-approve",
          },
          { onConflict: "license_key,scope_key,subject_id" }
        );
        if (ovErr) throw ovErr;

        // In-app confirmation (scoped → realtime delivery + bell). Opens the
        // subject's Latihan Soal tab when tapped (context=system + subject_id).
        await supabase.from("notifications").insert({
          license_key: lk,
          type: "exam_quota",
          sender_name: "HaiStudy",
          preview: `Top-up ${qty} kuota latihan untuk ${meta0.subjectName || subjectId} berhasil ditambahkan. Selamat berlatih!`,
          context: "system",
          subject_id: subjectId,
          thread_title: "Kuota latihan ditambahkan",
          semester: data.semester,
          exam_period: data.exam_period,
          jurusan: data.jurusan,
        });
      }
      return NextResponse.json({ purchase: mapRow(data) });
    }

    // Assign the per-scope invoice number at APPROVAL (not at submit), so
    // unverified / rejected orders never burn a number. Idempotent: only assign
    // when meta.orderNo is missing, so re-approving keeps the same invoice #.
    // next_scope_invoice() does value+1 RETURNING value (gap-free per scope).
    if (status === "approved" && data) {
      const existingMeta = (data.meta as PurchaseMeta) ?? {};
      if (existingMeta.orderNo == null) {
        const { data: nextNo, error: ctrErr } = await supabase.rpc("next_scope_invoice", {
          p_sem: data.semester,
          p_exam: data.exam_period,
          p_jur: data.jurusan,
        });
        if (ctrErr) throw ctrErr;
        const orderNo = (nextNo as number) ?? 1;
        const newMeta = { ...existingMeta, orderNo };
        const { data: metaRow, error: metaErr } = await supabase
          .from("purchase_requests")
          .update({ meta: newMeta })
          .eq("id", id)
          .select()
          .single();
        if (metaErr) throw metaErr;
        if (metaRow) Object.assign(data, metaRow);
      }
    }

    // On approval, propagate the buyer's contact info to their account so the
    // post-tutorial "Stay Connected" modal can auto-fill (and skip). Only fill
    // fields not already set — never clobber a value the user chose themselves.
    if (status === "approved" && data?.license_key) {
      const lk = data.license_key as string;
      const phone = (data.whatsapp as string) || null;
      const contactEmail = (data.email as string) || null;
      if (phone || contactEmail) {
        const { data: existing } = await supabase
          .from("user_profiles")
          .select("phone, email")
          .eq("license_key", lk)
          .maybeSingle();
        const patch: Record<string, unknown> = { license_key: lk };
        if (phone && !existing?.phone) patch.phone = phone;
        if (contactEmail && !existing?.email) patch.email = contactEmail;
        if (Object.keys(patch).length > 1) {
          const { error: pErr } = await supabase
            .from("user_profiles")
            .upsert(patch, { onConflict: "license_key" });
          if (pErr) console.error("[purchase] profile contact propagate failed", pErr);
        }
      }
    }

    return NextResponse.json({ purchase: mapRow(data) });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin purchase PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/purchase ───
// Body: { id }                  → delete one order (UI exposes this on rejected rows).
//       { action: "clearAll" }  → wipe EVERY order in the resolved scope (Danger Zone).
// Both remove the private proof images from storage before deleting the rows.
export async function DELETE(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);
    const body = await request.json().catch(() => ({}));
    const { id, action, revokeKey } = body as {
      id?: string;
      action?: string;
      revokeKey?: boolean;
    };
    const clearAll = action === "clearAll";

    if (!clearAll && !id) {
      return NextResponse.json({ error: "id or action required" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      if (clearAll) {
        for (const [key, p] of Array.from(mockPurchases.entries())) {
          if (
            resolved.mode === "scoped" &&
            (p.semester !== resolved.scope.semester ||
              p.examPeriod !== resolved.scope.examPeriod ||
              p.jurusan !== resolved.scope.jurusan)
          )
            continue;
          mockPurchases.delete(key);
        }
        return NextResponse.json({ success: true });
      }
      if (id) mockPurchases.delete(id);
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    // Strip the private proof images for the given rows (chunked — storage.remove
    // caps the payload, so big wipes can't exceed it).
    const removeProofs = async (rows: Record<string, unknown>[]) => {
      const paths = rows
        .flatMap((r) => [
          r.payment_proof_path as string | null,
          r.share_proof_path as string | null,
          r.share_proof_path_2 as string | null,
        ])
        .filter((p): p is string => !!p);
      for (let i = 0; i < paths.length; i += 100) {
        const chunk = paths.slice(i, i + 100);
        if (chunk.length) await supabase.storage.from("payment-proofs").remove(chunk);
      }
    };

    if (clearAll) {
      // Wiping every order is a per-period reset — refuse the "All periods" view.
      if (resolved.mode !== "scoped") {
        return NextResponse.json(
          { error: "Pilih satu periode (bukan Semua) untuk menghapus semua order." },
          { status: 400 }
        );
      }
      const { data: rows, error: selErr } = await supabase
        .from("purchase_requests")
        .select("payment_proof_path, share_proof_path, share_proof_path_2")
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
      if (selErr) throw selErr;
      await removeProofs((rows || []) as Record<string, unknown>[]);
      const { error: delErr } = await supabase
        .from("purchase_requests")
        .delete()
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
      if (delErr) throw delErr;
      // Wiping all orders also resets the per-scope invoice counter to #001.
      await supabase.from("scope_invoice_counter").upsert(
        {
          semester: resolved.scope.semester,
          exam_period: resolved.scope.examPeriod,
          jurusan: resolved.scope.jurusan,
          value: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "semester,exam_period,jurusan" }
      );
      return NextResponse.json({ success: true, cleared: (rows || []).length });
    }

    // Single delete — scoped guard so an admin can't reach another period's row.
    let selQ = supabase
      .from("purchase_requests")
      .select("payment_proof_path, share_proof_path, share_proof_path_2, license_key")
      .eq("id", id);
    if (resolved.mode === "scoped") {
      selQ = selQ
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }
    const { data: row, error: rowErr } = await selQ.maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await removeProofs([row as Record<string, unknown>]);

    let delQ = supabase.from("purchase_requests").delete().eq("id", id);
    if (resolved.mode === "scoped") {
      delQ = delQ
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }
    const { error: delErr } = await delQ;
    if (delErr) throw delErr;

    // "Hapus order + cabut key": also remove the issued license so the buyer
    // loses access (login → "key tidak valid"). Child→parent order so it works
    // whether or not the FKs cascade; the missing key row is what locks them out.
    const revokedKey = (row as Record<string, unknown>).license_key as string | null;
    if (revokeKey && revokedKey) {
      const { data: acts } = await supabase
        .from("activations")
        .select("id")
        .eq("license_key", revokedKey);
      const actIds = ((acts as { id: string }[]) || []).map((a) => a.id);
      if (actIds.length) {
        await supabase.from("devices").delete().in("activation_id", actIds);
      }
      await supabase.from("activations").delete().eq("license_key", revokedKey);
      await supabase.from("oauth_links").delete().eq("license_key", revokedKey);
      await supabase.from("license_keys").delete().eq("key", revokedKey);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin purchase DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
