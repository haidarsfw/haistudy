import { NextResponse } from "next/server";
// xlsx-js-style is a drop-in superset of SheetJS that can write cell styles (.s);
// the community "xlsx" build cannot. Same utils API.
import * as XLSX from "xlsx-js-style";
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
  "ShareProofURL2",
] as const;

// Column widths (chars) for a readable XLSX.
const COL_WIDTHS = [
  22, 10, 22, 16, 26, 12, 26, 10, 11, 14, 12, 16, 11, 14, 16, 14, 16, 22, 48, 48, 48,
];

function scopeLabelOf(row: Record<string, unknown>): string {
  const sem = (row.semester as number) ?? 2;
  const exam = (row.exam_period as string) ?? "uts";
  const jur = (row.jurusan as string) ?? "bm";
  return `s${sem}-${exam}-${jur}`;
}

// ─── XLSX styling helpers (xlsx-js-style cell `.s`) ───
const THIN = { style: "thin", color: { rgb: "E2E8F0" } } as const;
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;

function statusFill(v: string): Record<string, unknown> {
  if (v === "approved")
    return { fill: { fgColor: { rgb: "DCFCE7" } }, font: { color: { rgb: "166534" }, bold: true } };
  if (v === "rejected")
    return { fill: { fgColor: { rgb: "FEE2E2" } }, font: { color: { rgb: "991B1B" }, bold: true } };
  if (v === "pending")
    return { fill: { fgColor: { rgb: "FEF9C3" } }, font: { color: { rgb: "854D0E" }, bold: true } };
  return {};
}

// Apply a professional look: colored frozen header, zebra rows, borders,
// status tint, Rp number format + right-align on the amount columns, autofilter.
function styleSheet(ws: XLSX.WorkSheet, nRows: number) {
  const nCols = HEADERS.length;
  const statusCol = HEADERS.indexOf("Status");
  const amountCols = [HEADERS.indexOf("BasePrice"), HEADERS.indexOf("UniqueAmount")];

  // Header row
  for (let c = 0; c < nCols; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })] as XLSX.CellObject | undefined;
    if (!cell) continue;
    cell.s = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      fill: { fgColor: { rgb: "166534" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: BORDER,
    };
  }

  // Body rows
  for (let r = 1; r <= nRows; r++) {
    const zebra = r % 2 === 0 ? { fill: { fgColor: { rgb: "F8FAFC" } } } : {};
    for (let c = 0; c < nCols; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      if (!cell) continue;
      const base: Record<string, unknown> = {
        border: BORDER,
        alignment: { vertical: "top", wrapText: false },
        ...zebra,
      };
      if (c === statusCol) {
        cell.s = { ...base, ...statusFill(String(cell.v ?? "")), alignment: { vertical: "top", horizontal: "center" } };
      } else if (amountCols.includes(c)) {
        cell.s = { ...base, alignment: { vertical: "top", horizontal: "right" } };
        if (typeof cell.v === "number") cell.z = '"Rp"#,##0';
      } else {
        cell.s = base;
      }
    }
  }

  ws["!rows"] = [{ hpt: 22 }]; // taller header row
  // Autofilter on the header row. (Note: xlsx-js-style has no freeze-pane support,
  // so a frozen header isn't possible here — autofilter is the closest equivalent.)
  ws["!autofilter"] = {
    ref: `${XLSX.utils.encode_cell({ r: 0, c: 0 })}:${XLSX.utils.encode_cell({ r: nRows, c: nCols - 1 })}`,
  };
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

      // Sign all proofs in parallel (each row's URLs concurrently too) to avoid
      // an N+1 serial round-trip that could time out on large exports.
      rows = await Promise.all(
        ((data || []) as Record<string, unknown>[]).map(async (r) => {
          const meta = (r.meta as PurchaseMeta) || {};
          const [payUrl, shareUrl, shareUrl2] = await Promise.all([
            signOne((r.payment_proof_path as string) || ""),
            signOne((r.share_proof_path as string) || ""),
            signOne((r.share_proof_path_2 as string) || ""),
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
            ShareProofURL2: shareUrl2,
          };
        })
      );
    }

    // Build sheet (json_to_sheet with explicit header order; empty array → header-only).
    const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS as unknown as string[] });
    ws["!cols"] = COL_WIDTHS.map((w) => ({ wch: w }));

    const scopeTag = resolved.mode === "all" ? "all" : scopeKey(resolved.scope);
    const dateTag = new Date().toISOString().slice(0, 10);
    const filename = `haistudy-purchases-${scopeTag}-${dateTag}.${format}`;

    if (format === "csv") {
      // CSV can't carry styling — keep it plain, but prepend a UTF-8 BOM so Excel
      // opens it with the right encoding (no mojibake on names/emails).
      const csv = XLSX.utils.sheet_to_csv(ws);
      // Prepend an explicit UTF-8 BOM (EF BB BF) so Excel detects the encoding.
      const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(csv, "utf8")]);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // XLSX — apply the professional styling pass, then write.
    styleSheet(ws, rows.length);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchases");
    const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
