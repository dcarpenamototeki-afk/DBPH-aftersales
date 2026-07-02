import { NextRequest } from "next/server";
import { createRecord, listRecords } from "@/lib/api";

export const dynamic = "force-dynamic";

const searchable = ["warehouse", "model", "color", "engine_number", "chassis_number", "orcr"];

export async function GET(request: NextRequest) {
  return listRecords(request, "dbph_warehouse_inventory", searchable);
}

export async function POST(request: NextRequest) {
  return createRecord(request, "dbph_warehouse_inventory");
}
