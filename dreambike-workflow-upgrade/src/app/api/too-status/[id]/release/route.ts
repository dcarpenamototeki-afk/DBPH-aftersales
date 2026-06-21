import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const { releaseDate } = (await request.json()) as { releaseDate?: string };
  if (!releaseDate) return jsonError("Release date is required.");

  const supabase = getSupabaseAdmin();
  const { data: too, error: tooError } = await supabase
    .from("too_status_records")
    .select("*")
    .eq("id", params.id)
    .single();
  if (tooError || !too) return jsonError(tooError?.message ?? "ToO record was not found.", 404);
  if (too.status === "RELEASED") return jsonError("This ToO record is already released.");
  if (too.data_check_status === "NOT CHECKED") return jsonError("Run Data Check before releasing ToO documents.");

  const releasedRecord = {
    registered_name: too.first_owner_name,
    owner_name: too.first_owner_name,
    new_owner_name: too.new_owner_name,
    motorcycle_unit_type: too.motorcycle_unit_type,
    color: too.color,
    engine_number: too.engine_number,
    chassis_number: too.chassis_number,
    plate_number: too.plate_number,
    orcr_on_hand: false,
    plate_on_hand: false,
    orcr_release_date: releaseDate,
    orcr_release_method: "WALK IN",
    orcr_received_by: too.new_owner_name,
    remarks: `TRANSFER OF OWNERSHIP - ${too.origin}`
  };

  const { data: released, error: releaseError } = await supabase
    .from("orcr_plate_records")
    .insert(releasedRecord)
    .select("*")
    .single();
  if (releaseError) return jsonError(releaseError.message, 500);

  const { data, error } = await supabase
    .from("too_status_records")
    .update({ status: "RELEASED", release_date: releaseDate })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) {
    await supabase.from("orcr_plate_records").delete().eq("id", released.id);
    return jsonError(error.message, 500);
  }

  await supabase.from("activity_log").insert({
    table_name: "too_status_records",
    record_id: params.id,
    action: "UPDATE",
    changed_by: auth.user.id,
    changed_by_email: auth.user.email ?? "",
    old_data: too,
    new_data: data
  });

  return NextResponse.json({ data, released });
}
