import { NextRequest } from "next/server";
import { createRecord, listRecords } from "@/lib/api";

export const dynamic = "force-dynamic";

const searchable = ["model", "engine_number", "chassis_number", "color", "status", "note"];

export async function GET(request: NextRequest) {
  return listRecords(request, "sales_invoice_tracker_records", searchable);
}

export async function POST(request: NextRequest) {
  return createRecord(request, "sales_invoice_tracker_records");
}
