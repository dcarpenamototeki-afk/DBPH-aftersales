import { NextRequest, NextResponse } from "next/server";
import { jsonError, listRecords, normalizePayload, requireAllowedUser } from "@/lib/api";
import { moduleConfig } from "@/lib/schema";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return listRecords(request, moduleConfig.orcr.table, moduleConfig.orcr.searchable);
}

export async function POST(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const submitted = await request.json() as Record<string, unknown>;
  const duplicateAction = submitted.duplicateAction;
  if (duplicateAction && duplicateAction !== "overwrite" && duplicateAction !== "create") {
    return jsonError("Invalid duplicate action.");
  }

  const { duplicateAction: _duplicateAction, ...rawPayload } = submitted;
  const payload = normalizePayload(rawPayload) as Record<string, unknown>;
  const supabase = getSupabaseAdmin();
  const engineNumber = String(payload.engine_number ?? "").trim();
  const chassisNumber = String(payload.chassis_number ?? "").trim();
  const plateNumber = String(payload.plate_number ?? "").trim();

  async function findDuplicate(table: "orcr_plate_records" | "released_orcr_plate_archives") {
    if (engineNumber && chassisNumber) {
      const { data, error } = await supabase.from(table).select("*").eq("engine_number", engineNumber).eq("chassis_number", chassisNumber).limit(1);
      if (error) {
        if (table === "released_orcr_plate_archives" && (error.code === "42P01" || error.code === "PGRST205")) return null;
        throw error;
      }
      if (data?.[0]) return { ...data[0], duplicate_source: table };
    }
    if (plateNumber) {
      const { data, error } = await supabase.from(table).select("*").eq("plate_number", plateNumber).limit(1);
      if (error) {
        if (table === "released_orcr_plate_archives" && (error.code === "42P01" || error.code === "PGRST205")) return null;
        throw error;
      }
      if (data?.[0]) return { ...data[0], duplicate_source: table };
    }
    return null;
  }

  try {
    const duplicate = await findDuplicate("orcr_plate_records") ?? await findDuplicate("released_orcr_plate_archives");
    if (duplicate && !duplicateAction) {
      return NextResponse.json({ error: "A matching ORCR / Plate record already exists.", duplicate }, { status: 409 });
    }

    if (duplicate && duplicateAction === "overwrite") {
      const table = duplicate.duplicate_source as "orcr_plate_records" | "released_orcr_plate_archives";
      const { data, error } = await supabase.from(table).update(payload).eq("id", duplicate.id).select("*").single();
      if (error) return jsonError(error.message, 500);
      return NextResponse.json({ data: normalizePayload(data), action: "overwritten" });
    }

    const { data, error } = await supabase.from(moduleConfig.orcr.table).insert(payload).select("*").single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data: normalizePayload(data) }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to save ORCR / Plate record.", 500);
  }
}
