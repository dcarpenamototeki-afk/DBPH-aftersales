import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";
import { warehouseMonthlyReportCsv, type WarehouseMonthlyReportData } from "@/lib/warehouse-monthly-report";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { year: string; month: string } }
) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const year = Number(params.year);
  const month = Number(params.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return jsonError("Invalid report period.");
  }

  const { data, error } = await getSupabaseAdmin()
    .from("dbph_warehouse_monthly_reports")
    .select("report_data")
    .eq("report_year", year)
    .eq("report_month", month)
    .single();
  if (error || !data) return jsonError("Monthly report is not available yet.", 404);

  const fileMonth = String(month).padStart(2, "0");
  const csv = warehouseMonthlyReportCsv(data.report_data as WarehouseMonthlyReportData);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="DBPH_WH_Monthly_Report_${year}-${fileMonth}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}
