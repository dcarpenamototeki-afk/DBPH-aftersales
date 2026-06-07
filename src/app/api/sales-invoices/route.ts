import { NextRequest } from "next/server";
import { createRecord, listRecords } from "@/lib/api";
import { moduleConfig } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return listRecords(request, moduleConfig.sales.table, moduleConfig.sales.searchable);
}

export async function POST(request: NextRequest) {
  return createRecord(request, moduleConfig.sales.table);
}
