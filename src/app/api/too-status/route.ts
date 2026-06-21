import { NextRequest } from "next/server";
import { createRecord, listRecords } from "@/lib/api";

export const dynamic = "force-dynamic";

const searchable = [
  "first_owner_name",
  "new_owner_name",
  "motorcycle_unit_type",
  "engine_number",
  "chassis_number",
  "plate_number",
  "origin",
  "status"
];

export async function GET(request: NextRequest) {
  return listRecords(request, "too_status_records", searchable);
}

export async function POST(request: NextRequest) {
  return createRecord(request, "too_status_records");
}
