import { NextRequest, NextResponse } from "next/server";
import { jsonError, normalizePayload, requireAllowedUser, writeActivityLog } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

const editableFields = [
  "title", "brand", "category", "engine_cc", "year_model", "odometer_km", "cash_price", "swapping_value",
  "image_url", "condition_notes", "is_available", "is_published"
] as const;

function cleanPayload(input: unknown) {
  const normalized = normalizePayload(input) as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  editableFields.forEach((field) => { if (field in normalized) payload[field] = normalized[field]; });
  ["engine_cc", "odometer_km", "cash_price", "swapping_value"].forEach((field) => {
    if (!(field in payload)) return;
    payload[field] = payload[field] === "" || payload[field] == null ? null : Number(payload[field]);
  });
  ["is_available", "is_published"].forEach((field) => { if (field in payload) payload[field] = Boolean(payload[field]); });
  return payload;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;
  const supabase = getSupabaseAdmin();
  const { data: oldData, error: readError } = await supabase.from("catalog_items").select("*").eq("id", params.id).maybeSingle();
  if (readError) return jsonError(readError.message, 500);
  if (!oldData) return jsonError("Catalog item not found.", 404);
  const { data, error } = await supabase.from("catalog_items").update(cleanPayload(await request.json())).eq("id", params.id).select("*").single();
  if (error) return jsonError(error.message, 500);
  await writeActivityLog({ table: "catalog_items", recordId: params.id, action: "UPDATE", user: auth.user, oldData, newData: data });
  return NextResponse.json({ data });
}
