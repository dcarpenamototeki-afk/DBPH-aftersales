import { NextRequest, NextResponse } from "next/server";
import { jsonError, normalizePayload, requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const payload = normalizePayload(await request.json()) as {
    model?: string;
    color?: string;
    cost?: number;
  };
  const model = String(payload.model ?? "").trim();
  const color = String(payload.color ?? "").trim();
  const cost = Number(payload.cost);

  if (!model || !color) return jsonError("Model and color are required.");
  if (!Number.isFinite(cost) || cost < 0) return jsonError("Cost must be zero or greater.");

  const { data, error } = await getSupabaseAdmin()
    .from("dbph_warehouse_inventory")
    .update({ cost })
    .eq("model", model)
    .eq("color", color)
    .select("*");

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data: normalizePayload(data) });
}
