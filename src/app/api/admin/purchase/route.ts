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
      updates.license_key = licenseKey || null;
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
    return NextResponse.json({ purchase: mapRow(data) });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin purchase PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
