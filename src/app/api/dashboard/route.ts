import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function count(table: string, filter?: { column: string; value?: string | boolean; notNull?: boolean }) {
  let query = getSupabaseAdmin().from(table).select("*", { count: "exact", head: true });
  if (filter && "value" in filter) query = query.eq(filter.column, filter.value);
  if (filter?.notNull) query = query.not(filter.column, "is", null);
  const { count: total, error } = await query;
  if (error) throw error;
  return total ?? 0;
}

async function countReleasedOrcrPlate() {
  const { count: total, error } = await getSupabaseAdmin()
    .from("orcr_plate_records")
    .select("*", { count: "exact", head: true })
    .or("orcr_release_date.not.is.null,plate_release_date.not.is.null");
  if (error) throw error;
  return total ?? 0;
}

export async function GET(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const [
    totalOrcr,
    orcrOnHand,
    plateOnHand,
    pendingOrcr,
    released,
    totalSales,
    totalInventory,
    available,
    sold
  ] = await Promise.all([
    count("orcr_plate_records"),
    count("orcr_plate_records", { column: "orcr_on_hand", value: true }),
    count("orcr_plate_records", { column: "plate_on_hand", value: true }),
    count("orcr_plate_records", { column: "orcr_on_hand", value: false }),
    countReleasedOrcrPlate(),
    count("sales_invoice_records"),
    count("sb_finance_inventory"),
    count("sb_finance_inventory", { column: "main_status", value: "AVAILABLE" }),
    count("sb_finance_inventory", { column: "main_status", value: "SOLD" })
  ]);

  return NextResponse.json({
    totalOrcr,
    orcrOnHand,
    plateOnHand,
    pendingOrcr,
    released,
    totalSales,
    totalInventory,
    available,
    sold
  });
}
