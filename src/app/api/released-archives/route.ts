import { NextRequest, NextResponse } from "next/server";
import { jsonError, normalizePayload, requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MIN_YEAR = 2026;
const MAX_YEAR = 2030;

function dateRange(year: number, month: string) {
  if (month === "ALL") {
    return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
  }

  const monthNumber = Number(month);
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw new Error("Invalid archive month.");
  }
  const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  return { start, end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01` };
}

export async function GET(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const year = Number(request.nextUrl.searchParams.get("year") ?? MIN_YEAR);
  const month = (request.nextUrl.searchParams.get("month") ?? "ALL").toUpperCase();
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return jsonError(`Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
  }

  try {
    const { start, end } = dateRange(year, month);
    const { data, error } = await getSupabaseAdmin()
      .from("orcr_plate_records")
      .select("*")
      .or(
        `and(orcr_release_date.gte.${start},orcr_release_date.lt.${end}),and(plate_release_date.gte.${start},plate_release_date.lt.${end})`
      )
      .order("updated_at", { ascending: false })
      .limit(5000);

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data: normalizePayload(data), year, month });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load released archives.");
  }
}

