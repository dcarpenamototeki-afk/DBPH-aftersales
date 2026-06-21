import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const { data: too, error: tooError } = await supabase
    .from("too_status_records")
    .select("*")
    .eq("id", params.id)
    .single();
  if (tooError || !too) return jsonError(tooError?.message ?? "ToO record was not found.", 404);

  if (!String(too.first_owner_name ?? "").trim()) return jsonError("First Owner is required before running Data Check.");

  const { data, error } = await supabase.rpc("check_and_move_too_record", { p_too_id: params.id });
  if (error) return jsonError(error.message, 500);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return jsonError("Data Check did not return a ToO record.", 500);

  await supabase.from("activity_log").insert({
    table_name: "too_status_records",
    record_id: params.id,
    action: "UPDATE",
    changed_by: auth.user.id,
    changed_by_email: auth.user.email ?? "",
    old_data: too,
    new_data: result
  });

  return NextResponse.json({ data: result, matched: result.data_check_status === "MATCHED & MOVED" });
}
