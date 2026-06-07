import { NextRequest } from "next/server";
import { deleteRecord, updateRecord } from "@/lib/api";
import { moduleConfig } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return updateRecord(request, moduleConfig.sales.table, params.id);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  return deleteRecord(_request, moduleConfig.sales.table, params.id);
}
