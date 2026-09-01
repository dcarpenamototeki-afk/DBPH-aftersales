import { NextRequest, NextResponse } from "next/server";
import { jsonError, normalizePayload, requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type TraceRequestMatch = {
  unidentifiedRecordId: string;
  orcrRecordId: string;
};

function normalizedPlate(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

export async function GET(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const [unidentified, orcr] = await Promise.all([
    supabase
      .from("unidentified_plate_records")
      .select("id,plate_number,date_received,source_location")
      .eq("status", "UNTRACED")
      .order("date_received", { ascending: true })
      .limit(5000),
    supabase
      .from("orcr_plate_records")
      .select("id,registered_name,new_owner_name,motorcycle_unit_type,engine_number,chassis_number,plate_number,orcr_on_hand,plate_on_hand,orcr_release_date,plate_release_date")
      .neq("plate_number", "")
      .limit(5000)
  ]);

  if (unidentified.error) return jsonError(unidentified.error.message, 500);
  if (orcr.error) return jsonError(orcr.error.message, 500);

  const orcrByPlate = new Map<string, typeof orcr.data>();
  for (const row of orcr.data ?? []) {
    const plate = normalizedPlate(row.plate_number);
    if (!plate) continue;
    const current = orcrByPlate.get(plate) ?? [];
    current.push(row);
    orcrByPlate.set(plate, current);
  }

  const matches = (unidentified.data ?? []).flatMap((plateRow) => {
    const plate = normalizedPlate(plateRow.plate_number);
    return (orcrByPlate.get(plate) ?? []).map((orcrRow) => ({
      unidentifiedRecordId: plateRow.id,
      orcrRecordId: orcrRow.id,
      plateNumber: plateRow.plate_number,
      dateReceived: plateRow.date_received,
      sourceLocation: plateRow.source_location,
      registeredName: orcrRow.new_owner_name || orcrRow.registered_name,
      unit: orcrRow.motorcycle_unit_type,
      engineNumber: orcrRow.engine_number,
      chassisNumber: orcrRow.chassis_number,
      targetArea: orcrRow.orcr_release_date || orcrRow.plate_release_date ? "RELEASED ORCR" : "PLATE MONITORING",
      alreadyAvailable: Boolean(orcrRow.plate_on_hand)
    }));
  });

  return NextResponse.json({
    matches: normalizePayload(matches),
    tracedCount: unidentified.data?.length ?? 0,
    matchedPlateCount: new Set(matches.map((match) => match.unidentifiedRecordId)).size
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const body = (await request.json()) as { matches?: TraceRequestMatch[] };
  const requested = Array.isArray(body.matches) ? body.matches : [];
  if (!requested.length) return jsonError("No traced matches to export.");

  const uniquePairs = Array.from(
    new Map(
      requested
        .filter((match) => match?.unidentifiedRecordId && match?.orcrRecordId)
        .map((match) => [`${match.unidentifiedRecordId}:${match.orcrRecordId}`, match])
    ).values()
  );
  if (!uniquePairs.length) return jsonError("No valid traced matches to export.");

  const supabase = getSupabaseAdmin();
  const unidentifiedIds = Array.from(new Set(uniquePairs.map((match) => match.unidentifiedRecordId)));
  const orcrIds = Array.from(new Set(uniquePairs.map((match) => match.orcrRecordId)));
  const [unidentified, orcr] = await Promise.all([
    supabase
      .from("unidentified_plate_records")
      .select("id,plate_number,status")
      .in("id", unidentifiedIds),
    supabase
      .from("orcr_plate_records")
      .select("id,registered_name,new_owner_name,engine_number,chassis_number,plate_number,orcr_release_date,plate_release_date")
      .in("id", orcrIds)
  ]);

  if (unidentified.error) return jsonError(unidentified.error.message, 500);
  if (orcr.error) return jsonError(orcr.error.message, 500);

  const unidentifiedById = new Map((unidentified.data ?? []).map((row) => [row.id, row]));
  const orcrById = new Map((orcr.data ?? []).map((row) => [row.id, row]));
  const validPairs = uniquePairs.filter((match) => {
    const plateRow = unidentifiedById.get(match.unidentifiedRecordId);
    const orcrRow = orcrById.get(match.orcrRecordId);
    return plateRow?.status === "UNTRACED" && normalizedPlate(plateRow.plate_number) === normalizedPlate(orcrRow?.plate_number);
  });

  if (!validPairs.length) return jsonError("The traced matches are no longer valid. Run Trace Match again.", 409);

  const targetUpdates = await Promise.all(
    Array.from(new Set(validPairs.map((match) => match.orcrRecordId))).map((id) =>
      supabase.from("orcr_plate_records").update({ plate_on_hand: true }).eq("id", id)
    )
  );
  const targetError = targetUpdates.find((result) => result.error)?.error;
  if (targetError) return jsonError(targetError.message, 500);

  const firstMatchByPlateRecord = new Map<string, TraceRequestMatch>();
  for (const match of validPairs) {
    if (!firstMatchByPlateRecord.has(match.unidentifiedRecordId)) firstMatchByPlateRecord.set(match.unidentifiedRecordId, match);
  }

  const plateUpdates = await Promise.all(
    Array.from(firstMatchByPlateRecord.values()).map((match) => {
      const target = orcrById.get(match.orcrRecordId)!;
      return supabase
        .from("unidentified_plate_records")
        .update({
          status: "MATCHED",
          matched_registered_name: target.new_owner_name || target.registered_name,
          matched_engine_number: target.engine_number,
          matched_chassis_number: target.chassis_number,
          matched_record_type: target.orcr_release_date || target.plate_release_date ? "RELEASED ORCR" : "ORCR / PLATE MONITORING",
          matched_record_id: target.id
        })
        .eq("id", match.unidentifiedRecordId)
        .eq("status", "UNTRACED");
    })
  );
  const plateError = plateUpdates.find((result) => result.error)?.error;
  if (plateError) return jsonError(plateError.message, 500);

  const exported = Array.from(firstMatchByPlateRecord.values()).map((match) => {
    const plateRow = unidentifiedById.get(match.unidentifiedRecordId)!;
    const target = orcrById.get(match.orcrRecordId)!;
    return {
      plateNumber: plateRow.plate_number,
      registeredName: target.new_owner_name || target.registered_name,
      engineNumber: target.engine_number,
      chassisNumber: target.chassis_number,
      taggedIn: target.orcr_release_date || target.plate_release_date ? "RELEASED ORCR" : "PLATE MONITORING",
      status: "PLATE AVAILABLE"
    };
  });

  return NextResponse.json({ data: normalizePayload(exported), exportedCount: exported.length });
}

