import { NextRequest } from "next/server";
import { createRecord, listRecords } from "@/lib/api";
import { moduleConfig } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return listRecords(request, moduleConfig.inventory.table, moduleConfig.inventory.searchable);
}

export async function POST(request: NextRequest) {
  return createRecord(request, moduleConfig.inventory.table);
}
