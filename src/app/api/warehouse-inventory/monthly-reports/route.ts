import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const year = Number(request.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return jsonError("Invalid report year.");

  const { data, error } = await getSupabaseAdmin()
    .from("dbph_warehouse_monthly_reports")
    .select("id,report_year,report_month,generated_at")
    .eq("report_year", year)
    .order("report_month", { ascending: true });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data: data ?? [] });
}
