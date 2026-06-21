import { NextRequest } from "next/server";
import { deleteRecord, updateRecord } from "@/lib/api";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return updateRecord(request, "too_status_records", params.id);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return deleteRecord(request, "too_status_records", params.id);
}
