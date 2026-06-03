import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope } from "@/lib/auth/admin-scope";
import { ScopeError } from "@/lib/auth/scope-check";
import { scopeKey } from "@/lib/scope";
import type { PurchaseMeta } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Spreadsheet column order — one row per purchase response (Google-Forms style).
const HEADERS = [
  "Timestamp",
  "Status",
  "Name",
  "WhatsApp",
  "Email",
  "LoginMethod",
  "LoginEmail",
  "Package",
  "BasePrice",
  "UniqueAmount",
  "Class",
  "Campus",
  "DeviceLimit",
  "PaymentMethod",
  "Source",
  "Scope",
  "LicenseKey",
  "ApprovedAt",
  "PaymentProofURL",
  "ShareProofURL",
] as const;

// Column widths (chars) for a readable XLSX.
const COL_WIDTHS = [
  22, 10, 22, 16, 26, 12, 26, 10, 11, 14, 12, 16, 11, 14, 16, 14, 16, 22, 48, 48,
];

function scopeLabelOf(row: Record<string, unknown>): string {
  const sem = (row.semester as number) ?? 2;
  const exam = (row.exam_period as string) ?? "uts";
  const jur = (row.jurusan as string) ?? "bm";
  return `s${sem}-${exam}-${jur}`;
}

export async function GET(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

    let rows: Record<string, string | number>[] = [];

    if (isSupabaseServerConfigured) {
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
      const { data, error } = await query;
      if (error) throw error;

      const signOne = async (path: string): Promise<string> => {
        if (!path) return "";
        const { data: s } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(path, 3600);
        return s?.signedUrl ?? "";
      };

      // Sign all proofs in parallel (each row's two URLs concurrently too) to
      // avoid an N+1 serial round-trip that could time out on large exports.
      rows = await Promise.all(
        ((data || []) as Record<string, unknown>[]).map(async (r) => {
          const meta = (r.meta as PurchaseMeta) || {};
          const [payUrl, shareUrl] = await Promise.all([
            signOne((r.payment_proof_path as string) || ""),
            signOne((r.share_proof_path as string) || ""),
          ]);
          return {
            Timestamp: (r.created_at as string) || "",
            Status: (r.status as string) || "",
            Name: (r.name as string) || "",
            WhatsApp: (r.whatsapp as string) || "",
            Email: (r.email as string) || "",
            LoginMethod: meta.loginMethod || "",
            LoginEmail: meta.loginEmail || "",
            Package: (r.package as string) || "",
            BasePrice: typeof meta.basePrice === "number" ? meta.basePrice : "",
            UniqueAmount: typeof meta.uniqueAmount === "number" ? meta.uniqueAmount : "",
            Class: meta.classCode || "",
            Campus: meta.campus || "",
            DeviceLimit: typeof meta.deviceLimit === "number" ? meta.deviceLimit : "",
            PaymentMethod: meta.paymentMethod || "",
            Source: meta.source || "",
            Scope: scopeLabelOf(r),
            LicenseKey: (r.license_key as string) || "",
            ApprovedAt: (r.approved_at as string) || "",
            PaymentProofURL: payUrl,
            ShareProofURL: shareUrl,
          };
        })
      );
    }

    // Build sheet (json_to_sheet with explicit header order; empty array → header-only).
    const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS as unknown as string[] });
    ws["!cols"] = COL_WIDTHS.map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchases");

    const buf: Buffer = XLSX.write(wb, {
      type: "buffer",
      bookType: format === "xlsx" ? "xlsx" : "csv",
    });

    const scopeTag = resolved.mode === "all" ? "all" : scopeKey(resolved.scope);
    const dateTag = new Date().toISOString().slice(0, 10);
    const filename = `haistudy-purchases-${scopeTag}-${dateTag}.${format}`;
    const contentType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv; charset=utf-8";

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Admin purchase export error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
