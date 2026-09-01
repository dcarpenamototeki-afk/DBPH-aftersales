import { NextRequest, NextResponse } from "next/server";
import { jsonError, normalizePayload, requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MIN_YEAR = 2026;
const MAX_YEAR = 2030;

function dateRange(year: number, month: string) {
  if (month === "ALL") return { start: `${year}-01-01`, end: `${year + 1}-01-01` };

  const monthNumber = Number(month);
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw new Error("Invalid archive month.");
  }
  const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  return { start, end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01` };
}

function activeArchivePeriod(row: { orcr_release_date: string | null; plate_release_date: string | null }) {
  const dates = [row.orcr_release_date, row.plate_release_date].filter((date): date is string => Boolean(date)).sort();
  const date = dates.at(-1);
  return date ? { archive_year: Number(date.slice(0, 4)), archive_month: Number(date.slice(5, 7)) } : {};
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
    dateRange(year, month);
    const supabase = getSupabaseAdmin();
    let archiveQuery = supabase
      .from("released_orcr_plate_archives")
      .select("*")
      .eq("archive_year", year);
    if (month !== "ALL") archiveQuery = archiveQuery.eq("archive_month", Number(month));

    const [active, archived] = await Promise.all([
      supabase
        .from("orcr_plate_records")
        .select("*")
        .or("and(orcr_release_date.not.is.null,plate_release_date.is.null),and(orcr_release_date.is.null,plate_release_date.not.is.null)")
        .order("updated_at", { ascending: false })
        .limit(5000),
      archiveQuery.order("archived_at", { ascending: false }).limit(5000)
    ]);

    if (active.error) return jsonError(active.error.message, 500);
    if (archived.error) return jsonError(archived.error.message, 500);

    const activeRows = (active.data ?? []).map((row) => ({
      ...row,
      ...activeArchivePeriod(row),
      archived_at: null,
      is_archived: false
    }));
    const archivedRows = (archived.data ?? []).map((row) => ({ ...row, is_archived: true }));
    const archives = archivedRows.sort((left, right) => String(right.archived_at).localeCompare(String(left.archived_at)));

    return NextResponse.json({
      pending: normalizePayload(activeRows),
      archives: normalizePayload(archives),
      data: normalizePayload([...activeRows, ...archives]),
      year,
      month
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load released archives.");
  }
}

