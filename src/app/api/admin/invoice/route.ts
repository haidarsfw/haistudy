import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";

// ─── Mock counter ───
let mockCounter = 25;

// Helper: get the existing row (any row, since it's a singleton table)
async function getRow(supabase: ReturnType<typeof createServerClient>) {
  const { data, error } = await supabase!
    .from("invoice_counter")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── GET /api/admin/invoice - Get current counter ───
export async function GET() {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ value: mockCounter });
    }

    const supabase = createServerClient()!;
    const row = await getRow(supabase);
    return NextResponse.json({ value: row?.value ?? 1 });
  } catch (error) {
    console.error("Invoice GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/admin/invoice - Increment and return new value ───
export async function POST() {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    if (!isSupabaseServerConfigured) {
      mockCounter += 1;
      return NextResponse.json({ value: mockCounter });
    }

    const supabase = createServerClient()!;
    const row = await getRow(supabase);
    const currentValue = row?.value ?? 0;
    const newValue = currentValue + 1;

    if (row) {
      // Optimistic locking: only update if value hasn't changed
      const { data, error } = await supabase
        .from("invoice_counter")
        .update({ value: newValue, updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("value", currentValue)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Race condition - refetch and retry once
        const retry = await getRow(supabase);
        const retryValue = (retry?.value ?? 0) + 1;
        const { error: retryError } = await supabase
          .from("invoice_counter")
          .update({ value: retryValue, updated_at: new Date().toISOString() })
          .eq("id", retry!.id);
        if (retryError) throw retryError;
        return NextResponse.json({ value: retryValue });
      }

      return NextResponse.json({ value: newValue });
    } else {
      // No row yet - insert
      const { error } = await supabase
        .from("invoice_counter")
        .insert({ value: newValue, updated_at: new Date().toISOString() });
      if (error) throw error;
      return NextResponse.json({ value: newValue });
    }
  } catch (error) {
    console.error("Invoice POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PUT /api/admin/invoice - Set counter to specific value ───
export async function PUT(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await request.json();
    const { value } = body;

    if (typeof value !== "number" || value < 0) {
      return NextResponse.json(
        { error: "value must be a non-negative number" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      mockCounter = value;
      return NextResponse.json({ value: mockCounter });
    }

    const supabase = createServerClient()!;
    const row = await getRow(supabase);

    if (row) {
      const { error } = await supabase
        .from("invoice_counter")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("invoice_counter")
        .insert({ value, updated_at: new Date().toISOString() });
      if (error) throw error;
    }

    return NextResponse.json({ value });
  } catch (error) {
    console.error("Invoice PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
