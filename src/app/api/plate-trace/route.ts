import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const plate = request.nextUrl.searchParams.get("plate")?.trim();
  if (!plate) return jsonError("Plate number is required.");

  const supabase = getSupabaseAdmin();
  const [orcr, inventory] = await Promise.all([
    supabase
      .from("orcr_plate_records")
      .select("id,registered_name,owner_name,motorcycle_unit_type,engine_number,chassis_number,plate_number")
      .ilike("plate_number", plate),
    supabase
      .from("sb_finance_inventory")
      .select("id,registered_name,motorcycle_model,motor_number,plate_number,new_owner,main_status")
      .ilike("plate_number", plate)
  ]);

  if (orcr.error) return jsonError(orcr.error.message, 500);
  if (inventory.error) return jsonError(inventory.error.message, 500);

  const matches = [
    ...(orcr.data ?? []).map((row) => ({
      recordType: "ORCR / Plate",
      recordId: row.id,
      registeredName: row.registered_name,
      unit: row.motorcycle_unit_type,
      engineNumber: row.engine_number,
      chassisNumber: row.chassis_number,
      plateNumber: row.plate_number
    })),
    ...(inventory.data ?? []).map((row) => ({
      recordType: row.main_status === "SOLD" ? "Sold Unit" : "SB Finance Inventory",
      recordId: row.id,
      registeredName: row.main_status === "SOLD" ? row.new_owner || row.registered_name : row.registered_name,
      unit: row.motorcycle_model,
      engineNumber: row.motor_number,
      chassisNumber: "",
      plateNumber: row.plate_number
    }))
  ];

  return NextResponse.json({ matches });
}
