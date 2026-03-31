import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { PurchaseRequest } from "@/types";

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
  });
}

function mapRow(row: Record<string, unknown>): PurchaseRequest {
  return {
    id: row.id as string,
    name: row.name as string,
    whatsapp: row.whatsapp as string,
    email: (row.email as string) || null,
    package: row.package as "discount" | "normal" | "free",
    status: row.status as "pending" | "approved" | "rejected",
    licenseKey: (row.license_key as string) || null,
    approvedAt: (row.approved_at as string) || null,
    createdAt: row.created_at as string,
  };
}

// ─── GET /api/admin/purchase?status=pending ───
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    if (!isSupabaseServerConfigured) {
      let purchases = Array.from(mockPurchases.values());
      if (status) {
        purchases = purchases.filter((p) => p.status === status);
      }
      purchases.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return NextResponse.json({ purchases });
    }

    const supabase = createServerClient()!;
    let query = supabase
      .from("purchase_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      purchases: (data || []).map(mapRow),
    });
  } catch (error) {
    console.error("Admin purchase GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/purchase - Approve or reject ───
export async function PATCH(request: Request) {
  try {
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

    const { data, error } = await supabase
      .from("purchase_requests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ purchase: mapRow(data) });
  } catch (error) {
    console.error("Admin purchase PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
